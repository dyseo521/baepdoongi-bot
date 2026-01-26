'use client';

import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';

type PeriodOption = 7 | 14 | 30;

interface ChartCardProps {
  title: string;
  icon: LucideIcon;
  period: PeriodOption;
  onPeriodChange: (period: PeriodOption) => void;
  children: React.ReactNode;
  isLoading?: boolean;
}

const periodOptions: PeriodOption[] = [7, 14, 30];

export function ChartCard({
  title,
  icon: Icon,
  period,
  onPeriodChange,
  children,
  isLoading,
}: ChartCardProps) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Icon className="w-5 h-5 text-primary-600" />
          {title}
        </h3>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {periodOptions.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onPeriodChange(opt)}
              className={clsx(
                'px-3 py-1.5 text-sm font-medium transition-colors',
                period === opt
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              )}
            >
              {opt}일
            </button>
          ))}
        </div>
      </div>
      <div className="h-64">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-pulse flex flex-col items-center gap-2">
              <div className="h-32 w-full bg-gray-100 rounded" />
              <span className="text-sm text-gray-400">데이터를 불러오는 중...</span>
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
