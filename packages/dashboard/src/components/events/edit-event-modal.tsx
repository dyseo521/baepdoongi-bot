'use client';

import { useState, useEffect } from 'react';
import { Megaphone } from 'lucide-react';
import { Button, Modal, RichTextEditor } from '@/components/ui';
import type { Event, EventType } from '@baepdoongi/shared';

const formatAnnouncedAt = (isoString: string): string => {
  const date = new Date(isoString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${month}/${day}(${weekday}) ${hours}:${minutes}`;
};

interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
  onConfirm: (event: Partial<Event>) => Promise<void>;
}

const eventTypes = [
  { value: 'meeting', label: '정기모임' },
  { value: 'seminar', label: '세미나' },
  { value: 'workshop', label: '워크샵' },
  { value: 'social', label: '친목' },
  { value: 'other', label: '기타' },
];

export function EditEventModal({ isOpen, onClose, event, onConfirm }: EditEventModalProps) {
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

  // 이벤트가 변경되면 폼 초기화
  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setLocation(event.location || '');
      setType(event.type || 'meeting');

      // datetime이 비어있으면 미정
      if (!event.datetime) {
        setIsDateUndetermined(true);
        setStartDate('');
        setEndDate('');
        setStartTime('');
        setEndTime('');
        setIsMultiDay(false);
        setHasTime(false);
      } else if (event.startDate) {
        // 새 필드가 있으면 사용
        setIsDateUndetermined(false);
        setStartDate(event.startDate);
        setEndDate(event.endDate || '');
        setStartTime(event.startTime || '');
        setEndTime(event.endTime || '');
        setIsMultiDay(event.isMultiDay || false);
        setHasTime(event.hasTime || false);
      } else {
        // 기존 datetime에서 날짜/시간 추출
        setIsDateUndetermined(false);
        const dt = new Date(event.datetime);
        setStartDate(dt.toISOString().slice(0, 10));
        setEndDate('');
        setStartTime(dt.toTimeString().slice(0, 5));
        setEndTime('');
        setIsMultiDay(false);
        setHasTime(true); // 기존 이벤트는 시간이 있다고 가정
      }
    }
  }, [event]);

  if (!event) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || (!isDateUndetermined && !startDate)) return;

    setIsLoading(true);
    try {
      // datetime 생성 (하위 호환성)
      let datetime: string;
      if (isDateUndetermined) {
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
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="이벤트 수정"
      maxWidth="lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button
            type="submit"
            form="edit-event-form"
            isLoading={isLoading}
            disabled={!title || (!isDateUndetermined && !startDate)}
          >
            {event.announcement ? '수정 및 Slack 업데이트' : '수정'}
          </Button>
        </>
      }
    >
      <form id="edit-event-form" onSubmit={handleSubmit} className="p-6 space-y-4">
        {event.announcement && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <div className="flex items-center gap-2 mb-3">
              <Megaphone className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-800">Slack 공지 정보</span>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-blue-700">
              <div>
                <dt className="text-xs text-blue-500">공지 채널</dt>
                <dd className="font-medium">#{event.announcement.channelName}</dd>
              </div>
              <div>
                <dt className="text-xs text-blue-500">공지 일시</dt>
                <dd className="font-medium">
                  {formatAnnouncedAt(event.announcement.announcedAt)}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-blue-500">응답 옵션</dt>
                <dd className="flex flex-wrap gap-1 mt-1">
                  {event.announcement.responseOptions.map((opt) => (
                    <span
                      key={opt.optionId}
                      className="px-2 py-0.5 bg-blue-100 rounded text-xs"
                    >
                      {opt.emoji} {opt.label}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-blue-600 border-t border-blue-200 pt-2">
              수정하면 Slack 메시지도 함께 업데이트됩니다.
            </p>
          </div>
        )}

        <div>
          <label htmlFor="edit-event-title" className="block text-sm font-medium text-gray-700 mb-1">
            이벤트 제목 *
          </label>
          <input
            id="edit-event-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 2024 정기 총회"
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
                  name="editDateType"
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
                  name="editDateType"
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
              <label htmlFor="edit-event-start-date" className="block text-sm font-medium text-gray-700 mb-1">
                {isMultiDay ? '시작 날짜 *' : '날짜 *'}
              </label>
              <input
                id="edit-event-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 cursor-pointer"
                required={!isDateUndetermined}
              />
            </div>
            {isMultiDay && (
              <div>
                <label htmlFor="edit-event-end-date" className="block text-sm font-medium text-gray-700 mb-1">
                  종료 날짜 *
                </label>
                <input
                  id="edit-event-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
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
              <label htmlFor="edit-event-start-time" className="block text-sm font-medium text-gray-700 mb-1">
                시작 시간
              </label>
              <input
                id="edit-event-start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 cursor-pointer"
              />
            </div>
            <div>
              <label htmlFor="edit-event-end-time" className="block text-sm font-medium text-gray-700 mb-1">
                종료 시간
              </label>
              <input
                id="edit-event-end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="edit-event-location" className="block text-sm font-medium text-gray-700 mb-1">
            장소
          </label>
          <input
            id="edit-event-location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="예: 공학관 301호"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label htmlFor="edit-event-type" className="block text-sm font-medium text-gray-700 mb-1">
            유형
          </label>
          <select
            id="edit-event-type"
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
