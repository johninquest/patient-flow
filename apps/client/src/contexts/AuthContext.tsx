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
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signInWithGoogle: () => void;
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

  const login = async (email: string, password: string) => {
    const response = await api.post<{ user: User }>('/api/auth/sign-in/email', { email, password });
    setUser(response.user);
  };

  const logout = async () => {
    await api.post('/api/auth/sign-out');
    setUser(null);
  };

  const signInWithGoogle = () => {
    // Redirect to Better Auth's Google OAuth endpoint
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/sign-in/google`;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, signInWithGoogle }}>
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
