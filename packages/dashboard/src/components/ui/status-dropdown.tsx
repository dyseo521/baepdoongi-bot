'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { Clock, Eye, CheckCircle, XCircle, ChevronDown } from 'lucide-react';
import type { SuggestionStatus } from '@baepdoongi/shared';

interface StatusConfig {
  label: string;
  icon: typeof Clock;
  bg: string;
  text: string;
}

const statusConfig: Record<SuggestionStatus, StatusConfig> = {
  pending: { label: '대기 중', icon: Clock, bg: 'bg-yellow-100', text: 'text-yellow-800' },
  in_review: { label: '검토 중', icon: Eye, bg: 'bg-blue-100', text: 'text-blue-800' },
  resolved: { label: '완료', icon: CheckCircle, bg: 'bg-green-100', text: 'text-green-800' },
  rejected: { label: '반려', icon: XCircle, bg: 'bg-gray-100', text: 'text-gray-800' },
};

interface StatusDropdownProps {
  value: SuggestionStatus;
  onChange: (status: SuggestionStatus) => void;
  disabled?: boolean;
}

interface MenuPosition {
  top: number;
  left: number;
}

export function StatusDropdown({ value, onChange, disabled }: StatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const currentConfig = statusConfig[value];
  const CurrentIcon = currentConfig.icon;

  const updateMenuPosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
  }, []);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      updateMenuPosition();
    }
    setIsOpen(!isOpen);
  };

  // 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Escape 키로 닫기
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  // 스크롤 시 닫기
  useEffect(() => {
    if (isOpen) {
      const handleScroll = () => setIsOpen(false);
      window.addEventListener('scroll', handleScroll, true); // capture phase
      return () => window.removeEventListener('scroll', handleScroll, true);
    }
  }, [isOpen]);

  const handleSelect = (status: SuggestionStatus) => {
    if (status !== value) {
      onChange(status);
    }
    setIsOpen(false);
  };

  return (
    <div className="inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={clsx(
          'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors',
          currentConfig.bg,
          currentConfig.text,
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <CurrentIcon className="w-3.5 h-3.5" />
        <span>{currentConfig.label}</span>
        <ChevronDown className={clsx('w-3.5 h-3.5 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-50 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
            style={{ top: menuPosition.top, left: menuPosition.left }}
            role="listbox"
          >
            {(Object.keys(statusConfig) as SuggestionStatus[]).map((status) => {
              const config = statusConfig[status];
              const Icon = config.icon;
              const isSelected = status === value;

              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => handleSelect(status)}
                  className={clsx(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors',
                    isSelected ? 'bg-gray-50' : 'hover:bg-gray-50',
                    config.text
                  )}
                  role="option"
                  aria-selected={isSelected}
                >
                  <Icon className="w-4 h-4" />
                  <span>{config.label}</span>
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}

export { statusConfig };
