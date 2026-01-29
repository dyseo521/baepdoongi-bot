'use client';

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

interface Column<T> {
  key: string;
  header: ReactNode;
  render: (item: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  getRowKey: (item: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  /** 모바일에서 카드 형태로 렌더링하는 함수 */
  mobileCardRender?: (item: T) => ReactNode;
}

export function DataTable<T>({
  data,
  columns,
  getRowKey,
  isLoading,
  emptyMessage = '데이터가 없습니다.',
  onRowClick,
  mobileCardRender,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="card overflow-hidden">
        <div className="p-8 text-center text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-500" />
          <p className="mt-4">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="card overflow-hidden">
        <div className="p-8 text-center text-gray-500">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <>
      {/* 모바일 카드 뷰 (md 미만) */}
      {mobileCardRender && (
        <div className="md:hidden space-y-3">
          {data.map((item) => (
            <div key={getRowKey(item)}>{mobileCardRender(item)}</div>
          ))}
        </div>
      )}

      {/* 데스크탑 테이블 (md 이상 또는 mobileCardRender가 없을 때) */}
      <div className={clsx('card overflow-hidden', mobileCardRender && 'hidden md:block')}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={clsx(
                      'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                      column.className
                    )}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((item) => (
                <tr
                  key={getRowKey(item)}
                  className={clsx(
                    'hover:bg-gray-50',
                    onRowClick && 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500'
                  )}
                  onClick={() => onRowClick?.(item)}
                  onKeyDown={(e) => {
                    if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      onRowClick(item);
                    }
                  }}
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? 'button' : undefined}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={clsx(
                        'px-6 py-4 whitespace-nowrap text-sm',
                        column.className
                      )}
                    >
                      {column.render(item)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
