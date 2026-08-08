const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api`;

export interface TempleListItem {
  placeId: string;
  name: string;
  coordinates: { lat: number; lng: number };
  address: string;
}

export interface DivyaDesamList {
  _id: string;
  name: string;
  description: string;
  creatorEmail: string;
  isGlobalTemplate: boolean;
  isPublished: boolean;
  parentListId: string | null;
  iconSvg?: string;
  temples: TempleListItem[];
  createdAt: string;
  updatedAt: string;
}

export const fetchLists = async (): Promise<DivyaDesamList[]> => {
  const res = await fetch(`${API_BASE}/divyadesam`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch lists');
  return res.json();
};

export const fetchListDetails = async (id: string): Promise<DivyaDesamList> => {
  const res = await fetch(`${API_BASE}/divyadesam/${id}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch list details');
  return res.json();
};

export const createList = async (data: Partial<DivyaDesamList>): Promise<DivyaDesamList> => {
  const res = await fetch(`${API_BASE}/divyadesam`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || 'Failed to create list');
  }
  return res.json();
};

export const cloneList = async (id: string): Promise<DivyaDesamList> => {
  const res = await fetch(`${API_BASE}/divyadesam/${id}/clone`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || 'Failed to clone list');
  }
  return res.json();
};

export const updateList = async (id: string, data: Partial<DivyaDesamList>): Promise<DivyaDesamList> => {
  const res = await fetch(`${API_BASE}/divyadesam/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || 'Failed to update list');
  }
  return res.json();
};

export const deleteList = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/divyadesam/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || 'Failed to delete list');
  }
};
