'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, CheckCircle, XCircle, Clock } from 'lucide-react';
import { AuthLayout, PageHeader } from '@/components/layout';
import { DataTable, Badge, Button, SuggestionsPageSkeleton } from '@/components/ui';
import { fetchSuggestions, updateSuggestionStatus } from '@/lib/api';
import type { Suggestion, SuggestionStatus } from '@baepdoongi/shared';

const statusConfig: Record<
  SuggestionStatus,
  { label: string; variant: 'success' | 'warning' | 'info' | 'default'; icon: typeof Clock }
> = {
  pending: { label: '대기 중', variant: 'warning', icon: Clock },
  in_review: { label: '검토 중', variant: 'info', icon: Eye },
  resolved: { label: '완료', variant: 'success', icon: CheckCircle },
  rejected: { label: '반려', variant: 'default', icon: XCircle },
};

const categoryLabels: Record<string, string> = {
  general: '📋 일반',
  study: '📚 스터디',
  event: '🎉 이벤트',
  budget: '💰 회비',
  facility: '🔧 시설',
  other: '💡 기타',
};

export default function SuggestionsPage() {
  return (
    <AuthLayout>
      <SuggestionsContent />
    </AuthLayout>
  );
}

function SuggestionsContent() {
  const queryClient = useQueryClient();
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);

  const { data: suggestions = [], isLoading, isError, error } = useQuery<Suggestion[]>({
    queryKey: ['suggestions'],
    queryFn: fetchSuggestions,
    retry: 1,
  });

  // 모든 훅은 조건부 반환 전에 선언해야 함 (React Rules of Hooks)
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SuggestionStatus }) =>
      updateSuggestionStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
      setSelectedSuggestion(null);
    },
  });

  // 스켈레톤 로딩 표시
  if (isLoading) {
    return <SuggestionsPageSkeleton />;
  }

  // 에러 표시
  if (isError) {
    return (
      <div className="p-8">
        <div className="card p-8 text-center">
          <div className="text-red-500 mb-2">건의사항을 불러오는데 실패했습니다</div>
          <div className="text-sm text-gray-500">{(error as Error)?.message}</div>
        </div>
      </div>
    );
  }

  const handleStatusChange = (suggestionId: string, newStatus: SuggestionStatus) => {
    statusMutation.mutate({ id: suggestionId, status: newStatus });
  };

  const columns = [
    {
      key: 'category',
      header: '분류',
      render: (suggestion: Suggestion) => (
        <span className="text-sm">
          {categoryLabels[suggestion.category] || suggestion.category}
        </span>
      ),
    },
    {
      key: 'title',
      header: '제목',
      render: (suggestion: Suggestion) => (
        <div
          className="cursor-pointer hover:text-primary-600"
          onClick={() => setSelectedSuggestion(suggestion)}
        >
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
        const config = statusConfig[suggestion.status];
        return (
          <select
            value={suggestion.status}
            onChange={(e) =>
              handleStatusChange(suggestion.suggestionId, e.target.value as SuggestionStatus)
            }
            disabled={statusMutation.isPending}
            className={`text-sm px-2 py-1 rounded-lg border-0 cursor-pointer
              ${suggestion.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
              ${suggestion.status === 'in_review' ? 'bg-blue-100 text-blue-800' : ''}
              ${suggestion.status === 'resolved' ? 'bg-green-100 text-green-800' : ''}
              ${suggestion.status === 'rejected' ? 'bg-gray-100 text-gray-800' : ''}
            `}
          >
            <option value="pending">⏳ 대기 중</option>
            <option value="in_review">🔍 검토 중</option>
            <option value="resolved">✅ 완료</option>
            <option value="rejected">❌ 반려</option>
          </select>
        );
      },
    },
    {
      key: 'createdAt',
      header: '등록일',
      render: (suggestion: Suggestion) =>
        new Date(suggestion.createdAt).toLocaleDateString('ko-KR'),
    },
    {
      key: 'actions',
      header: '',
      render: (suggestion: Suggestion) => (
        <Button
          size="sm"
          variant="ghost"
          leftIcon={<Eye className="w-4 h-4" />}
          onClick={() => setSelectedSuggestion(suggestion)}
        >
          상세
        </Button>
      ),
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

      {/* 상세 모달 */}
      {selectedSuggestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelectedSuggestion(null)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-sm text-gray-500">
                    {categoryLabels[selectedSuggestion.category]}
                  </span>
                  <h2 className="text-xl font-semibold mt-1">
                    {selectedSuggestion.title}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedSuggestion(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-gray-700 whitespace-pre-wrap">
                  {selectedSuggestion.content}
                </p>
              </div>

              <div className="text-sm text-gray-500 mb-4">
                등록일: {new Date(selectedSuggestion.createdAt).toLocaleString('ko-KR')}
              </div>

              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  상태 변경
                </label>
                <div className="flex gap-2 flex-wrap">
                  {(Object.keys(statusConfig) as SuggestionStatus[]).map((status) => {
                    const config = statusConfig[status];
                    const isActive = selectedSuggestion.status === status;
                    return (
                      <button
                        key={status}
                        onClick={() =>
                          handleStatusChange(selectedSuggestion.suggestionId, status)
                        }
                        disabled={statusMutation.isPending}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors
                          ${isActive
                            ? 'ring-2 ring-offset-2 ring-primary-500'
                            : 'hover:bg-gray-100'
                          }
                          ${status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                          ${status === 'in_review' ? 'bg-blue-100 text-blue-800' : ''}
                          ${status === 'resolved' ? 'bg-green-100 text-green-800' : ''}
                          ${status === 'rejected' ? 'bg-gray-200 text-gray-800' : ''}
                        `}
                      >
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
