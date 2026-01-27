'use client';

import { clsx } from 'clsx';
import { Smile } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';

interface EmojiPickerButtonProps {
  value?: string | undefined;
  onSelect: (emoji: string) => void;
  className?: string;
  placeholder?: string;
  showLabel?: boolean;
}

export function EmojiPickerButton({
  value,
  onSelect,
  className,
  placeholder = '이모지',
  showLabel = true,
}: EmojiPickerButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const handleEmojiClick = useCallback(
    (emojiData: EmojiClickData) => {
      onSelect(emojiData.emoji);
      setIsOpen(false);
    },
    [onSelect]
  );

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (
      containerRef.current &&
      !containerRef.current.contains(event.target as Node)
    ) {
      setIsOpen(false);
    }
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleClickOutside, handleKeyDown]);

  // Position picker to avoid overflow
  useEffect(() => {
    if (isOpen && pickerRef.current && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const pickerHeight = 400;
      const pickerWidth = 350;

      // Adjust vertical position
      if (containerRect.bottom + pickerHeight > viewportHeight) {
        pickerRef.current.style.bottom = '100%';
        pickerRef.current.style.top = 'auto';
        pickerRef.current.style.marginBottom = '4px';
      } else {
        pickerRef.current.style.top = '100%';
        pickerRef.current.style.bottom = 'auto';
        pickerRef.current.style.marginTop = '4px';
      }

      // Adjust horizontal position
      if (containerRect.left + pickerWidth > viewportWidth) {
        pickerRef.current.style.right = '0';
        pickerRef.current.style.left = 'auto';
      } else {
        pickerRef.current.style.left = '0';
        pickerRef.current.style.right = 'auto';
      }
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className={clsx('relative inline-block', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'inline-flex items-center justify-center gap-1.5 px-3 py-2',
          'border border-gray-300 rounded-lg',
          'text-sm font-medium text-gray-700',
          'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
          'transition-colors'
        )}
        aria-label="이모지 선택"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        {value ? (
          <span className="text-lg leading-none">{value}</span>
        ) : (
          <Smile className="w-4 h-4 text-gray-500" />
        )}
        {showLabel && (
          <span className="text-gray-500">{value ? '' : placeholder}</span>
        )}
      </button>

      {isOpen && (
        <div
          ref={pickerRef}
          className="absolute z-50"
          role="dialog"
          aria-label="이모지 피커"
        >
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={Theme.LIGHT}
            lazyLoadEmojis
            searchPlaceholder="이모지 검색..."
            width={350}
            height={400}
          />
        </div>
      )}
    </div>
  );
}
