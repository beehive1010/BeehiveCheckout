import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { LucideIcon } from 'lucide-react';

interface DataItem {
  value: string | number;
  label: string;
  color?: string;
}

interface PremiumDataCardProps {
  title: string;
  icon: LucideIcon;
  iconColor: string;
  gradientFrom: string;
  gradientTo: string;
  data: DataItem[];
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
    testId?: string;
  };
  className?: string;
}

export default function PremiumDataCard({ 
  title, 
  icon: Icon, 
  iconColor, 
  gradientFrom, 
  gradientTo, 
  data, 
  action, 
  className = '' 
}: PremiumDataCardProps) {
  return (
    <div className={`group relative transition-all duration-500 hover:-translate-y-1 ${className}`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${gradientFrom} ${gradientTo} rounded-3xl blur-lg group-hover:blur-xl`}></div>
      <Card className="relative border-0 bg-gradient-to-br from-white/95 via-white/98 to-white/95 dark:from-gray-900/95 dark:via-gray-800/98 dark:to-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl transition-all duration-500 group-hover:shadow-3xl overflow-hidden">
        <CardContent className="p-4 sm:p-6 lg:p-8">
          {/* 头部图标和标题 */}
          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="relative">
              <div className={`absolute inset-0 bg-gradient-to-r ${gradientFrom} ${gradientTo} rounded-2xl blur-md group-hover:blur-lg transition-all duration-300`}></div>
              <div className={`relative p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br ${gradientFrom} ${gradientTo} backdrop-blur-sm`}>
                <Icon className={`h-6 w-6 sm:h-8 sm:w-8 ${iconColor} transition-all duration-300 group-hover:scale-110`} />
              </div>
            </div>
            <h3 className={`text-lg sm:text-xl font-bold bg-gradient-to-r ${iconColor} bg-clip-text text-transparent`}>
              {title}
            </h3>
          </div>
          
          {/* 数据展示 */}
          <div className={`grid ${data.length === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-4 sm:gap-6 ${action ? 'mb-6' : ''}`}>
            {data.map((item, index) => (
              <div key={index} className={`text-center p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br ${gradientFrom} ${gradientTo} border border-opacity-20 backdrop-blur-sm`}>
                <div className={`text-lg sm:text-2xl lg:text-3xl font-bold mb-2 ${item.color || iconColor}`}>
                  {item.value}
                </div>
                <div className="text-sm font-medium text-muted-foreground">{item.label}</div>
              </div>
            ))}
          </div>
          
          {/* Action Button */}
          {action && (
            <Button 
              onClick={action.onClick}
              className={`w-full h-11 sm:h-12 bg-gradient-to-r ${gradientFrom} ${gradientTo} hover:opacity-90 text-black font-bold text-sm sm:text-base rounded-xl sm:rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl`}
              data-testid={action.testId}
            >
              {action.icon && <action.icon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 transition-transform duration-200 group-hover:rotate-90" />}
              {action.label}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}