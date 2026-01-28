'use client';

import dynamic from 'next/dynamic';

// 경량 컴포넌트 - 정적 임포트
export { ChartCard } from './chart-card';
export { QuickActions } from './quick-actions';

// TrendsChart - 동적 임포트 (Recharts ~150KB)
export const TrendsChart = dynamic(
  () => import('./trends-chart').then((m) => m.TrendsChart),
  { ssr: false }
);
