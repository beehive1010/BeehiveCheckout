import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  AlertCircle,
  Zap,
  Award
} from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';
import CountdownTimer from './CountdownTimer';

interface PendingReward {
  id: string;
  expires_at: string;
  reward_amount: number;
  matrix_layer?: number;
  description?: string;
}

interface PendingRewardsListProps {
  rewards: PendingReward[];
  onRewardExpired?: () => void;
  variant?: 'compact' | 'detailed';
}

interface RewardItemProps {
  reward: PendingReward;
  onRewardExpired?: () => void;
  variant?: 'compact' | 'detailed';
}

function RewardItem({ reward, onRewardExpired, variant = 'compact' }: RewardItemProps) {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Calculate urgency level
  const getUrgencyLevel = () => {
    const now = new Date().getTime();
    const end = new Date(reward.expires_at).getTime();
    const difference = end - now;
    const totalSeconds = Math.floor(difference / 1000);
    const totalDuration = 72 * 60 * 60; // 72 hours
    const percentage = Math.max(0, Math.min(100, (totalSeconds / totalDuration) * 100));
    
    if (percentage > 50) return { level: 'safe', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' };
    if (percentage > 25) return { level: 'caution', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' };
    if (percentage > 10) return { level: 'warning', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' };
    return { level: 'critical', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' };
  };

  // Format compact time display
  const getCompactTimeDisplay = () => {
    const now = new Date().getTime();
    const end = new Date(reward.expires_at).getTime();
    const difference = end - now;
    
    if (difference <= 0) return 'EXPIRED';
    
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const urgency = getUrgencyLevel();
  const timeDisplay = getCompactTimeDisplay();

  return (
    <Card className={`transition-all hover:shadow-md ${urgency.border} border`}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className={`w-3 h-3 rounded-full ${urgency.bg} border-2 ${urgency.border}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="h-4 w-4 text-honey" />
                    <span className="font-medium text-sm">
                      {t('rewards.pendingRewardTimer')} #{reward.matrix_layer || 1}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {reward.description || t('rewards.pendingRewardDescription', { layer: reward.matrix_layer || 1 })}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <div className="font-bold text-honey text-sm">
                    ${reward.reward_amount} USDT
                  </div>
                  <div className={`text-xs font-mono ${urgency.color}`}>
                    {timeDisplay}
                  </div>
                </div>
                
                <Badge 
                  variant="outline" 
                  className={`${urgency.bg} ${urgency.color} ${urgency.border} text-xs`}
                >
                  {urgency.level === 'safe' ? t('common.safe') : 
                   urgency.level === 'caution' ? t('common.caution') :
                   urgency.level === 'warning' ? t('common.warning') : t('common.critical')}
                </Badge>
                
                <div className="flex items-center gap-2">
                  {/* Modal Dialog Button */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="h-8 w-8 p-0"
                        data-testid={`button-view-details-${reward.id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-honey" />
                          {t('rewards.pendingRewardDetails')}
                        </DialogTitle>
                      </DialogHeader>
                      <CountdownTimer
                        endTime={reward.expires_at}
                        title={t('rewards.pendingRewardTimer')}
                        description={reward.description || t('rewards.pendingRewardDescription', { layer: reward.matrix_layer || 1 })}
                        rewardAmount={reward.reward_amount}
                        variant="detailed"
                        urgencyColors={true}
                        onExpired={onRewardExpired}
                        className="border-0 shadow-none"
                      />
                    </DialogContent>
                  </Dialog>
                  
                  {/* Expand/Collapse Button */}
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="border-t border-border/50 pt-4">
              <CountdownTimer
                endTime={reward.expires_at}
                title={t('rewards.pendingRewardTimer')}
                description={reward.description || t('rewards.pendingRewardDescription', { layer: reward.matrix_layer || 1 })}
                rewardAmount={reward.reward_amount}
                variant="detailed"
                urgencyColors={true}
                onExpired={onRewardExpired}
                className="border-0 shadow-none bg-transparent"
              />
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export function PendingRewardsList({ rewards, onRewardExpired, variant = 'compact' }: PendingRewardsListProps) {
  const { t } = useI18n();
  
  if (rewards.length === 0) {
    return (
      <Card className="border-dashed border-2 border-muted-foreground/25">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">
            {t('rewards.noPendingRewards')}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {t('rewards.noPendingDescription')}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Sort rewards by urgency (most urgent first)
  const sortedRewards = [...rewards].sort((a, b) => {
    const timeA = new Date(a.expires_at).getTime();
    const timeB = new Date(b.expires_at).getTime();
    return timeA - timeB; // Earliest expiration first
  });

  return (
    <div className="space-y-3" data-testid="pending-rewards-list">
      {/* Summary Header */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {t('rewards.pendingRewardsCount', { count: rewards.length })}
        </span>
        <span className="font-medium">
          {t('rewards.totalPendingValue')}: ${rewards.reduce((sum, r) => sum + r.reward_amount, 0)} USDT
        </span>
      </div>
      
      {/* Rewards List */}
      <div className="space-y-2">
        {sortedRewards.map((reward) => (
          <RewardItem
            key={reward.id}
            reward={reward}
            onRewardExpired={onRewardExpired}
            variant={variant}
          />
        ))}
      </div>
      
      {/* Quick Stats */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-green-400">
                {sortedRewards.filter(r => {
                  const now = new Date().getTime();
                  const end = new Date(r.expires_at).getTime();
                  const percentage = ((end - now) / (72 * 60 * 60 * 1000)) * 100;
                  return percentage > 25;
                }).length}
              </div>
              <div className="text-xs text-muted-foreground">{t('common.safe')}</div>
            </div>
            <div>
              <div className="text-lg font-bold text-yellow-400">
                {sortedRewards.filter(r => {
                  const now = new Date().getTime();
                  const end = new Date(r.expires_at).getTime();
                  const percentage = ((end - now) / (72 * 60 * 60 * 1000)) * 100;
                  return percentage <= 25 && percentage > 10;
                }).length}
              </div>
              <div className="text-xs text-muted-foreground">{t('common.warning')}</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-400">
                {sortedRewards.filter(r => {
                  const now = new Date().getTime();
                  const end = new Date(r.expires_at).getTime();
                  const percentage = ((end - now) / (72 * 60 * 60 * 1000)) * 100;
                  return percentage <= 10;
                }).length}
              </div>
              <div className="text-xs text-muted-foreground">{t('common.critical')}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PendingRewardsList;