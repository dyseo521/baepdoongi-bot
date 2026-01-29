'use client';

import dynamic from 'next/dynamic';

// 경량 컴포넌트 - 정적 임포트
export { StatCard } from './stat-card';
export { DataTable } from './data-table';
export { MobileDataCard } from './mobile-data-card';
export { Badge } from './badge';
export { Button } from './button';
export { Modal } from './modal';
export { ConfirmModal } from './confirm-modal';
export { StatusDropdown, statusConfig } from './status-dropdown';
export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonTable,
  SkeletonStatCard,
  PageSkeleton,
  EventsPageSkeleton,
  SuggestionsPageSkeleton,
  SubmissionsPageSkeleton,
  MatchingPageSkeleton,
  DepositsPageSkeleton,
  DashboardSkeleton,
  MembersPageSkeleton,
  LogsPageSkeleton,
  PaymentsPageSkeleton,
} from './skeleton';

// 무거운 컴포넌트 - 동적 임포트 (Tiptap ~300KB, emoji-picker-react ~200KB)
export const RichTextEditor = dynamic(
  () => import('./rich-text-editor').then((m) => m.RichTextEditor),
  { ssr: false }
);

export const EmojiPickerButton = dynamic(
  () => import('./emoji-picker-button').then((m) => m.EmojiPickerButton),
  { ssr: false }
);
