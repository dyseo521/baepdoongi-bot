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

interface FormatRegion {
  start: number; // 마커 시작 위치
  end: number; // 마커 끝 위치
  innerStart: number; // 내용 시작
  innerEnd: number; // 내용 끝
}

// 포맷 영역 찾기 (볼드: *, 이탈릭: _)
function findFormatRegions(text: string, marker: string): FormatRegion[] {
  const regions: FormatRegion[] = [];
  const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`${escapedMarker}([^${escapedMarker}\\n]+)${escapedMarker}`, 'g');
  let match;
  while ((match = regex.exec(text)) !== null) {
    const innerContent = match[1];
    if (innerContent !== undefined) {
      regions.push({
        start: match.index,
        end: match.index + match[0].length,
        innerStart: match.index + 1,
        innerEnd: match.index + 1 + innerContent.length,
      });
    }
  }
  return regions;
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

  // 스마트 포맷 토글 (커서/선택이 포맷 영역 내부면 해제, 아니면 적용)
  const smartToggleFormat = useCallback(
    (marker: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const regions = findFormatRegions(value, marker);

      // 선택/커서가 포맷 영역 내부인지 확인
      const containingRegion = regions.find(
        (r) => start >= r.innerStart && end <= r.innerEnd
      );

      if (containingRegion) {
        // 포맷 제거: 해당 영역의 마커 제거
        const innerText = value.substring(
          containingRegion.innerStart,
          containingRegion.innerEnd
        );
        const newValue =
          value.substring(0, containingRegion.start) +
          innerText +
          value.substring(containingRegion.end);
        onChange(newValue);

        // 커서 위치 조정 (앞의 마커 제거로 1 감소)
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start - 1, end - 1);
        }, 0);
      } else {
        // 포맷 추가
        const selectedText = value.substring(start, end);
        const newValue =
          value.substring(0, start) +
          marker +
          selectedText +
          marker +
          value.substring(end);
        onChange(newValue);

        setTimeout(() => {
          textarea.focus();
          if (selectedText) {
            textarea.setSelectionRange(start + 1, end + 1);
          } else {
            textarea.setSelectionRange(start + 1, start + 1);
          }
        }, 0);
      }
    },
    [value, onChange]
  );

  const handleBold = useCallback(() => {
    smartToggleFormat('*');
  }, [smartToggleFormat]);

  const handleItalic = useCallback(() => {
    smartToggleFormat('_');
  }, [smartToggleFormat]);

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
        {/* Formatted overlay (항상 표시) */}
        <div
          className={clsx(
            'rich-text-overlay absolute inset-0 px-3 py-2',
            'text-sm text-gray-900 leading-relaxed',
            'whitespace-pre-wrap break-words',
            'pointer-events-none overflow-auto',
            'bg-white',
            'font-[system-ui]'
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

        {/* Textarea (항상 투명, 선택 영역도 숨김) */}
        <textarea
          ref={textareaRef}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          rows={rows}
          className={clsx(
            'relative w-full px-3 py-2',
            'text-sm leading-relaxed',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
            'resize-none',
            'font-[system-ui]',
            // 항상 투명 + 선택 영역도 숨김
            'text-transparent caret-gray-900 bg-transparent',
            'selection:bg-transparent selection:text-transparent'
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
