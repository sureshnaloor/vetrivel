export interface Friend {
  _id: string;
  email: string;
  name: string;
  since: string;
}

export interface FriendNest {
  _id: string;
  name: string;
  coordinates: { lat: number; lng: number };
  address: string;
  ownerEmail: string;
  ownerName: string;
  distanceKm: number | null;
  followStatus: 'auto' | 'manual' | 'available';
  canOpen: boolean;
}

export interface FriendRequest {
  _id: string;
  fromEmail: string;
  fromName: string;
  toEmail: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/friends`;

// ─── Friends List ────────────────────────────────────────────────────────────

export const fetchFriends = async (): Promise<Friend[]> => {
  const res = await fetch(API_BASE, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch friends');
  return res.json();
};

// ─── Requests ────────────────────────────────────────────────────────────────

export const fetchIncomingRequests = async (): Promise<FriendRequest[]> => {
  const res = await fetch(`${API_BASE}/requests`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch incoming requests');
  return res.json();
};

export const fetchSentRequests = async (): Promise<FriendRequest[]> => {
  const res = await fetch(`${API_BASE}/sent`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch sent requests');
  return res.json();
};

export const sendFriendRequest = async (toEmail: string): Promise<FriendRequest> => {
  const res = await fetch(`${API_BASE}/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ toEmail }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Failed to send friend request');
  }
  return res.json();
};

export const acceptFriendRequest = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/request/${id}/accept`, {
    method: 'PATCH',
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Failed to accept friend request');
  }
};

export const rejectFriendRequest = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/request/${id}/reject`, {
    method: 'PATCH',
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Failed to reject friend request');
  }
};

// ─── Unfriend ────────────────────────────────────────────────────────────────

export const removeFriend = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Failed to remove friend');
  }
};

// ─── Invite Links ────────────────────────────────────────────────────────────

export const generateInviteLink = async (toEmail: string): Promise<string> => {
  const res = await fetch(`${API_BASE}/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ toEmail }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Failed to generate invite link');
  }
  const data = await res.json();
  return data.token;
};

export const acceptInviteLink = async (token: string): Promise<{ message: string }> => {
  const res = await fetch(`${API_BASE}/invite/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Failed to accept invite');
  }
  return res.json();
};

// ─── Friend Nests ────────────────────────────────────────────────────────────

export const fetchFriendNests = async (): Promise<FriendNest[]> => {
  const res = await fetch(`${API_BASE}/nests`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch friend nests');
  return res.json();
};

export const fetchFollowedNestIds = async (): Promise<string[]> => {
  const res = await fetch(`${API_BASE}/nests/following`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch followed nest IDs');
  return res.json();
};

export const followFriendNest = async (nestId: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/nests/follow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ nestId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Failed to follow nest');
  }
};

export const unfollowFriendNest = async (nestId: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/nests/follow/${nestId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Failed to unfollow nest');
  }
};
