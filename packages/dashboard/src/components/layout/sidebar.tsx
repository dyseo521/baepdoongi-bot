'use client';

import { useState } from 'react';
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
  Dog,
  ChevronDown,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { logout } from '@/lib/auth';

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
      { name: '수동 매칭', href: '/payments/matching' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(() => {
    // Auto-expand menu if current path is in its children
    const expanded: string[] = [];
    navigation.forEach((item) => {
      if (item.children?.some((child) => pathname.startsWith(child.href))) {
        expanded.push(item.name);
      }
    });
    return expanded;
  });

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

  return (
    <aside className="w-64 bg-slate-800 text-white flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Dog className="w-6 h-6" />
          뱁둥이
        </h1>
        <p className="text-sm text-slate-400 mt-1">IGRUS 관리자 대시보드</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
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
                      onClick={() => toggleMenu(item.name)}
                      className={clsx(
                        'w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg transition-colors',
                        isActive
                          ? 'bg-primary-600 text-white'
                          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="w-5 h-5" />
                        <span>{item.name}</span>
                      </span>
                      <ChevronDown
                        className={clsx(
                          'w-4 h-4 transition-transform',
                          isExpanded && 'rotate-180'
                        )}
                      />
                    </button>
                    {isExpanded && item.children && (
                      <ul className="mt-1 ml-4 space-y-1">
                        {item.children.map((child) => {
                          const isChildActive = pathname.startsWith(child.href);
                          return (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                className={clsx(
                                  'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm',
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
                    className={clsx(
                      'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors',
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
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50"
        >
          <LogOut className="w-5 h-5" />
          <span>{isLoggingOut ? '로그아웃 중...' : '로그아웃'}</span>
        </button>
        <div className="mt-3 px-4 text-xs text-slate-500">
          <p>IGRUS Slack Bot v2.0.0</p>
        </div>
      </div>
    </aside>
  );
}
