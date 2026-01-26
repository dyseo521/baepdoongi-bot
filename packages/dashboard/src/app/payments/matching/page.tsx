'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRightLeft, AlertTriangle, Clock, Mail, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { AuthLayout, PageHeader } from '@/components/layout';
import { Badge, Button, MatchingPageSkeleton, ConfirmModal } from '@/components/ui';
import { fetchSubmissions, fetchDeposits, manualMatch, deleteSubmission, deleteDeposit } from '@/lib/api';
import type { Submission, Deposit } from '@baepdoongi/shared';
import { getTimeDifferenceMinutes } from '@/lib/matching';

export default function MatchingPage() {
  return (
    <AuthLayout>
      <MatchingContent />
    </AuthLayout>
  );
}

function MatchingContent() {
  const queryClient = useQueryClient();
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [autoSendEmail, setAutoSendEmail] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'submission' | 'deposit'; item: Submission | Deposit } | null>(null);

  const { data: submissions = [], isLoading: isLoadingSubmissions } = useQuery<Submission[]>({
    queryKey: ['submissions'],
    queryFn: fetchSubmissions,
    retry: 1,
  });

  const { data: deposits = [], isLoading: isLoadingDeposits } = useQuery<Deposit[]>({
    queryKey: ['deposits'],
    queryFn: fetchDeposits,
    retry: 1,
  });

  // 모든 훅은 조건부 반환 전에 선언해야 함 (React Rules of Hooks)
  const matchMutation = useMutation({
    mutationFn: ({ submissionId, depositId }: { submissionId: string; depositId: string }) =>
      manualMatch(submissionId, depositId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
      setSelectedSubmission(null);
      setSelectedDeposit(null);
    },
  });

  const deleteSubmissionMutation = useMutation({
    mutationFn: (submissionId: string) => deleteSubmission(submissionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      setDeleteTarget(null);
      setSelectedSubmission(null);
    },
    onError: (error) => {
      console.error('지원서 삭제 실패:', error);
      alert('지원서 삭제에 실패했습니다.');
    },
  });

  const deleteDepositMutation = useMutation({
    mutationFn: (depositId: string) => deleteDeposit(depositId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
      setDeleteTarget(null);
      setSelectedDeposit(null);
    },
    onError: (error) => {
      console.error('입금 삭제 실패:', error);
      alert('입금 삭제에 실패했습니다.');
    },
  });

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'submission') {
      deleteSubmissionMutation.mutate((deleteTarget.item as Submission).submissionId);
    } else {
      deleteDepositMutation.mutate((deleteTarget.item as Deposit).depositId);
    }
  };

  // 스켈레톤 로딩 표시
  if (isLoadingSubmissions || isLoadingDeposits) {
    return <MatchingPageSkeleton />;
  }

  const pendingSubmissions = submissions.filter((s) => s.status === 'pending');
  const pendingDeposits = deposits.filter((d) => d.status === 'pending');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const handleMatch = () => {
    if (selectedSubmission && selectedDeposit) {
      matchMutation.mutate({
        submissionId: selectedSubmission.submissionId,
        depositId: selectedDeposit.depositId,
      });
    }
  };

  const canMatch = selectedSubmission && selectedDeposit && !matchMutation.isPending;

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
        {/* 설정 및 매칭 버튼 */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSendEmail}
                onChange={(e) => setAutoSendEmail(e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">
                <Mail className="w-4 h-4 inline mr-1" />
                매칭 시 자동 초대 메일 발송
              </span>
            </label>
          </div>

          <Button
            onClick={handleMatch}
            disabled={!canMatch}
            isLoading={matchMutation.isPending}
            leftIcon={<ArrowRightLeft className="w-4 h-4" />}
          >
            선택 항목 매칭
          </Button>
        </div>

        {/* 선택된 항목 표시 */}
        {(selectedSubmission || selectedDeposit) && (
          <div className="mb-6 p-4 bg-primary-50 rounded-lg border border-primary-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <span className="text-gray-500">지원서:</span>{' '}
                  <span className="font-medium text-gray-900">
                    {selectedSubmission ? `${selectedSubmission.name} (${selectedSubmission.studentId})` : '선택 안 됨'}
                  </span>
                </div>
                <ArrowRightLeft className="w-4 h-4 text-gray-400" />
                <div className="text-sm">
                  <span className="text-gray-500">입금:</span>{' '}
                  <span className="font-medium text-gray-900">
                    {selectedDeposit ? `${selectedDeposit.depositorName} (${formatCurrency(selectedDeposit.amount)}원)` : '선택 안 됨'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedSubmission(null);
                  setSelectedDeposit(null);
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                선택 취소
              </button>
            </div>
          </div>
        )}

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
              <p className="text-xs text-gray-500 mt-1">클릭하여 선택</p>
            </div>
            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {pendingSubmissions.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  입금 대기 중인 지원서가 없습니다.
                </div>
              ) : (
                pendingSubmissions.map((sub) => (
                  <SubmissionCard
                    key={sub.submissionId}
                    submission={sub}
                    selected={selectedSubmission?.submissionId === sub.submissionId}
                    onClick={() => setSelectedSubmission(
                      selectedSubmission?.submissionId === sub.submissionId ? null : sub
                    )}
                    onDelete={() => setDeleteTarget({ type: 'submission', item: sub })}
                  />
                ))
              )}
            </div>
          </div>

          {/* 오른쪽: 매칭 대기 입금 */}
          <div className="card">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">매칭 대기 입금</h3>
              <p className="text-xs text-gray-500 mt-1">클릭하여 선택</p>
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
                    selected={selectedDeposit?.depositId === dep.depositId}
                    onClick={() => setSelectedDeposit(
                      selectedDeposit?.depositId === dep.depositId ? null : dep
                    )}
                    onDelete={() => setDeleteTarget({ type: 'deposit', item: dep })}
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
                입금자명 양식: <code className="bg-yellow-100 px-1 rounded">학번 2자리+이름</code> (예: 26김아그)
                <br />
                왼쪽에서 지원서를 선택하고, 오른쪽에서 해당하는 입금을 선택한 후 &quot;선택 항목 매칭&quot; 버튼을 클릭하세요.
                <br />
                잘못된 항목은 각 카드의 삭제 버튼으로 삭제할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={deleteTarget?.type === 'submission' ? '지원서 삭제' : '입금 삭제'}
        message={
          deleteTarget?.type === 'submission' ? (
            <div>
              <p className="mb-2">다음 지원서를 삭제하시겠습니까?</p>
              <p className="font-medium text-gray-900">
                {(deleteTarget.item as Submission).name} ({(deleteTarget.item as Submission).studentId})
              </p>
              <p className="text-sm text-red-500 mt-2">
                삭제된 항목은 복구할 수 없습니다.
              </p>
            </div>
          ) : deleteTarget?.type === 'deposit' ? (
            <div>
              <p className="mb-2">다음 입금을 삭제하시겠습니까?</p>
              <p className="font-medium text-gray-900">
                {(deleteTarget.item as Deposit).depositorName} ({formatCurrency((deleteTarget.item as Deposit).amount)}원)
              </p>
              <p className="text-sm text-red-500 mt-2">
                삭제된 항목은 복구할 수 없습니다.
              </p>
            </div>
          ) : null
        }
        confirmLabel="삭제"
        isLoading={deleteSubmissionMutation.isPending || deleteDepositMutation.isPending}
      />
    </div>
  );
}

function SubmissionCard({
  submission,
  selected,
  onClick,
  onDelete,
}: {
  submission: Submission;
  selected: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const timeSinceSubmission = getTimeDifferenceMinutes(
    new Date(),
    new Date(submission.submittedAt)
  );
  const hours = Math.floor(timeSinceSubmission / 60);
  const minutes = timeSinceSubmission % 60;

  return (
    <div
      onClick={onClick}
      className={`p-4 cursor-pointer transition-colors ${
        selected
          ? 'bg-primary-50 border-l-4 border-primary-500'
          : 'hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium text-gray-900">{submission.name}</div>
          <div className="text-sm text-gray-500 mt-0.5">
            {submission.studentId} / {submission.department}
          </div>
          <div className="text-xs text-gray-400 mt-1">{submission.phone || '-'}</div>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            {selected ? (
              <Badge variant="info">선택됨</Badge>
            ) : (
              <Badge variant="warning">대기</Badge>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
              title="삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="text-xs text-gray-400">
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
  selected,
  onClick,
  onDelete,
}: {
  deposit: Deposit;
  formatCurrency: (n: number) => string;
  selected: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`p-4 cursor-pointer transition-colors ${
        selected
          ? 'bg-primary-50 border-l-4 border-primary-500'
          : 'hover:bg-gray-50'
      }`}
    >
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
        <div className="text-right flex items-center gap-2">
          {selected ? (
            <Badge variant="info">선택됨</Badge>
          ) : (
            <Badge variant="warning">대기</Badge>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
            title="삭제"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
