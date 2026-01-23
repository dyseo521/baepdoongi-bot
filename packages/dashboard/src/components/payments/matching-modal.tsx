'use client';

import { useState } from 'react';
import { X, ArrowRightLeft, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import type { Submission, Deposit } from '@baepdoongi/shared';

interface MatchingModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: Submission | null;
  deposit: Deposit | null;
  onConfirm: (submissionId: string, depositId: string) => Promise<void>;
}

export function MatchingModal({
  isOpen,
  onClose,
  submission,
  deposit,
  onConfirm,
}: MatchingModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !submission || !deposit) return null;

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm(submission.submissionId, deposit.depositId);
      onClose();
    } catch (error) {
      console.error('Matching failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const timeDiff = Math.abs(
    new Date(deposit.timestamp).getTime() -
      new Date(submission.submittedAt).getTime()
  );
  const timeDiffMinutes = Math.floor(timeDiff / (1000 * 60));
  const timeDiffHours = Math.floor(timeDiffMinutes / 60);
  const isTimeWarning = timeDiffMinutes > 180;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-primary-600" />
            수동 매칭 확인
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* 시간 차이 경고 */}
          {isTimeWarning && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  시간 차이 경고
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  지원서 제출과 입금 사이에 {timeDiffHours}시간 이상의 차이가 있습니다.
                  올바른 매칭인지 다시 확인해주세요.
                </p>
              </div>
            </div>
          )}

          {/* 매칭 정보 */}
          <div className="grid grid-cols-2 gap-6">
            {/* 지원서 */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500 mb-2">지원서</div>
              <div className="font-semibold text-gray-900">{submission.name}</div>
              <div className="text-sm text-gray-600 mt-1">
                {submission.studentId}
              </div>
              <div className="text-xs text-gray-400 mt-2">
                {new Date(submission.submittedAt).toLocaleString('ko-KR')}
              </div>
            </div>

            {/* 입금 */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500 mb-2">입금</div>
              <div className="font-semibold text-gray-900">
                {deposit.depositorName}
              </div>
              <div className="text-sm text-green-600 mt-1">
                {new Intl.NumberFormat('ko-KR').format(deposit.amount)}원
              </div>
              <div className="text-xs text-gray-400 mt-2">
                {new Date(deposit.timestamp).toLocaleString('ko-KR')}
              </div>
            </div>
          </div>

          {/* 시간 차이 */}
          <div className="mt-4 text-center">
            <Badge variant={isTimeWarning ? 'warning' : 'success'}>
              시간 차이: {timeDiffHours > 0 ? `${timeDiffHours}시간 ` : ''}
              {timeDiffMinutes % 60}분
            </Badge>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button
            onClick={handleConfirm}
            isLoading={isLoading}
            leftIcon={<CheckCircle className="w-4 h-4" />}
          >
            매칭 확인
          </Button>
        </div>
      </div>
    </div>
  );
}
