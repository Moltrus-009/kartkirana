import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return <div className={`shimmer rounded-xl ${className}`} />;
};

export const SkeletonCircle: React.FC<SkeletonProps> = ({ className = '' }) => {
  return <div className={`shimmer rounded-full ${className}`} />;
};

export const SkeletonCard: React.FC = () => {
  return (
    <div className="border border-gray-100 dark:border-slate-800 rounded-3xl p-3.5 flex flex-col gap-2">
      <Skeleton className="w-full aspect-square" />
      <Skeleton className="w-1/2 h-3" />
      <Skeleton className="w-4/5 h-4" />
      <div className="flex items-center justify-between mt-2">
        <Skeleton className="w-12 h-6" />
        <Skeleton className="w-16 h-8" />
      </div>
    </div>
  );
};

export const ShopSkeleton: React.FC = () => {
  return (
    <div className="border border-gray-100 dark:border-slate-800 rounded-3xl flex flex-col gap-2">
      <Skeleton className="w-full aspect-video" />
      <div className="p-4 flex flex-col gap-2">
        <Skeleton className="w-1/3 h-4" />
        <Skeleton className="w-4/5 h-5" />
        <div className="flex items-center justify-between mt-4">
          <Skeleton className="w-14 h-5" />
          <Skeleton className="w-20 h-5" />
        </div>
      </div>
    </div>
  );
};
