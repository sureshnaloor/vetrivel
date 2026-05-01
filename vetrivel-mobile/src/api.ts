import axios from "axios";
import type { MobileAuthSession } from "./auth";
import { normalizeLatLng, type LatLng } from "./lib/geo";
import { normalizeDocumentId } from "./lib/id";

declare const process: {
  env: Record<string, string | undefined>;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

function authHeaders(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}

export type UserLocation = {
  _id: string;
  name: string;
  coordinates: LatLng;
  address?: string;
};

export type UserPlaceCategory = "nest" | "interest" | "pin";

export type UserPlace = {
  _id: string;
  placeId?: string | null;
  locationId?: string | null;
  name: string;
  coordinates: LatLng;
  category: UserPlaceCategory;
  status: string;
};

export async function exchangeGoogleIdToken(
  idToken: string
): Promise<MobileAuthSession> {
  const { data } = await api.post("/api/mobile/auth/google", { idToken });
  return data as MobileAuthSession;
}

function mapLocationRow(row: Record<string, unknown>): UserLocation | null {
  const id = normalizeDocumentId(row._id);
  if (!id) return null;
  const coords = normalizeLatLng(row.coordinates);
  if (!coords) return null;
  return {
    _id: id,
    name: String(row.name ?? ""),
    coordinates: coords,
    address: row.address != null ? String(row.address) : undefined,
  };
}

/** Saved spaces (maps / nests) for the signed-in user. */
export async function getLocations(accessToken: string): Promise<UserLocation[]> {
  const { data } = await api.get("/api/locations", {
    headers: authHeaders(accessToken),
  });
  const rows = data as Record<string, unknown>[];
  const out: UserLocation[] = [];
  for (const row of rows) {
    const loc = mapLocationRow(row);
    if (loc) out.push(loc);
  }
  return out;
}

function mapPlaceRow(row: Record<string, unknown>): UserPlace | null {
  const id = normalizeDocumentId(row._id);
  if (!id) return null;
  const coords = normalizeLatLng(row.coordinates);
  if (!coords) return null;
  const cat = row.category;
  const category: UserPlaceCategory =
    cat === "nest" || cat === "interest" || cat === "pin" ? cat : "interest";
  return {
    _id: id,
    placeId: row.placeId != null ? String(row.placeId) : null,
    locationId:
      row.locationId != null && row.locationId !== ""
        ? String(row.locationId)
        : null,
    name: String(row.name ?? ""),
    coordinates: coords,
    category,
    status: String(row.status ?? ""),
  };
}

/**
 * Places tied to a saved space (`locationId` matches a `user_locations` document).
 * Matches web `fetchPlaces(activeLocationId)`.
 */
export async function getPlacesForLocation(
  accessToken: string,
  locationId: string
): Promise<UserPlace[]> {
  const { data } = await api.get("/api/places", {
    params: { locationId },
    headers: authHeaders(accessToken),
  });
  const rows = data as Record<string, unknown>[];
  const out: UserPlace[] = [];
  for (const row of rows) {
    const p = mapPlaceRow(row);
    if (p) out.push(p);
  }
  return out;
}

/**
 * Places with no `locationId` (orphan / global rows). Same as web `GET /api/places` with no query.
 */
export async function getUnscopedPlaces(accessToken: string): Promise<UserPlace[]> {
  const { data } = await api.get("/api/places", {
    headers: authHeaders(accessToken),
  });
  const rows = data as Record<string, unknown>[];
  const out: UserPlace[] = [];
  for (const row of rows) {
    const p = mapPlaceRow(row);
    if (p) out.push(p);
  }
  return out;
}

export type NearbyTemple = {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  vicinity?: string;
  rating?: number;
  userRatingsTotal?: number;
};

/** Google Places nearby hindu_temple (server proxy). Matches web dashboard search. */
export async function searchNearbyTemples(
  accessToken: string,
  params: { lat: number; lng: number; radiusMeters?: number; keyword?: string }
): Promise<NearbyTemple[]> {
  const { data } = await api.get("/api/places/nearby", {
    headers: authHeaders(accessToken),
    params: {
      lat: params.lat,
      lng: params.lng,
      radius: params.radiusMeters ?? 50_000,
      ...(params.keyword ? { keyword: params.keyword } : {}),
    },
  });
  const results = (data as { results?: NearbyTemple[] }).results;
  return Array.isArray(results) ? results : [];
}

export type CreatePlaceInput = {
  name: string;
  coordinates: LatLng;
  category: "nest" | "interest";
  status: string;
  placeId?: string | null;
  locationId: string;
};

export async function createPlace(
  accessToken: string,
  input: CreatePlaceInput
): Promise<UserPlace> {
  const { data } = await api.post("/api/places", input, {
    headers: authHeaders(accessToken),
  });
  const row = data as Record<string, unknown>;
  const p = mapPlaceRow(row);
  if (!p) {
    throw new Error("Invalid place response from server");
  }
  return p;
}
