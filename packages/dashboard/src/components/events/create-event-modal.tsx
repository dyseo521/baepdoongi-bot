'use client';

import { useState } from 'react';
import { Button, Modal, RichTextEditor } from '@/components/ui';
import type { EventType } from '@baepdoongi/shared';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (event: {
    title: string;
    description: string;
    datetime: string;
    location: string;
    type: EventType;
  }) => Promise<void>;
}

const eventTypes = [
  { value: 'meeting', label: '정기모임' },
  { value: 'seminar', label: '세미나' },
  { value: 'workshop', label: '워크샵' },
  { value: 'social', label: '친목' },
  { value: 'other', label: '기타' },
];

export function CreateEventModal({ isOpen, onClose, onConfirm }: CreateEventModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [datetime, setDatetime] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState<EventType>('meeting');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !datetime) return;

    setIsLoading(true);
    try {
      await onConfirm({
        title,
        description,
        datetime: new Date(datetime).toISOString(),
        location,
        type,
      });
      // 폼 초기화
      setTitle('');
      setDescription('');
      setDatetime('');
      setLocation('');
      setType('meeting' as EventType);
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
            disabled={!title || !datetime}
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

        <div>
          <label htmlFor="event-datetime" className="block text-sm font-medium text-gray-700 mb-1">
            일시 *
          </label>
          <input
            id="event-datetime"
            type="datetime-local"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
            onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 cursor-pointer"
            required
          />
        </div>

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
