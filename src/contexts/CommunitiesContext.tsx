import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  acceptCommunityInterest,
  fetchIncomingInterests,
  fetchMyMemberships,
  fetchPublishedCommunities,
  fetchSentInterests,
  leaveCommunity,
  rejectCommunityInterest,
  sendCommunityInterest,
  type CommunityInterestRequest,
  type CommunityMember,
  type PublishedCommunity,
} from '../services/communities';

interface CommunitiesContextType {
  published: PublishedCommunity[];
  memberships: CommunityMember[];
  incomingInterests: CommunityInterestRequest[];
  sentInterests: CommunityInterestRequest[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  expressInterest: (spaceId: string, message?: string) => Promise<void>;
  acceptInterest: (id: string) => Promise<void>;
  rejectInterest: (id: string) => Promise<void>;
  leave: (spaceId: string) => Promise<void>;
}

const CommunitiesContext = createContext<CommunitiesContextType | undefined>(undefined);

export function CommunitiesProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [published, setPublished] = useState<PublishedCommunity[]>([]);
  const [memberships, setMemberships] = useState<CommunityMember[]>([]);
  const [incomingInterests, setIncomingInterests] = useState<CommunityInterestRequest[]>([]);
  const [sentInterests, setSentInterests] = useState<CommunityInterestRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    setError(null);
    try {
      const [pub, mine, incoming, sent] = await Promise.all([
        fetchPublishedCommunities(),
        fetchMyMemberships(),
        fetchIncomingInterests(),
        fetchSentInterests(),
      ]);
      setPublished(pub);
      setMemberships(mine);
      setIncomingInterests(incoming);
      setSentInterests(sent);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load communities');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session?.user) {
      void refresh();
    } else {
      setPublished([]);
      setMemberships([]);
      setIncomingInterests([]);
      setSentInterests([]);
    }
  }, [session, refresh]);

  const expressInterest = async (spaceId: string, message?: string) => {
    await sendCommunityInterest(spaceId, message);
    await refresh();
  };

  const acceptInterest = async (id: string) => {
    await acceptCommunityInterest(id);
    await refresh();
  };

  const rejectInterest = async (id: string) => {
    await rejectCommunityInterest(id);
    await refresh();
  };

  const leave = async (spaceId: string) => {
    await leaveCommunity(spaceId);
    await refresh();
  };

  return (
    <CommunitiesContext.Provider
      value={{
        published,
        memberships,
        incomingInterests,
        sentInterests,
        loading,
        error,
        refresh,
        expressInterest,
        acceptInterest,
        rejectInterest,
        leave,
      }}
    >
      {children}
    </CommunitiesContext.Provider>
  );
}

export function useCommunities() {
  const ctx = useContext(CommunitiesContext);
  if (!ctx) throw new Error('useCommunities must be used within a CommunitiesProvider');
  return ctx;
}
