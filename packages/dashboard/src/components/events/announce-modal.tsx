'use client';

import { useState, useEffect } from 'react';
import { Send, Hash, Eye, Loader2 } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { ResponseOptionsEditor, RESPONSE_TEMPLATES } from './response-options-editor';
import type { Event, EventResponseOption, SlackChannel } from '@baepdoongi/shared';

interface AnnounceModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
  onConfirm: (channelId: string, responseOptions: EventResponseOption[]) => Promise<void>;
}

export function AnnounceModal({
  isOpen,
  onClose,
  event,
  onConfirm,
}: AnnounceModalProps) {
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [responseOptions, setResponseOptions] = useState<EventResponseOption[]>(
    RESPONSE_TEMPLATES.simple
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 채널 목록 로드
  useEffect(() => {
    if (!isOpen) return;

    const loadChannels = async () => {
      setIsLoadingChannels(true);
      setError(null);

      try {
        const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] || '/api';
        const res = await fetch(`${API_BASE_URL}/slack/channels`, {
          credentials: 'include',
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        if (Array.isArray(data)) {
          setChannels(data);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        console.error('채널 목록 로드 실패:', err);
        setError('채널 목록을 불러오는데 실패했습니다');
      } finally {
        setIsLoadingChannels(false);
      }
    };

    loadChannels();
  }, [isOpen]);

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (isOpen && event) {
      setSelectedChannelId('');
      setResponseOptions([...RESPONSE_TEMPLATES.simple]);
      setError(null);
    }
  }, [isOpen, event]);

  if (!event) return null;

  const handleConfirm = async () => {
    if (!selectedChannelId) {
      setError('채널을 선택해주세요');
      return;
    }

    if (responseOptions.length < 2) {
      setError('최소 2개의 응답 옵션이 필요합니다');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onConfirm(selectedChannelId, responseOptions);
      onClose();
    } catch (err) {
      setError('공지 전송에 실패했습니다');
      console.error('공지 전송 실패:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedChannel = channels.find((c) => c.id === selectedChannelId);
  const datetime = new Date(event.datetime);
  const formattedDate = datetime.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Slack 공지 보내기"
      titleIcon={<Send className="w-5 h-5 text-primary-600" />}
      maxWidth="2xl"
      maxHeight="90vh"
      stickyHeader
      stickyFooter
      footer={
        <>
          <div className="flex-1 text-sm text-gray-500">
            {selectedChannel && <>#{selectedChannel.name}에 공지됩니다</>}
          </div>
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button
            onClick={handleConfirm}
            isLoading={isLoading}
            disabled={!selectedChannelId || isLoadingChannels}
            leftIcon={<Send className="w-4 h-4" />}
          >
            공지하기
          </Button>
        </>
      }
    >
      <div className="p-6 space-y-6">
        {/* 에러 메시지 */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* 채널 선택 */}
        <div>
          <label htmlFor="announce-channel" className="block text-sm font-medium text-gray-700 mb-2">
            <Hash className="w-4 h-4 inline mr-1" aria-hidden="true" />
            공지 채널
          </label>
          {isLoadingChannels ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>채널 목록 로딩 중...</span>
            </div>
          ) : (
            <select
              id="announce-channel"
              value={selectedChannelId}
              onChange={(e) => setSelectedChannelId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">채널을 선택하세요</option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  # {channel.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 응답 옵션 설정 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            응답 옵션 설정
          </label>
          <ResponseOptionsEditor
            options={responseOptions}
            onChange={setResponseOptions}
          />
        </div>

        {/* 미리보기 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
            <Eye className="w-4 h-4" aria-hidden="true" />
            미리보기
          </label>
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            {/* Slack 메시지 미리보기 */}
            <div className="space-y-3">
              <div className="font-semibold text-lg">📅 {event.title}</div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">📍 장소</span>
                  <div>{event.location || '미정'}</div>
                </div>
                <div>
                  <span className="text-gray-500">🕐 일시</span>
                  <div>{formattedDate}</div>
                </div>
              </div>
              {event.description && (
                <div className="text-sm text-gray-700 whitespace-pre-wrap">{event.description}</div>
              )}
              <hr className="border-gray-300" />
              <div className="text-xs text-gray-500">
                {responseOptions
                  .sort((a, b) => a.order - b.order)
                  .map((opt) => `${opt.emoji || ''} ${opt.label}: 0명`)
                  .join(' | ')}
              </div>
              <div className="flex flex-wrap gap-2">
                {responseOptions
                  .sort((a, b) => a.order - b.order)
                  .map((opt) => (
                    <span
                      key={opt.optionId}
                      className="px-3 py-1 bg-white border border-gray-300 rounded text-sm"
                    >
                      {opt.emoji || ''} {opt.label}
                      {opt.requiresInput && (
                        <span className="ml-1 text-xs text-gray-400" title="텍스트 입력 필요">
                          ✏️
                        </span>
                      )}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
