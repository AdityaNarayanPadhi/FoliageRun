import { z } from 'zod';

export const routeGenerateRequestSchema = z.object({
  startLat: z.number().min(-90).max(90),
  startLng: z.number().min(-180).max(180),
  targetDistanceKm: z.number().positive().max(100),
  locationName: z.string().min(1).max(200),
});

export type RouteGenerateRequest = z.infer<typeof routeGenerateRequestSchema>;

export interface Waypoint {
  lat: number;
  lng: number;
  name: string;
  ele?: number;
}

export interface RouteGenerateResponse {
  success: boolean;
  routeTitle: string;
  distanceKm: number;
  foliageSummary: string;
  waypoints: Waypoint[];
  turnByTurnInstructions: string[];
  gpxData: string;
}

export interface FoliageReport {
  location: string;
  peakStatus: 'Past Peak' | 'Peak' | 'Near Peak' | 'Moderate' | 'Early' | 'Unknown';
  summary: string;
  trailConditions?: string;
  parkAlerts?: string[];
  sources?: string[];
}

export interface OsmFeature {
  id: number;
  type: 'node' | 'way' | 'relation';
  name?: string;
  lat?: number;
  lng?: number;
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
}

export interface OsmRouteResult {
  parks: OsmFeature[];
  trails: OsmFeature[];
  nodes: Array<{ lat: number; lng: number; name?: string }>;
}
