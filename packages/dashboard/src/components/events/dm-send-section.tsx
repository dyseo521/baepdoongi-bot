'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Send, ChevronDown, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react';
import { clsx } from 'clsx';
import { Button, RichTextEditor } from '../ui';
import { DM_TEMPLATES, type DMTemplate } from '@baepdoongi/shared';
import type { Event, BulkDMJob, BulkDMJobResponse } from '@baepdoongi/shared';
import { sendBulkDM, getBulkDMJob } from '../../lib/api';

interface DMSendSectionProps {
  event: Event;
  selectedUserIds: string[];
  onDMSent?: () => void;
}

type SendStatus = 'idle' | 'selecting' | 'editing' | 'sending' | 'polling' | 'completed' | 'error';

export function DMSendSection({ event, selectedUserIds, onDMSent }: DMSendSectionProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DMTemplate | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle');
  const [currentJob, setCurrentJob] = useState<BulkDMJob | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // 템플릿 변수 치환
  const renderPreview = useMemo(() => {
    if (!selectedTemplate) return '';

    let template = selectedTemplate.messageTemplate;
    if (selectedTemplate.templateId === 'custom') {
      template = customMessage;
    }

    const datetime = new Date(event.datetime).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    return template
      .replace(/\{\{eventTitle\}\}/g, event.title)
      .replace(/\{\{datetime\}\}/g, datetime)
      .replace(/\{\{location\}\}/g, event.location || '미정')
      .replace(/\{\{customMessage\}\}/g, customMessage);
  }, [selectedTemplate, customMessage, event]);

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

  // 템플릿 선택
  const handleSelectTemplate = (template: DMTemplate) => {
    setSelectedTemplate(template);
    setIsDropdownOpen(false);
    setSendStatus('editing');
    setCustomMessage('');
    setErrorMessage(null);
  };

  // DM 발송
  const handleSendDM = async () => {
    if (selectedUserIds.length === 0 || !selectedTemplate) return;

    setSendStatus('sending');
    setErrorMessage(null);

    try {
      const request = {
        userIds: selectedUserIds,
        templateId: selectedTemplate.templateId,
        ...(selectedTemplate.templateId === 'custom' && customMessage && { customMessage }),
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
    setSendStatus('idle');
    setCurrentJob(null);
    setErrorMessage(null);
  };

  // 발송 불가 상태인지 확인
  const canSend = selectedUserIds.length > 0 &&
    selectedTemplate !== null &&
    (selectedTemplate.templateId !== 'custom' || customMessage.trim().length > 0);

  return (
    <div className="border-b border-gray-200 pb-4 mb-4">
      {/* DM 발송 버튼 / 드롭다운 */}
      {sendStatus === 'idle' && (
        <div className="relative">
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
            <div className="absolute z-10 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
              {DM_TEMPLATES.map((template) => (
                <button
                  key={template.templateId}
                  type="button"
                  onClick={() => handleSelectTemplate(template)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors"
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-primary-600" />
              <span className="font-medium text-gray-900">{selectedTemplate.name}</span>
              <span className="text-sm text-gray-500">• {selectedUserIds.length}명 선택</span>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="p-1 text-gray-400 hover:text-gray-600"
              disabled={sendStatus === 'sending'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 직접 입력 에디터 */}
          {selectedTemplate.templateId === 'custom' && (
            <RichTextEditor
              value={customMessage}
              onChange={setCustomMessage}
              placeholder="메시지를 입력하세요..."
              rows={4}
            />
          )}

          {/* 미리보기 */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-2">미리보기</div>
            <div className="text-sm text-gray-800 whitespace-pre-wrap">
              {renderPreview || '(메시지를 입력하세요)'}
            </div>
          </div>

          {/* 발송 버튼 */}
          <div className="flex gap-2">
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
            닫기
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
