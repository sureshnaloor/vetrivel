export type VisitMediaSource = 'upload' | 'camera';

export interface VisitMedia {
  id: string;
  mediaUrl: string;
  mediaType: string;
  source: VisitMediaSource;
  createdAt?: string;
}

export interface PlaceVisit {
  _id?: string;
  placeDocId: string;
  userEmail?: string;
  visitDate: string; // YYYY-MM-DD
  remarks: string;
  media: VisitMedia[];
  createdAt?: string;
  updatedAt?: string;
}

export type NewPlaceVisit = {
  placeDocId: string;
  visitDate: string;
  remarks?: string;
  media?: Array<{
    mediaUrl: string;
    mediaType: string;
    source?: VisitMediaSource;
  }>;
};

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/place-visits`;

export const fetchPlaceVisits = async (placeDocId: string): Promise<PlaceVisit[]> => {
  const res = await fetch(`${API_BASE}?placeDocId=${encodeURIComponent(placeDocId)}`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Failed to fetch visits');
  }
  return res.json();
};

export const createPlaceVisit = async (visit: NewPlaceVisit): Promise<PlaceVisit> => {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(visit),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Failed to log visit');
  }
  return res.json();
};

export const updatePlaceVisit = async (
  id: string,
  updates: Partial<Pick<PlaceVisit, 'visitDate' | 'remarks'>>
): Promise<PlaceVisit> => {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Failed to update visit');
  }
  return res.json();
};

export const addVisitMedia = async (
  visitId: string,
  media: { mediaUrl: string; mediaType: string; source?: VisitMediaSource }
): Promise<PlaceVisit> => {
  const res = await fetch(`${API_BASE}/${visitId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(media),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Failed to upload media');
  }
  return res.json();
};

export const deleteVisitMedia = async (visitId: string, mediaId: string): Promise<PlaceVisit> => {
  const res = await fetch(`${API_BASE}/${visitId}/media/${mediaId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Failed to delete media');
  }
  return res.json();
};

export const deletePlaceVisit = async (id: string): Promise<boolean> => {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return res.ok;
};

export function todayDateInputValue(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatVisitDate(isoDate: string): string {
  if (!isoDate) return '';
  const d = new Date(isoDate.includes('T') ? isoDate : `${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
