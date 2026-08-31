import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { fetchUserProfile, type UserProfile } from '../services/templeBook';

export function useUserProfile() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchUserProfile()
      .then(setProfile)
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Failed to load profile');
        setProfile(null);
      })
      .finally(() => setLoading(false));
  }, [authLoading, isAuthenticated]);

  return { profile, loading: authLoading || loading, error };
}
