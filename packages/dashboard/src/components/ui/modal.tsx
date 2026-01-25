'use client';

import { useEffect, useRef, useCallback, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  titleIcon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** 스크롤 가능한 콘텐츠 영역 최대 높이 (기본: 80vh) */
  maxHeight?: string;
  /** 헤더 스티키 여부 */
  stickyHeader?: boolean;
  /** 푸터 스티키 여부 */
  stickyFooter?: boolean;
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  titleIcon,
  children,
  footer,
  maxWidth = 'lg',
  maxHeight = '80vh',
  stickyHeader = false,
  stickyFooter = false,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Escape 키로 닫기
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  // Focus trap 구현
  const handleTabKey = useCallback((event: KeyboardEvent) => {
    if (event.key !== 'Tab' || !modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement?.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement?.focus();
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      // 현재 포커스된 요소 저장
      previousFocusRef.current = document.activeElement as HTMLElement;

      // 이벤트 리스너 등록
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('keydown', handleTabKey);

      // body 스크롤 방지
      document.body.style.overflow = 'hidden';

      // 모달 내 첫 번째 포커스 가능 요소에 포커스
      const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keydown', handleTabKey);
        document.body.style.overflow = '';

        // 이전 포커스 복원
        previousFocusRef.current?.focus();
      };
    }
  }, [isOpen, handleKeyDown, handleTabKey]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className={clsx(
          'relative bg-white rounded-xl shadow-xl w-full mx-4 my-8 overflow-hidden',
          maxWidthClasses[maxWidth]
        )}
        style={{
          maxHeight,
          overscrollBehavior: 'contain',
        }}
      >
        {/* Header */}
        <div
          className={clsx(
            'flex items-center justify-between p-4 border-b border-gray-200 bg-white',
            stickyHeader && 'sticky top-0 z-10'
          )}
        >
          <h2
            id="modal-title"
            className="text-lg font-semibold text-gray-900 flex items-center gap-2"
          >
            {titleIcon}
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="모달 닫기"
          >
            <X className="w-5 h-5 text-gray-500" aria-hidden="true" />
          </button>
        </div>

        {/* Content - scrollable area */}
        <div className="overflow-y-auto" style={{ maxHeight: `calc(${maxHeight} - 130px)` }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className={clsx(
              'flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50',
              stickyFooter && 'sticky bottom-0 z-10'
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
