'use client';

import { useQuery } from '@tanstack/react-query';
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
} from 'lucide-react';
import { AuthLayout, PageHeader } from '@/components/layout';
import { StatCard, Button } from '@/components/ui';
import { fetchPaymentStats } from '@/lib/api';
import type { PaymentStats } from '@baepdoongi/shared';

export default function PaymentsPage() {
  return (
    <AuthLayout>
      <PaymentsContent />
    </AuthLayout>
  );
}

function PaymentsContent() {
  const { data: stats, isLoading } = useQuery<PaymentStats>({
    queryKey: ['paymentStats'],
    queryFn: fetchPaymentStats,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };

  return (
    <div>
      <PageHeader
        title="회비 관리"
        description="회비 납부 현황 및 지원서 매칭 관리"
      />

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
            <div className="space-y-3">
              <StatusRow
                icon={Clock}
                label="입금 대기"
                count={stats?.submissionsByStatus.pending ?? 0}
                color="yellow"
              />
              <StatusRow
                icon={CheckCircle}
                label="입금 확인"
                count={stats?.submissionsByStatus.matched ?? 0}
                color="green"
              />
              <StatusRow
                icon={Mail}
                label="초대 발송"
                count={stats?.submissionsByStatus.invited ?? 0}
                color="blue"
              />
              <StatusRow
                icon={Users}
                label="가입 완료"
                count={stats?.submissionsByStatus.joined ?? 0}
                color="primary"
              />
            </div>
          </div>

          {/* 입금 상태 */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary-600" />
              입금 상태별 현황
            </h2>
            <div className="space-y-3">
              <StatusRow
                icon={Clock}
                label="매칭 대기"
                count={stats?.depositsByStatus.pending ?? 0}
                color="yellow"
              />
              <StatusRow
                icon={CheckCircle}
                label="매칭 완료"
                count={stats?.depositsByStatus.matched ?? 0}
                color="green"
              />
              <StatusRow
                icon={Clock}
                label="만료됨"
                count={stats?.depositsByStatus.expired ?? 0}
                color="gray"
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
            icon={CreditCard}
            title="입금 대기"
            value={isLoading ? '-' : stats?.submissionsByStatus.pending ?? 0}
            changeLabel="건"
            variant="warning"
            compact
          />
          <StatCard
            icon={TrendingUp}
            title="자동 매칭률"
            value={isLoading ? '-' : `${stats?.autoMatchRate ?? 0}%`}
            variant="success"
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
  color,
}: {
  icon: React.ElementType;
  label: string;
  count: number;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    yellow: 'text-yellow-600 bg-yellow-50',
    green: 'text-green-600 bg-green-50',
    blue: 'text-blue-600 bg-blue-50',
    primary: 'text-primary-600 bg-primary-50',
    gray: 'text-gray-600 bg-gray-50',
  };

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-gray-700">{label}</span>
      </div>
      <span className="font-semibold text-gray-900">{count}</span>
    </div>
  );
}
