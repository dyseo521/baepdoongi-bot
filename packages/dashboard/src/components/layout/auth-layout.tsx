'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { checkAuth } from '@/lib/auth';
import { Sidebar } from './sidebar';

interface AuthLayoutProps {
  children: React.ReactNode;
}

/**
 * 인증된 페이지용 레이아웃
 *
 * - 인증 상태 확인
 * - 미인증 시 로그인 페이지로 리다이렉트
 * - 사이드바 포함
 */
export function AuthLayout({ children }: AuthLayoutProps) {
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

        if (authenticated) {
          setIsAuthenticated(true);
        } else {
          router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
        }
      } catch {
        if (mounted) {
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
  }, [pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
