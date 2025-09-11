import React from 'react';
import { Card, CardContent } from '../ui/card';
import { ArrowRight, LucideIcon } from 'lucide-react';

interface QuickNavigationCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  onClick: () => void;
  className?: string;
}

export default function QuickNavigationCard({ 
  title, 
  description, 
  icon: Icon, 
  iconColor, 
  onClick, 
  className = '' 
}: QuickNavigationCardProps) {
  return (
    <Card 
      className={`cursor-pointer hover:bg-muted/50 transition-colors group ${className}`} 
      onClick={onClick}
    >
      <CardContent className="p-6 text-center">
        <Icon className={`h-8 w-8 ${iconColor} mx-auto mb-3 group-hover:scale-110 transition-transform`} />
        <div className="font-semibold mb-2">{title}</div>
        <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
          {description} <ArrowRight className="h-3 w-3" />
        </div>
      </CardContent>
    </Card>
  );
}