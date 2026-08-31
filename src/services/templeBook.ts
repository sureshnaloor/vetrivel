const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/temple-book`;
const USERS_API = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users`;

export type TempleMediaItem = { url: string; caption?: string; title?: string };

export type TempleBankDetails = {
  accountName?: string;
  accountNumber?: string;
  ifsc?: string;
  bankName?: string;
  branch?: string;
};

export type TemplePaymentInfo = {
  upiId?: string;
  upiQrImageUrl?: string;
  bankDetails?: TempleBankDetails;
};

export type TemplePage = {
  _id?: string;
  placeId: string;
  name: string;
  address?: string;
  coordinates?: { lat: number; lng: number } | null;
  descriptionHtml?: string;
  images?: TempleMediaItem[];
  videos?: TempleMediaItem[];
  audio?: TempleMediaItem[];
  payment?: TemplePaymentInfo;
  isPublished?: boolean;
  updatedByEmail?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type TempleOffering = {
  _id: string;
  placeId: string;
  type: 'puja' | 'donation' | 'prasad' | 'other';
  title: string;
  description?: string;
  price?: number | null;
  currency?: string;
  requiresBooking?: boolean;
  slots?: string[];
  isActive?: boolean;
};

export type TempleBooking = {
  _id: string;
  placeId: string;
  offeringId: string;
  offeringTitle: string;
  offeringType: string;
  userEmail: string;
  userName: string;
  donorName?: string;
  donorPhone?: string;
  preferredDate?: string | null;
  preferredSlot?: string | null;
  notes?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt?: string;
};

export type AdministeredTemple = {
  placeId: string;
  templeName: string;
  templeAddress: string;
  page: TemplePage | null;
};

export type UserProfile = {
  email: string;
  name: string | null;
  roles: string[];
  isTempleAdmin: boolean;
  isPlatformAdmin: boolean;
  administeredTemples: Array<{ placeId: string; templeName: string; templeAddress: string }>;
};

export async function fetchUserProfile(): Promise<UserProfile> {
  const res = await fetch(`${USERS_API}/me`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to load profile');
  return res.json();
}

export async function fetchPublishedTemplePages(): Promise<TemplePage[]> {
  const res = await fetch(`${API_BASE}/pages`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to load temple pages');
  return res.json();
}

export async function fetchTempleBookPage(placeId: string): Promise<{
  page: TemplePage;
  offerings: TempleOffering[];
  isAdmin: boolean;
}> {
  const res = await fetch(`${API_BASE}/pages/${encodeURIComponent(placeId)}`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Temple page not found');
  }
  return res.json();
}

export async function fetchMyAdminTemples(): Promise<AdministeredTemple[]> {
  const res = await fetch(`${API_BASE}/my-temples`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to load your temples');
  return res.json();
}

export async function upsertTemplePage(placeId: string, data: Partial<TemplePage>): Promise<TemplePage> {
  const res = await fetch(`${API_BASE}/pages/${encodeURIComponent(placeId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Failed to save temple page');
  }
  return res.json();
}

export async function createOffering(
  placeId: string,
  data: Partial<TempleOffering>
): Promise<TempleOffering> {
  const res = await fetch(`${API_BASE}/pages/${encodeURIComponent(placeId)}/offerings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Failed to create offering');
  }
  return res.json();
}

export async function updateOffering(
  id: string,
  data: Partial<TempleOffering>
): Promise<TempleOffering> {
  const res = await fetch(`${API_BASE}/offerings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Failed to update offering');
  }
  return res.json();
}

export async function deleteOffering(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/offerings/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to delete offering');
}

export async function createBooking(data: {
  placeId: string;
  offeringId: string;
  preferredDate?: string;
  preferredSlot?: string;
  notes?: string;
  donorName?: string;
  donorPhone?: string;
}): Promise<TempleBooking> {
  const res = await fetch(`${API_BASE}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Failed to submit booking');
  }
  return res.json();
}

export async function fetchTempleBookings(placeId: string): Promise<TempleBooking[]> {
  const res = await fetch(`${API_BASE}/pages/${encodeURIComponent(placeId)}/bookings`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to load bookings');
  return res.json();
}

export async function updateBookingStatus(
  id: string,
  status: TempleBooking['status']
): Promise<TempleBooking> {
  const res = await fetch(`${API_BASE}/bookings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Failed to update booking');
  return res.json();
}

export async function claimTemple(data: {
  placeId: string;
  templeName: string;
  templeAddress?: string;
  coordinates?: { lat: number; lng: number };
}): Promise<void> {
  const res = await fetch(`${API_BASE}/claim-temple`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Failed to claim temple');
  }
}

export async function assignTempleAdmin(data: {
  userEmail: string;
  placeId: string;
  templeName: string;
  templeAddress?: string;
}): Promise<void> {
  const res = await fetch(`${API_BASE}/admins`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Failed to assign admin');
  }
}

export async function searchGoogleTemples(
  q: string,
  lat?: number,
  lng?: number
): Promise<Array<{ placeId: string; name: string; address: string; coordinates: { lat: number; lng: number } }>> {
  const qs = new URLSearchParams({ q });
  if (lat != null && lng != null) {
    qs.set('lat', String(lat));
    qs.set('lng', String(lng));
  }
  const base = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/places`;
  const res = await fetch(`${base}/search?${qs.toString()}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Search failed');
  const data = await res.json();
  const rows = Array.isArray(data.results) ? data.results : [];
  return rows.map((r: { placeId: string; name: string; address: string; lat: number; lng: number }) => ({
    placeId: r.placeId,
    name: r.name,
    address: r.address,
    coordinates: { lat: r.lat, lng: r.lng },
  }));
}
