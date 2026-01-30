'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Users,
  Calendar,
  MessageSquare,
  FileText,
  CreditCard,
  ChevronDown,
  LogOut,
  X,
  type LucideIcon,
} from 'lucide-react';
import { logout } from '@/lib/auth';
import { useMobileMenu } from '@/contexts/mobile-menu-context';

interface NavigationChild {
  name: string;
  href: string;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  children?: NavigationChild[];
}

const navigation: NavigationItem[] = [
  { name: '대시보드', href: '/dashboard', icon: LayoutDashboard },
  { name: '회원 관리', href: '/members', icon: Users },
  { name: '이벤트 관리', href: '/events', icon: Calendar },
  { name: '건의사항', href: '/suggestions', icon: MessageSquare },
  { name: '활동 로그', href: '/logs', icon: FileText },
  {
    name: '회비 관리',
    href: '/payments',
    icon: CreditCard,
    children: [
      { name: '지원서 관리', href: '/payments/submissions' },
      { name: '입금 기록', href: '/payments/deposits' },
      { name: '수동 매칭', href: '/payments/matching' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isOpen, close } = useMobileMenu();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(() => {
    // Auto-expand menu if current path is parent or in its children
    const expanded: string[] = [];
    navigation.forEach((item) => {
      if (
        item.children &&
        (pathname === item.href ||
          item.children.some((child) => pathname.startsWith(child.href)))
      ) {
        expanded.push(item.name);
      }
    });
    return expanded;
  });

  // 모바일에서 사이드바 열릴 때 body 스크롤 방지
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const toggleMenu = (name: string) => {
    setExpandedMenus((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleNavClick = () => {
    // 모바일에서 메뉴 클릭 시 사이드바 닫기
    close();
  };

  return (
    <>
      {/* 모바일 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <aside
        className={clsx(
          'bg-slate-800 text-white flex flex-col w-64',
          'fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          'md:relative md:translate-x-0 md:z-auto'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            onClick={handleNavClick}
          >
            <img
              src="/images/logo.webp"
              alt="뱁둥이 로고"
              width={48}
              height={48}
              className="rounded-lg"
            />
            <h1 className="text-3xl font-bold">뱁둥이</h1>
          </Link>
          {/* 모바일 닫기 버튼 */}
          <button
            onClick={close}
            className="md:hidden p-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="메뉴 닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.children
                  ? item.children.some((child) => pathname.startsWith(child.href))
                  : pathname.startsWith(item.href));
              const isExpanded = expandedMenus.includes(item.name);
              const hasChildren = item.children && item.children.length > 0;
              const Icon = item.icon;

              return (
                <li key={item.name}>
                  {hasChildren ? (
                    <>
                      <button
                        onClick={() => {
                          toggleMenu(item.name);
                          router.push(item.href);
                          close();
                        }}
                        aria-expanded={isExpanded}
                        aria-controls={`submenu-${item.name}`}
                        className={clsx(
                          'w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg transition-colors min-h-[44px]',
                          isActive
                            ? 'bg-primary-600 text-white'
                            : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                        )}
                      >
                        <span className="flex items-center gap-3">
                          <Icon className="w-5 h-5" aria-hidden="true" />
                          <span>{item.name}</span>
                        </span>
                        <ChevronDown
                          className={clsx(
                            'w-4 h-4 transition-transform',
                            isExpanded && 'rotate-180'
                          )}
                          aria-hidden="true"
                        />
                      </button>
                      {isExpanded && item.children && (
                        <ul id={`submenu-${item.name}`} className="mt-1 ml-4 space-y-1">
                          {item.children.map((child) => {
                            const isChildActive = pathname.startsWith(child.href);
                            return (
                              <li key={child.href}>
                                <Link
                                  href={child.href}
                                  onClick={handleNavClick}
                                  className={clsx(
                                    'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm min-h-[44px]',
                                    isChildActive
                                      ? 'bg-primary-500 text-white'
                                      : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                                  )}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                  <span>{child.name}</span>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={handleNavClick}
                      className={clsx(
                        'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors min-h-[44px]',
                        isActive
                          ? 'bg-primary-600 text-white'
                          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50 min-h-[44px]"
          >
            <LogOut className="w-5 h-5" />
            <span>{isLoggingOut ? '로그아웃 중...' : '로그아웃'}</span>
          </button>
          <div className="mt-3 px-4 text-xs text-slate-500">
            <p>IGRUS Slack Bot v2.0.0</p>
          </div>
        </div>
      </aside>
    </>
  );
}
