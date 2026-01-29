import type { ReactNode } from 'react';
import { clsx } from 'clsx';

interface MobileDataCardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  metadata?: Array<{ label: string; value: ReactNode }>;
  actions?: ReactNode;
  badge?: ReactNode;
  onClick?: () => void;
}

export function MobileDataCard({
  title,
  subtitle,
  metadata,
  actions,
  badge,
  onClick,
}: MobileDataCardProps) {
  return (
    <div
      className={clsx(
        'card p-4',
        onClick && 'cursor-pointer hover:bg-gray-50 transition-colors'
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* 상단: 제목 & 뱃지 */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900">{title}</div>
          {subtitle && (
            <div className="text-sm text-gray-500 mt-0.5">{subtitle}</div>
          )}
        </div>
        {badge && <div className="flex-shrink-0">{badge}</div>}
      </div>

      {/* 메타데이터 */}
      {metadata && metadata.length > 0 && (
        <div className="space-y-1.5 mt-3 pt-3 border-t border-gray-100">
          {metadata.map((item, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="text-gray-500">{item.label}</span>
              <span className="text-gray-700">{item.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* 액션 버튼 */}
      {actions && (
        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-100">
          {actions}
        </div>
      )}
    </div>
  );
}
