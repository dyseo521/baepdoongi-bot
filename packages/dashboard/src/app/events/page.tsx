'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, MapPin, Clock, Send, CheckCircle, Trash2, Pencil, Users, Edit3 } from 'lucide-react';
import { AuthLayout, PageHeader } from '@/components/layout';
import { DataTable, Badge, Button, EventsPageSkeleton } from '@/components/ui';
import { AnnounceModal, CreateEventModal, EditEventModal, RSVPListModal } from '@/components/events';
import { fetchEvents, announceEvent, deleteEvent, createEvent, updateEvent } from '@/lib/api';
import type { Event, EventResponseOption, EventType } from '@baepdoongi/shared';

const statusLabels: Record<string, { label: string; variant: 'success' | 'warning' | 'default' }> = {
  published: { label: '공개', variant: 'success' },
  draft: { label: '초안', variant: 'default' },
  cancelled: { label: '취소됨', variant: 'warning' },
};

const typeLabels: Record<string, string> = {
  meeting: '정기모임',
  seminar: '세미나',
  workshop: '워크샵',
  social: '친목',
  other: '기타',
};

export default function EventsPage() {
  return (
    <AuthLayout>
      <EventsContent />
    </AuthLayout>
  );
}

function EventsContent() {
  const queryClient = useQueryClient();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isAnnounceModalOpen, setIsAnnounceModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRSVPModalOpen, setIsRSVPModalOpen] = useState(false);
  const [announceMode, setAnnounceMode] = useState<'create' | 'edit'>('create');

  const { data: events = [], isLoading, isError, error } = useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: fetchEvents,
    retry: 1,
  });

  // 모든 훅은 조건부 반환 전에 선언해야 함 (React Rules of Hooks)
  const announceMutation = useMutation({
    mutationFn: async ({
      eventId,
      channelId,
      responseOptions,
    }: {
      eventId: string;
      channelId: string;
      responseOptions: EventResponseOption[];
    }) => {
      return announceEvent(eventId, channelId, responseOptions);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (error) => {
      console.error('공지 전송 실패:', error);
      alert('공지 전송에 실패했습니다.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (error) => {
      console.error('이벤트 삭제 실패:', error);
      alert('이벤트 삭제에 실패했습니다.');
    },
  });

  const createMutation = useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (error) => {
      console.error('이벤트 생성 실패:', error);
      alert('이벤트 생성에 실패했습니다.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: Partial<Event> }) =>
      updateEvent(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (error) => {
      console.error('이벤트 수정 실패:', error);
      alert('이벤트 수정에 실패했습니다.');
    },
  });

  // 스켈레톤 로딩 표시
  if (isLoading) {
    return <EventsPageSkeleton />;
  }

  // 에러 표시
  if (isError) {
    return (
      <div className="p-8">
        <div className="card p-8 text-center">
          <div className="text-red-500 mb-2">데이터를 불러오는데 실패했습니다</div>
          <div className="text-sm text-gray-500">{(error as Error)?.message}</div>
        </div>
      </div>
    );
  }

  const handleDelete = async (eventId: string, title: string) => {
    if (confirm(`"${title}" 이벤트를 삭제하시겠습니까?`)) {
      await deleteMutation.mutateAsync(eventId);
    }
  };

  const handleCreate = async (event: {
    title: string;
    description: string;
    datetime: string;
    location: string;
    type: EventType;
  }) => {
    await createMutation.mutateAsync({
      ...event,
      status: 'published',
      createdBy: 'dashboard',
    });
  };

  const handleEdit = async (data: Partial<Event>) => {
    if (!selectedEvent) return;
    await updateMutation.mutateAsync({
      eventId: selectedEvent.eventId,
      data,
    });
  };

  const openEditModal = (event: Event) => {
    setSelectedEvent(event);
    setIsEditModalOpen(true);
  };

  const handleAnnounce = async (channelId: string, responseOptions: EventResponseOption[]) => {
    if (!selectedEvent) return;
    await announceMutation.mutateAsync({
      eventId: selectedEvent.eventId,
      channelId,
      responseOptions,
    });
  };

  const openAnnounceModal = (event: Event, mode: 'create' | 'edit' = 'create') => {
    setSelectedEvent(event);
    setAnnounceMode(mode);
    setIsAnnounceModalOpen(true);
  };

  const openRSVPModal = (event: Event) => {
    setSelectedEvent(event);
    setIsRSVPModalOpen(true);
  };

  const columns = [
    {
      key: 'title',
      header: '이벤트',
      render: (event: Event) => (
        <div>
          <div className="font-medium text-gray-900">{event.title}</div>
          <div className="text-xs text-gray-500 mt-1">
            {typeLabels[event.type] || event.type}
          </div>
        </div>
      ),
    },
    {
      key: 'datetime',
      header: '일시',
      render: (event: Event) => (
        <div className="flex items-center gap-1.5 text-gray-600">
          <Clock className="w-4 h-4" />
          <span>
            {new Date(event.datetime).toLocaleString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      ),
    },
    {
      key: 'location',
      header: '장소',
      render: (event: Event) => (
        <div className="flex items-center gap-1.5 text-gray-600">
          <MapPin className="w-4 h-4" />
          <span>{event.location || '-'}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: '상태',
      render: (event: Event) => {
        const status = statusLabels[event.status] || {
          label: event.status,
          variant: 'default' as const,
        };
        return <Badge variant={status.variant}>{status.label}</Badge>;
      },
    },
    {
      key: 'actions',
      header: '액션',
      render: (event: Event) => (
        <div className="flex items-center gap-2">
          {event.announcement ? (
            <>
              {/* 공지됨 배지 - 클릭하면 공지 수정 모달 열림 */}
              <button
                type="button"
                onClick={() => openAnnounceModal(event, 'edit')}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
                title="클릭하여 공지 수정"
              >
                <CheckCircle className="w-3 h-3" />
                공지됨
                <Edit3 className="w-3 h-3 ml-0.5" />
              </button>
              {/* RSVP 확인 버튼 */}
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<Users className="w-3 h-3" />}
                onClick={() => openRSVPModal(event)}
              >
                응답 확인
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Send className="w-3 h-3" />}
              onClick={() => openAnnounceModal(event, 'create')}
              disabled={event.status === 'cancelled'}
            >
              Slack 공지
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<Pencil className="w-3 h-3" />}
            onClick={() => openEditModal(event)}
          >
            수정
          </Button>
          <Button
            size="sm"
            variant="danger"
            leftIcon={<Trash2 className="w-3 h-3" />}
            onClick={() => handleDelete(event.eventId, event.title)}
            disabled={deleteMutation.isPending}
          >
            삭제
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="이벤트 관리"
        description="동아리 이벤트 생성 및 관리"
        actions={
          <Button
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            새 이벤트
          </Button>
        }
      />

      <div className="p-8">
        <DataTable
          data={events}
          columns={columns}
          getRowKey={(event) => event.eventId}
          isLoading={isLoading}
          emptyMessage="등록된 이벤트가 없습니다."
        />
      </div>

      {/* Slack 공지 모달 */}
      <AnnounceModal
        isOpen={isAnnounceModalOpen}
        onClose={() => setIsAnnounceModalOpen(false)}
        event={selectedEvent}
        onConfirm={handleAnnounce}
        mode={announceMode}
        onEdit={async () => {
          // edit 모드에서는 이벤트 업데이트가 필요없음 (이미 EditEventModal에서 처리)
          // 모달을 닫기만 하면 됨
        }}
      />

      {/* 이벤트 생성 모달 */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onConfirm={handleCreate}
      />

      {/* 이벤트 수정 모달 */}
      <EditEventModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        event={selectedEvent}
        onConfirm={handleEdit}
      />

      {/* RSVP 목록 모달 */}
      <RSVPListModal
        isOpen={isRSVPModalOpen}
        onClose={() => setIsRSVPModalOpen(false)}
        event={selectedEvent}
      />
    </div>
  );
}
