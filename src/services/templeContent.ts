export interface TempleContent {
  _id?: string;
  templeKey: string;
  userEmail: string;
  userName: string;
  tab: 'info' | 'pooja' | 'media' | 'qa';
  content: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type NewTempleContent = Pick<TempleContent, 'templeKey' | 'tab' | 'content' | 'mediaUrl' | 'mediaType'>;

const API_BASE = 'http://localhost:3000/api/temple-content';

export const fetchTempleContent = async (templeKey: string): Promise<TempleContent[]> => {
  const res = await fetch(`${API_BASE}?templeKey=${encodeURIComponent(templeKey)}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to fetch temple content');
  return res.json();
};

export const createTempleContent = async (entry: NewTempleContent): Promise<TempleContent> => {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(entry),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Failed to create temple content');
  }
  return res.json();
};

export const updateTempleContent = async (id: string, updates: Partial<Pick<TempleContent, 'content' | 'mediaUrl' | 'mediaType'>>): Promise<TempleContent> => {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Failed to update temple content');
  }
  return res.json();
};

export const deleteTempleContent = async (id: string): Promise<boolean> => {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return res.ok;
};

/** Utility: generate a stable templeKey from placeId or name */
export const getTempleKey = (placeId?: string, name?: string): string => {
  if (placeId) return placeId;
  return (name || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};
