export type CommunityInterestStatus = 'none' | 'pending' | 'joined';

export interface PublishedCommunity {
  _id: string;
  name: string;
  address: string;
  coordinates: { lat: number; lng: number };
  purpose: string;
  ownerEmail: string;
  ownerName: string;
  publishedAt?: string;
  memberCount: number;
  isOwner: boolean;
  isMember: boolean;
  interestStatus: CommunityInterestStatus;
}

export interface CommunityInterestRequest {
  _id: string;
  spaceId: string;
  spaceName: string;
  ownerEmail: string;
  fromEmail: string;
  fromName: string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt?: string;
}

export interface CommunityMember {
  _id?: string;
  spaceId: string;
  spaceName?: string;
  userEmail: string;
  userName: string;
  role: 'owner' | 'member';
  joinedAt?: string;
  joinedVia?: string;
}

export interface CommunityMessage {
  _id: string;
  spaceId: string;
  userEmail: string;
  userName: string;
  body: string;
  createdAt?: string;
}

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/communities`;

async function readError(res: Response, fallback: string): Promise<string> {
  const err = await res.json().catch(() => null);
  return err?.error || fallback;
}

export const fetchPublishedCommunities = async (): Promise<PublishedCommunity[]> => {
  const res = await fetch(API_BASE, { credentials: 'include' });
  if (!res.ok) throw new Error(await readError(res, 'Failed to browse communities'));
  return res.json();
};

export const fetchMyMemberships = async (): Promise<CommunityMember[]> => {
  const res = await fetch(`${API_BASE}/mine`, { credentials: 'include' });
  if (!res.ok) throw new Error(await readError(res, 'Failed to load memberships'));
  return res.json();
};

export const fetchIncomingInterests = async (): Promise<CommunityInterestRequest[]> => {
  const res = await fetch(`${API_BASE}/interests/incoming`, { credentials: 'include' });
  if (!res.ok) throw new Error(await readError(res, 'Failed to load interest requests'));
  return res.json();
};

export const fetchSentInterests = async (): Promise<CommunityInterestRequest[]> => {
  const res = await fetch(`${API_BASE}/interests/sent`, { credentials: 'include' });
  if (!res.ok) throw new Error(await readError(res, 'Failed to load sent interests'));
  return res.json();
};

export const sendCommunityInterest = async (
  spaceId: string,
  message?: string
): Promise<CommunityInterestRequest> => {
  const res = await fetch(`${API_BASE}/${spaceId}/interest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ message: message || '' }),
  });
  if (!res.ok) throw new Error(await readError(res, 'Failed to send interest'));
  return res.json();
};

export const acceptCommunityInterest = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/interests/${id}/accept`, {
    method: 'PATCH',
    credentials: 'include',
  });
  if (!res.ok) throw new Error(await readError(res, 'Failed to accept interest'));
};

export const rejectCommunityInterest = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/interests/${id}/reject`, {
    method: 'PATCH',
    credentials: 'include',
  });
  if (!res.ok) throw new Error(await readError(res, 'Failed to decline interest'));
};

export const fetchCommunityMembers = async (spaceId: string): Promise<CommunityMember[]> => {
  const res = await fetch(`${API_BASE}/${spaceId}/members`, { credentials: 'include' });
  if (!res.ok) throw new Error(await readError(res, 'Failed to load members'));
  return res.json();
};

export const leaveCommunity = async (spaceId: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/${spaceId}/members/me`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error(await readError(res, 'Failed to leave community'));
};

export const fetchCommunityMessages = async (spaceId: string): Promise<CommunityMessage[]> => {
  const res = await fetch(`${API_BASE}/${spaceId}/messages`, { credentials: 'include' });
  if (!res.ok) throw new Error(await readError(res, 'Failed to load board'));
  return res.json();
};

export const postCommunityMessage = async (
  spaceId: string,
  body: string
): Promise<CommunityMessage> => {
  const res = await fetch(`${API_BASE}/${spaceId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ body }),
  });
  if (!res.ok) throw new Error(await readError(res, 'Failed to post message'));
  return res.json();
};

export const deleteCommunityMessage = async (
  spaceId: string,
  messageId: string
): Promise<void> => {
  const res = await fetch(`${API_BASE}/${spaceId}/messages/${messageId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error(await readError(res, 'Failed to delete message'));
};
