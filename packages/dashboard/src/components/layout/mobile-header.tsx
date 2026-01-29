'use client';

import { Menu } from 'lucide-react';
import { useMobileMenu } from '@/contexts/mobile-menu-context';

export function MobileHeader() {
  const { open } = useMobileMenu();

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-slate-800 flex items-center px-4">
      <button
        onClick={open}
        className="p-2 -ml-2 text-white hover:bg-slate-700 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="메뉴 열기"
      >
        <Menu className="w-6 h-6" />
      </button>
      <div className="flex-1 flex items-center justify-center">
        <img
          src="/images/logo.webp"
          alt="뱁둥이 로고"
          width={32}
          height={32}
          className="rounded-lg"
        />
        <span className="ml-2 text-xl font-bold text-white">뱁둥이</span>
      </div>
      {/* 오른쪽 빈 공간 (햄버거 버튼과 대칭) */}
      <div className="w-10" />
    </header>
  );
}
