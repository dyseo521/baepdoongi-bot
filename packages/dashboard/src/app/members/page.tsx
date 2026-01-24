'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, AlertTriangle, CheckCircle, RefreshCw, MessageSquare } from 'lucide-react';
import { AuthLayout, PageHeader } from '@/components/layout';
import { DataTable, Badge, Button } from '@/components/ui';
import { fetchMembers, syncMembers, warnMember } from '@/lib/api';
import type { Member } from '@baepdoongi/shared';

export default function MembersPage() {
  return (
    <AuthLayout>
      <MembersContent />
    </AuthLayout>
  );
}

function MembersContent() {
  const queryClient = useQueryClient();

  const { data: members = [], isLoading, refetch } = useQuery<Member[]>({
    queryKey: ['members'],
    queryFn: () => fetchMembers('slack'),
  });

  const syncMutation = useMutation({
    mutationFn: syncMembers,
    onSuccess: (data) => {
      alert(`${data.count}명의 회원을 DB에 동기화했습니다.`);
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });

  const warnMutation = useMutation({
    mutationFn: warnMember,
    onSuccess: () => {
      alert('경고 DM을 전송했습니다.');
    },
    onError: () => {
      alert('DM 전송에 실패했습니다.');
    },
  });

  const handleWarn = (member: Member) => {
    if (confirm(`"${member.displayName}"에게 이름 형식 경고 DM을 보내시겠습니까?`)) {
      warnMutation.mutate(member.slackId);
    }
  };

  const handleWarnAll = () => {
    const invalidMembers = members.filter((m) => !m.isNameValid);
    if (invalidMembers.length === 0) {
      alert('이름 형식 미준수 회원이 없습니다.');
      return;
    }
    if (confirm(`이름 형식 미준수 ${invalidMembers.length}명에게 경고 DM을 보내시겠습니까?`)) {
      invalidMembers.forEach((m) => warnMutation.mutate(m.slackId));
    }
  };

  const columns = [
    {
      key: 'displayName',
      header: '표시 이름',
      render: (member: Member) => (
        <div>
          <div className="font-medium text-gray-900">{member.displayName}</div>
          <div className="text-xs text-gray-500">{member.email}</div>
        </div>
      ),
    },
    {
      key: 'realName',
      header: '실명',
      render: (member: Member) => member.realName,
    },
    {
      key: 'isNameValid',
      header: '이름 형식',
      render: (member: Member) =>
        member.isNameValid ? (
          <Badge variant="success">
            <CheckCircle className="w-3 h-3 mr-1" />
            준수
          </Badge>
        ) : (
          <Badge variant="error">
            <AlertTriangle className="w-3 h-3 mr-1" />
            미준수
          </Badge>
        ),
    },
    {
      key: 'warningCount',
      header: '경고 횟수',
      render: (member: Member) => (
        <span
          className={member.warningCount > 0 ? 'text-red-600 font-medium' : ''}
        >
          {member.warningCount}
        </span>
      ),
    },
    {
      key: 'joinedAt',
      header: '가입일',
      render: (member: Member) =>
        new Date(member.joinedAt).toLocaleDateString('ko-KR'),
    },
    {
      key: 'actions',
      header: '액션',
      render: (member: Member) =>
        !member.isNameValid ? (
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<MessageSquare className="w-3 h-3" />}
            onClick={() => handleWarn(member)}
            disabled={warnMutation.isPending}
          >
            경고 DM
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        title="회원 관리"
        description="동아리 회원 목록 및 이름 형식 준수 현황"
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              leftIcon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
              onClick={() => refetch()}
              disabled={isLoading}
            >
              새로고침
            </Button>
            <Button
              variant="secondary"
              leftIcon={<MessageSquare className="w-4 h-4" />}
              onClick={handleWarnAll}
              disabled={warnMutation.isPending}
            >
              미준수 전체 경고
            </Button>
            <Button
              variant="primary"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              DB 동기화
            </Button>
          </div>
        }
      />

      <div className="p-8">
        {/* 요약 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card p-4">
            <div className="text-sm text-gray-500">전체 회원</div>
            <div className="text-2xl font-bold text-gray-900">
              {members.length}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-gray-500">이름 형식 준수</div>
            <div className="text-2xl font-bold text-green-600">
              {members.filter((m) => m.isNameValid).length}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-gray-500">이름 형식 미준수</div>
            <div className="text-2xl font-bold text-red-600">
              {members.filter((m) => !m.isNameValid).length}
            </div>
          </div>
        </div>

        {/* 회원 테이블 */}
        <DataTable
          data={members}
          columns={columns}
          getRowKey={(member) => member.slackId}
          isLoading={isLoading}
          emptyMessage="등록된 회원이 없습니다."
        />
      </div>
    </div>
  );
}
