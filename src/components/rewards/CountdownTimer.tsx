import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Zap, 
  TrendingUp,
  ArrowUp
} from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';
import { useToast } from '../../hooks/use-toast';

interface CountdownTimerProps {
  endTime: string;
  title?: string;
  description?: string;
  rewardAmount?: number;
  canUpgrade?: boolean;
  onUpgrade?: () => void;
  onExpired?: () => void;
  className?: string;
  variant?: 'compact' | 'detailed';
  urgencyColors?: boolean;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  percentage: number;
}

export function CountdownTimer({
  endTime,
  title = "Countdown Timer",
  description,
  rewardAmount,
  canUpgrade = false,
  onUpgrade,
  onExpired,
  className = "",
  variant = "detailed",
  urgencyColors = true
}: CountdownTimerProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const hasNotifiedExpiryRef = useRef(false);

  // Calculate time remaining
  const calculateTimeRemaining = (): TimeRemaining | null => {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const difference = end - now;

    if (difference <= 0) {
      return null;
    }

    const totalSeconds = Math.floor(difference / 1000);
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    // Calculate percentage (assuming 72 hours = 100%)
    const totalDuration = 72 * 60 * 60; // 72 hours in seconds
    const percentage = Math.max(0, Math.min(100, (totalSeconds / totalDuration) * 100));

    return {
      days,
      hours,
      minutes,
      seconds,
      totalSeconds,
      percentage
    };
  };

  // Memoize urgency style to prevent recalculation on every render
  const urgencyStyle = useMemo(() => {
    if (!urgencyColors || !timeRemaining) return { color: 'text-honey', bg: 'bg-honey/10', border: 'border-honey/30' };

    const { percentage } = timeRemaining;
    
    if (percentage > 50) {
      return { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' };
    } else if (percentage > 25) {
      return { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' };
    } else if (percentage > 10) {
      return { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' };
    } else {
      return { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' };
    }
  }, [timeRemaining?.percentage, urgencyColors]);

  // Stable update function to prevent flicker
  const updateTime = useCallback(() => {
    const remaining = calculateTimeRemaining();
    
    if (remaining) {
      setTimeRemaining(prev => {
        // Only update if there's a meaningful change to reduce flicker
        if (!prev || prev.seconds !== remaining.seconds) {
          return remaining;
        }
        return prev;
      });
      if (isExpired) setIsExpired(false);
    } else {
      setTimeRemaining(null);
      if (!isExpired) {
        setIsExpired(true);
        if (!hasNotifiedExpiryRef.current) {
          hasNotifiedExpiryRef.current = true;
          toast({
            title: "⏰ Timer Expired",
            description: "Your countdown timer has expired.",
            variant: "destructive"
          });
          onExpired?.();
        }
      }
    }
  }, [endTime, isExpired, onExpired, toast]);

  // Update timer every second with stable dependencies
  useEffect(() => {
    // Initial calculation
    updateTime();
    
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [updateTime]); // Include updateTime in dependencies


  // Format time display
  const formatTimeDisplay = (time: TimeRemaining) => {
    if (time.days > 0) {
      return `${time.days}d ${time.hours}h ${time.minutes}m`;
    } else if (time.hours > 0) {
      return `${time.hours}h ${time.minutes}m ${time.seconds}s`;
    } else {
      return `${time.minutes}m ${time.seconds}s`;
    }
  };

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Clock className={`h-4 w-4 ${isExpired ? 'text-red-400' : urgencyStyle.color}`} />
        <span className={`font-mono text-sm ${isExpired ? 'text-red-400' : urgencyStyle.color}`}>
          {isExpired ? 'EXPIRED' : timeRemaining ? formatTimeDisplay(timeRemaining) : 'Loading...'}
        </span>
      </div>
    );
  }

  // Expired state
  if (isExpired) {
    return (
      <Card className={`border-red-500/30 bg-red-500/5 ${className}`}>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold text-red-400 mb-1">Timer Expired</h3>
              <p className="text-sm text-muted-foreground">
                {description || "The countdown has ended"}
              </p>
              {rewardAmount && (
                <p className="text-xs text-red-400 mt-2">
                  Reward: ${rewardAmount} USDT (May be rolled up to upline)
                </p>
              )}
            </div>
            {canUpgrade && onUpgrade && (
              <Button 
                onClick={onUpgrade}
                variant="outline"
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Upgrade Now to Prevent Future Loss
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (!timeRemaining) {
    return (
      <Card className={`${className}`}>
        <CardContent className="pt-6">
          <div className="text-center">
            <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading timer...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${urgencyStyle.bg} ${urgencyStyle.border} border ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className={`text-lg ${urgencyStyle.color} flex items-center gap-2`}>
            <Clock className="h-5 w-5" />
            {title}
          </CardTitle>
          <Badge 
            variant="outline" 
            className={`${urgencyStyle.bg} ${urgencyStyle.color} ${urgencyStyle.border}`}
          >
            {timeRemaining.percentage > 50 ? 'Safe' : 
             timeRemaining.percentage > 25 ? 'Caution' :
             timeRemaining.percentage > 10 ? 'Warning' : 'Critical'}
          </Badge>
        </div>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Time Display */}
        <div className="text-center">
          <div className={`text-3xl font-mono font-bold ${urgencyStyle.color} mb-1`}>
            {formatTimeDisplay(timeRemaining)}
          </div>
          <div className="text-xs text-muted-foreground">
            {timeRemaining.days > 0 ? 'days, hours, minutes' : 
             timeRemaining.hours > 0 ? 'hours, minutes, seconds' : 'minutes, seconds'}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Time Remaining</span>
            <span className={urgencyStyle.color}>{timeRemaining.percentage.toFixed(1)}%</span>
          </div>
          <Progress 
            value={timeRemaining.percentage} 
            className={`h-2 ${urgencyStyle.bg}`}
          />
        </div>

        {/* Reward Information */}
        {rewardAmount && (
          <div className={`rounded-lg p-3 ${urgencyStyle.bg} border ${urgencyStyle.border}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Reward at Stake</div>
                <div className={`text-lg font-bold ${urgencyStyle.color}`}>
                  ${rewardAmount} USDT
                </div>
              </div>
              <Zap className={`h-6 w-6 ${urgencyStyle.color}`} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {timeRemaining.percentage > 25 
                ? "Upgrade to claim this reward before it expires"
                : "⚠️ Upgrade urgently or this reward will be rolled up to your upline"
              }
            </p>
          </div>
        )}

        {/* Action Buttons */}
        {canUpgrade && onUpgrade && (
          <div className="space-y-2">
            <Button 
              onClick={onUpgrade}
              className={`w-full ${timeRemaining.percentage <= 25 ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' : 'bg-honey hover:bg-honey/90 text-black'}`}
            >
              {timeRemaining.percentage <= 25 ? (
                <>
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Urgent: Upgrade Now
                </>
              ) : (
                <>
                  <ArrowUp className="mr-2 h-4 w-4" />
                  Upgrade to Claim
                </>
              )}
            </Button>
            
            {timeRemaining.percentage <= 10 && (
              <div className="text-center">
                <p className="text-xs text-red-400 font-medium animate-pulse">
                  ⚠️ CRITICAL: Reward expires in {formatTimeDisplay(timeRemaining)}!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Timer Details */}
        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border">
          <div className="text-center">
            <div className={`text-lg font-bold ${urgencyStyle.color}`}>{timeRemaining.days}</div>
            <div className="text-xs text-muted-foreground">Days</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${urgencyStyle.color}`}>{timeRemaining.hours}</div>
            <div className="text-xs text-muted-foreground">Hours</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${urgencyStyle.color}`}>{timeRemaining.minutes}</div>
            <div className="text-xs text-muted-foreground">Minutes</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${urgencyStyle.color}`}>{timeRemaining.seconds}</div>
            <div className="text-xs text-muted-foreground">Seconds</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default CountdownTimer;