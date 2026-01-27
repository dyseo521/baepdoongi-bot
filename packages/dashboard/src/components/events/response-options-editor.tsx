'use client';

import { useState } from 'react';
import { Plus, Trash2, GripVertical, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { Button, EmojiPickerButton } from '@/components/ui';
import type { EventResponseOption } from '@baepdoongi/shared';

interface ResponseOptionsEditorProps {
  options: EventResponseOption[];
  onChange: (options: EventResponseOption[]) => void;
  disabled?: boolean;
}

/** 기본 응답 옵션 템플릿 */
export const RESPONSE_TEMPLATES = {
  simple: [
    { optionId: 'attend', label: '참석', emoji: '✅', order: 1 },
    { optionId: 'absent', label: '불참', emoji: '❌', order: 2 },
  ],
  detailed: [
    { optionId: 'attend', label: '참석', emoji: '✅', order: 1 },
    { optionId: 'online', label: '온라인', emoji: '💻', order: 2 },
    { optionId: 'late', label: '늦참', emoji: '⏰', order: 3 },
    { optionId: 'absent', label: '불참', emoji: '❌', order: 4 },
  ],
};

export function ResponseOptionsEditor({ options, onChange, disabled }: ResponseOptionsEditorProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const addOption = () => {
    const newOption: EventResponseOption = {
      optionId: `option_${Date.now()}`,
      label: '새 옵션',
      emoji: '',
      order: options.length + 1,
    };
    onChange([...options, newOption]);
  };

  const removeOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    // order 재정렬
    const reorderedOptions = newOptions.map((opt, i) => ({
      ...opt,
      order: i + 1,
    }));
    onChange(reorderedOptions);
    if (expandedIndex === index) {
      setExpandedIndex(null);
    }
  };

  const updateOption = <K extends keyof EventResponseOption>(
    index: number,
    field: K,
    value: EventResponseOption[K]
  ) => {
    const newOptions = [...options];
    const current = newOptions[index];
    if (current) {
      newOptions[index] = { ...current, [field]: value };
      onChange(newOptions);
    }
  };

  const toggleRequiresInput = (index: number) => {
    const current = options[index];
    if (!current) return;

    const newRequiresInput = !current.requiresInput;
    const newOptions = [...options];

    if (newRequiresInput) {
      // 활성화: 입력 관련 필드 추가
      newOptions[index] = {
        ...current,
        requiresInput: true,
        inputLabel: current.inputLabel || '',
        inputPlaceholder: current.inputPlaceholder || '',
      };
      setExpandedIndex(index);
    } else {
      // 비활성화: 입력 관련 필드 제거 (destructure로 제외)
      const { inputLabel: _il, inputPlaceholder: _ip, requiresInput: _ri, ...rest } = current;
      newOptions[index] = rest;
    }

    onChange(newOptions);
  };

  const applyTemplate = (templateKey: keyof typeof RESPONSE_TEMPLATES) => {
    onChange([...RESPONSE_TEMPLATES[templateKey]]);
    setExpandedIndex(null);
  };

  const handleDragStart = (index: number) => {
    if (disabled) return;
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (disabled) return;
    if (draggedIndex === null || draggedIndex === index) return;

    const newOptions = [...options];
    const draggedOption = newOptions[draggedIndex]!;
    newOptions.splice(draggedIndex, 1);
    newOptions.splice(index, 0, draggedOption);

    // order 재정렬
    const reorderedOptions = newOptions.map((opt, i) => ({
      ...opt,
      order: i + 1,
    }));

    onChange(reorderedOptions);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-4">
      {/* 템플릿 버튼 */}
      {!disabled && (
        <div className="flex gap-2 items-center">
          <span className="text-sm text-gray-500">템플릿:</span>
          <button
            type="button"
            onClick={() => applyTemplate('simple')}
            className="text-sm px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            참석/불참
          </button>
          <button
            type="button"
            onClick={() => applyTemplate('detailed')}
            className="text-sm px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            참석/온라인/늦참/불참
          </button>
        </div>
      )}

      {/* 옵션 목록 */}
      <div className="space-y-2">
        {options.map((option, index) => (
          <div
            key={option.optionId}
            draggable={!disabled}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`p-2 bg-gray-50 rounded-lg border ${
              draggedIndex === index ? 'border-primary-400 bg-primary-50' : 'border-gray-200'
            } ${disabled ? 'opacity-60' : ''}`}
          >
            <div className="flex items-center gap-2">
              {/* 드래그 핸들 */}
              <div
                className={`text-gray-400 ${
                  disabled ? 'cursor-not-allowed' : 'cursor-grab hover:text-gray-600'
                }`}
              >
                <GripVertical className="w-4 h-4" />
              </div>

              {/* 이모지 피커 */}
              <EmojiPickerButton
                value={option.emoji}
                onSelect={(emoji) => updateOption(index, 'emoji', emoji)}
                showLabel={false}
                className={disabled ? 'pointer-events-none' : ''}
              />

              {/* 레이블 입력 */}
              <input
                type="text"
                value={option.label}
                onChange={(e) => updateOption(index, 'label', e.target.value)}
                placeholder="옵션 이름"
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                disabled={disabled}
              />

              {/* 텍스트 입력 토글 버튼 */}
              <button
                type="button"
                onClick={() => toggleRequiresInput(index)}
                className={`p-1.5 rounded transition-colors ${
                  option.requiresInput
                    ? 'bg-primary-100 text-primary-600'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
                disabled={disabled}
                title={option.requiresInput ? '텍스트 입력 활성화됨' : '텍스트 입력 비활성화'}
                aria-label="텍스트 입력 토글"
              >
                <MessageSquare className="w-4 h-4" aria-hidden="true" />
              </button>

              {/* 확장/축소 버튼 (텍스트 입력이 활성화된 경우만) */}
              {option.requiresInput && (
                <button
                  type="button"
                  onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  aria-label={expandedIndex === index ? '설정 접기' : '설정 펼치기'}
                >
                  {expandedIndex === index ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              )}

              {/* 삭제 버튼 */}
              <button
                type="button"
                onClick={() => removeOption(index)}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={options.length <= 2 || disabled}
                aria-label={`${option.label} 옵션 삭제`}
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {/* 텍스트 입력 설정 (확장된 경우) */}
            {option.requiresInput && expandedIndex === index && (
              <div className="mt-3 ml-6 pl-4 border-l-2 border-primary-200 space-y-2">
                <div className="text-xs text-gray-500 mb-2">
                  이 옵션 선택 시 Slack에서 추가 입력을 받습니다
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">입력 필드 레이블</label>
                  <input
                    type="text"
                    value={option.inputLabel || ''}
                    onChange={(e) => updateOption(index, 'inputLabel', e.target.value)}
                    placeholder="예: 불참 사유"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                    disabled={disabled}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">플레이스홀더</label>
                  <input
                    type="text"
                    value={option.inputPlaceholder || ''}
                    onChange={(e) => updateOption(index, 'inputPlaceholder', e.target.value)}
                    placeholder="예: 사유를 입력해주세요"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                    disabled={disabled}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 추가 버튼 */}
      {!disabled && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={addOption}
          leftIcon={<Plus className="w-4 h-4" />}
          disabled={options.length >= 5}
        >
          옵션 추가
        </Button>
      )}

      {options.length >= 5 && !disabled && (
        <p className="text-xs text-gray-500">최대 5개의 옵션까지 추가할 수 있습니다.</p>
      )}
    </div>
  );
}
