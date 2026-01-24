'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Mail, CheckCircle, Clock, Users, MailCheck, MailX } from 'lucide-react';
import Link from 'next/link';
import { AuthLayout, PageHeader } from '@/components/layout';
import { DataTable, Badge, Button, SubmissionsPageSkeleton } from '@/components/ui';
import { fetchSubmissions, fetchDeposits, sendInviteEmail } from '@/lib/api';
import type { Submission, Deposit, SubmissionStatus } from '@baepdoongi/shared';

const statusConfig: Record<SubmissionStatus, { label: string; variant: 'success' | 'warning' | 'info' | 'default' }> = {
  pending: { label: '입금 대기', variant: 'warning' },
  matched: { label: '입금 확인', variant: 'success' },
  invited: { label: '초대 발송', variant: 'info' },
  joined: { label: '가입 완료', variant: 'default' },
};

export default function SubmissionsPage() {
  return (
    <AuthLayout>
      <SubmissionsContent />
    </AuthLayout>
  );
}

function SubmissionsContent() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<SubmissionStatus | 'all'>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  const { data: submissions = [], isLoading: isLoadingSubmissions, isError, error } = useQuery<Submission[]>({
    queryKey: ['submissions'],
    queryFn: fetchSubmissions,
    retry: 1,
  });

  const { data: deposits = [], isLoading: isLoadingDeposits } = useQuery<Deposit[]>({
    queryKey: ['deposits'],
    queryFn: fetchDeposits,
    retry: 1,
  });

  // depositId -> Deposit 맵핑 (입금 금액 조회용)
  const depositMap = new Map(deposits.map(d => [d.depositId, d]));

  const isLoading = isLoadingSubmissions || isLoadingDeposits;

  // 모든 훅은 조건부 반환 전에 선언해야 함 (React Rules of Hooks)
  const sendEmailMutation = useMutation({
    mutationFn: (submissionId: string) => sendInviteEmail(submissionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      setSelectedSubmission(null);
    },
  });

  // 스켈레톤 로딩 표시
  if (isLoading) {
    return <SubmissionsPageSkeleton />;
  }

  // 에러 표시
  if (isError) {
    return (
      <div className="p-8">
        <div className="card p-8 text-center">
          <div className="text-red-500 mb-2">지원서 목록을 불러오는데 실패했습니다</div>
          <div className="text-sm text-gray-500">{(error as Error)?.message}</div>
        </div>
      </div>
    );
  }

  const filteredSubmissions = filter === 'all'
    ? submissions
    : submissions.filter(s => s.status === filter);

  const columns = [
    {
      key: 'name',
      header: '이름',
      render: (sub: Submission) => (
        <div
          className="cursor-pointer hover:text-primary-600"
          onClick={() => setSelectedSubmission(sub)}
        >
          <div className="font-medium text-gray-900">{sub.name}</div>
          <div className="text-xs text-gray-500">{sub.phone || '-'}</div>
        </div>
      ),
    },
    {
      key: 'studentId',
      header: '학번',
      render: (sub: Submission) => (
        <span className="font-mono text-sm">{sub.studentId}</span>
      ),
    },
    {
      key: 'department',
      header: '학과/학년',
      render: (sub: Submission) => (
        <div>
          <div className="text-sm">{sub.department || '-'}</div>
          <div className="text-xs text-gray-500">{sub.grade || '-'}</div>
        </div>
      ),
    },
    {
      key: 'email',
      header: '이메일',
      render: (sub: Submission) => (
        <span className="text-sm text-gray-600 truncate max-w-[200px] block">
          {sub.email || '-'}
        </span>
      ),
    },
    {
      key: 'hasPaid',
      header: '자가체크',
      render: (sub: Submission) => (
        <span className={`text-sm ${sub.hasPaid === '네' ? 'text-blue-600' : 'text-gray-400'}`}>
          {sub.hasPaid === '네' ? '✓' : '-'}
        </span>
      ),
    },
    {
      key: 'amount',
      header: '입금액',
      render: (sub: Submission) => {
        if (!sub.matchedDepositId) {
          return <span className="text-sm text-gray-400">-</span>;
        }
        const deposit = depositMap.get(sub.matchedDepositId);
        if (!deposit) {
          return <span className="text-sm text-gray-400">-</span>;
        }
        return (
          <span className="text-sm font-medium text-green-600">
            {new Intl.NumberFormat('ko-KR').format(deposit.amount)}원
          </span>
        );
      },
    },
    {
      key: 'status',
      header: '매칭상태',
      render: (sub: Submission) => {
        const config = statusConfig[sub.status];
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      key: 'emailSent',
      header: '메일',
      render: (sub: Submission) => (
        sub.emailSent ? (
          <div className="flex items-center gap-1 text-green-600">
            <MailCheck className="w-4 h-4" />
            <span className="text-xs">발송</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-gray-400">
            <MailX className="w-4 h-4" />
            <span className="text-xs">미발송</span>
          </div>
        )
      ),
    },
    {
      key: 'submittedAt',
      header: '제출일',
      render: (sub: Submission) =>
        new Date(sub.submittedAt).toLocaleDateString('ko-KR'),
    },
    {
      key: 'actions',
      header: '',
      render: (sub: Submission) => {
        if (sub.status === 'matched' && !sub.emailSent) {
          return (
            <Button
              size="sm"
              leftIcon={<Mail className="w-3 h-3" />}
              onClick={() => sendEmailMutation.mutate(sub.submissionId)}
              isLoading={sendEmailMutation.isPending}
            >
              초대 발송
            </Button>
          );
        }
        return null;
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="지원서 관리"
        description="구글 폼 지원서 목록 및 상태 관리"
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
            전체 ({submissions.length})
          </FilterButton>
          <FilterButton active={filter === 'pending'} onClick={() => setFilter('pending')}>
            <Clock className="w-3 h-3" />
            입금 대기 ({submissions.filter(s => s.status === 'pending').length})
          </FilterButton>
          <FilterButton active={filter === 'matched'} onClick={() => setFilter('matched')}>
            <CheckCircle className="w-3 h-3" />
            입금 확인 ({submissions.filter(s => s.status === 'matched').length})
          </FilterButton>
          <FilterButton active={filter === 'invited'} onClick={() => setFilter('invited')}>
            <Mail className="w-3 h-3" />
            초대 발송 ({submissions.filter(s => s.status === 'invited').length})
          </FilterButton>
          <FilterButton active={filter === 'joined'} onClick={() => setFilter('joined')}>
            <Users className="w-3 h-3" />
            가입 완료 ({submissions.filter(s => s.status === 'joined').length})
          </FilterButton>
        </div>

        <DataTable
          data={filteredSubmissions}
          columns={columns}
          getRowKey={(sub) => sub.submissionId}
          isLoading={isLoading}
          emptyMessage="지원서가 없습니다."
        />
      </div>

      {/* 상세 모달 */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelectedSubmission(null)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-semibold">지원서 상세</h2>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <InfoRow label="이름" value={selectedSubmission.name} />
                <InfoRow label="학번" value={selectedSubmission.studentId} />
                <InfoRow label="학과" value={selectedSubmission.department || '-'} />
                <InfoRow label="학년" value={selectedSubmission.grade || '-'} />
                <InfoRow label="성별" value={selectedSubmission.gender || '-'} />
                <InfoRow label="재학 여부" value={selectedSubmission.enrollmentStatus || '-'} />
                <InfoRow label="연락처" value={selectedSubmission.phone || '-'} />
                <InfoRow label="이메일" value={selectedSubmission.email || '-'} />
                <InfoRow
                  label="자가 체크"
                  value={selectedSubmission.hasPaid === '네' ? '✓ 입금함' : '미체크'}
                  highlight={selectedSubmission.hasPaid === '네'}
                />
                <InfoRow
                  label="입금액"
                  value={(() => {
                    if (!selectedSubmission.matchedDepositId) return '-';
                    const deposit = depositMap.get(selectedSubmission.matchedDepositId);
                    return deposit ? `${new Intl.NumberFormat('ko-KR').format(deposit.amount)}원` : '-';
                  })()}
                  highlight={!!selectedSubmission.matchedDepositId}
                />
                <InfoRow
                  label="매칭 상태"
                  value={statusConfig[selectedSubmission.status].label}
                />
                <InfoRow
                  label="메일 발송"
                  value={selectedSubmission.emailSent
                    ? `발송 완료 (${selectedSubmission.emailSentAt ? new Date(selectedSubmission.emailSentAt).toLocaleString('ko-KR') : ''})`
                    : '미발송'
                  }
                  highlight={selectedSubmission.emailSent === true}
                />
                <InfoRow
                  label="제출일"
                  value={new Date(selectedSubmission.submittedAt).toLocaleString('ko-KR')}
                />
              </div>

              {selectedSubmission.status === 'matched' && !selectedSubmission.emailSent && (
                <div className="mt-6 pt-4 border-t">
                  <Button
                    className="w-full"
                    leftIcon={<Mail className="w-4 h-4" />}
                    onClick={() => sendEmailMutation.mutate(selectedSubmission.submissionId)}
                    isLoading={sendEmailMutation.isPending}
                  >
                    초대 메일 발송
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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
