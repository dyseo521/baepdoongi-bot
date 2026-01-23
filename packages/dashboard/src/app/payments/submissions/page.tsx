'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Mail, CheckCircle, Clock, Users, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout';
import { DataTable, Badge, Button } from '@/components/ui';
import { fetchSubmissions } from '@/lib/api';
import type { Submission, SubmissionStatus } from '@baepdoongi/shared';

const statusConfig: Record<SubmissionStatus, { label: string; variant: 'success' | 'warning' | 'info' | 'default' }> = {
  pending: { label: '입금 대기', variant: 'warning' },
  matched: { label: '입금 확인', variant: 'success' },
  invited: { label: '초대 발송', variant: 'info' },
  joined: { label: '가입 완료', variant: 'default' },
};

export default function SubmissionsPage() {
  const { data: submissions = [], isLoading } = useQuery<Submission[]>({
    queryKey: ['submissions'],
    queryFn: fetchSubmissions,
  });

  const columns = [
    {
      key: 'name',
      header: '이름',
      render: (sub: Submission) => (
        <div>
          <div className="font-medium text-gray-900">{sub.name}</div>
          <div className="text-xs text-gray-500">{sub.email}</div>
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
      header: '학과',
      render: (sub: Submission) => sub.department || '-',
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
      key: 'submittedAt',
      header: '제출일',
      render: (sub: Submission) =>
        new Date(sub.submittedAt).toLocaleDateString('ko-KR'),
    },
    {
      key: 'matchedAt',
      header: '매칭/초대',
      render: (sub: Submission) => {
        if (sub.invitedAt) {
          return (
            <div className="text-xs text-green-600">
              <Mail className="w-3 h-3 inline mr-1" />
              {new Date(sub.invitedAt).toLocaleDateString('ko-KR')}
            </div>
          );
        }
        if (sub.matchedAt) {
          return (
            <div className="text-xs text-blue-600">
              <CheckCircle className="w-3 h-3 inline mr-1" />
              {new Date(sub.matchedAt).toLocaleDateString('ko-KR')}
            </div>
          );
        }
        return <span className="text-gray-400">-</span>;
      },
    },
    {
      key: 'actions',
      header: '',
      render: (sub: Submission) => {
        if (sub.status === 'matched') {
          return (
            <Button size="sm" leftIcon={<Mail className="w-3 h-3" />}>
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
          <FilterButton active>전체 ({submissions.length})</FilterButton>
          <FilterButton>
            <Clock className="w-3 h-3" />
            입금 대기 ({submissions.filter(s => s.status === 'pending').length})
          </FilterButton>
          <FilterButton>
            <CheckCircle className="w-3 h-3" />
            입금 확인 ({submissions.filter(s => s.status === 'matched').length})
          </FilterButton>
          <FilterButton>
            <Mail className="w-3 h-3" />
            초대 발송 ({submissions.filter(s => s.status === 'invited').length})
          </FilterButton>
          <FilterButton>
            <Users className="w-3 h-3" />
            가입 완료 ({submissions.filter(s => s.status === 'joined').length})
          </FilterButton>
        </div>

        <DataTable
          data={submissions}
          columns={columns}
          getRowKey={(sub) => sub.submissionId}
          isLoading={isLoading}
          emptyMessage="지원서가 없습니다."
        />
      </div>
    </div>
  );
}

function FilterButton({
  children,
  active,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
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
