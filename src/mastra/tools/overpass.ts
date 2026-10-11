import * as Sentry from '@sentry/node';
import { z } from 'zod';
import { config } from '../../config';
import { OsmFeature, OsmRouteResult } from '../../types/route';
import { computeDestinationPoint } from '../../utils/geo';

export const osmParkRouteInputSchema = z.object({
  centerLat: z.number().describe('Center latitude for searching parks and pedestrian trails'),
  centerLng: z.number().describe('Center longitude for searching parks and pedestrian trails'),
  radiusMeters: z
    .number()
    .min(500)
    .max(25000)
    .default(3000)
    .describe('Search radius in meters from the center point'),
});

export type OsmParkRouteInput = z.infer<typeof osmParkRouteInputSchema>;

/**
 * Generates fallback waypoints if Overpass API is slow, throttled, or unreachable.
 */
function createFallbackOsmResult(
  centerLat: number,
  centerLng: number,
  radiusMeters: number
): OsmRouteResult {
  const radiusKm = radiusMeters / 1000;
  const cardinalBearings = [0, 45, 90, 135, 180, 225, 270, 315];
  const sampleParkNames = [
    'Maple Grove Park',
    'Whispering Pine Greenway',
    'Autumn Ridge Nature Trail',
    'Golden Oak Meadow',
    'Foliage Creek Path',
    'Harvest Hill Park',
  ];

  const nodes: Array<{ lat: number; lng: number; name?: string }> = [];

  cardinalBearings.forEach((bearing, idx) => {
    const fraction = 0.4 + (idx % 3) * 0.25;
    const pt = computeDestinationPoint(
      centerLat,
      centerLng,
      radiusKm * fraction,
      bearing
    );
    nodes.push({
      lat: pt.lat,
      lng: pt.lng,
      name: sampleParkNames[idx % sampleParkNames.length],
    });
  });

  return {
    parks: [
      {
        id: 101,
        type: 'way',
        name: 'Community Autumn Greenbelt',
        lat: centerLat,
        lng: centerLng,
        tags: { leisure: 'park', name: 'Community Autumn Greenbelt' },
      },
    ],
    trails: [
      {
        id: 201,
        type: 'way',
        name: 'Woodland Footpath Loop',
        tags: { highway: 'path', surface: 'ground' },
      },
    ],
    nodes,
  };
}

/**
 * Builds Overpass QL query string for parks, forests, and pedestrian paths.
 */
function buildOverpassQuery(lat: number, lng: number, radiusMeters: number): string {
  return `
    [out:json][timeout:12];
    (
      way["leisure"="park"](around:${radiusMeters},${lat},${lng});
      way["landuse"="forest"](around:${radiusMeters},${lat},${lng});
      way["highway"~"footway|cycleway|path"](around:${radiusMeters},${lat},${lng});
    );
    out tags center 40;
  `.trim();
}

/**
 * Executes OpenStreetMap Overpass query with Sentry tracing and automatic fallback.
 */
export async function executeOsmParkRoute(input: OsmParkRouteInput): Promise<OsmRouteResult> {
  return await Sentry.startSpan(
    {
      name: 'osmParkRouteTool',
      op: 'ai.tool',
      attributes: {
        'ai.tool.name': 'osmParkRouteTool',
        'ai.tool.call.payload': JSON.stringify(input),
      },
    },
    async (span) => {
      const startTime = Date.now();
      const { centerLat, centerLng, radiusMeters } = input;
      const overpassUrl = config.overpass.apiUrl;
      const timeoutMs = config.overpass.timeoutMs || 12000;

      const qlQuery = buildOverpassQuery(centerLat, centerLng, radiusMeters);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(overpassUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'FoliageRun/1.0 (Hacktoberfest 2026 Touch Grass backend)',
          },
          body: `data=${encodeURIComponent(qlQuery)}`,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Overpass API responded with HTTP status ${response.status}`);
        }

        const data = (await response.json()) as any;
        const elements: any[] = data.elements || [];

        const parks: OsmFeature[] = [];
        const trails: OsmFeature[] = [];
        const nodes: Array<{ lat: number; lng: number; name?: string }> = [];

        for (const el of elements) {
          const lat = el.center?.lat || el.lat;
          const lng = el.center?.lon || el.lon;
          const tags = el.tags || {};
          const name = tags.name;

          if (tags.leisure === 'park' || tags.landuse === 'forest') {
            parks.push({
              id: el.id,
              type: el.type,
              name,
              lat,
              lng,
              tags,
            });
          }

          if (['footway', 'cycleway', 'path'].includes(tags.highway)) {
            trails.push({
              id: el.id,
              type: el.type,
              name,
              lat,
              lng,
              tags,
            });
          }

          if (lat && lng) {
            nodes.push({ lat, lng, name });
          }
        }

        // If Overpass returned zero usable nodes in the radius, use fallback
        if (nodes.length < 3) {
          span.setAttribute('ai.tool.status', 'sparse_result_fallback');
          span.setAttribute('ai.tool.latency_ms', Date.now() - startTime);
          return createFallbackOsmResult(centerLat, centerLng, radiusMeters);
        }

        const result: OsmRouteResult = {
          parks,
          trails,
          nodes: nodes.slice(0, 30),
        };

        span.setAttribute('ai.tool.status', 'success');
        span.setAttribute('ai.tool.latency_ms', Date.now() - startTime);
        span.setAttribute('ai.tool.parks_found', parks.length);
        span.setAttribute('ai.tool.trails_found', trails.length);
        span.setAttribute('ai.tool.nodes_extracted', nodes.length);

        return result;
      } catch (err: any) {
        clearTimeout(timeoutId);
        span.recordException(err);
        span.setAttribute('ai.tool.status', 'fallback_error');
        span.setAttribute('ai.tool.error_message', err?.message || 'Overpass timeout/error');
        span.setAttribute('ai.tool.latency_ms', Date.now() - startTime);

        return createFallbackOsmResult(centerLat, centerLng, radiusMeters);
      }
    }
  );
}

/**
 * Mastra Tool Definition for OSM Park Route Discovery
 */
export const osmParkRouteTool = {
  id: 'osmParkRouteTool',
  description:
    'Queries OpenStreetMap Overpass API for nearby parks, forests, footways, cycleways, and pedestrian loops within a given radius.',
  parameters: osmParkRouteInputSchema,
  execute: executeOsmParkRoute,
};
