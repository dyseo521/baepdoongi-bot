'use client';

import { clsx } from 'clsx';
import { Users, Clock, MessageSquare } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal, Skeleton } from '../ui';
import { fetchEventRSVPs } from '../../lib/api';
import type { Event, RSVPWithMember, EventResponseOption } from '@baepdoongi/shared';

interface RSVPListModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
}

export function RSVPListModal({ isOpen, onClose, event }: RSVPListModalProps) {
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['event-rsvps', event?.eventId],
    queryFn: () => (event ? fetchEventRSVPs(event.eventId) : Promise.resolve(null)),
    enabled: isOpen && !!event,
    staleTime: 30000, // 30초 캐시
  });

  // 응답 옵션 목록 (공지되지 않은 이벤트는 기본 옵션 사용)
  const responseOptions = useMemo<EventResponseOption[]>(() => {
    if (event?.announcement?.responseOptions) {
      return [...event.announcement.responseOptions].sort((a, b) => a.order - b.order);
    }
    return [
      { optionId: 'attend', label: '참석', emoji: '✅', order: 1 },
      { optionId: 'absent', label: '불참', emoji: '❌', order: 2 },
    ];
  }, [event]);

  // 첫 번째 탭을 기본 선택
  const currentTab = activeTab ?? responseOptions[0]?.optionId ?? null;

  // 현재 탭의 RSVP 목록
  const filteredRSVPs = useMemo(() => {
    if (!data?.rsvps) return [];
    return data.rsvps.filter((rsvp) => {
      const optionId = rsvp.responseOptionId || (rsvp.status === 'attending' ? 'attend' : 'absent');
      return optionId === currentTab;
    });
  }, [data?.rsvps, currentTab]);

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}/${day} ${hours}:${minutes}`;
  };

  if (!event) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="응답 현황"
      titleIcon={<Users className="w-5 h-5" />}
      maxWidth="lg"
    >
      <div className="min-h-[300px]">
        {/* 탭 네비게이션 */}
        <div className="flex gap-1 border-b border-gray-200 mb-4 overflow-x-auto">
          {responseOptions.map((option) => {
            const count = data?.summary[option.optionId] || 0;
            const isActive = currentTab === option.optionId;
            return (
              <button
                key={option.optionId}
                type="button"
                onClick={() => setActiveTab(option.optionId)}
                className={clsx(
                  'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap',
                  'border-b-2 transition-colors',
                  isActive
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                {option.emoji && <span>{option.emoji}</span>}
                <span>{option.label}</span>
                <span
                  className={clsx(
                    'ml-1 px-1.5 py-0.5 rounded-full text-xs',
                    isActive
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-gray-100 text-gray-600'
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 로딩 상태 */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="w-24 h-4 mb-1" />
                  <Skeleton className="w-16 h-3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 에러 상태 */}
        {error && (
          <div className="text-center py-8 text-red-600">
            응답 목록을 불러오는데 실패했습니다
          </div>
        )}

        {/* RSVP 목록 */}
        {!isLoading && !error && (
          <>
            {filteredRSVPs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>아직 응답한 회원이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredRSVPs.map((rsvp) => (
                  <RSVPItem key={rsvp.memberId} rsvp={rsvp} formatTime={formatTime} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

interface RSVPItemProps {
  rsvp: RSVPWithMember;
  formatTime: (isoString: string) => string;
}

function RSVPItem({ rsvp, formatTime }: RSVPItemProps) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
      {/* 아바타 */}
      {rsvp.memberImageUrl ? (
        <img
          src={rsvp.memberImageUrl}
          alt={rsvp.memberName || '회원'}
          className="w-10 h-10 rounded-full object-cover"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
          <span className="text-gray-500 text-sm font-medium">
            {(rsvp.memberName || '?')[0]}
          </span>
        </div>
      )}

      {/* 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 truncate">
            {rsvp.memberName || rsvp.memberId}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
          <Clock className="w-3 h-3" />
          <span>{formatTime(rsvp.respondedAt)}</span>
        </div>

        {/* 입력값 표시 */}
        {rsvp.inputValue && (
          <div className="mt-2 flex items-start gap-1.5 text-sm text-gray-600 bg-gray-50 rounded px-2 py-1.5">
            <MessageSquare className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-400" />
            <span className="whitespace-pre-wrap">{rsvp.inputValue}</span>
          </div>
        )}
      </div>
    </div>
  );
}
