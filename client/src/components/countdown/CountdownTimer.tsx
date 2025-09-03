import { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

export interface CountdownTimerProps {
  expiresAt: Date | string;
  onExpiry?: () => void;
  className?: string;
}

export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

export function CountdownTimer({ expiresAt, onExpiry, className = '' }: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    total: 0
  });

  const calculateTimeRemaining = (targetDate: Date | string): TimeRemaining => {
    const now = new Date().getTime();
    // Ensure targetDate is a Date object
    const target = targetDate instanceof Date ? targetDate.getTime() : new Date(targetDate).getTime();
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
      const remaining = calculateTimeRemaining(expiresAt);
      setTimeRemaining(remaining);

      if (remaining.total <= 0 && onExpiry) {
        onExpiry();
      }
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpiry]);

  const formatTime = (value: number): string => {
    return value.toString().padStart(2, '0');
  };

  const isExpired = timeRemaining.total <= 0;
  const isUrgent = timeRemaining.total <= 24 * 60 * 60 * 1000; // Less than 24 hours
  const isCritical = timeRemaining.total <= 6 * 60 * 60 * 1000; // Less than 6 hours

  if (isExpired) {
    return (
      <div className={`flex items-center gap-2 text-red-500 ${className}`} data-testid="countdown-expired">
        <AlertTriangle className="w-4 h-4" />
        <span className="text-sm font-medium">EXPIRED</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`} data-testid="countdown-timer">
      <Clock className={`w-4 h-4 ${isCritical ? 'text-red-500' : isUrgent ? 'text-yellow-500' : 'text-gray-400'}`} />
      
      <div className={`flex items-center gap-1 text-sm font-mono ${
        isCritical ? 'text-red-500' : isUrgent ? 'text-yellow-500' : 'text-gray-300'
      }`}>
        {timeRemaining.days > 0 && (
          <>
            <span data-testid="countdown-days">{timeRemaining.days}</span>
            <span className="text-xs">d</span>
          </>
        )}
        
        <span data-testid="countdown-hours">{formatTime(timeRemaining.hours)}</span>
        <span className="text-xs">:</span>
        <span data-testid="countdown-minutes">{formatTime(timeRemaining.minutes)}</span>
        <span className="text-xs">:</span>
        <span data-testid="countdown-seconds">{formatTime(timeRemaining.seconds)}</span>
      </div>

      {isCritical && (
        <div className="ml-1">
          <span className="text-xs text-red-400 animate-pulse">URGENT</span>
        </div>
      )}
    </div>
  );
}

export default CountdownTimer;