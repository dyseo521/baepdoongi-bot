'use client';

import { clsx } from 'clsx';
import { Bold, HelpCircle, Italic, Smile } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  id?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = '내용을 입력하세요...',
  rows = 4,
  className,
  id,
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Wrap selected text with markers
  const wrapSelection = useCallback(
    (before: string, after: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end);

      // If text is already wrapped, unwrap it
      const textBefore = value.substring(start - before.length, start);
      const textAfter = value.substring(end, end + after.length);

      if (textBefore === before && textAfter === after) {
        // Unwrap
        const newValue =
          value.substring(0, start - before.length) +
          selectedText +
          value.substring(end + after.length);
        onChange(newValue);
        // Restore selection
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start - before.length, end - before.length);
        }, 0);
      } else {
        // Wrap
        const newValue =
          value.substring(0, start) +
          before +
          selectedText +
          after +
          value.substring(end);
        onChange(newValue);
        // Restore selection including markers
        setTimeout(() => {
          textarea.focus();
          if (selectedText) {
            textarea.setSelectionRange(
              start + before.length,
              end + before.length
            );
          } else {
            textarea.setSelectionRange(
              start + before.length,
              start + before.length
            );
          }
        }, 0);
      }
    },
    [value, onChange]
  );

  const handleBold = useCallback(() => {
    wrapSelection('*', '*');
  }, [wrapSelection]);

  const handleItalic = useCallback(() => {
    wrapSelection('_', '_');
  }, [wrapSelection]);

  const handleEmojiClick = useCallback(
    (emojiData: EmojiClickData) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const newValue =
        value.substring(0, start) + emojiData.emoji + value.substring(end);
      onChange(newValue);

      setShowEmojiPicker(false);

      // Move cursor after emoji
      setTimeout(() => {
        textarea.focus();
        const newPosition = start + emojiData.emoji.length;
        textarea.setSelectionRange(newPosition, newPosition);
      }, 0);
    },
    [value, onChange]
  );

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        handleBold();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        e.preventDefault();
        handleItalic();
      }
    },
    [handleBold, handleItalic]
  );

  // Highlight mentions in display
  const getHighlightedPreview = useCallback(() => {
    if (!value) return null;

    const mentionRegex = /(@channel|@here|@everyone)/g;
    const parts = value.split(mentionRegex);

    return parts.map((part, index) => {
      if (mentionRegex.test(part)) {
        return (
          <span
            key={index}
            className="bg-yellow-100 text-yellow-800 px-0.5 rounded"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  }, [value]);

  return (
    <div ref={containerRef} className={clsx('relative', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-1.5 bg-gray-50 border border-b-0 border-gray-300 rounded-t-lg">
        <button
          type="button"
          onClick={handleBold}
          className={clsx(
            'p-1.5 rounded hover:bg-gray-200 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-primary-500'
          )}
          title="굵게 (Ctrl+B)"
          aria-label="굵게"
        >
          <Bold className="w-4 h-4 text-gray-600" />
        </button>
        <button
          type="button"
          onClick={handleItalic}
          className={clsx(
            'p-1.5 rounded hover:bg-gray-200 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-primary-500'
          )}
          title="기울임 (Ctrl+I)"
          aria-label="기울임"
        >
          <Italic className="w-4 h-4 text-gray-600" />
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={clsx(
              'p-1.5 rounded hover:bg-gray-200 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary-500',
              showEmojiPicker && 'bg-gray-200'
            )}
            title="이모지"
            aria-label="이모지 삽입"
            aria-expanded={showEmojiPicker}
          >
            <Smile className="w-4 h-4 text-gray-600" />
          </button>
          {showEmojiPicker && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowEmojiPicker(false)}
              />
              <div className="absolute left-0 top-full mt-1 z-50">
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  theme={Theme.LIGHT}
                  lazyLoadEmojis
                  searchPlaceholder="이모지 검색..."
                  width={320}
                  height={350}
                />
              </div>
            </>
          )}
        </div>
        <div className="flex-1" />
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className={clsx(
              'p-1.5 rounded hover:bg-gray-200 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary-500',
              showHelp && 'bg-gray-200'
            )}
            title="서식 도움말"
            aria-label="서식 도움말"
            aria-expanded={showHelp}
          >
            <HelpCircle className="w-4 h-4 text-gray-500" />
          </button>
          {showHelp && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowHelp(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-50 w-64 p-3 bg-white rounded-lg shadow-lg border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  Slack 서식
                </h4>
                <ul className="text-xs text-gray-600 space-y-1.5">
                  <li>
                    <code className="bg-gray-100 px-1 rounded">*텍스트*</code>
                    <span className="ml-2">→ 굵게</span>
                  </li>
                  <li>
                    <code className="bg-gray-100 px-1 rounded">_텍스트_</code>
                    <span className="ml-2">→ 기울임</span>
                  </li>
                  <li>
                    <code className="bg-gray-100 px-1 rounded">~텍스트~</code>
                    <span className="ml-2">→ 취소선</span>
                  </li>
                  <li>
                    <code className="bg-gray-100 px-1 rounded">`코드`</code>
                    <span className="ml-2">→ 인라인 코드</span>
                  </li>
                  <li>
                    <code className="bg-gray-100 px-1 rounded">@channel</code>
                    <span className="ml-2">→ 모든 멤버 알림</span>
                  </li>
                  <li>
                    <code className="bg-gray-100 px-1 rounded">@here</code>
                    <span className="ml-2">→ 활성 멤버 알림</span>
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={clsx(
          'w-full px-3 py-2 border border-gray-300 rounded-b-lg',
          'text-sm text-gray-900 placeholder-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
          'resize-none'
        )}
      />

      {/* Mention preview */}
      {value && /(@channel|@here|@everyone)/.test(value) && (
        <div className="mt-1 px-2 py-1 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
          💡 멘션이 포함되어 있습니다: 공지 시 해당 채널의 멤버에게 알림이 갑니다
        </div>
      )}
    </div>
  );
}
