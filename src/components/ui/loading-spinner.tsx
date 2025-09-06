import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  variant?: 'default' | 'primary' | 'secondary' | 'muted';
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12'
};

const variantClasses = {
  default: 'text-foreground',
  primary: 'text-primary',
  secondary: 'text-secondary',
  muted: 'text-muted-foreground'
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className,
  variant = 'default'
}) => {
  return (
    <Loader2 
      className={cn(
        'animate-spin',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    />
  );
};

// Specialized spinner components
export const InlineSpinner: React.FC<{ className?: string }> = ({ className }) => (
  <LoadingSpinner size="sm" className={cn('inline mr-2', className)} />
);

export const CenteredSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }> = ({ 
  size = 'lg', 
  className 
}) => (
  <div className={cn('flex justify-center items-center p-8', className)}>
    <LoadingSpinner size={size} variant="primary" />
  </div>
);

export const OverlaySpinner: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn(
    'absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50',
    className
  )}>
    <LoadingSpinner size="lg" variant="primary" />
  </div>
);

export default LoadingSpinner;