'use client';

import { clsx } from 'clsx';
import { Bold, HelpCircle, Italic, Smile } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
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

  // Slack mrkdwn → HTML 변환 (실시간 미리보기용)
  const formattedHtml = useMemo(() => {
    if (!value) return '';

    let html = value
      // HTML 엔티티 이스케이프
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Bold: *text*
      .replace(/\*([^*\n]+)\*/g, '<strong class="font-semibold">$1</strong>')
      // Italic: _text_
      .replace(/_([^_\n]+)_/g, '<em class="italic">$1</em>')
      // Strikethrough: ~text~
      .replace(/~([^~\n]+)~/g, '<del class="line-through">$1</del>')
      // Inline code: `code`
      .replace(/`([^`\n]+)`/g, '<code class="bg-gray-200 px-0.5 rounded text-sm font-mono">$1</code>')
      // Mentions: @channel, @here, @everyone
      .replace(/(@channel|@here|@everyone)/g, '<span class="bg-yellow-100 text-yellow-800 px-0.5 rounded">$1</span>')
      // Line breaks
      .replace(/\n/g, '<br />');

    return html;
  }, [value]);

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

  // Sync scroll between textarea and overlay
  const handleScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    const overlay = containerRef.current?.querySelector('.rich-text-overlay');
    if (overlay) {
      overlay.scrollTop = e.currentTarget.scrollTop;
    }
  }, []);

  // Calculate height based on rows
  const textareaHeight = `${rows * 1.5 + 1}rem`;

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

      {/* Editor container with overlay */}
      <div className="relative border border-gray-300 rounded-b-lg overflow-hidden">
        {/* Formatted overlay (behind textarea) */}
        <div
          className={clsx(
            'rich-text-overlay absolute inset-0 px-3 py-2',
            'text-sm text-gray-900 leading-relaxed',
            'whitespace-pre-wrap break-words',
            'pointer-events-none overflow-auto',
            'bg-white'
          )}
          style={{ height: textareaHeight }}
          aria-hidden="true"
        >
          {formattedHtml ? (
            <div dangerouslySetInnerHTML={{ __html: formattedHtml }} />
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </div>

        {/* Transparent textarea (in front, for user input) */}
        <textarea
          ref={textareaRef}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          placeholder=""
          rows={rows}
          className={clsx(
            'relative w-full px-3 py-2',
            'text-sm leading-relaxed',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
            'resize-none',
            // Make text transparent but keep caret visible
            'text-transparent caret-gray-900',
            'bg-transparent'
          )}
          style={{ height: textareaHeight }}
        />
      </div>

      {/* Mention preview */}
      {value && /(@channel|@here|@everyone)/.test(value) && (
        <div className="mt-1 px-2 py-1 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
          💡 멘션이 포함되어 있습니다: 공지 시 해당 채널의 멤버에게 알림이 갑니다
        </div>
      )}
    </div>
  );
}
