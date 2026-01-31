'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  CreditCard,
  FileText,
  ArrowRightLeft,
  TrendingUp,
  Clock,
  CheckCircle,
  Mail,
  Users,
  Settings,
  X,
} from 'lucide-react';
import { AuthLayout, PageHeader } from '@/components/layout';
import { StatCard, Button } from '@/components/ui';
import { fetchPaymentStats, fetchSettings, updateSettings } from '@/lib/api';
import type { PaymentStats, Settings as SettingsType } from '@baepdoongi/shared';

export default function PaymentsPage() {
  return (
    <AuthLayout>
      <PaymentsContent />
    </AuthLayout>
  );
}

function PaymentsContent() {
  const [showSettings, setShowSettings] = useState(false);
  const queryClient = useQueryClient();

  const { data: stats, isLoading } = useQuery<PaymentStats>({
    queryKey: ['paymentStats'],
    queryFn: fetchPaymentStats,
  });

  const { data: settings } = useQuery<SettingsType>({
    queryKey: ['settings'],
    queryFn: fetchSettings,
  });

  const settingsMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const handleToggleAutoEmail = () => {
    settingsMutation.mutate({
      autoSendInviteEmail: !settings?.autoSendInviteEmail,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}년 ${month}월 ${day}일 ${hours}:${minutes}`;
  };

  return (
    <div>
      <PageHeader
        title="회비 관리"
        description="회비 납부 현황 및 지원서 매칭 관리"
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-4 h-4 mr-1.5" />
            설정
          </Button>
        }
      />

      {/* 설정 패널 */}
      {showSettings && (
        <div className="mx-4 sm:mx-8 mb-4">
          <div className="card p-4 border-primary-100 bg-primary-50/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary-600" />
                결제 관리 설정
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between py-3 border-t border-primary-100">
              <div>
                <div className="font-medium text-gray-900">자동 초대 이메일 발송</div>
                <div className="text-sm text-gray-500">
                  자동 매칭 성공 시 Slack 초대 이메일을 자동으로 발송합니다
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings?.autoSendInviteEmail ?? false}
                onClick={handleToggleAutoEmail}
                disabled={settingsMutation.isPending}
                className={`
                  relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full
                  border-2 border-transparent transition-colors duration-200 ease-in-out
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                  ${settings?.autoSendInviteEmail ? 'bg-primary-600' : 'bg-gray-200'}
                  ${settingsMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <span
                  className={`
                    pointer-events-none inline-block h-5 w-5 transform rounded-full
                    bg-white shadow ring-0 transition duration-200 ease-in-out
                    ${settings?.autoSendInviteEmail ? 'translate-x-5' : 'translate-x-0'}
                  `}
                />
              </button>
            </div>

            {settings?.updatedAt && (
              <div className="text-xs text-gray-400 mt-2">
                마지막 변경: {formatDateTime(settings.updatedAt)}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="p-4 sm:p-8 space-y-6">
        {/* 퀵 링크 */}
        <div className="grid grid-cols-3 gap-4">
          <Link href="/payments/submissions" className="card p-4 sm:p-6 hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <div className="p-2 sm:p-3 rounded-lg bg-primary-50 text-primary-600">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="text-center sm:text-left">
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base">지원서 관리</h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 hidden sm:block">
                  구글 폼 지원서 목록 및 상태 관리
                </p>
              </div>
            </div>
          </Link>

          <Link href="/payments/deposits" className="card p-4 sm:p-6 hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <div className="p-2 sm:p-3 rounded-lg bg-blue-50 text-blue-600">
                <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="text-center sm:text-left">
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base">입금 기록</h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 hidden sm:block">
                  전체 입금 내역 및 매칭 현황
                </p>
              </div>
            </div>
          </Link>

          <Link href="/payments/matching" className="card p-4 sm:p-6 hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <div className="p-2 sm:p-3 rounded-lg bg-green-50 text-green-600">
                <ArrowRightLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="text-center sm:text-left">
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base">수동 매칭</h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 hidden sm:block">
                  자동 매칭 실패 건 수동 처리
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* 상태별 현황 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 지원서 상태 */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-600" />
              지원서 상태별 현황
            </h2>
            <div className="space-y-1">
              <StatusRow
                icon={Clock}
                label="입금 대기"
                count={stats?.submissionsByStatus.pending ?? 0}
              />
              <StatusRow
                icon={CheckCircle}
                label="입금 확인"
                count={stats?.submissionsByStatus.matched ?? 0}
              />
              <StatusRow
                icon={Mail}
                label="초대 발송"
                count={stats?.submissionsByStatus.invited ?? 0}
              />
              <StatusRow
                icon={Users}
                label="가입 완료"
                count={stats?.submissionsByStatus.joined ?? 0}
              />
            </div>
          </div>

          {/* 입금 상태 */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary-600" />
              입금 상태별 현황
            </h2>
            <div className="space-y-1">
              <StatusRow
                icon={Clock}
                label="매칭 대기"
                count={stats?.depositsByStatus.pending ?? 0}
              />
              <StatusRow
                icon={CheckCircle}
                label="매칭 완료"
                count={stats?.depositsByStatus.matched ?? 0}
              />
              <StatusRow
                icon={Clock}
                label="만료됨"
                count={stats?.depositsByStatus.expired ?? 0}
              />
            </div>
          </div>
        </div>

        {/* 통계 카드 그리드 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
          <StatCard
            icon={FileText}
            title="총 지원서"
            value={isLoading ? '-' : stats?.totalSubmissions ?? 0}
            changeLabel="건"
            compact
          />
          <StatCard
            icon={Clock}
            title="입금 대기"
            value={isLoading ? '-' : stats?.submissionsByStatus.pending ?? 0}
            changeLabel="건"
            compact
          />
          <StatCard
            icon={TrendingUp}
            title="자동 매칭률"
            value={isLoading ? '-' : `${stats?.autoMatchRate ?? 0}%`}
            compact
          />
          <StatCard
            icon={CreditCard}
            title="총 입금액"
            value={isLoading ? '-' : formatCurrency(stats?.totalAmount ?? 0)}
            compact
          />
        </div>
      </div>
    </div>
  );
}

function StatusRow({
  icon: Icon,
  label,
  count,
}: {
  icon: React.ElementType;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-blue-50 last:border-0">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-50 text-blue-400">
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-gray-600">{label}</span>
      </div>
      <span className="font-semibold text-gray-900 tabular-nums">{count}</span>
    </div>
  );
}
