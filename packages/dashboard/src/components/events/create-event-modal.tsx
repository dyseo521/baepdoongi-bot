'use client';

import { useState } from 'react';
import { Button, Modal, RichTextEditor } from '@/components/ui';
import type { EventType } from '@baepdoongi/shared';

export interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (event: {
    title: string;
    description: string;
    datetime: string;
    location: string;
    type: EventType;
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    isMultiDay: boolean;
    hasTime: boolean;
  }) => Promise<void>;
}

const eventTypes = [
  { value: 'meeting', label: '정기모임' },
  { value: 'seminar', label: '세미나' },
  { value: 'workshop', label: '워크샵' },
  { value: 'social', label: '친목' },
  { value: 'other', label: '기타' },
];

// 10분 단위 시간 옵션 생성
const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 10) {
    TIME_OPTIONS.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
  }
}

export function CreateEventModal({ isOpen, onClose, onConfirm }: CreateEventModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState<EventType>('meeting');
  const [isLoading, setIsLoading] = useState(false);

  // 새 날짜/시간 상태
  const [isDateUndetermined, setIsDateUndetermined] = useState(false);
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [hasTime, setHasTime] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || (!isDateUndetermined && !startDate)) return;

    setIsLoading(true);
    try {
      // datetime 생성 (하위 호환성)
      let datetime: string;
      if (isDateUndetermined) {
        // 미정인 경우 빈 문자열 또는 특수 플레이스홀더 사용
        datetime = '';
      } else if (hasTime && startTime) {
        datetime = new Date(`${startDate}T${startTime}`).toISOString();
      } else {
        datetime = new Date(`${startDate}T00:00:00`).toISOString();
      }

      await onConfirm({
        title,
        description,
        datetime,
        location,
        type,
        ...(!isDateUndetermined && startDate && { startDate }),
        ...(isMultiDay && endDate && { endDate }),
        ...(hasTime && startTime && { startTime }),
        ...(hasTime && endTime && { endTime }),
        isMultiDay: isDateUndetermined ? false : isMultiDay,
        hasTime: isDateUndetermined ? false : hasTime,
      });
      // 폼 초기화
      setTitle('');
      setDescription('');
      setLocation('');
      setType('meeting');
      setIsDateUndetermined(false);
      setIsMultiDay(false);
      setHasTime(false);
      setStartDate('');
      setEndDate('');
      setStartTime('');
      setEndTime('');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="새 이벤트 만들기"
      maxWidth="lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button
            type="submit"
            form="create-event-form"
            isLoading={isLoading}
            disabled={!title || (!isDateUndetermined && !startDate)}
          >
            이벤트 생성
          </Button>
        </>
      }
    >
      <form id="create-event-form" onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label htmlFor="event-title" className="block text-sm font-medium text-gray-700 mb-1">
            이벤트 제목 *
          </label>
          <input
            id="event-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 2026 개강총회"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            required
          />
        </div>

        {/* 일시 미정 체크박스 */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isDateUndetermined}
              onChange={(e) => {
                setIsDateUndetermined(e.target.checked);
                if (e.target.checked) {
                  setStartDate('');
                  setEndDate('');
                  setStartTime('');
                  setEndTime('');
                  setIsMultiDay(false);
                  setHasTime(false);
                }
              }}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">일시 미정</span>
          </label>
        </div>

        {/* 날짜 유형 선택 (미정이 아닐 때만) */}
        {!isDateUndetermined && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              일정 유형 *
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="dateType"
                  checked={!isMultiDay}
                  onChange={() => {
                    setIsMultiDay(false);
                    setEndDate('');
                  }}
                  className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">하루</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="dateType"
                  checked={isMultiDay}
                  onChange={() => setIsMultiDay(true)}
                  className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">여러 날</span>
              </label>
            </div>
          </div>
        )}

        {/* 날짜 입력 (미정이 아닐 때만) */}
        {!isDateUndetermined && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="event-start-date" className="block text-sm font-medium text-gray-700 mb-1">
                {isMultiDay ? '시작 날짜 *' : '날짜 *'}
              </label>
              <input
                id="event-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 cursor-pointer"
                required={!isDateUndetermined}
              />
            </div>
            {isMultiDay && (
              <div>
                <label htmlFor="event-end-date" className="block text-sm font-medium text-gray-700 mb-1">
                  종료 날짜 *
                </label>
                <input
                  id="event-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                  min={startDate}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 cursor-pointer"
                  required={isMultiDay}
                />
              </div>
            )}
          </div>
        )}

        {/* 시간 지정 여부 (미정이 아닐 때만) */}
        {!isDateUndetermined && (
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasTime}
                onChange={(e) => {
                  setHasTime(e.target.checked);
                  if (!e.target.checked) {
                    setStartTime('');
                    setEndTime('');
                  }
                }}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">시간 지정</span>
            </label>
          </div>
        )}

        {/* 시간 입력 (미정이 아니고 시간 지정 시만) */}
        {!isDateUndetermined && hasTime && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="event-start-time" className="block text-sm font-medium text-gray-700 mb-1">
                시작 시간
              </label>
              <select
                id="event-start-time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">시간 선택</option>
                {TIME_OPTIONS.map((time) => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="event-end-time" className="block text-sm font-medium text-gray-700 mb-1">
                종료 시간
              </label>
              <select
                id="event-end-time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">시간 선택</option>
                {TIME_OPTIONS.map((time) => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="event-location" className="block text-sm font-medium text-gray-700 mb-1">
            장소
          </label>
          <input
            id="event-location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="예: 동아리방 (5동 지하 003호)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label htmlFor="event-type" className="block text-sm font-medium text-gray-700 mb-1">
            유형
          </label>
          <select
            id="event-type"
            value={type}
            onChange={(e) => setType(e.target.value as EventType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {eventTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            설명
          </label>
          <RichTextEditor
            value={description}
            onChange={setDescription}
            placeholder="이벤트 설명을 입력하세요 (Slack 서식 지원)"
            rows={4}
          />
        </div>
      </form>
    </Modal>
  );
}
