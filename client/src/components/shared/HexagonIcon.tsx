import { cn } from '../../lib/utils';

interface HexagonIconProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-20 h-20',
};

export default function HexagonIcon({ children, className, size = 'md' }: HexagonIconProps) {
  return (
    <div className={cn('hexagon-border hexagon', sizeClasses[size], className)}>
      <div className="hexagon-inner w-full h-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
