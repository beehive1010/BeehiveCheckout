import React from 'react';
import { cn } from '../../lib/utils';

interface FadeTransitionProps {
  show: boolean;
  children: React.ReactNode;
  className?: string;
  duration?: 'fast' | 'normal' | 'slow';
}

interface SlideTransitionProps {
  show: boolean;
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right';
  className?: string;
  duration?: 'fast' | 'normal' | 'slow';
}

interface ScaleTransitionProps {
  show: boolean;
  children: React.ReactNode;
  className?: string;
  duration?: 'fast' | 'normal' | 'slow';
}

const durationClasses = {
  fast: 'transition-all duration-150 ease-in-out',
  normal: 'transition-all duration-300 ease-in-out',
  slow: 'transition-all duration-500 ease-in-out'
};

export const FadeTransition: React.FC<FadeTransitionProps> = ({
  show,
  children,
  className,
  duration = 'normal'
}) => {
  return (
    <div
      className={cn(
        durationClasses[duration],
        show ? 'opacity-100' : 'opacity-0 pointer-events-none',
        className
      )}
    >
      {children}
    </div>
  );
};

export const SlideTransition: React.FC<SlideTransitionProps> = ({
  show,
  children,
  direction = 'up',
  className,
  duration = 'normal'
}) => {
  const directionClasses = {
    up: show ? 'translate-y-0' : 'translate-y-4',
    down: show ? 'translate-y-0' : '-translate-y-4',
    left: show ? 'translate-x-0' : 'translate-x-4',
    right: show ? 'translate-x-0' : '-translate-x-4'
  };

  return (
    <div
      className={cn(
        durationClasses[duration],
        'transform',
        directionClasses[direction],
        show ? 'opacity-100' : 'opacity-0 pointer-events-none',
        className
      )}
    >
      {children}
    </div>
  );
};

export const ScaleTransition: React.FC<ScaleTransitionProps> = ({
  show,
  children,
  className,
  duration = 'normal'
}) => {
  return (
    <div
      className={cn(
        durationClasses[duration],
        'transform origin-center',
        show ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none',
        className
      )}
    >
      {children}
    </div>
  );
};

// Staggered animation for lists
interface StaggeredListProps {
  children: React.ReactNode[];
  show: boolean;
  className?: string;
  staggerDelay?: number; // in milliseconds
}

export const StaggeredList: React.FC<StaggeredListProps> = ({
  children,
  show,
  className,
  staggerDelay = 100
}) => {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <div
          key={index}
          className={cn(
            'transition-all duration-300 ease-out',
            show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          )}
          style={{
            transitionDelay: show ? `${index * staggerDelay}ms` : '0ms'
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
};

// Hover and focus transitions
export const HoverCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  scale?: boolean;
  shadow?: boolean;
}> = ({ children, className, scale = true, shadow = true }) => {
  return (
    <div
      className={cn(
        'transition-all duration-200 ease-in-out',
        scale && 'hover:scale-[1.02]',
        shadow && 'hover:shadow-lg hover:shadow-primary/10',
        'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
};

// Loading.tsx state transition
export const LoadingTransition: React.FC<{
  isLoading: boolean;
  children: React.ReactNode;
  loader?: React.ReactNode;
  className?: string;
}> = ({ isLoading, children, loader, className }) => {
  return (
    <div className={cn('relative', className)}>
      <FadeTransition show={!isLoading}>
        {children}
      </FadeTransition>
      <FadeTransition show={isLoading}>
        <div className="absolute inset-0 flex items-center justify-center">
          {loader}
        </div>
      </FadeTransition>
    </div>
  );
};

export default {
  FadeTransition,
  SlideTransition,
  ScaleTransition,
  StaggeredList,
  HoverCard,
  LoadingTransition
};