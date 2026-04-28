export interface UserPlace {
  _id?: string;
  placeId?: string;
  locationId?: string; // Links this place to a specific Saved Map
  name: string;
  coordinates: { lat: number, lng: number };
  category: 'nest' | 'interest' | 'pin';
  status: 'planned' | 'visited' | 'recommended' | 'wishlist' | 'place of interest';
  createdAt?: Date;
}

const API_BASE = 'http://localhost:3000/api/places';

export const fetchPlaces = async (locationId?: string): Promise<UserPlace[]> => {
  const url = locationId ? `${API_BASE}?locationId=${locationId}` : API_BASE;
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
  const res = await fetch('http://localhost:3000/api/custom-temples', {credentials: 'include'});
  if (!res.ok) throw new Error('Failed to fetch custom temples');
  return res.json();
};

export const createCustomTemple = async (temple: CustomTemple): Promise<CustomTemple> => {
  const res = await fetch('http://localhost:3000/api/custom-temples', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(temple),
  });
  if (!res.ok) throw new Error('Failed to save custom temple');
  return res.json();
};
