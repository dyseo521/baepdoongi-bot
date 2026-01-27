import type { Metadata } from 'next';
import { Providers } from './providers';
import { sbAgro } from './fonts';
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
    <html lang="ko" className={sbAgro.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
