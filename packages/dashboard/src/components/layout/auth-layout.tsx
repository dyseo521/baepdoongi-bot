'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Sidebar } from './sidebar';
import { PageSkeleton } from '../ui/skeleton';

interface AuthLayoutProps {
  children: React.ReactNode;
}

/**
 * 인증된 페이지용 레이아웃
 *
 * - AuthContext를 통해 전역 인증 상태 사용
 * - 인증 로딩 중에도 사이드바 즉시 표시 (children만 스켈레톤)
 * - 미인증 시 로그인 페이지로 리다이렉트
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // 로딩이 끝났고 인증되지 않았으면 로그인으로 리다이렉트
    if (!isLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  // 인증 확인 중이거나 미인증 시에도 레이아웃은 표시 (사이드바 보임)
  // children 영역만 스켈레톤으로 대체
  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {isLoading ? <PageSkeleton /> : isAuthenticated ? children : <PageSkeleton />}
      </main>
    </div>
  );
}
