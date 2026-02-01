'use client';

import { useState, useMemo, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { Send, ChevronDown, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react';
import { clsx } from 'clsx';
import { Button, RichTextEditor } from '../ui';
import { DM_TEMPLATES, type DMTemplate } from '@baepdoongi/shared';
import type { Event, BulkDMJob, BulkDMJobResponse } from '@baepdoongi/shared';
import { sendBulkDM, getBulkDMJob } from '../../lib/api';
import { formatEventDateTimeForDisplay } from '../../lib/utils';

interface DMSendSectionProps {
  event: Event;
  selectedUserIds: string[];
  onDMSent?: () => void;
  onCloseModal?: () => void;
}

type SendStatus = 'idle' | 'selecting' | 'editing' | 'sending' | 'polling' | 'completed' | 'error';

/**
 * Slack mrkdwn 형식의 볼드체를 HTML로 렌더링합니다.
 * *bold* → <strong>bold</strong>
 */
function renderSlackMarkdown(text: string): ReactNode {
  const parts = text.split(/(\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*')) {
      return <strong key={i}>{part.slice(1, -1)}</strong>;
    }
    return part;
  });
}

export function DMSendSection({ event, selectedUserIds, onDMSent, onCloseModal }: DMSendSectionProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DMTemplate | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [editedMessage, setEditedMessage] = useState('');
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle');
  const [currentJob, setCurrentJob] = useState<BulkDMJob | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 템플릿 변수 치환
  const renderPreview = useMemo(() => {
    if (!selectedTemplate) return '';

    let template: string;
    if (selectedTemplate.templateId === 'custom') {
      template = customMessage;
    } else if (selectedTemplate.templateId === 'remind' || selectedTemplate.templateId === 'additional') {
      // remind, additional은 고정 템플릿 + customMessage
      template = selectedTemplate.messageTemplate;
    } else {
      // editedMessage가 있으면 그걸 사용, 없으면 기본 템플릿
      template = editedMessage || selectedTemplate.messageTemplate;
    }

    // 새 필드가 있으면 사용, 없으면 기존 datetime 사용
    const datetime = formatEventDateTimeForDisplay({
      ...(event.startDate && { startDate: event.startDate }),
      ...(event.endDate && { endDate: event.endDate }),
      ...(event.startTime && { startTime: event.startTime }),
      ...(event.endTime && { endTime: event.endTime }),
      ...(event.isMultiDay !== undefined && { isMultiDay: event.isMultiDay }),
      ...(event.hasTime !== undefined && { hasTime: event.hasTime }),
      datetime: event.datetime,
    });

    return template
      .replace(/\{\{eventTitle\}\}/g, event.title)
      .replace(/\{\{datetime\}\}/g, datetime)
      .replace(/\{\{location\}\}/g, event.location || '미정')
      .replace(/\{\{customMessage\}\}/g, customMessage);
  }, [selectedTemplate, customMessage, editedMessage, event]);

  // 폴링 정리
  const clearPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // 컴포넌트 언마운트 시 폴링 정리
  useEffect(() => {
    return () => clearPolling();
  }, [clearPolling]);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 템플릿 선택
  const handleSelectTemplate = (template: DMTemplate) => {
    setSelectedTemplate(template);
    setIsDropdownOpen(false);
    setSendStatus('editing');
    setCustomMessage('');
    setEditedMessage(template.messageTemplate);
    setErrorMessage(null);
  };

  // 에디터 값 변경 핸들러
  const handleEditorChange = (value: string) => {
    if (selectedTemplate?.templateId === 'custom') {
      setCustomMessage(value);
    } else if (selectedTemplate?.templateId === 'additional' || selectedTemplate?.templateId === 'remind') {
      // remind, additional은 customMessage만 입력
      setCustomMessage(value);
    } else {
      setEditedMessage(value);
    }
  };

  // 현재 에디터에 표시할 값
  const getEditorValue = () => {
    if (selectedTemplate?.templateId === 'custom') {
      return customMessage;
    }
    if (selectedTemplate?.templateId === 'additional' || selectedTemplate?.templateId === 'remind') {
      return customMessage;
    }
    return editedMessage;
  };

  // DM 발송
  const handleSendDM = async () => {
    if (selectedUserIds.length === 0 || !selectedTemplate) return;

    setSendStatus('sending');
    setErrorMessage(null);

    try {
      // customMessage에 실제 발송할 메시지를 담아 전송
      let messageToSend: string | undefined;
      if (selectedTemplate.templateId === 'custom') {
        messageToSend = customMessage;
      } else if (selectedTemplate.templateId === 'additional' || selectedTemplate.templateId === 'remind') {
        // remind, additional은 customMessage 전송
        messageToSend = customMessage;
      } else if (editedMessage && editedMessage !== selectedTemplate.messageTemplate) {
        // 템플릿이 수정되었으면 customMessage로 전송
        messageToSend = editedMessage;
      }

      const request = {
        userIds: selectedUserIds,
        templateId: selectedTemplate.templateId,
        ...(messageToSend && { customMessage: messageToSend }),
      };
      const response: BulkDMJobResponse = await sendBulkDM(event.eventId, request);

      setCurrentJob({
        jobId: response.jobId,
        eventId: event.eventId,
        templateId: selectedTemplate.templateId,
        userIds: selectedUserIds,
        totalCount: response.totalCount,
        sentCount: 0,
        failedCount: 0,
        status: response.status,
        createdAt: new Date().toISOString(),
      });

      setSendStatus('polling');

      // 폴링 시작
      pollingRef.current = setInterval(async () => {
        try {
          const job = await getBulkDMJob(event.eventId, response.jobId);
          setCurrentJob(job);

          if (job.status === 'completed' || job.status === 'failed') {
            clearPolling();
            setSendStatus(job.status === 'completed' ? 'completed' : 'error');
            if (job.status === 'completed') {
              onDMSent?.();
            }
            if (job.status === 'failed' && job.errors && job.errors.length > 0) {
              setErrorMessage(`${job.errors.length}건 발송 실패`);
            }
          }
        } catch {
          clearPolling();
          setSendStatus('error');
          setErrorMessage('작업 상태 조회 실패');
        }
      }, 2000);
    } catch (error) {
      setSendStatus('error');
      setErrorMessage(error instanceof Error ? error.message : '발송 요청 실패');
    }
  };

  // 초기화
  const handleReset = () => {
    clearPolling();
    setSelectedTemplate(null);
    setCustomMessage('');
    setEditedMessage('');
    setSendStatus('idle');
    setCurrentJob(null);
    setErrorMessage(null);
  };

  // 발송 불가 상태인지 확인
  const needsCustomMessage = selectedTemplate?.templateId === 'custom' || selectedTemplate?.templateId === 'additional';
  const canSend = selectedUserIds.length > 0 &&
    selectedTemplate !== null &&
    (!needsCustomMessage || customMessage.trim().length > 0);

  return (
    <div className="border-b border-gray-200 pb-4 mb-4">
      {/* DM 발송 버튼 / 드롭다운 */}
      {sendStatus === 'idle' && (
        <div className="relative flex flex-col items-end pr-4" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            disabled={selectedUserIds.length === 0}
            className={clsx(
              'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
              selectedUserIds.length === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            )}
          >
            <Send className="w-4 h-4" />
            <span>DM 발송</span>
            <ChevronDown className="w-4 h-4" />
          </button>

          {/* 드롭다운 메뉴 */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
              {DM_TEMPLATES.map((template) => (
                <button
                  key={template.templateId}
                  type="button"
                  onClick={() => handleSelectTemplate(template)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">{template.name}</div>
                  <div className="text-xs text-gray-500">{template.description}</div>
                </button>
              ))}
            </div>
          )}

          {selectedUserIds.length === 0 && (
            <p className="mt-2 text-xs text-gray-500">
              DM을 보내려면 아래에서 회원을 선택하세요
            </p>
          )}
        </div>
      )}

      {/* 템플릿 편집 상태 */}
      {(sendStatus === 'editing' || sendStatus === 'sending') && selectedTemplate && (
        <div className="space-y-3">
          <div className="flex items-center justify-end gap-3">
            {/* 템플릿 변경 드롭다운 */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                disabled={sendStatus === 'sending'}
                className="flex items-center gap-2 text-sm hover:bg-gray-100 px-2 py-1 rounded-md transition-colors"
              >
                <Send className="w-4 h-4 text-primary-600" />
                <span className="font-medium text-gray-900">{selectedTemplate.name}</span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
              {isDropdownOpen && (
                <div className="absolute right-0 top-full z-10 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                  {DM_TEMPLATES.map((template) => (
                    <button
                      key={template.templateId}
                      type="button"
                      onClick={() => handleSelectTemplate(template)}
                      className={clsx(
                        'w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors',
                        template.templateId === selectedTemplate.templateId && 'bg-gray-50'
                      )}
                    >
                      <div className="font-medium text-gray-900">{template.name}</div>
                      <div className="text-xs text-gray-500">{template.description}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="text-sm text-gray-500">• {selectedUserIds.length}명 선택</span>
            <button
              type="button"
              onClick={handleReset}
              className="p-1 text-gray-400 hover:text-gray-600"
              disabled={sendStatus === 'sending'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 미리보기 */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-2">미리보기</div>
            <div className="text-sm text-gray-800 whitespace-pre-wrap">
              {renderPreview ? renderSlackMarkdown(renderPreview) : '(메시지를 입력하세요)'}
            </div>
          </div>

          {/* 메시지 입력 에디터 (모든 템플릿) */}
          <RichTextEditor
            value={getEditorValue()}
            onChange={handleEditorChange}
            placeholder={
              selectedTemplate.templateId === 'custom'
                ? '메시지를 입력하세요...'
                : selectedTemplate.templateId === 'additional'
                  ? '추가 공지 내용을 입력하세요...'
                  : selectedTemplate.templateId === 'remind'
                    ? '추가 메시지를 입력하세요 (선택사항)...'
                    : '메시지를 수정할 수 있습니다...'
            }
            rows={6}
          />

          {/* 발송 버튼 */}
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleReset}
              disabled={sendStatus === 'sending'}
            >
              취소
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSendDM}
              disabled={!canSend || sendStatus === 'sending'}
              isLoading={sendStatus === 'sending'}
            >
              {selectedUserIds.length}명에게 DM 발송
            </Button>
          </div>
        </div>
      )}

      {/* 폴링 상태 */}
      {sendStatus === 'polling' && currentJob && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          <div>
            <div className="font-medium text-blue-900">DM 발송 중...</div>
            <div className="text-sm text-blue-700">
              {currentJob.sentCount} / {currentJob.totalCount}명 완료
            </div>
          </div>
        </div>
      )}

      {/* 완료 상태 */}
      {sendStatus === 'completed' && currentJob && (
        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div className="flex-1">
            <div className="font-medium text-green-900">DM 발송 완료</div>
            <div className="text-sm text-green-700">
              {currentJob.sentCount}명에게 발송 완료
              {currentJob.failedCount > 0 && ` (${currentJob.failedCount}건 실패)`}
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={handleReset}>
            새 DM 발송
          </Button>
        </div>
      )}

      {/* 에러 상태 */}
      {sendStatus === 'error' && (
        <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <div className="flex-1">
            <div className="font-medium text-red-900">발송 실패</div>
            <div className="text-sm text-red-700">{errorMessage}</div>
          </div>
          <Button variant="secondary" size="sm" onClick={handleReset}>
            다시 시도
          </Button>
        </div>
      )}
    </div>
  );
}
