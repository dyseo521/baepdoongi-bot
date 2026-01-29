/**
 * 활동 로그 더미 데이터
 */

import type { ActivityLog, LogType } from '@baepdoongi/shared';

const baseLogs: ActivityLog[] = [
  {
    logId: 'log-001',
    type: 'MEMBER_JOIN',
    userId: 'U012',
    details: { displayName: '임준혁/전자공학과/24' },
    createdAt: '2026-01-29T09:30:00Z',
  },
  {
    logId: 'log-002',
    type: 'EVENT_ANNOUNCE',
    userId: 'dashboard',
    eventId: 'evt-002',
    details: { title: 'AWS 서버리스 아키텍처 세미나', channelName: 'seminars' },
    createdAt: '2026-01-29T09:00:00Z',
  },
  {
    logId: 'log-003',
    type: 'EVENT_RSVP',
    userId: 'U007',
    eventId: 'evt-002',
    details: { responseOptionId: 'attend', memberName: '강서연/정보통신공학과/24' },
    createdAt: '2026-01-28T14:00:00Z',
  },
  {
    logId: 'log-004',
    type: 'NAME_WARNING_SENT',
    userId: 'system',
    targetUserId: 'U009',
    details: { displayName: '조예진', warningCount: 2 },
    createdAt: '2026-01-28T09:00:00Z',
  },
  {
    logId: 'log-005',
    type: 'SUGGESTION_SUBMIT',
    userId: 'anonymous',
    details: { category: 'study', title: '스터디 주제 다양화 요청' },
    createdAt: '2026-01-28T10:30:00Z',
  },
  {
    logId: 'log-006',
    type: 'RAG_QUERY',
    userId: 'U003',
    details: { query: '동아리 회비는 얼마인가요?' },
    createdAt: '2026-01-28T11:00:00Z',
  },
  {
    logId: 'log-007',
    type: 'RAG_RESPONSE',
    userId: 'system',
    targetUserId: 'U003',
    details: { query: '동아리 회비는 얼마인가요?', responseTime: 1.2 },
    createdAt: '2026-01-28T11:00:02Z',
  },
  {
    logId: 'log-008',
    type: 'EVENT_CREATE',
    userId: 'dashboard',
    eventId: 'evt-004',
    details: { title: 'IGRUS 해커톤 2026' },
    createdAt: '2026-01-26T15:00:00Z',
  },
  {
    logId: 'log-009',
    type: 'MEMBER_SYNC',
    userId: 'dashboard',
    details: { syncedCount: 12, newCount: 2 },
    createdAt: '2026-01-26T10:00:00Z',
  },
  {
    logId: 'log-010',
    type: 'NAME_VALID',
    userId: 'U007',
    details: { oldName: '강서연', newName: '강서연/정보통신공학과/24' },
    createdAt: '2026-01-25T15:00:00Z',
  },
  {
    logId: 'log-011',
    type: 'BULK_DM_COMPLETE',
    userId: 'dashboard',
    eventId: 'evt-001',
    details: { totalCount: 5, sentCount: 5, failedCount: 0 },
    createdAt: '2026-01-25T10:00:00Z',
  },
  {
    logId: 'log-012',
    type: 'PAYMENT_MATCH_AUTO',
    userId: 'system',
    details: { submissionId: 'sub-001', depositId: 'dep-001', name: '임준혁' },
    createdAt: '2026-01-24T14:00:00Z',
  },
  {
    logId: 'log-013',
    type: 'SUBMISSION_RECEIVE',
    userId: 'system',
    details: { name: '임준혁', studentId: '12241234' },
    createdAt: '2026-01-24T13:30:00Z',
  },
  {
    logId: 'log-014',
    type: 'DEPOSIT_RECEIVE',
    userId: 'system',
    details: { depositorName: '임준혁', amount: 30000 },
    createdAt: '2026-01-24T14:00:00Z',
  },
  {
    logId: 'log-015',
    type: 'INVITE_EMAIL_SENT',
    userId: 'dashboard',
    details: { name: '임준혁', email: 'lim@example.com' },
    createdAt: '2026-01-24T14:30:00Z',
  },
];

export const logs: ActivityLog[] = baseLogs;

export function generateLogsResponse(options?: {
  limit?: number;
  type?: string;
}): { logs: ActivityLog[]; todayCount: number; hasMore: boolean } {
  let filteredLogs = [...baseLogs];

  // 타입 필터
  if (options?.type) {
    filteredLogs = filteredLogs.filter((log) => log.type === options.type);
  }

  // 오늘 날짜 기준 카운트 (2026-01-29 기준)
  const today = '2026-01-29';
  const todayCount = baseLogs.filter((log) => log.createdAt.startsWith(today)).length;

  // limit 적용
  const limit = options?.limit || 20;
  const hasMore = filteredLogs.length > limit;

  return {
    logs: filteredLogs.slice(0, limit),
    todayCount,
    hasMore,
  };
}

export const logTypes: LogType[] = [
  'MEMBER_JOIN',
  'MEMBER_LEAVE',
  'MEMBER_SYNC',
  'NAME_VALID',
  'NAME_INVALID',
  'NAME_WARNING_SENT',
  'EVENT_CREATE',
  'EVENT_UPDATE',
  'EVENT_DELETE',
  'EVENT_ANNOUNCE',
  'EVENT_RSVP',
  'SUGGESTION_SUBMIT',
  'RAG_QUERY',
  'RAG_RESPONSE',
  'PAYMENT_MATCH_AUTO',
  'PAYMENT_MATCH_MANUAL',
  'SUBMISSION_RECEIVE',
  'DEPOSIT_RECEIVE',
  'INVITE_EMAIL_SENT',
  'BULK_DM_COMPLETE',
];
