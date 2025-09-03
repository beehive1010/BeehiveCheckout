interface MobileDividerProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  withText?: string;
}

export default function MobileDivider({ 
  orientation = 'horizontal', 
  className = '', 
  withText 
}: MobileDividerProps) {
  if (withText) {
    return (
      <div className={`flex items-center my-4 ${className}`}>
        <div className="flex-1 h-px bg-border"></div>
        <span className="px-3 text-xs text-muted-foreground bg-background">
          {withText}
        </span>
        <div className="flex-1 h-px bg-border"></div>
      </div>
    );
  }

  if (orientation === 'vertical') {
    return <div className={`w-px bg-border ${className}`}></div>;
  }

  return <div className={`h-px bg-border ${className}`}></div>;
}