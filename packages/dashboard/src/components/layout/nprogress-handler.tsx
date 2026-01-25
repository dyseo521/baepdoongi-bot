'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import NProgress from 'nprogress';

// NProgress 설정
NProgress.configure({
  showSpinner: false,
  minimum: 0.1,
  speed: 300,
  trickleSpeed: 100,
});

/**
 * Next.js App Router 페이지 전환 시 NProgress 바를 표시합니다.
 *
 * pathname이나 searchParams가 변경될 때 프로그레스 바를 완료합니다.
 */
export function NProgressHandler() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstRender = useRef(true);

  useEffect(() => {
    // 첫 렌더링에서는 프로그레스 완료만
    if (isFirstRender.current) {
      isFirstRender.current = false;
      NProgress.done();
      return;
    }

    // 페이지 전환 완료
    NProgress.done();
  }, [pathname, searchParams]);

  // 링크 클릭 이벤트 감지하여 프로그레스 시작
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');

      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      // 외부 링크, 해시 링크, 새 탭은 무시
      if (
        href.startsWith('http') ||
        href.startsWith('#') ||
        anchor.target === '_blank' ||
        anchor.hasAttribute('download')
      ) {
        return;
      }

      // 현재 페이지와 동일한 경로면 무시
      const currentPath = window.location.pathname;
      const targetPath = href.split('?')[0]?.split('#')[0];
      if (currentPath === targetPath) return;

      // 프로그레스 시작
      NProgress.start();
    };

    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);

  return null;
}
