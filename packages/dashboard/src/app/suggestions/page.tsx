'use client';

import { useQuery } from '@tanstack/react-query';
import { MessageSquare } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { DataTable, Badge } from '@/components/ui';
import { fetchSuggestions } from '@/lib/api';
import type { Suggestion } from '@baepdoongi/shared';

const statusLabels: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'default' }> = {
  pending: { label: '대기 중', variant: 'warning' },
  in_review: { label: '검토 중', variant: 'info' },
  resolved: { label: '완료', variant: 'success' },
  rejected: { label: '반려', variant: 'default' },
};

const categoryLabels: Record<string, string> = {
  study: '스터디',
  event: '이벤트',
  improvement: '개선',
  other: '기타',
};

export default function SuggestionsPage() {
  const { data: suggestions = [], isLoading } = useQuery<Suggestion[]>({
    queryKey: ['suggestions'],
    queryFn: fetchSuggestions,
  });

  const columns = [
    {
      key: 'category',
      header: '분류',
      render: (suggestion: Suggestion) => (
        <Badge variant="default">
          {categoryLabels[suggestion.category] || suggestion.category}
        </Badge>
      ),
    },
    {
      key: 'title',
      header: '제목',
      render: (suggestion: Suggestion) => (
        <div>
          <div className="font-medium text-gray-900">{suggestion.title}</div>
          <div className="text-xs text-gray-500 mt-1 line-clamp-1">
            {suggestion.content}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: '상태',
      render: (suggestion: Suggestion) => {
        const status = statusLabels[suggestion.status] || {
          label: suggestion.status,
          variant: 'default' as const,
        };
        return <Badge variant={status.variant}>{status.label}</Badge>;
      },
    },
    {
      key: 'createdAt',
      header: '등록일',
      render: (suggestion: Suggestion) =>
        new Date(suggestion.createdAt).toLocaleDateString('ko-KR'),
    },
  ];

  const pendingCount = suggestions.filter((s) => s.status === 'pending').length;

  return (
    <div>
      <PageHeader
        title="건의사항"
        description="익명으로 제출된 건의사항 관리"
      />

      <div className="p-8">
        {/* 요약 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="card p-4">
            <div className="text-sm text-gray-500">전체</div>
            <div className="text-2xl font-bold text-gray-900">
              {suggestions.length}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-gray-500">대기 중</div>
            <div className="text-2xl font-bold text-yellow-600">
              {pendingCount}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-gray-500">검토 중</div>
            <div className="text-2xl font-bold text-blue-600">
              {suggestions.filter((s) => s.status === 'in_review').length}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-gray-500">완료</div>
            <div className="text-2xl font-bold text-green-600">
              {suggestions.filter((s) => s.status === 'resolved').length}
            </div>
          </div>
        </div>

        <DataTable
          data={suggestions}
          columns={columns}
          getRowKey={(suggestion) => suggestion.suggestionId}
          isLoading={isLoading}
          emptyMessage="건의사항이 없습니다."
        />
      </div>
    </div>
  );
}
