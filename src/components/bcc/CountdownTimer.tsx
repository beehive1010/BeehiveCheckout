import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetDate: string;
  onComplete?: () => void;
  className?: string;
  showDays?: boolean;
  showSeconds?: boolean;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  targetDate,
  onComplete,
  className = '',
  showDays = true,
  showSeconds = true,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    total: 0,
  });

  const calculateTimeRemaining = (targetDate: string): TimeRemaining => {
    const target = new Date(targetDate).getTime();
    const now = new Date().getTime();
    const difference = target - now;

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, total: difference };
  };

  useEffect(() => {
    const updateTimer = () => {
      const remaining = calculateTimeRemaining(targetDate);
      setTimeRemaining(remaining);

      if (remaining.total <= 0 && onComplete) {
        onComplete();
      }
    };

    // Update immediately
    updateTimer();

    // Set up interval
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [targetDate, onComplete]);

  if (timeRemaining.total <= 0) {
    return (
      <div className={`text-green-600 font-semibold ${className}`}>
        ✅ Complete! Ready to claim
      </div>
    );
  }

  const formatNumber = (num: number): string => {
    return num.toString().padStart(2, '0');
  };

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-center space-x-1">
        {showDays && timeRemaining.days > 0 && (
          <>
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold">{formatNumber(timeRemaining.days)}</span>
              <span className="text-xs uppercase tracking-wide opacity-75">Days</span>
            </div>
            <span className="text-lg font-bold opacity-50">:</span>
          </>
        )}
        
        <div className="flex flex-col items-center">
          <span className="text-lg font-bold">{formatNumber(timeRemaining.hours)}</span>
          <span className="text-xs uppercase tracking-wide opacity-75">Hours</span>
        </div>
        <span className="text-lg font-bold opacity-50">:</span>
        
        <div className="flex flex-col items-center">
          <span className="text-lg font-bold">{formatNumber(timeRemaining.minutes)}</span>
          <span className="text-xs uppercase tracking-wide opacity-75">Min</span>
        </div>
        
        {showSeconds && (
          <>
            <span className="text-lg font-bold opacity-50">:</span>
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold">{formatNumber(timeRemaining.seconds)}</span>
              <span className="text-xs uppercase tracking-wide opacity-75">Sec</span>
            </div>
          </>
        )}
      </div>
      
      {/* Progress bar for visual appeal */}
      <div className="mt-2">
        <div className="w-full bg-gray-200 rounded-full h-1">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-1 rounded-full transition-all duration-1000"
            style={{ 
              width: `${Math.max(0, Math.min(100, 100 - (timeRemaining.total / (72 * 60 * 60 * 1000)) * 100))}%`
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};

// Compact version for smaller spaces
export const CompactCountdownTimer: React.FC<CountdownTimerProps> = ({
  targetDate,
  onComplete,
  className = '',
}) => {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    total: 0,
  });

  useEffect(() => {
    const updateTimer = () => {
      const target = new Date(targetDate).getTime();
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });
        if (onComplete) onComplete();
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds, total: difference });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [targetDate, onComplete]);

  if (timeRemaining.total <= 0) {
    return <span className={`text-green-600 ${className}`}>Ready!</span>;
  }

  const formatCompact = (): string => {
    if (timeRemaining.days > 0) {
      return `${timeRemaining.days}d ${timeRemaining.hours}h ${timeRemaining.minutes}m`;
    }
    if (timeRemaining.hours > 0) {
      return `${timeRemaining.hours}h ${timeRemaining.minutes}m`;
    }
    return `${timeRemaining.minutes}m ${timeRemaining.seconds}s`;
  };

  return (
    <span className={`font-mono ${className}`}>
      {formatCompact()}
    </span>
  );
};