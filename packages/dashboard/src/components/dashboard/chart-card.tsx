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
  /** 모바일용 컴팩트 모드 */
  compact?: boolean;
}

const periodOptions: PeriodOption[] = [7, 14, 30];

export function ChartCard({
  title,
  icon: Icon,
  period,
  onPeriodChange,
  children,
  isLoading,
  compact = false,
}: ChartCardProps) {
  return (
    <div className={clsx('card', compact ? 'p-2 sm:p-6' : 'p-6')}>
      <div className={clsx('flex items-center justify-between', compact ? 'mb-2 sm:mb-4' : 'mb-4')}>
        <h3 className={clsx(
          'font-semibold text-gray-900 flex items-center gap-1 sm:gap-2',
          compact ? 'text-xs sm:text-lg' : 'text-lg'
        )}>
          <Icon className={clsx(
            'text-primary-600',
            compact ? 'w-3 h-3 sm:w-5 sm:h-5' : 'w-5 h-5'
          )} />
          <span className={compact ? 'hidden sm:inline' : ''}>{title}</span>
          <span className={compact ? 'sm:hidden' : 'hidden'}>
            {title.split(' ')[0]}
          </span>
        </h3>
        <div className={clsx(
          'flex rounded-lg border border-gray-200 overflow-hidden',
          compact && 'hidden sm:flex'
        )}>
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
      <div className={clsx('min-w-0', compact ? 'h-28 sm:h-64' : 'h-64')}>
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-pulse flex flex-col items-center gap-2">
              <div className={clsx(
                'w-full bg-gray-100 rounded',
                compact ? 'h-16 sm:h-32' : 'h-32'
              )} />
              <span className="text-sm text-gray-400 hidden sm:inline">데이터를 불러오는 중...</span>
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
