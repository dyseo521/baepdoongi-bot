'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { checkAuth, logout as apiLogout } from '@/lib/auth';

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  revalidate: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);

  const verify = useCallback(async () => {
    try {
      const authenticated = await checkAuth();
      setIsAuthenticated(authenticated);
      return authenticated;
    } catch {
      setIsAuthenticated(false);
      return false;
    } finally {
      setIsLoading(false);
      setHasChecked(true);
    }
  }, []);

  // 최초 1회만 인증 확인
  useEffect(() => {
    if (!hasChecked) {
      verify();
    }
  }, [hasChecked, verify]);

  const logout = useCallback(async () => {
    await apiLogout();
    setIsAuthenticated(false);
    router.push('/login');
  }, [router]);

  const revalidate = useCallback(async () => {
    setIsLoading(true);
    const authenticated = await verify();
    if (!authenticated) {
      router.push('/login');
    }
  }, [verify, router]);

  const value = useMemo(
    () => ({ isAuthenticated, isLoading, logout, revalidate }),
    [isAuthenticated, isLoading, logout, revalidate]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
