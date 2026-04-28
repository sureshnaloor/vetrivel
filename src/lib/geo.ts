import type { UserLocation } from '../services/locations';

export type LatLng = { lat: number; lng: number };

const toRadians = (value: number) => (value * Math.PI) / 180;

/** Parse { lat, lng } from API / Mongo (may be strings or GeoJSON-style) */
export function normalizeLatLng(input: unknown): LatLng | null {
  if (!input || typeof input !== 'object') return null;
  const o = input as Record<string, unknown>;
  const latRaw = o.lat ?? o.latitude;
  const lngRaw = o.lng ?? o.longitude ?? o.lon;
  const lat = typeof latRaw === 'number' ? latRaw : Number(latRaw);
  const lng = typeof lngRaw === 'number' ? lngRaw : Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/** Stable string id from Mongo `_id` (string, ObjectId, or { $oid }) */
export function normalizeDocumentId(raw: unknown): string | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && raw !== null && '$oid' in raw) {
    const oid = (raw as { $oid: unknown }).$oid;
    return oid != null ? String(oid) : null;
  }
  return String(raw);
}

/** Haversine distance in kilometers */
export function getDistanceKm(a: LatLng, b: LatLng): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return earthRadiusKm * c;
}

/** Same default as dashboard / explore space matching (km) */
export function getSpaceMatchDistanceKm(): number {
  const rawValue = import.meta.env.VITE_SPACE_MATCH_DISTANCE_KM;
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
}

/** Nearest sacred space whose center lies within `radiusKm` of `point`, or null */
export function findSpaceContainingPoint(
  point: LatLng | unknown,
  locations: UserLocation[],
  radiusKm: number
): UserLocation | null {
  const p = normalizeLatLng(point);
  if (!p) return null;

  let best: UserLocation | null = null;
  let bestD = Infinity;
  for (const loc of locations) {
    const id = normalizeDocumentId(loc._id as unknown);
    if (!id) continue;
    const lc = normalizeLatLng(loc.coordinates as unknown);
    if (!lc) continue;
    const d = getDistanceKm(p, lc);
    if (Number.isFinite(d) && d <= radiusKm && d < bestD) {
      best = loc;
      bestD = d;
    }
  }
  return best;
}
