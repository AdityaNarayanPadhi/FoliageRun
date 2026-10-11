import { Waypoint } from '../types/route';

const EARTH_RADIUS_KM = 6371;

/**
 * Calculates haversine distance between two coordinates in kilometers.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) *
      Math.cos(degreesToRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Converts degrees to radians.
 */
export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Converts radians to degrees.
 */
export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Calculates total route distance along an array of waypoints in km.
 */
export function calculateTotalDistanceKm(waypoints: Waypoint[]): number {
  if (waypoints.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    total += calculateHaversineDistance(
      waypoints[i].lat,
      waypoints[i].lng,
      waypoints[i + 1].lat,
      waypoints[i + 1].lng
    );
  }
  return Math.round(total * 100) / 100;
}

/**
 * Generates a destination coordinate given start coordinate, bearing, and distance in km.
 */
export function computeDestinationPoint(
  lat: number,
  lng: number,
  distanceKm: number,
  bearingDegrees: number
): { lat: number; lng: number } {
  const δ = distanceKm / EARTH_RADIUS_KM;
  const θ = degreesToRadians(bearingDegrees);
  const φ1 = degreesToRadians(lat);
  const λ1 = degreesToRadians(lng);

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  );
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
    );

  return {
    lat: Number(radiansToDegrees(φ2).toFixed(6)),
    lng: Number(radiansToDegrees(λ2).toFixed(6)),
  };
}

/**
 * Generates an autumn loop route around a start location matching target distance.
 * Connects provided trail/park points or synthesizes an organic loop path.
 */
export function synthesizeLoopRoute(
  startLat: number,
  startLng: number,
  targetDistanceKm: number,
  locationName: string,
  guideWaypoints: Array<{ lat: number; lng: number; name?: string }> = []
): Waypoint[] {
  const result: Waypoint[] = [];
  const baseElevation = 45;

  // Add starting point
  result.push({
    lat: startLat,
    lng: startLng,
    name: `${locationName} - Route Start`,
    ele: baseElevation,
  });

  // Calculate approximate loop radius based on circumference C = 2 * PI * r
  // For target distance D, radius r ≈ D / (2 * PI) * 1.1 (for slight trail curvature)
  const loopRadiusKm = (targetDistanceKm / (2 * Math.PI)) * 0.95;
  const numSteps = Math.max(8, Math.min(24, Math.round(targetDistanceKm * 2.5)));

  // If we have extracted OSM points, incorporate the best matches as anchor waypoints
  const hasOsmAnchors = guideWaypoints.length >= 3;

  for (let i = 1; i < numSteps; i++) {
    const fraction = i / numSteps;
    const angleDeg = fraction * 360;

    // Introduce natural curve perturbation (autumn park winding feel)
    const wobble = Math.sin(fraction * Math.PI * 4) * 0.15;
    const stepDist = loopRadiusKm * (1 + wobble);

    const projected = computeDestinationPoint(
      startLat,
      startLng,
      stepDist,
      angleDeg
    );

    let finalLat = projected.lat;
    let finalLng = projected.lng;
    let pointName = `Autumn Foliage Trail - KM ${(fraction * targetDistanceKm).toFixed(1)}`;

    if (hasOsmAnchors) {
      // Find nearest OSM waypoint in similar direction
      const closestOsm = guideWaypoints.find(
        (p) =>
          calculateHaversineDistance(projected.lat, projected.lng, p.lat, p.lng) <
          loopRadiusKm * 0.6
      );
      if (closestOsm) {
        finalLat = Number(closestOsm.lat.toFixed(6));
        finalLng = Number(closestOsm.lng.toFixed(6));
        if (closestOsm.name) {
          pointName = `${closestOsm.name} Path`;
        }
      }
    }

    const eleVariation = Math.round(Math.sin(fraction * Math.PI * 2) * 25);

    result.push({
      lat: finalLat,
      lng: finalLng,
      name: pointName,
      ele: baseElevation + eleVariation,
    });
  }

  // Complete the loop back to the start coordinate
  result.push({
    lat: startLat,
    lng: startLng,
    name: `${locationName} - Route Finish`,
    ele: baseElevation,
  });

  return result;
}
