import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../lib/api/client';
import type { Role } from '../lib/types/patient.types';

interface User {
  id: string;
  email: string;
  name?: string;
  role: Role;
  status: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await api.get<{ user: User }>('/api/auth/get-session');
      setUser(response.user);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<User> => {
    const response = await api.post<{ user: User }>('/api/auth/sign-in/email', { email, password });
    setUser(response.user);
    // Returned so callers can route on the fresh role — reading `user` from
    // context immediately after this call would still see the previous value.
    return response.user;
  };

  const logout = async () => {
    await api.post('/api/auth/sign-out');
    setUser(null);
  };

  /**
   * Starts the Google OAuth flow.
   *
   * Better Auth exposes social sign-in as `POST /api/auth/sign-in/social`, which
   * answers with the provider's authorization URL rather than redirecting. We
   * have to follow it ourselves — navigating straight to an `/api/auth/sign-in/google`
   * URL would issue a GET, which Better Auth does not serve.
   */
  const signInWithGoogle = async () => {
    const { url } = await api.post<{ url: string }>('/api/auth/sign-in/social', {
      provider: 'google',
      callbackURL: `${window.location.origin}/dashboard`,
    });

    window.location.href = url;
  };

  /**
   * Re-reads the session. Used by the waiting room so a user who has just been
   * granted a role can continue without signing out and back in.
   */
  const refresh = async () => {
    await checkAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        signInWithGoogle,
        refresh,
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
