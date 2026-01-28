/**
 * 쿼리 키 팩토리 패턴
 * - 일관된 쿼리 키 관리
 * - 타입 안전성 보장
 * - 캐시 무효화 용이
 */
export const queryKeys = {
  // 이벤트
  events: ['events'] as const,

  // 회원
  members: (source: 'db' | 'slack' = 'db') => ['members', source] as const,

  // 대시보드
  dashboardStats: ['dashboard', 'stats'] as const,
  dashboardTrends: (type: 'members' | 'rag', days: number) =>
    ['dashboard', 'trends', type, days] as const,

  // 건의사항
  suggestions: ['suggestions'] as const,

  // 결제
  submissions: ['payments', 'submissions'] as const,
  deposits: ['payments', 'deposits'] as const,
  matches: ['payments', 'matches'] as const,

  // Slack
  slackChannels: ['slack', 'channels'] as const,

  // 활동 로그
  logs: ['logs'] as const,
} as const;
