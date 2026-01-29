import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: number;
  changeLabel?: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
  /** 모바일용 컴팩트 모드 */
  compact?: boolean;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  change,
  changeLabel,
  variant = 'default',
  compact = false,
}: StatCardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  const iconColors = {
    default: 'text-primary-600 bg-primary-50',
    success: 'text-green-600 bg-green-50',
    warning: 'text-yellow-600 bg-yellow-50',
    error: 'text-red-600 bg-red-50',
  };

  if (compact) {
    return (
      <div className="card p-2 sm:p-6">
        <div className="hidden sm:flex items-center justify-between">
          <div className={clsx('p-3 rounded-lg', iconColors[variant])}>
            <Icon className="w-6 h-6" />
          </div>
          {change !== undefined && (
            <span
              className={clsx(
                'text-sm font-medium',
                isPositive && 'text-green-600',
                isNegative && 'text-red-600',
                !isPositive && !isNegative && 'text-gray-500'
              )}
            >
              {isPositive && '+'}
              {change}%
            </span>
          )}
        </div>
        <div className="sm:mt-4">
          <div className={clsx('p-1.5 rounded-lg w-fit sm:hidden', iconColors[variant])}>
            <Icon className="w-4 h-4" />
          </div>
          <p className="text-[10px] sm:text-sm font-medium text-gray-500 mt-1 sm:mt-0">{title}</p>
          <p className="text-lg sm:text-3xl font-bold text-gray-900">{value}</p>
          {changeLabel && (
            <p className="text-[10px] sm:text-xs text-gray-400">{changeLabel}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div className={clsx('p-3 rounded-lg', iconColors[variant])}>
          <Icon className="w-6 h-6" />
        </div>
        {change !== undefined && (
          <span
            className={clsx(
              'text-sm font-medium',
              isPositive && 'text-green-600',
              isNegative && 'text-red-600',
              !isPositive && !isNegative && 'text-gray-500'
            )}
          >
            {isPositive && '+'}
            {change}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        {changeLabel && (
          <p className="text-xs text-gray-400 mt-1">{changeLabel}</p>
        )}
      </div>
    </div>
  );
}
