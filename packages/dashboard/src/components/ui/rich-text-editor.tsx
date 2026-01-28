'use client';

import { clsx } from 'clsx';
import { Bold, HelpCircle, Italic, Smile } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { toMrkdwn, fromMrkdwn } from '@/lib/mrkdwn';

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  id?: string;
}

interface ToolbarProps {
  editor: Editor | null;
  onEmojiClick: (emoji: string) => void;
}

function Toolbar({ editor, onEmojiClick }: ToolbarProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const handleBold = useCallback(() => {
    editor?.chain().focus().toggleBold().run();
  }, [editor]);

  const handleItalic = useCallback(() => {
    editor?.chain().focus().toggleItalic().run();
  }, [editor]);

  const handleEmojiSelect = useCallback(
    (emojiData: EmojiClickData) => {
      onEmojiClick(emojiData.emoji);
      setShowEmojiPicker(false);
    },
    [onEmojiClick]
  );

  return (
    <div className="flex items-center gap-1 p-1.5 bg-gray-50 border border-b-0 border-gray-300 rounded-t-lg">
      <button
        type="button"
        onClick={handleBold}
        className={clsx(
          'p-1.5 rounded hover:bg-gray-200 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-primary-500',
          editor?.isActive('bold') && 'bg-gray-200'
        )}
        title="굵게 (Ctrl+B)"
        aria-label="굵게"
        aria-pressed={editor?.isActive('bold')}
      >
        <Bold className="w-4 h-4 text-gray-600" />
      </button>
      <button
        type="button"
        onClick={handleItalic}
        className={clsx(
          'p-1.5 rounded hover:bg-gray-200 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-primary-500',
          editor?.isActive('italic') && 'bg-gray-200'
        )}
        title="기울임 (Ctrl+I)"
        aria-label="기울임"
        aria-pressed={editor?.isActive('italic')}
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
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowEmojiPicker(false)}
            />
            <div className="absolute left-0 top-full mt-1 z-50">
              <EmojiPicker
                onEmojiClick={handleEmojiSelect}
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
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = '내용을 입력하세요...',
  rows = 4,
  className,
  id,
}: RichTextEditorProps) {
  const isUpdatingRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Bold, Italic, Strike, Code 포함
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        listItem: false,
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: fromMrkdwn(value),
    onUpdate: ({ editor: e }) => {
      if (isUpdatingRef.current) return;
      const mrkdwn = toMrkdwn(e.getJSON());
      onChange(mrkdwn);
    },
    editorProps: {
      attributes: {
        id: id ?? '',
        class: 'rich-text-editor-content',
        style: `min-height: calc(${rows} * 1.5rem + 1rem)`,
      },
    },
  });

  // 외부에서 value가 변경되면 에디터 내용 동기화
  useEffect(() => {
    if (!editor) return;

    const currentMrkdwn = toMrkdwn(editor.getJSON());
    if (currentMrkdwn !== value) {
      isUpdatingRef.current = true;
      editor.commands.setContent(fromMrkdwn(value));
      isUpdatingRef.current = false;
    }
  }, [editor, value]);

  const handleEmojiInsert = useCallback(
    (emoji: string) => {
      editor?.chain().focus().insertContent(emoji).run();
    },
    [editor]
  );

  // Calculate height based on rows
  const editorHeight = `calc(${rows} * 1.5rem + 1rem)`;

  return (
    <div className={clsx('relative', className)}>
      <Toolbar editor={editor} onEmojiClick={handleEmojiInsert} />

      {/* Editor */}
      <div
        className={clsx(
          'border border-gray-300 rounded-b-lg overflow-hidden bg-white',
          'focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500'
        )}
      >
        <EditorContent
          editor={editor}
          className="rich-text-editor"
          style={
            { '--editor-rows': rows, '--editor-height': editorHeight } as React.CSSProperties
          }
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
