import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export type UserSession = {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  expires?: string;
} | null;

type AuthContextType = {
  session: UserSession;
  loading: boolean;
  login: () => void;
  logout: () => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<UserSession>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          if (Object.keys(data).length > 0) {
            setSession(data);
          } else {
            setSession(null);
          }
        } else {
          setSession(null);
        }
      } catch (error) {
        console.error('Failed to fetch session', error);
        setSession(null);
      } finally {
        setLoading(false);
      }
    }

    void fetchSession();
  }, []);

  const login = () => {
    window.location.href = '/signin';
  };

  const logout = () => {
    window.location.href = '/signout';
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        login,
        logout,
        isAuthenticated: !!session,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
