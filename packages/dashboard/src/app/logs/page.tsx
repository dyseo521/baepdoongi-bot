'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Filter,
  RefreshCw,
  Calendar,
  User,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Send,
  Users,
  Settings,
} from 'lucide-react';
import { AuthLayout, PageHeader } from '@/components/layout';
import { Button, Badge } from '@/components/ui';
import { fetchLogs, fetchMembers } from '@/lib/api';
import type { ActivityLog, LogType } from '@baepdoongi/shared';

// 로그 타입별 한글 라벨
const LOG_TYPE_LABELS: Record<string, string> = {
  MEMBER_JOIN: '신규 가입',
  MEMBER_LEAVE: '워크스페이스 탈퇴',
  MEMBER_SYNC: '회원 동기화',
  MEMBER_PROFILE_UPDATE: '프로필 업데이트',
  NAME_VALID: '이름 형식 수정',
  NAME_INVALID: '이름 형식 미준수',
  NAME_WARNING_SENT: '이름 경고 DM',
  NAME_WARNING_BULK: '이름 경고 일괄 발송',
  EVENT_CREATE: '이벤트 생성',
  EVENT_UPDATE: '이벤트 수정',
  EVENT_DELETE: '이벤트 삭제',
  EVENT_ANNOUNCE: '이벤트 공지',
  EVENT_ANNOUNCE_UPDATE: '공지 수정',
  EVENT_RSVP: '참석 응답',
  EVENT_REMINDER: '리마인더 발송',
  COMMAND_GUIDE: '/가이드 사용',
  COMMAND_SUGGESTION: '/익명건의 사용',
  COMMAND_OTHER: '커맨드 사용',
  SUGGESTION_SUBMIT: '건의사항 제출',
  SUGGESTION_READ: '건의사항 확인',
  SUGGESTION_REPLY: '건의사항 답변',
  DM_SENT: 'DM 전송',
  DM_WELCOME: '환영 DM',
  DM_ERROR: 'DM 전송 실패',
  RAG_QUERY: 'RAG 질문',
  RAG_RESPONSE: 'RAG 응답',
  RAG_ERROR: 'RAG 오류',
  SYSTEM_START: '봇 시작',
  SYSTEM_ERROR: '시스템 오류',
  API_ERROR: 'API 오류',
};

// 로그 타입별 아이콘 및 색상
const LOG_TYPE_CONFIG: Record<string, { icon: typeof Activity; color: string; bgColor: string }> = {
  MEMBER_JOIN: { icon: Users, color: 'text-green-600', bgColor: 'bg-green-100' },
  MEMBER_LEAVE: { icon: Users, color: 'text-red-600', bgColor: 'bg-red-100' },
  MEMBER_SYNC: { icon: RefreshCw, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  MEMBER_PROFILE_UPDATE: { icon: User, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  NAME_VALID: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
  NAME_INVALID: { icon: AlertTriangle, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  NAME_WARNING_SENT: { icon: Send, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  NAME_WARNING_BULK: { icon: Send, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  EVENT_CREATE: { icon: Calendar, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  EVENT_UPDATE: { icon: Calendar, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  EVENT_DELETE: { icon: Calendar, color: 'text-red-600', bgColor: 'bg-red-100' },
  EVENT_ANNOUNCE: { icon: Send, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  EVENT_ANNOUNCE_UPDATE: { icon: Send, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  EVENT_RSVP: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
  EVENT_REMINDER: { icon: Send, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  COMMAND_GUIDE: { icon: MessageSquare, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  COMMAND_SUGGESTION: { icon: MessageSquare, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  COMMAND_OTHER: { icon: MessageSquare, color: 'text-gray-600', bgColor: 'bg-gray-100' },
  SUGGESTION_SUBMIT: { icon: MessageSquare, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  SUGGESTION_READ: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
  SUGGESTION_REPLY: { icon: Send, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  DM_SENT: { icon: Send, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  DM_WELCOME: { icon: Send, color: 'text-green-600', bgColor: 'bg-green-100' },
  DM_ERROR: { icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-100' },
  RAG_QUERY: { icon: MessageSquare, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  RAG_RESPONSE: { icon: CheckCircle, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  RAG_ERROR: { icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-100' },
  SYSTEM_START: { icon: Settings, color: 'text-green-600', bgColor: 'bg-green-100' },
  SYSTEM_ERROR: { icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-100' },
  API_ERROR: { icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-100' },
};

const LOG_CATEGORIES = [
  { value: '', label: '전체' },
  { value: 'member', label: '회원', types: ['MEMBER_JOIN', 'MEMBER_LEAVE', 'MEMBER_SYNC', 'MEMBER_PROFILE_UPDATE', 'NAME_VALID', 'NAME_INVALID', 'NAME_WARNING_SENT', 'NAME_WARNING_BULK'] },
  { value: 'event', label: '이벤트', types: ['EVENT_CREATE', 'EVENT_UPDATE', 'EVENT_DELETE', 'EVENT_ANNOUNCE', 'EVENT_ANNOUNCE_UPDATE', 'EVENT_RSVP', 'EVENT_REMINDER'] },
  { value: 'command', label: '커맨드', types: ['COMMAND_GUIDE', 'COMMAND_SUGGESTION', 'COMMAND_OTHER'] },
  { value: 'dm', label: 'DM', types: ['DM_SENT', 'DM_WELCOME', 'DM_ERROR', 'NAME_WARNING_SENT'] },
  { value: 'suggestion', label: '건의사항', types: ['SUGGESTION_SUBMIT', 'SUGGESTION_READ', 'SUGGESTION_REPLY'] },
  { value: 'rag', label: 'RAG', types: ['RAG_QUERY', 'RAG_RESPONSE', 'RAG_ERROR'] },
  { value: 'system', label: '시스템', types: ['SYSTEM_START', 'SYSTEM_ERROR', 'API_ERROR'] },
];

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;

  return date.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getLogIcon(type: LogType) {
  const config = LOG_TYPE_CONFIG[type] || { icon: Activity, color: 'text-gray-600', bgColor: 'bg-gray-100' };
  const Icon = config.icon;
  return (
    <div className={`w-8 h-8 rounded-full ${config.bgColor} flex items-center justify-center`}>
      <Icon className={`w-4 h-4 ${config.color}`} />
    </div>
  );
}

function getLogLabel(type: LogType): string {
  return LOG_TYPE_LABELS[type] || type;
}

function formatLogDetails(log: ActivityLog): string {
  const details = log.details as Record<string, unknown> || {};

  switch (log.type) {
    case 'EVENT_CREATE':
    case 'EVENT_UPDATE':
    case 'EVENT_DELETE':
    case 'EVENT_ANNOUNCE':
    case 'EVENT_ANNOUNCE_UPDATE':
      return details['title'] ? `"${details['title']}"` : '';

    case 'NAME_WARNING_SENT':
      // targetUserId는 로그 하단에서 이름 변환되어 표시됨
      return '';

    case 'MEMBER_SYNC':
      return details['totalCount'] ? `${details['totalCount']}명 (유효: ${details['validNameCount']}, 미준수: ${details['invalidNameCount']})` : '';

    case 'EVENT_RSVP':
      return details['response'] ? `응답: ${details['response']}` : '';

    default:
      if (Object.keys(details).length > 0) {
        const parts = Object.entries(details)
          .slice(0, 2)
          .map(([k, v]) => `${k}: ${v}`);
        return parts.join(', ');
      }
      return '';
  }
}

export default function LogsPage() {
  return (
    <AuthLayout>
      <LogsContent />
    </AuthLayout>
  );
}

function LogsContent() {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [limit, setLimit] = useState(50);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['logs', limit],
    queryFn: () => fetchLogs({ limit }),
  });

  const { data: members } = useQuery({
    queryKey: ['members'],
    queryFn: () => fetchMembers('db'),
    staleTime: 5 * 60 * 1000,
  });

  const logs = data?.logs || [];
  const todayCount = data?.todayCount || 0;

  const memberNameMap = useMemo(() => {
    const map = new Map<string, string>();
    members?.forEach((m) => map.set(m.slackId, m.displayName));
    return map;
  }, [members]);

  const getUserName = useCallback((userId: string): string => {
    if (userId === 'system') return '시스템';
    if (userId === 'dashboard') return '대시보드';
    return memberNameMap.get(userId) || userId;
  }, [memberNameMap]);

  // 카테고리 필터링
  const filteredLogs = selectedCategory
    ? logs.filter((log) => {
        const category = LOG_CATEGORIES.find((c) => c.value === selectedCategory);
        return category?.types?.includes(log.type);
      })
    : logs;

  return (
    <div>
      <PageHeader
        title="활동 로그"
        description="시스템의 모든 활동 기록을 확인합니다"
        actions={
          <Button
            variant="secondary"
            leftIcon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
            onClick={() => refetch()}
            disabled={isLoading}
          >
            새로고침
          </Button>
        }
      />

      <div className="p-8">
        {/* 요약 카드 */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-4 mb-6">
          <div className="card p-2 sm:p-4">
            <div className="text-[10px] sm:text-sm text-gray-500">오늘 활동</div>
            <div className="text-lg sm:text-2xl font-bold text-gray-900">{todayCount}</div>
          </div>
          <div className="card p-2 sm:p-4">
            <div className="text-[10px] sm:text-sm text-gray-500">전체 로그</div>
            <div className="text-lg sm:text-2xl font-bold text-gray-900">{data?.totalCount ?? 0}</div>
          </div>
          <div className="card p-2 sm:p-4">
            <div className="text-[10px] sm:text-sm text-gray-500">필터된 로그</div>
            <div className="text-lg sm:text-2xl font-bold text-primary-600">{filteredLogs.length}</div>
          </div>
          <div className="card p-2 sm:p-4 hidden sm:block">
            <label htmlFor="log-limit" className="text-sm text-gray-500">
              표시 개수
            </label>
            <select
              id="log-limit"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 text-sm"
            >
              <option value={25}>25개</option>
              <option value={50}>50개</option>
              <option value={100}>100개</option>
              <option value={200}>200개</option>
            </select>
          </div>
        </div>

        {/* 필터 */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
          {LOG_CATEGORIES.map((category) => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>

        {/* 로그 목록 */}
        <div className="card divide-y divide-gray-100">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">로그를 불러오는 중...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">기록된 활동이 없습니다.</div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.logId} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  {getLogIcon(log.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {getLogLabel(log.type)}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {formatRelativeTime(log.createdAt)}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {formatLogDetails(log)}
                    </div>
                    {log.userId && (
                      <div className="mt-1 text-xs text-gray-400">
                        실행자: {getUserName(log.userId)}
                        {log.targetUserId && ` → 대상: ${getUserName(log.targetUserId)}`}
                        {log.eventId && ` | 이벤트: ${log.eventId}`}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 더보기 */}
        {data?.hasMore && (
          <div className="mt-4 text-center">
            <Button
              variant="secondary"
              onClick={() => setLimit((prev) => prev + 50)}
            >
              더 보기
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
