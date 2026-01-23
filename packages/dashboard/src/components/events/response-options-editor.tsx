'use client';

import { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui';
import type { EventResponseOption } from '@baepdoongi/shared';

interface ResponseOptionsEditorProps {
  options: EventResponseOption[];
  onChange: (options: EventResponseOption[]) => void;
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

export function ResponseOptionsEditor({ options, onChange }: ResponseOptionsEditorProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

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
  };

  const updateOption = (index: number, field: keyof EventResponseOption, value: string | number) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index]!, [field]: value };
    onChange(newOptions);
  };

  const applyTemplate = (templateKey: keyof typeof RESPONSE_TEMPLATES) => {
    onChange([...RESPONSE_TEMPLATES[templateKey]]);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
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

      {/* 옵션 목록 */}
      <div className="space-y-2">
        {options.map((option, index) => (
          <div
            key={option.optionId}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-2 p-2 bg-gray-50 rounded-lg border ${
              draggedIndex === index ? 'border-primary-400 bg-primary-50' : 'border-gray-200'
            }`}
          >
            <div className="cursor-grab text-gray-400 hover:text-gray-600">
              <GripVertical className="w-4 h-4" />
            </div>

            {/* 이모지 입력 */}
            <input
              type="text"
              value={option.emoji || ''}
              onChange={(e) => updateOption(index, 'emoji', e.target.value)}
              placeholder="😀"
              className="w-12 px-2 py-1 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
              maxLength={2}
            />

            {/* 레이블 입력 */}
            <input
              type="text"
              value={option.label}
              onChange={(e) => updateOption(index, 'label', e.target.value)}
              placeholder="옵션 이름"
              className="flex-1 px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
            />

            {/* 삭제 버튼 */}
            <button
              type="button"
              onClick={() => removeOption(index)}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              disabled={options.length <= 2}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* 추가 버튼 */}
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

      {options.length >= 5 && (
        <p className="text-xs text-gray-500">최대 5개의 옵션까지 추가할 수 있습니다.</p>
      )}
    </div>
  );
}
