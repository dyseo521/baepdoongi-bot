'use client';

import { clsx } from 'clsx';
import { Smile } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { searchEmojis, containsKorean } from '@/lib/emoji-ko';

export interface EmojiPickerButtonProps {
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
  const [koreanQuery, setKoreanQuery] = useState('');
  const [quickEmojis, setQuickEmojis] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const koreanInputRef = useRef<HTMLInputElement>(null);

  const handleEmojiClick = useCallback(
    (emojiData: EmojiClickData) => {
      onSelect(emojiData.emoji);
      setIsOpen(false);
      setKoreanQuery('');
      setQuickEmojis([]);
    },
    [onSelect]
  );

  const handleQuickSelect = useCallback(
    (emoji: string) => {
      onSelect(emoji);
      setIsOpen(false);
      setKoreanQuery('');
      setQuickEmojis([]);
    },
    [onSelect]
  );

  const handleKoreanSearch = useCallback((value: string) => {
    setKoreanQuery(value);

    if (containsKorean(value) && value.length >= 1) {
      const results = searchEmojis(value);
      setQuickEmojis(results.slice(0, 12)); // 최대 12개
    } else {
      setQuickEmojis([]);
    }
  }, []);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (
      containerRef.current &&
      !containerRef.current.contains(event.target as Node)
    ) {
      setIsOpen(false);
      setKoreanQuery('');
      setQuickEmojis([]);
    }
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      setKoreanQuery('');
      setQuickEmojis([]);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      // 피커가 열리면 한국어 검색창에 포커스
      setTimeout(() => {
        koreanInputRef.current?.focus();
      }, 100);
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
      const pickerHeight = 480; // 한국어 검색창 높이 추가
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
          className="absolute z-50 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
          role="dialog"
          aria-label="이모지 피커"
        >
          {/* 한국어 빠른 검색 */}
          <div className="px-3 py-2 border-b border-gray-200">
            <input
              ref={koreanInputRef}
              type="text"
              value={koreanQuery}
              onChange={(e) => handleKoreanSearch(e.target.value)}
              placeholder="한국어로 검색 (예: 하트, 참석, 웃음)"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {quickEmojis.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {quickEmojis.map((emoji, index) => (
                  <button
                    key={`${emoji}-${index}`}
                    type="button"
                    onClick={() => handleQuickSelect(emoji)}
                    className="p-1.5 text-xl hover:bg-gray-100 rounded transition-colors"
                    aria-label={`이모지 ${emoji} 선택`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
            {koreanQuery && containsKorean(koreanQuery) && quickEmojis.length === 0 && (
              <p className="text-xs text-gray-500 mt-2">
                검색 결과가 없습니다. 영어로 검색해보세요.
              </p>
            )}
          </div>

          {/* 기존 이모지 피커 */}
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={Theme.LIGHT}
            lazyLoadEmojis
            searchPlaceholder="영어로 검색..."
            width={350}
            height={400}
          />
        </div>
      )}
    </div>
  );
}
