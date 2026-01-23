import type { Metadata } from 'next';
import { Sidebar } from '@/components/layout/sidebar';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'IGRUS 관리자 대시보드',
  description: '뱁둥이 Slack 봇 관리자 대시보드',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <Providers>
          <div className="min-h-screen flex bg-gray-50">
            <Sidebar />
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
