import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  fetchFriends,
  fetchIncomingRequests,
  fetchSentRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  generateInviteLink,
  acceptInviteLink,
  fetchFriendNests,
  fetchFollowedNestIds,
  followFriendNest,
  unfollowFriendNest,
  type Friend,
  type FriendRequest,
  type FriendNest,
} from '../services/friends';

interface FriendsContextType {
  friends: Friend[];
  incomingRequests: FriendRequest[];
  sentRequests: FriendRequest[];
  friendNests: FriendNest[];
  followedNestIds: Set<string>;
  loading: boolean;
  error: string | null;
  sendRequest: (toEmail: string) => Promise<void>;
  acceptRequest: (id: string) => Promise<void>;
  rejectRequest: (id: string) => Promise<void>;
  unfriend: (id: string) => Promise<void>;
  getInviteLink: () => Promise<string>;
  acceptInvite: (token: string) => Promise<string>;
  followNest: (id: string) => Promise<void>;
  unfollowNest: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const FriendsContext = createContext<FriendsContextType | undefined>(undefined);

export function FriendsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [friendNests, setFriendNests] = useState<FriendNest[]>([]);
  const [followedNestIds, setFollowedNestIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    setError(null);
    try {
      const [f, incoming, sent, nests, followed] = await Promise.all([
        fetchFriends(),
        fetchIncomingRequests(),
        fetchSentRequests(),
        fetchFriendNests(),
        fetchFollowedNestIds(),
      ]);
      setFriends(f);
      setIncomingRequests(incoming);
      setSentRequests(sent);
      setFriendNests(nests);
      setFollowedNestIds(new Set(followed));
    } catch (e: any) {
      console.error('Failed to fetch friends data:', e);
      setError(e.message || 'Failed to load friends');
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Auto-fetch on login
  useEffect(() => {
    if (session?.user) {
      refresh();
    } else {
      setFriends([]);
      setIncomingRequests([]);
      setSentRequests([]);
      setFriendNests([]);
      setFollowedNestIds(new Set());
    }
  }, [session, refresh]);

  const sendRequest = async (toEmail: string) => {
    setError(null);
    try {
      await sendFriendRequest(toEmail);
      await refresh();
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  };

  const acceptRequest = async (id: string) => {
    setError(null);
    try {
      await acceptFriendRequest(id);
      await refresh();
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  };

  const rejectRequest = async (id: string) => {
    setError(null);
    try {
      await rejectFriendRequest(id);
      await refresh();
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  };

  const unfriend = async (id: string) => {
    setError(null);
    try {
      await removeFriend(id);
      await refresh();
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  };

  const getInviteLink = async (): Promise<string> => {
    setError(null);
    try {
      return await generateInviteLink();
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  };

  const acceptInvite = async (token: string): Promise<string> => {
    setError(null);
    try {
      const result = await acceptInviteLink(token);
      await refresh();
      return result.message;
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  };

  const followNest = async (id: string) => {
    setError(null);
    try {
      await followFriendNest(id);
      await refresh();
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  };

  const unfollowNest = async (id: string) => {
    setError(null);
    try {
      await unfollowFriendNest(id);
      await refresh();
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  };


  return (
    <FriendsContext.Provider
      value={{
        friends,
        incomingRequests,
        sentRequests,
        friendNests,
        followedNestIds,
        loading,
        error,
        sendRequest,
        acceptRequest,
        rejectRequest,
        unfriend,
        getInviteLink,
        acceptInvite,
        followNest,
        unfollowNest,
        refresh,
      }}
    >
      {children}
    </FriendsContext.Provider>
  );
}

export function useFriends() {
  const context = useContext(FriendsContext);
  if (context === undefined) {
    throw new Error('useFriends must be used within a FriendsProvider');
  }
  return context;
}
