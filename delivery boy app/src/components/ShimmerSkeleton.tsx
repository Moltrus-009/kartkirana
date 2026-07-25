import React from 'react';

interface SkeletonProps {
  type: 'card' | 'list' | 'profile' | 'kpi';
  count?: number;
}

export const ShimmerSkeleton: React.FC<SkeletonProps> = ({ type, count = 1 }) => {
  const renderItem = () => {
    switch (type) {
      case 'kpi':
        return (
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border p-4 rounded-2xl shadow-xs space-y-2">
            <div className="h-3 w-16 bg-slate-200 dark:bg-zinc-800 rounded-sm shimmer"></div>
            <div className="h-6 w-24 bg-slate-200 dark:bg-zinc-800 rounded-sm shimmer"></div>
          </div>
        );
      case 'card':
        return (
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border p-4.5 rounded-2xl shadow-sm space-y-3.5">
            <div className="flex justify-between items-center">
              <div className="h-3.5 w-24 bg-slate-200 dark:bg-zinc-800 rounded shimmer"></div>
              <div className="h-4.5 w-16 bg-slate-200 dark:bg-zinc-800 rounded-full shimmer"></div>
            </div>
            <div className="space-y-2 pb-2">
              <div className="h-3 w-40 bg-slate-200 dark:bg-zinc-800 rounded shimmer"></div>
              <div className="h-3 w-56 bg-slate-200 dark:bg-zinc-800 rounded shimmer"></div>
            </div>
            <div className="flex justify-between items-center border-t border-slate-100 dark:border-dark-border pt-3">
              <div className="h-3 w-20 bg-slate-200 dark:bg-zinc-800 rounded shimmer"></div>
              <div className="h-4 w-12 bg-slate-200 dark:bg-zinc-800 rounded shimmer"></div>
            </div>
          </div>
        );
      case 'list':
        return (
          <div className="flex items-center space-x-3 py-3 border-b border-slate-100 dark:border-dark-border">
            <div className="h-10 w-10 bg-slate-200 dark:bg-zinc-800 rounded-full shimmer flex-shrink-0"></div>
            <div className="flex-grow space-y-1.5">
              <div className="h-3.5 w-1/3 bg-slate-200 dark:bg-zinc-800 rounded shimmer"></div>
              <div className="h-2.5 w-2/3 bg-slate-200 dark:bg-zinc-800 rounded shimmer"></div>
            </div>
            <div className="h-4 w-12 bg-slate-200 dark:bg-zinc-800 rounded shimmer"></div>
          </div>
        );
      case 'profile':
        return (
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border p-6 rounded-2xl shadow-sm text-center space-y-4">
            <div className="h-20 w-20 bg-slate-200 dark:bg-zinc-800 rounded-full mx-auto shimmer"></div>
            <div className="space-y-2">
              <div className="h-4 w-32 bg-slate-200 dark:bg-zinc-800 rounded mx-auto shimmer"></div>
              <div className="h-3 w-40 bg-slate-200 dark:bg-zinc-800 rounded mx-auto shimmer"></div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-dark-border">
              <div className="h-8 bg-slate-200 dark:bg-zinc-800 rounded shimmer"></div>
              <div className="h-8 bg-slate-200 dark:bg-zinc-800 rounded shimmer"></div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 w-full">
      {Array.from({ length: count }).map((_, idx) => (
        <React.Fragment key={idx}>{renderItem()}</React.Fragment>
      ))}
    </div>
  );
};
