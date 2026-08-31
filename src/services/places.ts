export interface UserPlace {
  _id?: string;
  placeId?: string;
  locationId?: string; // Links this place to a specific Saved Map
  name: string;
  coordinates: { lat: number, lng: number };
  category: 'nest' | 'interest' | 'pin';
  status: 'planned' | 'visited' | 'recommended' | 'wishlist' | 'place of interest';
  /** YYYY-MM-DD of most recent logged visit, if any */
  lastVisitDate?: string | null;
  /** True when at least one saved visit includes remarks or media */
  hasVisitDetails?: boolean;
  /** Count of saved visit log entries */
  visitLogCount?: number;
  address?: string;
}

// const API_BASE = 'http://localhost:3000/api/places';
const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/places`;
export const fetchPlaces = async (locationId?: string, all: boolean = false): Promise<UserPlace[]> => {
  let url = API_BASE;
  if (all) {
    url += '?all=true';
  } else if (locationId) {
    url += `?locationId=${locationId}`;
  }
  const res = await fetch(url, {credentials: 'include'});
  if (!res.ok) throw new Error('Failed to fetch user places');
  return res.json();
};

export const savePlace = async (place: UserPlace): Promise<UserPlace> => {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(place),
  });
  if (!res.ok) throw new Error('Failed to save place');
  return res.json();
};

export const addPlace = async (place: Partial<UserPlace>): Promise<UserPlace> => {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(place),
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to add place');
  return res.json();
};

export const resolveMapLink = async (url: string): Promise<{ placeId: string, name: string, coordinates: {lat: number, lng: number}, address: string }> => {
  const res = await fetch(`${API_BASE}/resolve-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to resolve map link');
  return res.json();
};

export const updatePlace = async (id: string, updates: Partial<UserPlace>): Promise<UserPlace> => {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update place');
  return res.json();
};

export const deletePlace = async (id: string): Promise<boolean> => {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return res.ok;
};

export type NearbyTemple = {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  vicinity?: string;
  rating?: number;
  userRatingsTotal?: number;
  distanceMeters?: number;
};

export type NearbyTemplesResponse = {
  results: NearbyTemple[];
  radiusMeters: number;
  center: { lat: number; lng: number };
};

async function parseNearbyResponse(
  res: Response,
  fallbackCenter: { lat: number; lng: number },
  fallbackRadiusMeters: number
): Promise<NearbyTemplesResponse> {
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || 'Nearby search failed');
  }
  const payload = (await res.json()) as Partial<NearbyTemplesResponse>;
  return {
    results: Array.isArray(payload.results) ? payload.results : [],
    radiusMeters: payload.radiusMeters ?? fallbackRadiusMeters,
    center: payload.center ?? fallbackCenter,
  };
}

/** Hindu temples near a point (default ~50 km radius). */
export async function searchNearbyTemples(params: {
  lat: number;
  lng: number;
  radiusMeters?: number;
  keyword?: string;
}): Promise<NearbyTemplesResponse> {
  const radius = params.radiusMeters ?? 50_000;
  const qs = new URLSearchParams({
    lat: String(params.lat),
    lng: String(params.lng),
    radius: String(radius),
  });
  if (params.keyword) qs.set('keyword', params.keyword);
  const res = await fetch(`${API_BASE}/nearby?${qs.toString()}`, {
    credentials: 'include',
  });
  return parseNearbyResponse(res, { lat: params.lat, lng: params.lng }, radius);
}

/** Temples within 1 km of the user's coordinates. */
export async function searchTemplesWithin1Km(
  lat: number,
  lng: number,
  keyword?: string
): Promise<NearbyTemplesResponse> {
  const qs = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  if (keyword) qs.set('keyword', keyword);
  const res = await fetch(`${API_BASE}/nearby/1km?${qs.toString()}`, {
    credentials: 'include',
  });
  return parseNearbyResponse(res, { lat, lng }, 1_000);
}

/** Temples within 5 km of the user's coordinates. */
export async function searchTemplesWithin5Km(
  lat: number,
  lng: number,
  keyword?: string
): Promise<NearbyTemplesResponse> {
  const qs = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  if (keyword) qs.set('keyword', keyword);
  const res = await fetch(`${API_BASE}/nearby/5km?${qs.toString()}`, {
    credentials: 'include',
  });
  return parseNearbyResponse(res, { lat, lng }, 5_000);
}

// ----------------------------------------
// Custom Community Temples
// ----------------------------------------

export interface CustomTemple {
  _id?: string;
  name: string;
  coordinates: { lat: number, lng: number };
  description?: string;
  creatorEmail?: string;
  creatorName?: string;
  createdByIp?: string;
  createdAt?: string;
}

export const fetchCustomTemples = async (): Promise<CustomTemple[]> => {
  // const res = await fetch('http://localhost:3000/api/custom-temples', {credentials: 'include'});
  const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/custom-temples`, {credentials: 'include'});
  if (!res.ok) throw new Error('Failed to fetch custom temples');
  return res.json();
};

export const createCustomTemple = async (temple: CustomTemple): Promise<CustomTemple> => {
  // const res = await fetch('http://localhost:3000/api/custom-temples', {
  const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/custom-temples`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(temple),
  });
  if (!res.ok) throw new Error('Failed to save custom temple');
  return res.json();
};
