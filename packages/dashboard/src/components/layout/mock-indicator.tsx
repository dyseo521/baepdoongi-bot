'use client';

/**
 * Mock 모드 인디케이터
 *
 * NEXT_PUBLIC_USE_MOCK=true 환경에서만 표시됩니다.
 * 프로덕션 빌드 시 이 컴포넌트는 tree-shaking으로 제거됩니다.
 */

const IS_MOCK = process.env['NEXT_PUBLIC_USE_MOCK'] === 'true';

export function MockIndicator() {
  if (!IS_MOCK) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-200" />
      </span>
      MOCK MODE
    </div>
  );
}
