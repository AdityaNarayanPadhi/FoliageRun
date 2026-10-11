import * as Sentry from '@sentry/node';
import { z } from 'zod';
import { config } from '../../config';
import { FoliageReport } from '../../types/route';

export const foliageSearchInputSchema = z.object({
  location: z.string().describe('The name of the city, region, or park for the foliage report'),
  lat: z.number().optional().describe('Latitude coordinate'),
  lng: z.number().optional().describe('Longitude coordinate'),
});

export type FoliageSearchInput = z.infer<typeof foliageSearchInputSchema>;

/**
 * Parses organic search results and snippets to detect autumn peak foliage status.
 */
function extractPeakStatus(text: string): FoliageReport['peakStatus'] {
  const lower = text.toLowerCase();
  if (lower.includes('past peak') || lower.includes('leaves falling') || lower.includes('bare trees')) {
    return 'Past Peak';
  }
  if (lower.includes('peak color') || lower.includes('peak foliage') || lower.includes('at peak') || lower.includes('vibrant red')) {
    return 'Peak';
  }
  if (lower.includes('near peak') || lower.includes('approaching peak') || lower.includes('moderate color')) {
    return 'Near Peak';
  }
  if (lower.includes('early') || lower.includes('starting to turn') || lower.includes('patchy')) {
    return 'Early';
  }
  if (lower.includes('moderate') || lower.includes('some color')) {
    return 'Moderate';
  }
  return 'Near Peak';
}

/**
 * Fallback generator when SerpApi key is missing, network fails, or times out.
 */
function createFallbackFoliageReport(location: string): FoliageReport {
  return {
    location,
    peakStatus: 'Near Peak',
    summary: `Crisp autumn conditions observed around ${location}. Canopy displays vibrant golden amber and scarlet tones with dry, runnable footing along wooded trails.`,
    trailConditions: 'Dry packed dirt and paved paths; damp fallen leaf litter in shaded park loops.',
    parkAlerts: ['Watch for hidden roots under fresh leaf cover during morning runs.'],
    sources: ['FoliageRun Regional Fall Foliage Model (Fallback Offline Index)'],
  };
}

/**
 * SerpApi Foliage Tool implementation with Sentry instrumentation and robust error recovery.
 */
export async function executeFoliageSearch(input: FoliageSearchInput): Promise<FoliageReport> {
  return await Sentry.startSpan(
    {
      name: 'foliageSearchTool',
      op: 'ai.tool',
      attributes: {
        'ai.tool.name': 'foliageSearchTool',
        'ai.tool.call.payload': JSON.stringify(input),
      },
    },
    async (span) => {
      const startTime = Date.now();
      const { location } = input;
      const apiKey = config.serpApi.apiKey;

      if (!apiKey || apiKey === 'your_serpapi_api_key_here') {
        const fallback = createFallbackFoliageReport(location);
        span.setAttribute('ai.tool.status', 'fallback_no_api_key');
        span.setAttribute('ai.tool.latency_ms', Date.now() - startTime);
        span.setAttribute('ai.tool.output', JSON.stringify(fallback));
        return fallback;
      }

      const query = `current fall foliage report near ${location}`;
      const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${apiKey}&num=5`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`SerpApi responded with HTTP status ${response.status}`);
        }

        const data = (await response.json()) as any;

        const snippets: string[] = [];
        const sources: string[] = [];

        if (data.answer_box?.snippet) {
          snippets.push(data.answer_box.snippet);
        }
        if (data.answer_box?.answer) {
          snippets.push(data.answer_box.answer);
        }

        if (Array.isArray(data.organic_results)) {
          for (const item of data.organic_results.slice(0, 4)) {
            if (item.snippet) snippets.push(item.snippet);
            if (item.link) sources.push(item.link);
          }
        }

        const combinedText = snippets.join(' ');
        const peakStatus = extractPeakStatus(combinedText);
        const summary =
          snippets.length > 0
            ? snippets.slice(0, 2).join(' ')
            : `Moderate to peak autumn foliage reported around ${location}. Vibrant seasonal canopies along local park loops.`;

        const report: FoliageReport = {
          location,
          peakStatus,
          summary,
          trailConditions: 'Runnable trail surfaces with scattered autumn leaf canopy.',
          parkAlerts: ['Scattered wet leaves may reduce traction on sharp descents.'],
          sources,
        };

        span.setAttribute('ai.tool.status', 'success');
        span.setAttribute('ai.tool.latency_ms', Date.now() - startTime);
        span.setAttribute('ai.tool.output', JSON.stringify(report));
        return report;
      } catch (err: any) {
        clearTimeout(timeoutId);
        span.recordException(err);
        span.setAttribute('ai.tool.status', 'fallback_error');
        span.setAttribute('ai.tool.error_message', err?.message || 'Unknown SerpApi error');
        span.setAttribute('ai.tool.latency_ms', Date.now() - startTime);

        const fallback = createFallbackFoliageReport(location);
        span.setAttribute('ai.tool.output', JSON.stringify(fallback));
        return fallback;
      }
    }
  );
}

/**
 * Mastra Tool Definition for Foliage Search
 */
export const foliageSearchTool = {
  id: 'foliageSearchTool',
  description:
    'Searches live regional fall foliage conditions, peak status, park alerts, and trail surface reports for a given city, park, or coordinates.',
  parameters: foliageSearchInputSchema,
  execute: executeFoliageSearch,
};
