'use client';

import { clsx } from 'clsx';
import { Users, Clock, MessageSquare, Check, History, X } from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal, Skeleton } from '../ui';
import { DMSendSection } from './dm-send-section';
import { fetchEventRSVPs, getEventDMHistory } from '../../lib/api';
import type { Event, RSVPWithMember, EventResponseOption, BulkDMJob } from '@baepdoongi/shared';
import { DM_TEMPLATES } from '@baepdoongi/shared';

export interface RSVPListModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
}

/** 템플릿 ID로 이름 가져오기 */
function getTemplateName(templateId: string): string {
  const template = DM_TEMPLATES.find(t => t.templateId === templateId);
  return template?.name || templateId;
}

/** 날짜 포맷 */
function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

/** DM 발송 이력 섹션 */
function DMHistorySection({ eventId }: { eventId: string }) {
  const [selectedJob, setSelectedJob] = useState<BulkDMJob | null>(null);

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['dm-history', eventId],
    queryFn: () => getEventDMHistory(eventId),
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="mt-4 pt-4 border-t border-gray-200 pl-1">
        <Skeleton className="w-32 h-4 mb-2" />
        <Skeleton className="w-full h-8" />
      </div>
    );
  }

  if (!jobs || jobs.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-gray-200 pl-1">
      <div className="flex items-center gap-2 mb-3 ml-1">
        <History className="w-4 h-4 text-gray-500" />
        <h4 className="text-sm font-medium text-gray-700">최근 DM 발송 이력</h4>
      </div>
      <div className="space-y-2">
        {jobs.map((job: BulkDMJob) => (
          <button
            key={job.jobId}
            type="button"
            onClick={() => setSelectedJob(selectedJob?.jobId === job.jobId ? null : job)}
            className={clsx(
              'w-full flex items-center justify-between text-sm text-gray-600 rounded-lg px-3 py-2 transition-colors text-left',
              selectedJob?.jobId === job.jobId ? 'bg-primary-50 ring-1 ring-primary-200' : 'bg-gray-50 hover:bg-gray-100'
            )}
          >
            <span className="font-medium">{getTemplateName(job.templateId)}</span>
            <span className={clsx(
              job.failedCount > 0 ? 'text-orange-600' : 'text-green-600'
            )}>
              {job.sentCount}명 발송
              {job.failedCount > 0 && ` (${job.failedCount}건 실패)`}
            </span>
            <span className="text-gray-400">
              {job.completedAt ? formatDateTime(job.completedAt) : formatDateTime(job.createdAt)}
            </span>
          </button>
        ))}
      </div>

      {/* 선택된 작업 상세 정보 */}
      {selectedJob && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h5 className="font-medium text-gray-800">{getTemplateName(selectedJob.templateId)} 상세</h5>
            <button
              type="button"
              onClick={() => setSelectedJob(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-gray-500">발송 대상</dt>
              <dd className="font-medium text-gray-800">{selectedJob.totalCount}명</dd>
            </div>
            <div>
              <dt className="text-gray-500">발송 성공</dt>
              <dd className="font-medium text-green-600">{selectedJob.sentCount}명</dd>
            </div>
            <div>
              <dt className="text-gray-500">발송 실패</dt>
              <dd className={clsx('font-medium', selectedJob.failedCount > 0 ? 'text-red-600' : 'text-gray-600')}>
                {selectedJob.failedCount}명
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">발송 일시</dt>
              <dd className="font-medium text-gray-800">
                {selectedJob.completedAt ? formatDateTime(selectedJob.completedAt) : formatDateTime(selectedJob.createdAt)}
              </dd>
            </div>
            {selectedJob.customMessage && (
              <div className="col-span-2">
                <dt className="text-gray-500 mb-1">추가 메시지</dt>
                <dd className="font-medium text-gray-800 bg-white p-2 rounded border border-gray-100 whitespace-pre-wrap">
                  {selectedJob.customMessage}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}

export function RSVPListModal({ isOpen, onClose, event }: RSVPListModalProps) {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['event-rsvps', event?.eventId],
    queryFn: () => (event ? fetchEventRSVPs(event.eventId) : Promise.resolve(null)),
    enabled: isOpen && !!event,
    staleTime: 30000, // 30초 캐시
  });

  // 응답 옵션 목록 (공지되지 않은 이벤트는 기본 옵션 사용)
  // '전체' 탭을 맨 앞에 추가하여 모든 응답자에게 DM 발송 가능
  const responseOptions = useMemo<EventResponseOption[]>(() => {
    const allOption: EventResponseOption = {
      optionId: 'all',
      label: '전체',
      emoji: '👥',
      order: 0,
    };

    if (event?.announcement?.responseOptions) {
      const options = [...event.announcement.responseOptions].sort((a, b) => a.order - b.order);
      return [allOption, ...options];
    }
    return [
      allOption,
      { optionId: 'attend', label: '참석', emoji: '✅', order: 1 },
      { optionId: 'absent', label: '불참', emoji: '❌', order: 2 },
    ];
  }, [event]);

  // 첫 번째 탭을 기본 선택
  const currentTab = activeTab ?? responseOptions[0]?.optionId ?? null;

  // 현재 탭의 RSVP 목록 (중복 선택 모드 지원)
  const filteredRSVPs = useMemo(() => {
    if (!data?.rsvps) return [];

    // '전체' 탭이면 모든 응답자 반환
    if (currentTab === 'all') {
      return data.rsvps;
    }

    return data.rsvps.filter((rsvp) => {
      // 중복 선택 모드인 경우 responseOptionIds 배열 확인
      if (rsvp.responseOptionIds && rsvp.responseOptionIds.length > 0) {
        return rsvp.responseOptionIds.includes(currentTab ?? '');
      }
      // 단일 선택 모드
      const optionId = rsvp.responseOptionId || (rsvp.status === 'attending' ? 'attend' : 'absent');
      return optionId === currentTab;
    });
  }, [data?.rsvps, currentTab]);

  // 현재 탭의 모든 회원 ID
  const currentTabMemberIds = useMemo(() => {
    return filteredRSVPs.map((rsvp) => rsvp.memberId);
  }, [filteredRSVPs]);

  // 현재 탭에서 선택된 회원만 필터링
  const selectedInCurrentTab = useMemo(() => {
    return currentTabMemberIds.filter((id) => selectedMembers.has(id));
  }, [currentTabMemberIds, selectedMembers]);

  // 전체 선택 상태
  const isAllSelected = currentTabMemberIds.length > 0 &&
    selectedInCurrentTab.length === currentTabMemberIds.length;

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}/${day} ${hours}:${minutes}`;
  };

  // 전체 선택/해제
  const handleSelectAll = useCallback(() => {
    if (isAllSelected) {
      // 현재 탭 회원 전체 해제
      setSelectedMembers((prev) => {
        const next = new Set(prev);
        currentTabMemberIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      // 현재 탭 회원 전체 선택
      setSelectedMembers((prev) => {
        const next = new Set(prev);
        currentTabMemberIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [isAllSelected, currentTabMemberIds]);

  // 개별 선택/해제
  const handleToggleMember = useCallback((memberId: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  }, []);

  // DM 발송 완료 후 처리
  const handleDMSent = useCallback(() => {
    setSelectedMembers(new Set());
    refetch();
  }, [refetch]);

  // 모달 닫을 때 선택 초기화
  const handleClose = useCallback(() => {
    setSelectedMembers(new Set());
    setActiveTab(null);
    onClose();
  }, [onClose]);

  if (!event) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="응답 현황 및 DM 발송"
      titleIcon={<Users className="w-5 h-5" />}
      maxWidth="2xl"
    >
      <div className="min-h-[400px]">
        {/* 탭 네비게이션 */}
        <div className="flex gap-1 border-b border-gray-200 mb-4 overflow-x-auto">
          {responseOptions.map((option) => {
            // '전체' 탭은 전체 응답자 수, 나머지는 summary에서 가져옴
            const count = option.optionId === 'all'
              ? data?.rsvps?.length || 0
              : data?.summary[option.optionId] || 0;
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
            {/* DM 발송 섹션 */}
            <DMSendSection
              event={event}
              selectedUserIds={Array.from(selectedMembers)}
              onDMSent={handleDMSent}
              onCloseModal={handleClose}
            />

            {filteredRSVPs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>아직 응답한 회원이 없습니다</p>
              </div>
            ) : (
              <>
                {/* 전체 선택 체크박스 */}
                <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 mb-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className={clsx(
                      'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                      isAllSelected
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : 'border-gray-300 hover:border-primary-500'
                    )}
                  >
                    {isAllSelected && <Check className="w-3 h-3" />}
                  </button>
                  <span className="text-sm text-gray-700">
                    전체 선택 ({filteredRSVPs.length}명)
                  </span>
                  {selectedInCurrentTab.length > 0 && (
                    <span className="text-xs text-primary-600 ml-auto">
                      {selectedInCurrentTab.length}명 선택됨
                    </span>
                  )}
                </div>

                {/* 회원 목록 */}
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  {filteredRSVPs.map((rsvp) => (
                    <RSVPItem
                      key={rsvp.memberId}
                      rsvp={rsvp}
                      formatTime={formatTime}
                      isSelected={selectedMembers.has(rsvp.memberId)}
                      onToggle={() => handleToggleMember(rsvp.memberId)}
                    />
                  ))}
                </div>
              </>
            )}

            {/* DM 발송 이력 섹션 */}
            <DMHistorySection eventId={event.eventId} />
          </>
        )}
      </div>
    </Modal>
  );
}

interface RSVPItemProps {
  rsvp: RSVPWithMember;
  formatTime: (isoString: string) => string;
  isSelected: boolean;
  onToggle: () => void;
}

function RSVPItem({ rsvp, formatTime, isSelected, onToggle }: RSVPItemProps) {
  return (
    <div
      className={clsx(
        'flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer',
        isSelected ? 'bg-primary-50' : 'hover:bg-gray-50'
      )}
      onClick={onToggle}
    >
      {/* 체크박스 */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={clsx(
          'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 mt-1',
          isSelected
            ? 'bg-primary-600 border-primary-600 text-white'
            : 'border-gray-300 hover:border-primary-500'
        )}
      >
        {isSelected && <Check className="w-3 h-3" />}
      </button>

      {/* 아바타 */}
      {rsvp.memberImageUrl ? (
        <img
          src={rsvp.memberImageUrl}
          alt={rsvp.memberName || '회원'}
          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
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
