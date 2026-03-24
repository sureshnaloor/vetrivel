import { useEffect, useState } from "react";

export type UserSession = {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  expires?: string;
} | null;

export function useAuth() {
  const [session, setSession] = useState<UserSession>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const data = await res.json();
          // Auth.js returns {} if not authenticated, we need to check if Object.keys(data).length > 0
          if (Object.keys(data).length > 0) {
            setSession(data);
          } else {
            setSession(null);
          }
        } else {
          setSession(null);
        }
      } catch (error) {
        console.error("Failed to fetch session", error);
        setSession(null);
      } finally {
        setLoading(false);
      }
    }

    fetchSession();
  }, []);

  const login = () => {
    // Navigate to our custom sign-in page
    window.location.href = "/signin";
  };

  const logout = () => {
    // Navigate to our custom sign-out page
    window.location.href = "/signout";
  };

  return { session, loading, login, logout, isAuthenticated: !!session };
}
