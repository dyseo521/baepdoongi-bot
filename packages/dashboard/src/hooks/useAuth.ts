'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { checkAuth, logout as logoutApi } from '@/lib/auth';

interface UseAuthOptions {
  /** 인증 필요 여부 (기본값: true) */
  requireAuth?: boolean;
}

interface UseAuthReturn {
  /** 인증 상태 확인 중 */
  isLoading: boolean;
  /** 인증됨 여부 */
  isAuthenticated: boolean;
  /** 로그아웃 함수 */
  logout: () => Promise<void>;
}

/**
 * 클라이언트 사이드 인증 훅
 *
 * 보호된 페이지에서 사용하여 인증되지 않은 사용자를 로그인 페이지로 리다이렉트합니다.
 */
export function useAuth(options: UseAuthOptions = {}): UseAuthReturn {
  const { requireAuth = true } = options;
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;

    const verify = async () => {
      try {
        const authenticated = await checkAuth();

        if (!mounted) return;

        setIsAuthenticated(authenticated);

        if (requireAuth && !authenticated) {
          router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
        }
      } catch {
        if (mounted && requireAuth) {
          router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    verify();

    return () => {
      mounted = false;
    };
  }, [pathname, requireAuth, router]);

  const logout = async () => {
    await logoutApi();
    setIsAuthenticated(false);
    router.push('/login');
  };

  return { isLoading, isAuthenticated, logout };
}
