'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, AlertTriangle, CheckCircle, RefreshCw, MessageSquare, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { AuthLayout, PageHeader } from '@/components/layout';
import { DataTable, Badge, Button } from '@/components/ui';
import { fetchMembers, syncMembers, warnMember } from '@/lib/api';
import type { Member } from '@baepdoongi/shared';

type SortKey = 'displayName' | 'realName' | 'isNameValid' | 'warningCount' | 'joinedAt';
type SortDirection = 'asc' | 'desc';

export default function MembersPage() {
  return (
    <AuthLayout>
      <MembersContent />
    </AuthLayout>
  );
}

function MembersContent() {
  const queryClient = useQueryClient();
  const [sortKey, setSortKey] = useState<SortKey>('displayName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const { data: members = [], isLoading, refetch } = useQuery<Member[]>({
    queryKey: ['members'],
    queryFn: () => fetchMembers('slack'),
  });

  // 정렬된 데이터
  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      let comparison = 0;

      switch (sortKey) {
        case 'displayName':
          comparison = a.displayName.localeCompare(b.displayName);
          break;
        case 'realName':
          comparison = a.realName.localeCompare(b.realName);
          break;
        case 'isNameValid':
          comparison = (a.isNameValid === b.isNameValid) ? 0 : a.isNameValid ? -1 : 1;
          break;
        case 'warningCount':
          comparison = a.warningCount - b.warningCount;
          break;
        case 'joinedAt':
          comparison = new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [members, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) {
      return <ChevronsUpDown className="w-3 h-3 ml-1 text-gray-400" />;
    }
    return sortDirection === 'asc'
      ? <ChevronUp className="w-3 h-3 ml-1" />
      : <ChevronDown className="w-3 h-3 ml-1" />;
  };

  const SortableHeader = ({ label, columnKey }: { label: string; columnKey: SortKey }) => (
    <button
      type="button"
      onClick={() => handleSort(columnKey)}
      className="flex items-center hover:text-gray-700 focus:outline-none focus:text-gray-700"
    >
      {label}
      <SortIcon columnKey={columnKey} />
    </button>
  );

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
      header: <SortableHeader label="표시 이름" columnKey="displayName" />,
      render: (member: Member) => (
        <div>
          <div className="font-medium text-gray-900">{member.displayName}</div>
          <div className="text-xs text-gray-500">{member.email}</div>
        </div>
      ),
    },
    {
      key: 'realName',
      header: <SortableHeader label="실명" columnKey="realName" />,
      render: (member: Member) => member.realName,
    },
    {
      key: 'isNameValid',
      header: <SortableHeader label="이름 형식" columnKey="isNameValid" />,
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
      header: <SortableHeader label="경고 횟수" columnKey="warningCount" />,
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
      header: <SortableHeader label="가입일" columnKey="joinedAt" />,
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
              leftIcon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />}
              onClick={() => refetch()}
              disabled={isLoading}
              aria-label="회원 목록 새로고침"
            >
              새로고침
            </Button>
            <Button
              variant="secondary"
              leftIcon={<MessageSquare className="w-4 h-4" aria-hidden="true" />}
              onClick={handleWarnAll}
              disabled={warnMutation.isPending}
              aria-label="이름 형식 미준수 회원에게 전체 경고 DM 발송"
            >
              미준수 전체 경고
            </Button>
            <Button
              variant="primary"
              leftIcon={<Download className="w-4 h-4" aria-hidden="true" />}
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              aria-label="Slack 회원 정보 DB 동기화"
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
          data={sortedMembers}
          columns={columns}
          getRowKey={(member) => member.slackId}
          isLoading={isLoading}
          emptyMessage="등록된 회원이 없습니다."
        />
      </div>
    </div>
  );
}
