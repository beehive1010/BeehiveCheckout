import React from 'react';
import { cn } from '../../lib/utils';

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'default' | 'card' | 'text' | 'circle' | 'button';
  lines?: number;
  height?: string;
  width?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className,
  variant = 'default',
  lines = 1,
  height = 'h-4',
  width = 'w-full'
}) => {
  const baseClasses = 'animate-pulse bg-muted rounded';
  
  if (variant === 'card') {
    return (
      <div className={cn('border rounded-lg p-4 space-y-3', className)}>
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-4/5"></div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'circle') {
    return (
      <div className={cn('animate-pulse bg-muted rounded-full', height, width || height, className)} />
    );
  }

  if (variant === 'button') {
    return (
      <div className={cn('animate-pulse bg-muted rounded px-4 py-2', height, width, className)} />
    );
  }

  if (variant === 'text' && lines > 1) {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(
              baseClasses,
              height,
              index === lines - 1 ? 'w-3/4' : 'w-full'
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn(baseClasses, height, width, className)} />
  );
};

// Specialized loading components
export const CardLoadingSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <LoadingSkeleton variant="card" className={className} />
);

export const TextLoadingSkeleton: React.FC<{ lines?: number; className?: string }> = ({ 
  lines = 3, 
  className 
}) => (
  <LoadingSkeleton variant="text" lines={lines} className={className} />
);

export const ButtonLoadingSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <LoadingSkeleton variant="button" className={className} />
);

export const CircleLoadingSkeleton: React.FC<{ size?: string; className?: string }> = ({ 
  size = 'h-10 w-10', 
  className 
}) => (
  <LoadingSkeleton variant="circle" height={size} className={className} />
);

export default LoadingSkeleton;