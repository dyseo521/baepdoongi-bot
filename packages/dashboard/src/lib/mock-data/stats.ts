/**
 * 대시보드 통계 더미 데이터
 */

import type { DashboardStats, DashboardTrends, DailyDataPoint } from '@baepdoongi/shared';

export const dashboardStats: DashboardStats = {
  totalMembers: 12,
  validNameMembers: 9,
  newMembersThisMonth: 4,
  activeEvents: 2,
  pendingSuggestions: 2,
  ragQueriesToday: 8,
};

function generateDailyData(days: number, baseValue: number, variance: number): DailyDataPoint[] {
  const data: DailyDataPoint[] = [];
  const today = new Date('2026-01-29');

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // 주말은 활동이 적음
    const dayOfWeek = date.getDay();
    const weekendFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 0.3 : 1;

    const count = Math.max(
      0,
      Math.round((baseValue + (Math.random() - 0.5) * variance * 2) * weekendFactor)
    );

    data.push({ date: dateStr!, count });
  }

  return data;
}

export function generateTrends(days: 7 | 14 | 30 = 7): DashboardTrends {
  return {
    dailyMembers: generateDailyData(days, 0.5, 0.5), // 평균 0.5명/일
    dailyRagQueries: generateDailyData(days, 5, 3), // 평균 5회/일
  };
}

export const dashboardTrends7: DashboardTrends = generateTrends(7);
export const dashboardTrends14: DashboardTrends = generateTrends(14);
export const dashboardTrends30: DashboardTrends = generateTrends(30);
