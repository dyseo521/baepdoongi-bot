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
      <div className="px-8 py-6 border-b border-gray-200 bg-white flex justify-between">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>
      <div className="p-8 space-y-6">
        {/* Filters */}
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-lg" />
          ))}
        </div>
        <SkeletonTable rows={6} columns={7} />
      </div>
    </div>
  );
}

export function MatchingPageSkeleton() {
  return (
    <div className="animate-in fade-in duration-300">
      <div className="px-8 py-6 border-b border-gray-200 bg-white flex justify-between">
        <div>
          <Skeleton className="h-8 w-28 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>
      <div className="p-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        {/* Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <div className="p-4 border-b">
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="divide-y">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="p-4 border-b">
              <Skeleton className="h-5 w-28" />
            </div>
            <div className="divide-y">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 space-y-2">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
