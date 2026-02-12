'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Mail, CheckCircle, Clock, Users, MailCheck, MailX, CreditCard, RotateCw, Unlink, UserCheck, Bell, BellOff, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { AuthLayout, PageHeader } from '@/components/layout';
import { DataTable, Badge, Button, Modal, SubmissionsPageSkeleton, MobileDataCard } from '@/components/ui';
import { fetchSubmissions, fetchDeposits, sendInviteEmail, unmatchSubmission, markSubmissionJoined, fetchSettings, updateSettings } from '@/lib/api';
import type { Submission, Deposit, SubmissionStatus, Settings } from '@baepdoongi/shared';

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
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [unmatchConfirmSubmission, setUnmatchConfirmSubmission] = useState<Submission | null>(null);
  const [joinConfirmSubmission, setJoinConfirmSubmission] = useState<Submission | null>(null);
  const [showAutoSendModal, setShowAutoSendModal] = useState(false);
  const [forceInviteSubmission, setForceInviteSubmission] = useState<Submission | null>(null);

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

  const { data: settings } = useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: fetchSettings,
  });

  const settingsMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setShowAutoSendModal(false);
    },
  });

  // depositId -> Deposit 맵핑 (입금 금액 조회용)
  const depositMap = useMemo(
    () => new Map(deposits.map(d => [d.depositId, d])),
    [deposits]
  );

  // 상태별 개수 계산 (필터 버튼용)
  const statusCounts = useMemo(() => ({
    all: submissions.length,
    pending: submissions.filter(s => s.status === 'pending').length,
    matched: submissions.filter(s => s.status === 'matched').length,
    invited: submissions.filter(s => s.status === 'invited').length,
    joined: submissions.filter(s => s.status === 'joined').length,
  }), [submissions]);

  const isLoading = isLoadingSubmissions || isLoadingDeposits;

  // 모든 훅은 조건부 반환 전에 선언해야 함 (React Rules of Hooks)
  const sendEmailMutation = useMutation({
    mutationFn: ({ submissionId, force }: { submissionId: string; force?: boolean }) =>
      sendInviteEmail(submissionId, force),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      setSelectedSubmission(null);
      setForceInviteSubmission(null);
      alert('초대 메일이 발송되었습니다.');
    },
    onError: (error) => {
      console.error('초대 메일 발송 실패:', error);
      alert('초대 메일 발송에 실패했습니다.');
    },
  });

  const unmatchMutation = useMutation({
    mutationFn: (submissionId: string) => unmatchSubmission(submissionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
      setSelectedSubmission(null);
      setUnmatchConfirmSubmission(null);
      alert('매칭이 해제되었습니다.');
    },
    onError: (error) => {
      console.error('매칭 해제 실패:', error);
      alert('매칭 해제에 실패했습니다.');
    },
  });

  const markJoinedMutation = useMutation({
    mutationFn: (submissionId: string) => markSubmissionJoined(submissionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      setSelectedSubmission(null);
      setJoinConfirmSubmission(null);
    },
    onError: (error) => {
      console.error('가입 확인 실패:', error);
      alert('가입 확인 처리에 실패했습니다.');
    },
  });

  // 필터링된 지원서 목록 (훅은 조건부 반환 전에 선언)
  const filteredSubmissions = useMemo(
    () => filter === 'all'
      ? submissions
      : submissions.filter(s => s.status === filter),
    [submissions, filter]
  );

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

  const columns = [
    {
      key: 'name',
      header: '이름',
      render: (sub: Submission) => (
        <button
          type="button"
          className="text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 rounded"
          onClick={() => setSelectedSubmission(sub)}
        >
          <div className="font-medium text-primary-600 group-hover:text-primary-700 group-hover:underline">
            {sub.name}
          </div>
          <div className="text-xs text-gray-500">{sub.phone || '-'}</div>
        </button>
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
      header: '상태',
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
        // pending + 이메일 있는 경우: 수동 초대
        if (sub.status === 'pending' && sub.email) {
          return (
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Mail className="w-3 h-3" />}
              onClick={() => setForceInviteSubmission(sub)}
            >
              수동 초대
            </Button>
          );
        }
        // 최초 발송: matched 상태 + 미발송
        if (sub.status === 'matched' && !sub.emailSent) {
          return (
            <Button
              size="sm"
              leftIcon={<Mail className="w-3 h-3" />}
              onClick={() => sendEmailMutation.mutate({ submissionId: sub.submissionId })}
              isLoading={sendEmailMutation.isPending}
            >
              초대 발송
            </Button>
          );
        }
        // invited 상태: 가입 확인 (초록색)
        if (sub.status === 'invited') {
          return (
            <Button
              size="sm"
              variant="success"
              leftIcon={<UserCheck className="w-3 h-3" />}
              onClick={() => setJoinConfirmSubmission(sub)}
            >
              가입 확인
            </Button>
          );
        }
        // 그 외 (matched+발송됨, joined): 버튼 없음 - 상세 모달에서 재전송 가능
        return null;
      },
    },
  ];

  // 모바일 카드 렌더링
  const renderMobileCard = (sub: Submission) => {
    const config = statusConfig[sub.status];
    const deposit = sub.matchedDepositId ? depositMap.get(sub.matchedDepositId) : null;

    return (
      <MobileDataCard
        title={sub.name}
        subtitle={`${sub.studentId} · ${sub.department || '-'}`}
        badge={<Badge variant={config.variant}>{config.label}</Badge>}
        metadata={[
          { label: '학년', value: sub.grade || '-' },
          { label: '이메일', value: sub.email || '-' },
          {
            label: '입금액',
            value: deposit ? (
              <span className="text-green-600 font-medium">
                {new Intl.NumberFormat('ko-KR').format(deposit.amount)}원
              </span>
            ) : '-',
          },
          {
            label: '메일',
            value: sub.emailSent ? (
              <span className="inline-flex items-center gap-1 text-green-600">
                <MailCheck className="w-3.5 h-3.5" />
                발송
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-gray-400">
                <MailX className="w-3.5 h-3.5" />
                미발송
              </span>
            ),
          },
          {
            label: '제출일',
            value: new Date(sub.submittedAt).toLocaleDateString('ko-KR'),
          },
        ]}
        onClick={() => setSelectedSubmission(sub)}
        actions={
          // pending + 이메일: 수동 초대
          sub.status === 'pending' && sub.email ? (
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Mail className="w-4 h-4" />}
              onClick={(e) => {
                e.stopPropagation();
                setForceInviteSubmission(sub);
              }}
              className="w-full"
            >
              수동 초대
            </Button>
          ) : // 최초 발송 (파란색)
          sub.status === 'matched' && !sub.emailSent ? (
            <Button
              size="sm"
              leftIcon={<Mail className="w-4 h-4" />}
              onClick={(e) => {
                e.stopPropagation();
                sendEmailMutation.mutate({ submissionId: sub.submissionId });
              }}
              isLoading={sendEmailMutation.isPending}
              className="w-full"
            >
              초대 메일 발송
            </Button>
          ) : // invited 상태: 가입 확인 (초록색)
          sub.status === 'invited' ? (
            <Button
              size="sm"
              variant="success"
              leftIcon={<UserCheck className="w-4 h-4" />}
              onClick={(e) => {
                e.stopPropagation();
                setJoinConfirmSubmission(sub);
              }}
              className="w-full"
            >
              가입 확인
            </Button>
          ) : // 그 외 (matched+발송됨, joined): 버튼 없음
          undefined
        }
      />
    );
  };

  return (
    <div>
      <PageHeader
        title="지원서 관리"
        description="구글 폼 지원서 목록 및 상태 관리"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={settings?.autoSendInviteEmail ? 'primary' : 'secondary'}
              size="sm"
              leftIcon={settings?.autoSendInviteEmail ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              onClick={() => setShowAutoSendModal(true)}
            >
              자동 발송 {settings?.autoSendInviteEmail ? 'ON' : 'OFF'}
            </Button>
            <Link href="/payments">
              <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                돌아가기
              </Button>
            </Link>
          </div>
        }
      />

      <div className="p-4 sm:p-8">
        {/* 상태 필터 */}
        <div className="mb-6 flex gap-2 flex-wrap">
          <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
            전체 ({statusCounts.all})
          </FilterButton>
          <FilterButton active={filter === 'pending'} onClick={() => setFilter('pending')}>
            <Clock className="w-3 h-3" />
            <span className="hidden sm:inline">입금 대기</span>
            <span className="sm:hidden">대기</span>
            ({statusCounts.pending})
          </FilterButton>
          <FilterButton active={filter === 'matched'} onClick={() => setFilter('matched')}>
            <CheckCircle className="w-3 h-3" />
            <span className="hidden sm:inline">입금 확인</span>
            <span className="sm:hidden">확인</span>
            ({statusCounts.matched})
          </FilterButton>
          <FilterButton active={filter === 'invited'} onClick={() => setFilter('invited')}>
            <Mail className="w-3 h-3" />
            <span className="hidden sm:inline">초대 발송</span>
            <span className="sm:hidden">초대</span>
            ({statusCounts.invited})
          </FilterButton>
          <FilterButton active={filter === 'joined'} onClick={() => setFilter('joined')}>
            <Users className="w-3 h-3" />
            <span className="hidden sm:inline">가입 완료</span>
            <span className="sm:hidden">완료</span>
            ({statusCounts.joined})
          </FilterButton>
        </div>

        <DataTable
          data={filteredSubmissions}
          columns={columns}
          getRowKey={(sub) => sub.submissionId}
          isLoading={isLoading}
          emptyMessage="지원서가 없습니다."
          mobileCardRender={renderMobileCard}
        />
      </div>

      {/* 상세 모달 */}
      <Modal
        isOpen={!!selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
        title="지원서 상세"
        footer={
          <div className="flex items-center justify-between gap-2 w-full">
            {/* 왼쪽: 정보 조회 버튼 */}
            <div>
              {selectedSubmission?.matchedDepositId && (
                <Button
                  variant="ghost"
                  leftIcon={<CreditCard className="w-4 h-4" />}
                  onClick={() => {
                    const deposit = depositMap.get(selectedSubmission.matchedDepositId!);
                    if (deposit) setSelectedDeposit(deposit);
                  }}
                >
                  입금 보기
                </Button>
              )}
            </div>
            {/* 오른쪽: 액션 버튼들 */}
            <div className="flex items-center gap-3">
              {/* 수동 초대 - pending + 이메일 있는 경우 */}
              {selectedSubmission?.status === 'pending' && selectedSubmission?.email && (
                <Button
                  variant="secondary"
                  leftIcon={<Mail className="w-4 h-4" />}
                  onClick={() => setForceInviteSubmission(selectedSubmission)}
                >
                  수동 초대
                </Button>
              )}
              {/* 매칭 해제 - matched 상태에서만 표시 */}
              {selectedSubmission?.status === 'matched' && (
                <Button
                  variant="ghost"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  leftIcon={<Unlink className="w-4 h-4" />}
                  onClick={() => setUnmatchConfirmSubmission(selectedSubmission)}
                >
                  매칭 해제
                </Button>
              )}
              {/* 최초 발송 */}
              {selectedSubmission?.status === 'matched' && !selectedSubmission?.emailSent && (
                <Button
                  leftIcon={<Mail className="w-4 h-4" />}
                  onClick={() => sendEmailMutation.mutate({ submissionId: selectedSubmission.submissionId })}
                  isLoading={sendEmailMutation.isPending}
                >
                  초대 발송
                </Button>
              )}
              {/* 수동 가입 확인 - invited 상태에서만 표시 */}
              {selectedSubmission?.status === 'invited' && (
                <Button
                  variant="success"
                  leftIcon={<UserCheck className="w-4 h-4" />}
                  onClick={() => setJoinConfirmSubmission(selectedSubmission)}
                >
                  가입 확인
                </Button>
              )}
              {/* 재전송 */}
              {(selectedSubmission?.status === 'invited' || selectedSubmission?.emailSent) && (
                <Button
                  variant="secondary"
                  leftIcon={<RotateCw className="w-4 h-4" />}
                  onClick={() => sendEmailMutation.mutate({ submissionId: selectedSubmission.submissionId })}
                  isLoading={sendEmailMutation.isPending}
                >
                  재전송
                </Button>
              )}
            </div>
          </div>
        }
      >
        {selectedSubmission && (
          <div className="p-4 sm:p-6 space-y-4">
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
        )}
      </Modal>

      {/* 입금 상세 모달 */}
      <Modal
        isOpen={!!selectedDeposit}
        onClose={() => setSelectedDeposit(null)}
        title="입금 정보"
        titleIcon={<CreditCard className="w-5 h-5 text-green-600" />}
      >
        {selectedDeposit && (
          <div className="p-4 sm:p-6 space-y-4">
            <InfoRow label="입금자명" value={selectedDeposit.depositorName} />
            <InfoRow
              label="금액"
              value={`${new Intl.NumberFormat('ko-KR').format(selectedDeposit.amount)}원`}
              highlight
            />
            <InfoRow
              label="입금 시각"
              value={new Date(selectedDeposit.timestamp).toLocaleString('ko-KR')}
            />
            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium text-gray-900 mb-2">원본 알림</h4>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap break-all">
                {selectedDeposit.rawNotification || '원본 알림 없음'}
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* 매칭 해제 확인 모달 */}
      <Modal
        isOpen={!!unmatchConfirmSubmission}
        onClose={() => setUnmatchConfirmSubmission(null)}
        title="매칭 해제"
        titleIcon={<Unlink className="w-5 h-5 text-red-600" />}
        footer={
          <div className="flex gap-2 w-full">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => setUnmatchConfirmSubmission(null)}
            >
              취소
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={() => {
                if (unmatchConfirmSubmission) {
                  unmatchMutation.mutate(unmatchConfirmSubmission.submissionId);
                }
              }}
              isLoading={unmatchMutation.isPending}
            >
              매칭 해제
            </Button>
          </div>
        }
      >
        {unmatchConfirmSubmission && (
          <div className="p-4 sm:p-6">
            <p className="text-gray-700 mb-4">
              <span className="font-medium">{unmatchConfirmSubmission.name}</span>님의 매칭을 해제하시겠습니까?
            </p>
            <ul className="text-sm text-gray-600 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-gray-400">•</span>
                <span>지원서가 &quot;입금 대기&quot;로 변경됩니다</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400">•</span>
                <span>연결된 입금이 &quot;매칭 대기&quot;로 변경됩니다</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400">•</span>
                <span>다른 지원서와 재매칭 가능합니다</span>
              </li>
            </ul>
          </div>
        )}
      </Modal>

      {/* 가입 확인 모달 */}
      <Modal
        isOpen={!!joinConfirmSubmission}
        onClose={() => setJoinConfirmSubmission(null)}
        title="가입 확인"
        titleIcon={<UserCheck className="w-5 h-5 text-primary-600" />}
        footer={
          <div className="flex gap-3 w-full">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => setJoinConfirmSubmission(null)}
            >
              취소
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                if (joinConfirmSubmission) {
                  markJoinedMutation.mutate(joinConfirmSubmission.submissionId);
                }
              }}
              isLoading={markJoinedMutation.isPending}
            >
              확인
            </Button>
          </div>
        }
      >
        {joinConfirmSubmission && (
          <div className="p-4 sm:p-6">
            <p className="text-gray-700 mb-4">
              <span className="font-medium">{joinConfirmSubmission.name}</span>님의 가입을 확인하시겠습니까?
            </p>
            <ul className="text-sm text-gray-600 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-gray-400">•</span>
                <span>지원서 상태가 &quot;가입 완료&quot;로 변경됩니다</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400">•</span>
                <span>슬랙 워크스페이스 가입을 수동으로 확인할 때 사용하세요</span>
              </li>
            </ul>
          </div>
        )}
      </Modal>

      {/* 수동 초대 확인 모달 */}
      <Modal
        isOpen={!!forceInviteSubmission}
        onClose={() => setForceInviteSubmission(null)}
        title="수동 초대"
        titleIcon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
        footer={
          <div className="flex gap-2 w-full">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => setForceInviteSubmission(null)}
            >
              취소
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                if (forceInviteSubmission) {
                  sendEmailMutation.mutate({
                    submissionId: forceInviteSubmission.submissionId,
                    force: true,
                  });
                }
              }}
              isLoading={sendEmailMutation.isPending}
            >
              초대 발송
            </Button>
          </div>
        }
      >
        {forceInviteSubmission && (
          <div className="p-4 sm:p-6">
            <p className="text-gray-700 mb-4">
              <span className="font-medium">{forceInviteSubmission.name}</span>님에게 입금 확인 없이 초대 메일을 발송하시겠습니까?
            </p>
            <ul className="text-sm text-gray-600 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-amber-500">•</span>
                <span>입금이 확인되지 않은 상태에서 초대됩니다</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500">•</span>
                <span>지원서 상태가 &quot;초대 발송&quot;으로 변경됩니다</span>
              </li>
            </ul>
          </div>
        )}
      </Modal>

      {/* 자동 발송 설정 모달 */}
      <Modal
        isOpen={showAutoSendModal}
        onClose={() => setShowAutoSendModal(false)}
        title={settings?.autoSendInviteEmail ? '자동 발송 끄기' : '자동 발송 켜기'}
        titleIcon={settings?.autoSendInviteEmail ? <BellOff className="w-5 h-5 text-gray-600" /> : <Bell className="w-5 h-5 text-green-600" />}
        footer={
          <div className="flex gap-3 w-full">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => setShowAutoSendModal(false)}
            >
              취소
            </Button>
            <Button
              className="flex-1"
              variant={settings?.autoSendInviteEmail ? 'secondary' : 'primary'}
              onClick={() => {
                settingsMutation.mutate({
                  autoSendInviteEmail: !settings?.autoSendInviteEmail,
                });
              }}
              isLoading={settingsMutation.isPending}
            >
              {settings?.autoSendInviteEmail ? '끄기' : '켜기'}
            </Button>
          </div>
        }
      >
        <div className="p-4 sm:p-6">
          {settings?.autoSendInviteEmail ? (
            <>
              <p className="text-gray-700 mb-4">
                자동 매칭 성공 시 초대 이메일이 발송되지 않습니다.
              </p>
              <p className="text-sm text-gray-500">
                수동으로 &quot;초대 발송&quot; 버튼을 눌러야 합니다.
              </p>
            </>
          ) : (
            <p className="text-gray-700">
              자동 매칭 성공 시 Slack 초대 이메일이 자동으로 발송됩니다.
            </p>
          )}
        </div>
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
      className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors min-h-[36px] ${
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
    <div className="flex justify-between py-2 border-b border-gray-100 gap-4">
      <span className="text-gray-500 flex-shrink-0">{label}</span>
      <span className={`font-medium text-right break-all ${highlight ? 'text-green-600' : 'text-gray-900'}`}>
        {value}
      </span>
    </div>
  );
}
