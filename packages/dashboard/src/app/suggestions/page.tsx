'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import { AuthLayout, PageHeader } from '@/components/layout';
import { DataTable, Badge, Button, Modal, SuggestionsPageSkeleton, StatusDropdown, statusConfig } from '@/components/ui';
import { fetchSuggestions, updateSuggestionStatus } from '@/lib/api';
import type { Suggestion, SuggestionStatus } from '@baepdoongi/shared';

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
    onError: (error) => {
      console.error('상태 변경 실패:', error);
      alert('상태 변경에 실패했습니다.');
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
      render: (suggestion: Suggestion) => (
        <StatusDropdown
          value={suggestion.status}
          onChange={(newStatus) => handleStatusChange(suggestion.suggestionId, newStatus)}
          disabled={statusMutation.isPending}
        />
      ),
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
      <Modal
        isOpen={!!selectedSuggestion}
        onClose={() => setSelectedSuggestion(null)}
        title={selectedSuggestion?.title || '건의사항'}
      >
        {selectedSuggestion && (
          <div className="p-6">
            <div className="mb-4">
              <span className="text-sm text-gray-500">
                {categoryLabels[selectedSuggestion.category]}
              </span>
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
              <div className="flex gap-2 flex-wrap" role="group" aria-label="상태 변경 버튼">
                {(Object.keys(statusConfig) as SuggestionStatus[]).map((status) => {
                  const config = statusConfig[status];
                  const Icon = config.icon;
                  const isActive = selectedSuggestion.status === status;
                  return (
                    <button
                      key={status}
                      onClick={() =>
                        handleStatusChange(selectedSuggestion.suggestionId, status)
                      }
                      disabled={statusMutation.isPending}
                      aria-pressed={isActive}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                        ${config.bg} ${config.text}
                        ${isActive ? 'ring-2 ring-offset-2 ring-primary-500' : 'hover:opacity-80'}
                      `}
                    >
                      <Icon className="w-4 h-4" />
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
