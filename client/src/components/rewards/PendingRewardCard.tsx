import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CountdownTimer } from '../countdown/CountdownTimer';
import { Clock, DollarSign, TrendingUp, Zap } from 'lucide-react';
import { useLocation } from 'wouter';

export interface PendingReward {
  id: string;
  amount: number;
  tokenType: 'USDT';
  requiresLevel: number;
  unlockCondition: string;
  expiresAt: Date;
  hoursLeft: number;
  recipientWallet: string;
  sourceWallet: string;
  triggerLevel: number;
}

interface PendingRewardCardProps {
  reward: PendingReward;
  currentUserLevel: number;
  onExpiry?: () => void;
  className?: string;
}

export function PendingRewardCard({ 
  reward, 
  currentUserLevel, 
  onExpiry,
  className = ''
}: PendingRewardCardProps) {
  const [, setLocation] = useLocation();

  const canUpgrade = currentUserLevel < reward.requiresLevel;
  const isUrgent = reward.hoursLeft <= 24;
  const isCritical = reward.hoursLeft <= 6;

  const handleUpgradeClick = () => {
    setLocation('/tasks');
  };

  const handleExpiry = () => {
    console.log(`⏰ Pending reward ${reward.id} has expired`);
    onExpiry?.();
  };

  return (
    <Card className={`relative overflow-hidden border-2 ${
      isCritical 
        ? 'border-red-500 bg-red-950/20' 
        : isUrgent 
          ? 'border-yellow-500 bg-yellow-950/20'
          : 'border-yellow-400 bg-yellow-950/10'
    } ${className}`} data-testid={`pending-reward-${reward.id}`}>
      
      {/* Urgent indicator */}
      {isCritical && (
        <div className="absolute top-0 right-0 bg-red-500 text-white text-xs px-2 py-1 rounded-bl-lg">
          <Zap className="w-3 h-3 inline mr-1" />
          URGENT
        </div>
      )}

      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="w-5 h-5 text-yellow-400" />
            {reward.amount} USDT
          </CardTitle>
          
          <Badge variant="outline" className="border-yellow-400 text-yellow-400">
            Layer {reward.triggerLevel}
          </Badge>
        </div>
        
        <div className="text-sm text-gray-400">
          Pending reward from upgrade
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Countdown Timer */}
        <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-300">Time remaining:</span>
          </div>
          
          <CountdownTimer 
            expiresAt={reward.expiresAt}
            onExpiry={handleExpiry}
            data-testid={`countdown-${reward.id}`}
          />
        </div>

        {/* Requirements */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <span className="text-gray-300">
              Requires: <span className="text-blue-400 font-medium">Level {reward.requiresLevel} Membership</span>
            </span>
          </div>
          
          <div className="text-xs text-gray-500">
            Current level: Level {currentUserLevel}
          </div>
        </div>

        {/* Action Button */}
        {canUpgrade && (
          <Button 
            onClick={handleUpgradeClick}
            className={`w-full ${
              isCritical 
                ? 'bg-red-600 hover:bg-red-700' 
                : isUrgent 
                  ? 'bg-yellow-600 hover:bg-yellow-700'
                  : 'bg-blue-600 hover:bg-blue-700'
            }`}
            data-testid={`upgrade-button-${reward.id}`}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Upgrade to Level {reward.requiresLevel}
          </Button>
        )}

        {/* Helper text */}
        <div className="text-xs text-gray-500 text-center">
          {isCritical 
            ? '⚠️ Less than 6 hours remaining - upgrade now!' 
            : isUrgent 
              ? '⏰ Less than 24 hours remaining'
              : 'Upgrade before the timer expires to claim this reward'
          }
        </div>
      </CardContent>
    </Card>
  );
}

export default PendingRewardCard;