import type { MetricStatus } from '@/types';

// ──── Haversine distance (km) ────

const R = 6371; // Earth radius km

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineKm(
  a: [number, number],
  b: [number, number],
): number {
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ──── Polyline interpolation ────

/** Segment lengths cache */
const segmentCache = new WeakMap<readonly [number, number][], number[]>();

function getSegmentLengths(
  waypoints: readonly [number, number][],
): number[] {
  const cached = segmentCache.get(waypoints);
  if (cached) return cached;

  const lengths: number[] = [];
  for (let i = 1; i < waypoints.length; i++) {
    lengths.push(haversineKm(waypoints[i - 1], waypoints[i]));
  }
  segmentCache.set(waypoints, lengths);
  return lengths;
}

/**
 * Interpolate a position along a polyline.
 * @param waypoints Array of [lat,lng] points
 * @param progress 0.0 → start, 1.0 → end
 * @returns [lat, lng, headingDeg]
 */
export function interpolateOnPolyline(
  waypoints: readonly [number, number][],
  progress: number,
): [number, number, number] {
  if (waypoints.length === 0) return [0, 0, 0];
  if (waypoints.length === 1) return [waypoints[0][0], waypoints[0][1], 0];

  const t = Math.max(0, Math.min(1, progress));
  const lengths = getSegmentLengths(waypoints);
  const totalLength = lengths.reduce((a, b) => a + b, 0);
  const targetDist = t * totalLength;

  let accumulated = 0;
  for (let i = 0; i < lengths.length; i++) {
    const segLen = lengths[i];
    if (accumulated + segLen >= targetDist || i === lengths.length - 1) {
      const segProgress =
        segLen > 0 ? (targetDist - accumulated) / segLen : 0;
      const from = waypoints[i];
      const to = waypoints[i + 1];

      const lat = from[0] + (to[0] - from[0]) * segProgress;
      const lng = from[1] + (to[1] - from[1]) * segProgress;
      const heading = bearing(from, to);

      return [lat, lng, heading];
    }
    accumulated += segLen;
  }

  const last = waypoints[waypoints.length - 1];
  return [last[0], last[1], 0];
}

/** Compute bearing (degrees) from point A to B */
function bearing(a: [number, number], b: [number, number]): number {
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// ──── Health status helpers ────

export function getHealthStatus(index: number): MetricStatus {
  if (index >= 85) return 'normal';
  if (index >= 60) return 'warning';
  return 'critical';
}

export function getHealthColor(status: MetricStatus): string {
  switch (status) {
    case 'normal':
      return '#22c55e';
    case 'warning':
      return '#eab308';
    case 'critical':
      return '#ef4444';
  }
}

export function getHealthBgClass(status: MetricStatus): string {
  switch (status) {
    case 'normal':
      return 'bg-green-500';
    case 'warning':
      return 'bg-yellow-500';
    case 'critical':
      return 'bg-red-500';
  }
}

// ──── Marker animation helper ────

export function animateMarkerTo(
  marker: L.Marker,
  target: [number, number],
  duration: number,
): void {
  const from = marker.getLatLng();
  const start = performance.now();

  function step(now: number) {
    const t = Math.min((now - start) / duration, 1);
    // ease-out quad
    const e = t * (2 - t);
    const lat = from.lat + (target[0] - from.lat) * e;
    const lng = from.lng + (target[1] - from.lng) * e;
    marker.setLatLng([lat, lng]);
    if (t < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}
