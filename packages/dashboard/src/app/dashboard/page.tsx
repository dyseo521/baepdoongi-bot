'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  CheckCircle,
  UserPlus,
  Calendar,
  MessageSquare,
  Bot,
} from 'lucide-react';
import { AuthLayout, PageHeader } from '@/components/layout';
import { StatCard } from '@/components/ui';
import { ChartCard, TrendsChart } from '@/components/dashboard';
import {
  fetchDashboardStats,
  fetchDashboardTrends,
  fetchEvents,
  fetchMembers,
} from '@/lib/api';
import type { DashboardStats, DashboardTrends, Event, Member } from '@baepdoongi/shared';

type PeriodOption = 7 | 14 | 30;

export default function DashboardPage() {
  return (
    <AuthLayout>
      <DashboardContent />
    </AuthLayout>
  );
}

function DashboardContent() {
  const [membersPeriod, setMembersPeriod] = useState<PeriodOption>(7);
  const [ragPeriod, setRagPeriod] = useState<PeriodOption>(7);

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboardStats'],
    queryFn: fetchDashboardStats,
  });

  const { data: membersTrends, isLoading: membersTrendsLoading } = useQuery<DashboardTrends>({
    queryKey: ['dashboardTrends', 'members', membersPeriod],
    queryFn: () => fetchDashboardTrends(membersPeriod),
  });

  const { data: ragTrends, isLoading: ragTrendsLoading } = useQuery<DashboardTrends>({
    queryKey: ['dashboardTrends', 'rag', ragPeriod],
    queryFn: () => fetchDashboardTrends(ragPeriod),
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: fetchEvents,
  });

  const { data: members = [], isLoading: membersLoading } = useQuery<Member[]>({
    queryKey: ['members'],
    queryFn: () => fetchMembers('db'),
  });

  // 7일 이내 이벤트 필터링
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return events
      .filter((e) => {
        const eventDate = new Date(e.datetime);
        return eventDate >= now && eventDate <= sevenDaysLater && e.status !== 'cancelled';
      })
      .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
  }, [events]);

  // 7일 이내 가입 회원 필터링
  const recentMembers = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return members
      .filter((m) => new Date(m.joinedAt) >= sevenDaysAgo)
      .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());
  }, [members]);

  return (
    <div>
      <PageHeader title="대시보드" />

      <div className="p-8 space-y-8">
        {/* 통계 카드 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            icon={Users}
            title="전체 회원"
            value={statsLoading ? '-' : stats?.totalMembers ?? 0}
            changeLabel="명"
          />
          <StatCard
            icon={Calendar}
            title="예정된 이벤트"
            value={statsLoading ? '-' : stats?.activeEvents ?? 0}
            changeLabel="개"
          />
          <StatCard
            icon={MessageSquare}
            title="미처리 건의"
            value={statsLoading ? '-' : stats?.pendingSuggestions ?? 0}
            changeLabel="건"
            variant={stats?.pendingSuggestions ? 'warning' : 'default'}
          />
        </div>

        {/* 일별 트렌드 차트 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard
            title="일별 가입 회원"
            icon={UserPlus}
            period={membersPeriod}
            onPeriodChange={setMembersPeriod}
            isLoading={membersTrendsLoading}
          >
            {membersTrends && (
              <TrendsChart
                data={membersTrends.dailyMembers}
                color="#3b82f6"
                gradientId="membersGradient"
              />
            )}
          </ChartCard>

          <ChartCard
            title="일별 RAG 질문"
            icon={Bot}
            period={ragPeriod}
            onPeriodChange={setRagPeriod}
            isLoading={ragTrendsLoading}
          >
            {ragTrends && (
              <TrendsChart
                data={ragTrends.dailyRagQueries}
                color="#0ea5e9"
                gradientId="ragGradient"
              />
            )}
          </ChartCard>
        </div>

        {/* 최근 활동 섹션 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 최근 가입 회원 */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary-600" />
              최근 가입 회원
              <span className="text-sm font-normal text-gray-500">(7일 이내)</span>
            </h2>
            {membersLoading ? (
              <div className="text-sm text-gray-500">데이터를 불러오는 중...</div>
            ) : recentMembers.length === 0 ? (
              <div className="text-sm text-gray-500">최근 7일내 가입한 회원이 없습니다.</div>
            ) : (
              <ul className="space-y-3">
                {recentMembers.map((member) => (
                  <li key={member.slackId} className="flex items-center gap-3">
                    {member.imageUrl ? (
                      <img
                        src={member.imageUrl}
                        alt={member.displayName}
                        width={32}
                        height={32}
                        loading="lazy"
                        decoding="async"
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <Users className="w-4 h-4 text-gray-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {member.displayName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(member.joinedAt).toLocaleDateString('ko-KR')} 가입
                      </div>
                    </div>
                    {member.isNameValid ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <span className="text-xs text-red-500">이름 미준수</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 다가오는 이벤트 */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-600" />
              다가오는 이벤트
              <span className="text-sm font-normal text-gray-500">(7일 이내)</span>
            </h2>
            {eventsLoading ? (
              <div className="text-sm text-gray-500">데이터를 불러오는 중...</div>
            ) : upcomingEvents.length === 0 ? (
              <div className="text-sm text-gray-500">7일 이내 예정된 이벤트가 없습니다.</div>
            ) : (
              <ul className="space-y-3">
                {upcomingEvents.map((event) => {
                  const eventDate = new Date(event.datetime);
                  const diffMs = eventDate.getTime() - Date.now();
                  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

                  let timeLabel = '';
                  if (diffDays === 0) {
                    timeLabel = diffHours <= 0 ? '곧 시작' : `${diffHours}시간 후`;
                  } else {
                    timeLabel = `${diffDays}일 ${diffHours}시간 후`;
                  }

                  return (
                    <li key={event.eventId} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-lg flex flex-col items-center justify-center">
                        <span className="text-xs text-primary-600 font-medium">
                          {eventDate.toLocaleDateString('ko-KR', { month: 'short' })}
                        </span>
                        <span className="text-lg font-bold text-primary-700">
                          {eventDate.getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {event.title}
                        </div>
                        <div className="text-xs text-gray-500">
                          {event.location} · {eventDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-xs text-primary-600 font-medium mt-1">
                          {timeLabel}
                        </div>
                      </div>
                      {event.announcement && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          공지됨
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
