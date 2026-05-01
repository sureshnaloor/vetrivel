export type LatLng = { lat: number; lng: number };

/** Parse { lat, lng } from API / Mongo (may be strings or alternate keys). */
export function normalizeLatLng(input: unknown): LatLng | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Record<string, unknown>;
  const latRaw = o.lat ?? o.latitude;
  const lngRaw = o.lng ?? o.longitude ?? o.lon;
  const lat = typeof latRaw === "number" ? latRaw : Number(latRaw);
  const lng = typeof lngRaw === "number" ? lngRaw : Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}
