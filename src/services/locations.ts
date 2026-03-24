export interface UserLocation {
  _id?: string;
  userEmail: string;
  name: string;
  coordinates: { lat: number, lng: number };
  address: string;
  createdAt?: string;
}

const API_BASE = 'http://localhost:3000/api/locations';

export const fetchLocations = async (): Promise<UserLocation[]> => {
  const res = await fetch(API_BASE, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch user locations');
  return res.json();
};

export const saveLocation = async (location: Omit<UserLocation, '_id' | 'userEmail' | 'createdAt'>): Promise<UserLocation> => {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(location),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(errorBody?.error || 'Failed to save location');
  }
  return res.json();
};

export const deleteLocation = async (id: string): Promise<boolean> => {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return res.ok;
};
