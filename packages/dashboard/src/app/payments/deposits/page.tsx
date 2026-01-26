'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Clock, CheckCircle, XCircle, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { AuthLayout, PageHeader } from '@/components/layout';
import { DataTable, Badge, Button, Modal, DepositsPageSkeleton } from '@/components/ui';
import { fetchDeposits, fetchSubmissions } from '@/lib/api';
import type { Deposit, Submission, DepositStatus } from '@baepdoongi/shared';

const statusConfig: Record<DepositStatus, { label: string; variant: 'success' | 'warning' | 'default' }> = {
  pending: { label: '매칭 대기', variant: 'warning' },
  matched: { label: '매칭 완료', variant: 'success' },
  expired: { label: '만료됨', variant: 'default' },
};

export default function DepositsPage() {
  return (
    <AuthLayout>
      <DepositsContent />
    </AuthLayout>
  );
}

function DepositsContent() {
  const [filter, setFilter] = useState<DepositStatus | 'all'>('all');
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);

  const { data: deposits = [], isLoading: isLoadingDeposits, isError, error } = useQuery<Deposit[]>({
    queryKey: ['deposits'],
    queryFn: fetchDeposits,
    retry: 1,
  });

  const { data: submissions = [], isLoading: isLoadingSubmissions } = useQuery<Submission[]>({
    queryKey: ['submissions'],
    queryFn: fetchSubmissions,
    retry: 1,
  });

  // submissionId -> Submission 맵핑 (매칭된 지원서 조회용)
  const submissionMap = useMemo(
    () => new Map(submissions.map(s => [s.submissionId, s])),
    [submissions]
  );

  // 상태별 개수 계산
  const statusCounts = useMemo(() => ({
    all: deposits.length,
    pending: deposits.filter(d => d.status === 'pending').length,
    matched: deposits.filter(d => d.status === 'matched').length,
    expired: deposits.filter(d => d.status === 'expired').length,
  }), [deposits]);

  const isLoading = isLoadingDeposits || isLoadingSubmissions;

  // 필터링된 입금 목록
  const filteredDeposits = useMemo(
    () => filter === 'all'
      ? deposits
      : deposits.filter(d => d.status === filter),
    [deposits, filter]
  );

  // 매칭된 지원서 찾기
  const getMatchedSubmission = (deposit: Deposit): Submission | undefined => {
    if (!deposit.matchedSubmissionId) return undefined;
    return submissionMap.get(deposit.matchedSubmissionId);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  // 스켈레톤 로딩 표시
  if (isLoading) {
    return <DepositsPageSkeleton />;
  }

  // 에러 표시
  if (isError) {
    return (
      <div className="p-8">
        <div className="card p-8 text-center">
          <div className="text-red-500 mb-2">입금 목록을 불러오는데 실패했습니다</div>
          <div className="text-sm text-gray-500">{(error as Error)?.message}</div>
        </div>
      </div>
    );
  }

  const columns = [
    {
      key: 'depositorName',
      header: '입금자명',
      render: (dep: Deposit) => (
        <div
          className="cursor-pointer hover:text-primary-600"
          onClick={() => setSelectedDeposit(dep)}
        >
          <div className="font-medium text-gray-900">{dep.depositorName}</div>
        </div>
      ),
    },
    {
      key: 'amount',
      header: '금액',
      render: (dep: Deposit) => (
        <span className="font-medium text-green-600">
          {formatCurrency(dep.amount)}원
        </span>
      ),
    },
    {
      key: 'timestamp',
      header: '입금 시각',
      render: (dep: Deposit) =>
        new Date(dep.timestamp).toLocaleString('ko-KR'),
    },
    {
      key: 'status',
      header: '상태',
      render: (dep: Deposit) => {
        const config = statusConfig[dep.status];
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      key: 'matchedSubmission',
      header: '매칭 정보',
      render: (dep: Deposit) => {
        const submission = getMatchedSubmission(dep);
        if (!submission) {
          return <span className="text-sm text-gray-400">-</span>;
        }
        return (
          <div className="text-sm">
            <div className="font-medium text-gray-900">{submission.name}</div>
            <div className="text-xs text-gray-500">{submission.studentId}</div>
          </div>
        );
      },
    },
    {
      key: 'rawNotification',
      header: '원본 알림',
      render: (dep: Deposit) => (
        <span className="text-xs text-gray-500 truncate max-w-[150px] block" title={dep.rawNotification}>
          {dep.rawNotification || '-'}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="입금 기록"
        description="전체 입금 기록 및 매칭 현황"
        actions={
          <Link href="/payments">
            <Button variant="ghost" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              돌아가기
            </Button>
          </Link>
        }
      />

      <div className="p-8">
        {/* 상태 필터 */}
        <div className="mb-6 flex gap-2 flex-wrap">
          <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
            전체 ({statusCounts.all})
          </FilterButton>
          <FilterButton active={filter === 'pending'} onClick={() => setFilter('pending')}>
            <Clock className="w-3 h-3" />
            매칭 대기 ({statusCounts.pending})
          </FilterButton>
          <FilterButton active={filter === 'matched'} onClick={() => setFilter('matched')}>
            <CheckCircle className="w-3 h-3" />
            매칭 완료 ({statusCounts.matched})
          </FilterButton>
          <FilterButton active={filter === 'expired'} onClick={() => setFilter('expired')}>
            <XCircle className="w-3 h-3" />
            만료됨 ({statusCounts.expired})
          </FilterButton>
        </div>

        <DataTable
          data={filteredDeposits}
          columns={columns}
          getRowKey={(dep) => dep.depositId}
          isLoading={isLoading}
          emptyMessage="입금 기록이 없습니다."
        />
      </div>

      {/* 상세 모달 */}
      <Modal
        isOpen={!!selectedDeposit}
        onClose={() => setSelectedDeposit(null)}
        title="입금 상세"
        titleIcon={<CreditCard className="w-5 h-5 text-green-600" />}
      >
        {selectedDeposit && (
          <div className="p-6 space-y-4">
            <InfoRow label="입금자명" value={selectedDeposit.depositorName} />
            <InfoRow
              label="금액"
              value={`${formatCurrency(selectedDeposit.amount)}원`}
              highlight
            />
            <InfoRow
              label="입금 시각"
              value={new Date(selectedDeposit.timestamp).toLocaleString('ko-KR')}
            />
            <InfoRow
              label="상태"
              value={statusConfig[selectedDeposit.status].label}
            />
            {selectedDeposit.matchedSubmissionId && (
              <>
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium text-gray-900 mb-3">매칭된 지원서</h4>
                  {(() => {
                    const submission = getMatchedSubmission(selectedDeposit);
                    if (!submission) return <span className="text-gray-400">정보 없음</span>;
                    return (
                      <div className="space-y-2">
                        <InfoRow label="이름" value={submission.name} />
                        <InfoRow label="학번" value={submission.studentId} />
                        <InfoRow label="학과" value={submission.department || '-'} />
                        <InfoRow label="이메일" value={submission.email || '-'} />
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium text-gray-900 mb-2">원본 알림</h4>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                {selectedDeposit.rawNotification || '원본 알림 없음'}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function FilterButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors ${
        active
          ? 'bg-primary-50 text-primary-700 font-medium'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  );
}

function InfoRow({
  label,
  value,
  highlight
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium ${highlight ? 'text-green-600' : 'text-gray-900'}`}>
        {value}
      </span>
    </div>
  );
}
