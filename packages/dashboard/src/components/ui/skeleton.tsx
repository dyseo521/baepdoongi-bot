'use client';

import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className, width, height }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] rounded',
        className
      )}
      style={{ width, height }}
    />
  );
}

export function SkeletonText({ lines = 1, className }: { lines?: number; className?: string }) {
  return (
    <div className={clsx('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          width={i === lines - 1 && lines > 1 ? '70%' : '100%'}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={clsx('card p-4 space-y-3', className)}>
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-8 w-16" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
        <div className="flex gap-6">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
      </div>
      {/* Rows */}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-6 py-4 flex gap-6">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={colIndex}
                className="h-5"
                width={colIndex === 0 ? 120 : colIndex === columns - 1 ? 80 : 100}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-7 w-12" />
        </div>
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="animate-in fade-in duration-300">
      {/* Page Header Skeleton */}
      <div className="px-8 py-6 border-b border-gray-200 bg-white">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Content Skeleton */}
      <div className="p-8 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>

        {/* Table */}
        <SkeletonTable rows={5} columns={5} />
      </div>
    </div>
  );
}

export function EventsPageSkeleton() {
  return (
    <div className="animate-in fade-in duration-300">
      <div className="px-8 py-6 border-b border-gray-200 bg-white flex justify-between">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
      <div className="p-8">
        <SkeletonTable rows={4} columns={5} />
      </div>
    </div>
  );
}

export function SuggestionsPageSkeleton() {
  return (
    <div className="animate-in fade-in duration-300">
      <div className="px-8 py-6 border-b border-gray-200 bg-white">
        <Skeleton className="h-8 w-28 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <SkeletonTable rows={5} columns={5} />
      </div>
    </div>
  );
}

export function SubmissionsPageSkeleton() {
  return (
    <div className="animate-in fade-in duration-300">
      <div className="px-8 py-6 border-b border-gray-200 bg-white flex justify-between items-start">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>
      <div className="p-8 space-y-6">
        {/* Filters - 5개 */}
        <div className="flex gap-2 flex-wrap">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-8 w-28 rounded-lg" />
          ))}
        </div>
        {/* Table - 9 columns */}
        <SkeletonTable rows={6} columns={9} />
      </div>
    </div>
  );
}

export function MatchingPageSkeleton() {
  return (
    <div className="animate-in fade-in duration-300">
      {/* Header with back button */}
      <div className="px-8 py-6 border-b border-gray-200 bg-white flex justify-between items-start">
        <div>
          <Skeleton className="h-8 w-28 mb-2" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>

      <div className="p-8">
        {/* Settings row */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>

        {/* Matching status cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="w-5 h-5" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-9 w-12" />
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="w-5 h-5" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-9 w-12" />
          </div>
        </div>

        {/* Matching interface - two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Submissions */}
          <div className="card">
            <div className="p-4 border-b border-gray-200">
              <Skeleton className="h-5 w-32 mb-1" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="divide-y divide-gray-100">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <div className="text-right space-y-1">
                      <Skeleton className="h-5 w-12 rounded-full" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Deposits */}
          <div className="card">
            <div className="p-4 border-b border-gray-200">
              <Skeleton className="h-5 w-32 mb-1" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="divide-y divide-gray-100">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Info section */}
        <div className="mt-8 card p-6">
          <div className="flex gap-3">
            <Skeleton className="w-5 h-5 flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-full max-w-xl" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="px-8 py-6 border-b border-gray-200 bg-white">
        <Skeleton className="h-8 w-28 mb-2" />
        <Skeleton className="h-4 w-56" />
      </div>

      <div className="p-8 space-y-6">
        {/* Stats Grid - 6 cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>

        {/* Two list cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent events card */}
          <div className="card">
            <div className="p-4 border-b flex justify-between items-center">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="divide-y">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-4 flex justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </div>

          {/* Recent logs card */}
          <div className="card">
            <div className="p-4 border-b flex justify-between items-center">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="divide-y">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-4 flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MembersPageSkeleton() {
  return (
    <div className="animate-in fade-in duration-300">
      {/* Page Header with 3 buttons */}
      <div className="px-8 py-6 border-b border-gray-200 bg-white flex justify-between items-start">
        <div>
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
      </div>

      <div className="p-8 space-y-6">
        {/* Summary cards - 3개 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>

        {/* Table - 6 columns */}
        <SkeletonTable rows={8} columns={6} />
      </div>
    </div>
  );
}

export function LogsPageSkeleton() {
  return (
    <div className="animate-in fade-in duration-300">
      {/* Page Header with refresh button */}
      <div className="px-8 py-6 border-b border-gray-200 bg-white flex justify-between items-start">
        <div>
          <Skeleton className="h-8 w-28 mb-2" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>

      <div className="p-8 space-y-6">
        {/* Summary cards - 4개 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>

        {/* Filter tabs - 8개 */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Skeleton className="w-4 h-4 flex-shrink-0" />
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-8 w-16 rounded-full flex-shrink-0" />
          ))}
        </div>

        {/* Log list */}
        <div className="card divide-y">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="p-4 flex items-start gap-3">
              <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-20 rounded" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-4 w-full max-w-md" />
              </div>
              <Skeleton className="h-4 w-20 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PaymentsPageSkeleton() {
  return (
    <div className="animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="px-8 py-6 border-b border-gray-200 bg-white">
        <Skeleton className="h-8 w-28 mb-2" />
        <Skeleton className="h-4 w-56" />
      </div>

      <div className="p-8">
        {/* Stat cards - 4개 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>

        {/* Status cards - 2개 */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 지원서 상태 */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="w-5 h-5" />
              <Skeleton className="h-6 w-36" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-lg" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-5 w-8" />
                </div>
              ))}
            </div>
          </div>

          {/* 입금 상태 */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="w-5 h-5" />
              <Skeleton className="h-6 w-36" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-lg" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-5 w-8" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick links - 2개 */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="card p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
