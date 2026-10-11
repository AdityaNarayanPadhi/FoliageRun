import * as Sentry from '@sentry/node';
import { config } from '../config';
import { RouteGenerateRequest, RouteGenerateResponse, Waypoint } from '../types/route';
import { calculateTotalDistanceKm, synthesizeLoopRoute } from '../utils/geo';
import { generateGpxXml } from '../utils/gpx';
import { executeFoliageSearch, foliageSearchTool } from './tools/foliage';
import { executeOsmParkRoute, osmParkRouteTool } from './tools/overpass';

/**
 * Interface representing the Mastra Agent instance
 */
export interface RouteAgent {
  name: string;
  model: string;
  generateRoute(request: RouteGenerateRequest): Promise<RouteGenerateResponse>;
}

/**
 * Fallback prompt synthesizer when LLM API is unavailable, unauthenticated, or rate-limited.
 */
function buildDeterministicSynthesis(
  request: RouteGenerateRequest,
  foliageReport: Awaited<ReturnType<typeof executeFoliageSearch>>,
  osmResult: Awaited<ReturnType<typeof executeOsmParkRoute>>,
  synthesizedWaypoints: Waypoint[],
  calculatedDistance: number
): {
  routeTitle: string;
  foliageSummary: string;
  turnByTurnInstructions: string[];
} {
  const { locationName, targetDistanceKm } = request;
  const parkName = osmResult.parks[0]?.name || 'Autumn Canopy Park';

  const routeTitle = `${locationName} Autumn ${Math.round(targetDistanceKm)}k ${foliageReport.peakStatus} Loop`;
  const foliageSummary = `${foliageReport.summary} Current status: ${foliageReport.peakStatus}. Trail surface: ${foliageReport.trailConditions || 'Dry dirt and fallen leaves'}.`;

  const instructions: string[] = [
    `Start at ${locationName} baseline trailhead. Head north towards ${parkName}.`,
    `At 1.2km, enter the wooded section under mature maple and oak canopy. Watch for wet leaf litter.`,
    `Proceed along the gentle incline toward the scenic ridge overlook.`,
    `Follow the winding park loop path eastward, enjoying views of yellow and scarlet foliage.`,
    `At ${(targetDistanceKm * 0.7).toFixed(1)}km, take the connecting path curving south toward the greenway.`,
    `Complete the circular loop returning safely to the initial start point at ${locationName}.`,
  ];

  return {
    routeTitle,
    foliageSummary,
    turnByTurnInstructions: instructions,
  };
}

/**
 * FoliageRun Route Agent built on Mastra principles.
 * Orchestrates foliageSearchTool and osmParkRouteTool using Groq/Hugging Face open-weight models.
 */
export class FoliageRouteAgent implements RouteAgent {
  public readonly name = 'FoliageRouteAgent';
  public readonly model = config.llm.modelName;

  /**
   * Generates a complete foliage-optimized running route loop.
   */
  async generateRoute(request: RouteGenerateRequest): Promise<RouteGenerateResponse> {
    return await Sentry.startSpan(
      {
        name: 'generate_foliage_route',
        op: 'ai.agent',
        attributes: {
          'ai.agent.name': this.name,
          'ai.model.id': this.model,
          'ai.prompt.location': request.locationName,
          'ai.prompt.target_distance_km': request.targetDistanceKm,
          'ai.prompt.start_lat': request.startLat,
          'ai.prompt.start_lng': request.startLng,
        },
      },
      async (agentSpan) => {
        const startTime = Date.now();
        const { startLat, startLng, targetDistanceKm, locationName } = request;

        // Step 1: Execute Foliage Report Tool
        const foliageReport = await executeFoliageSearch({
          location: locationName,
          lat: startLat,
          lng: startLng,
        });

        // Step 2: Execute OpenStreetMap Overpass Tool
        // Search radius: roughly half the target distance, capped between 1.5km and 8km
        const radiusMeters = Math.min(
          8000,
          Math.max(1500, Math.round((targetDistanceKm / 2) * 1000))
        );

        const osmResult = await executeOsmParkRoute({
          centerLat: startLat,
          centerLng: startLng,
          radiusMeters,
        });

        // Step 3: Compute geometric loop waypoints
        const guidePoints = osmResult.nodes.map((n) => ({
          lat: n.lat,
          lng: n.lng,
          name: n.name,
        }));

        const waypoints = synthesizeLoopRoute(
          startLat,
          startLng,
          targetDistanceKm,
          locationName,
          guidePoints
        );

        const measuredDistanceKm = calculateTotalDistanceKm(waypoints);

        // Step 4: LLM Synthesis with Groq / Hugging Face Open-Weight Model
        let routeTitle = '';
        let foliageSummary = '';
        let turnByTurnInstructions: string[] = [];

        const hasRealApiKey =
          config.llm.apiKey &&
          !config.llm.apiKey.startsWith('mock-') &&
          !config.llm.apiKey.startsWith('gsk_your_');

        if (hasRealApiKey) {
          try {
            const llmResult = await this.synthesizeWithLlm({
              request,
              foliageReport,
              osmResult,
              measuredDistanceKm,
              agentSpan,
            });

            routeTitle = llmResult.routeTitle;
            foliageSummary = llmResult.foliageSummary;
            turnByTurnInstructions = llmResult.turnByTurnInstructions;
          } catch (err: any) {
            agentSpan.recordException(err);
            agentSpan.setAttribute('ai.llm.fallback', 'true');
            agentSpan.setAttribute('ai.llm.error', err?.message || 'LLM error');

            const fallback = buildDeterministicSynthesis(
              request,
              foliageReport,
              osmResult,
              waypoints,
              measuredDistanceKm
            );
            routeTitle = fallback.routeTitle;
            foliageSummary = fallback.foliageSummary;
            turnByTurnInstructions = fallback.turnByTurnInstructions;
          }
        } else {
          agentSpan.setAttribute('ai.llm.mode', 'deterministic_offline');
          const fallback = buildDeterministicSynthesis(
            request,
            foliageReport,
            osmResult,
            waypoints,
            measuredDistanceKm
          );
          routeTitle = fallback.routeTitle;
          foliageSummary = fallback.foliageSummary;
          turnByTurnInstructions = fallback.turnByTurnInstructions;
        }

        // Step 5: Generate GPX 1.1 XML
        const gpxData = generateGpxXml(waypoints, {
          routeTitle,
          description: `${foliageSummary} Target distance: ${measuredDistanceKm}km. Built for Hacktoberfest 2026 Touch Grass challenge.`,
        });

        const totalLatency = Date.now() - startTime;
        agentSpan.setAttribute('ai.agent.latency_ms', totalLatency);
        agentSpan.setAttribute('ai.route.distance_km', measuredDistanceKm);
        agentSpan.setAttribute('ai.route.waypoints_count', waypoints.length);

        return {
          success: true,
          routeTitle,
          distanceKm: measuredDistanceKm,
          foliageSummary,
          waypoints,
          turnByTurnInstructions,
          gpxData,
        };
      }
    );
  }

  /**
   * Calls the open-weight LLM (Gemma 2 9B or Llama 3.1 8B) with Sentry span telemetry.
   */
  private async synthesizeWithLlm(params: {
    request: RouteGenerateRequest;
    foliageReport: Awaited<ReturnType<typeof executeFoliageSearch>>;
    osmResult: Awaited<ReturnType<typeof executeOsmParkRoute>>;
    measuredDistanceKm: number;
    agentSpan: Sentry.Span;
  }): Promise<{
    routeTitle: string;
    foliageSummary: string;
    turnByTurnInstructions: string[];
  }> {
    const { request, foliageReport, osmResult, measuredDistanceKm } = params;

    return await Sentry.startSpan(
      {
        name: 'chat_completion',
        op: 'ai.chat_completions.create',
        attributes: {
          'ai.model.id': this.model,
          'ai.provider': 'groq-or-hf',
        },
      },
      async (llmSpan) => {
        const systemPrompt = `You are FoliageRun, an expert outdoor athletic route designer for Hacktoberfest 2026 "Touch Grass" challenge.
Your mission is to craft inspiring, scenic autumn running routes that showcase vibrant fall foliage, park canopies, and safe pedestrian paths.
Always reply with valid JSON only, using this exact structure:
{
  "routeTitle": "Creative, autumn-themed name for the route",
  "foliageSummary": "Concise summary of seasonal conditions, peak status, canopy colors, and footing",
  "turnByTurnInstructions": ["Step 1...", "Step 2...", "Step 3..."]
}`;

        const parksList = osmResult.parks
          .map((p) => p.name)
          .filter(Boolean)
          .slice(0, 5)
          .join(', ');

        const userPrompt = `Synthesize an autumn running route loop for:
- Location: ${request.locationName} (Lat: ${request.startLat}, Lng: ${request.startLng})
- Target Distance: ${request.targetDistanceKm} km (Calculated loop: ${measuredDistanceKm} km)
- Fall Foliage Report: Peak Status: ${foliageReport.peakStatus}; Summary: "${foliageReport.summary}"; Trail alerts: "${foliageReport.trailConditions}"
- Nearby Parks & Trails: ${parksList || 'Scenic local greenway and wooded paths'}

Return only a JSON object with routeTitle, foliageSummary, and 5-6 turnByTurnInstructions.`;

        const completionStartTime = Date.now();
        const response = await fetch(`${config.llm.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.llm.apiKey}`,
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.6,
            max_tokens: 800,
          }),
        });

        if (!response.ok) {
          throw new Error(`Groq LLM provider returned HTTP status ${response.status}: ${await response.text()}`);
        }

        const completion = (await response.json()) as any;
        const latency = Date.now() - completionStartTime;
        const usage = completion.usage;

        if (usage) {
          llmSpan.setAttribute('ai.usage.prompt_tokens', usage.prompt_tokens);
          llmSpan.setAttribute('ai.usage.completion_tokens', usage.completion_tokens);
          llmSpan.setAttribute('ai.usage.total_tokens', usage.total_tokens);
        }
        llmSpan.setAttribute('ai.response.model', completion.model || this.model);
        llmSpan.setAttribute('ai.response.latency_ms', latency);

        const content = completion.choices?.[0]?.message?.content || '{}';
        const parsed = JSON.parse(content);

        return {
          routeTitle: parsed.routeTitle || `${request.locationName} Autumn Run`,
          foliageSummary: parsed.foliageSummary || foliageReport.summary,
          turnByTurnInstructions: Array.isArray(parsed.turnByTurnInstructions)
            ? parsed.turnByTurnInstructions
            : ['Follow the loop path through the park and return to start.'],
        };
      }
    );
  }
}

/**
 * Singleton instance of the Mastra Route Agent
 */
export const foliageRouteAgent = new FoliageRouteAgent();
