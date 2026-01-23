'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRightLeft, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout';
import { Badge, Button } from '@/components/ui';
import { fetchSubmissions, fetchDeposits } from '@/lib/api';
import type { Submission, Deposit } from '@baepdoongi/shared';
import { getTimeDifferenceMinutes } from '@/lib/matching';

export default function MatchingPage() {
  const { data: submissions = [] } = useQuery<Submission[]>({
    queryKey: ['submissions'],
    queryFn: fetchSubmissions,
  });

  const { data: deposits = [] } = useQuery<Deposit[]>({
    queryKey: ['deposits'],
    queryFn: fetchDeposits,
  });

  const pendingSubmissions = submissions.filter((s) => s.status === 'pending');
  const pendingDeposits = deposits.filter((d) => d.status === 'pending');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  return (
    <div>
      <PageHeader
        title="수동 매칭"
        description="자동 매칭 실패 건을 수동으로 처리합니다"
        actions={
          <Link href="/payments">
            <Button variant="ghost" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              돌아가기
            </Button>
          </Link>
        }
      />

      <div className="p-8">
        {/* 매칭 대기 현황 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="card p-4">
            <div className="flex items-center gap-2 text-yellow-600 mb-2">
              <Clock className="w-5 h-5" />
              <span className="font-medium">입금 대기 지원서</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {pendingSubmissions.length}
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 text-yellow-600 mb-2">
              <Clock className="w-5 h-5" />
              <span className="font-medium">매칭 대기 입금</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {pendingDeposits.length}
            </div>
          </div>
        </div>

        {/* 매칭 인터페이스 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 왼쪽: 입금 대기 지원서 */}
          <div className="card">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">입금 대기 지원서</h3>
            </div>
            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {pendingSubmissions.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  입금 대기 중인 지원서가 없습니다.
                </div>
              ) : (
                pendingSubmissions.map((sub) => (
                  <SubmissionCard key={sub.submissionId} submission={sub} />
                ))
              )}
            </div>
          </div>

          {/* 오른쪽: 매칭 대기 입금 */}
          <div className="card">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">매칭 대기 입금</h3>
            </div>
            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {pendingDeposits.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  매칭 대기 중인 입금이 없습니다.
                </div>
              ) : (
                pendingDeposits.map((dep) => (
                  <DepositCard
                    key={dep.depositId}
                    deposit={dep}
                    formatCurrency={formatCurrency}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* 수동 매칭 안내 */}
        <div className="mt-8 card p-6 bg-yellow-50 border-yellow-200">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800">수동 매칭 안내</h4>
              <p className="text-sm text-yellow-700 mt-1">
                자동 매칭이 실패한 경우 왼쪽 지원서와 오른쪽 입금 내역을 직접 확인하여
                매칭할 수 있습니다. 입금자명의 이름과 학번 뒤 2자리를 확인해주세요.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubmissionCard({ submission }: { submission: Submission }) {
  const timeSinceSubmission = getTimeDifferenceMinutes(
    new Date(),
    new Date(submission.submittedAt)
  );
  const hours = Math.floor(timeSinceSubmission / 60);
  const minutes = timeSinceSubmission % 60;

  return (
    <div className="p-4 hover:bg-gray-50 cursor-pointer">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium text-gray-900">{submission.name}</div>
          <div className="text-sm text-gray-500 mt-0.5">
            {submission.studentId} / {submission.department}
          </div>
          <div className="text-xs text-gray-400 mt-1">{submission.email}</div>
        </div>
        <div className="text-right">
          <Badge variant="warning">대기</Badge>
          <div className="text-xs text-gray-400 mt-1">
            {hours > 0 ? `${hours}시간 ` : ''}{minutes}분 전
          </div>
        </div>
      </div>
    </div>
  );
}

function DepositCard({
  deposit,
  formatCurrency,
}: {
  deposit: Deposit;
  formatCurrency: (n: number) => string;
}) {
  return (
    <div className="p-4 hover:bg-gray-50 cursor-pointer">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium text-gray-900">{deposit.depositorName}</div>
          <div className="text-sm text-green-600 mt-0.5">
            {formatCurrency(deposit.amount)}원
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {new Date(deposit.timestamp).toLocaleString('ko-KR')}
          </div>
        </div>
        <div className="text-right">
          <Badge variant="warning">대기</Badge>
        </div>
      </div>
    </div>
  );
}
