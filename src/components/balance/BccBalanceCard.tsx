import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Button } from '../ui/button';
import { 
  Coins, 
  Lock, 
  Unlock, 
  TrendingUp, 
  Clock, 
  Gift,
  Info
} from 'lucide-react';
import { useBalance } from '../../hooks/useBalance';
import { Tooltip } from '../ui/tooltip';

interface BccBalanceCardProps {
  walletAddress?: string;
  memberLevel?: number;
  className?: string;
}

export const BccBalanceCard: React.FC<BccBalanceCardProps> = ({
  walletAddress,
  memberLevel,
  className = ''
}) => {
  const { 
    balanceData, 
    isBalanceLoading, 
    getTierInfo,
    getBalanceBreakdown,
    claimLockedRewards,
    isClaimingRewards,
    transferBcc,
    isTransferringBcc
  } = useBalance();

  // Get balance breakdown from enhanced hook
  const balanceBreakdown = getBalanceBreakdown() || {
    transferable: 0,
    lockedRewards: 0,
    lockedLevel: 0,
    lockedStaking: 0,
    pendingActivation: 0,
    total: 0
  };

  const tierInfo = getTierInfo();

  if (isBalanceLoading) {
    return (
      <Card className={`animate-pulse ${className}`}>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-32 mb-2"></div>
          <div className="h-4 bg-muted rounded w-48"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-16 bg-muted rounded"></div>
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-24 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getBalanceTypeColor = (type: string) => {
    switch (type) {
      case 'transferable':
        return 'text-green-600 dark:text-green-400';
      case 'locked_rewards':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'locked_level_unlock':
        return 'text-blue-600 dark:text-blue-400';
      case 'pending_activation':
        return 'text-purple-600 dark:text-purple-400';
      default:
        return 'text-muted-foreground';
    }
  };

  const getBalanceTypeIcon = (type: string) => {
    switch (type) {
      case 'transferable':
        return <Unlock className="h-4 w-4" />;
      case 'locked_rewards':
        return <Gift className="h-4 w-4" />;
      case 'locked_level_unlock':
        return <TrendingUp className="h-4 w-4" />;
      case 'pending_activation':
        return <Clock className="h-4 w-4" />;
      default:
        return <Lock className="h-4 w-4" />;
    }
  };

  const getBalanceTypeDescription = (type: string, amount: number) => {
    switch (type) {
      case 'transferable':
        return 'Available for transfers, purchases, and spending';
      case 'locked_rewards':
        return 'BCC earned from layer rewards, unlocks when claimed';
      case 'locked_level_unlock':
        return `Will unlock when you reach Level ${memberLevel + 1}`;
      case 'pending_activation':
        return 'Will unlock when you activate your Level 1 membership';
      default:
        return 'Locked BCC balance';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Coins className="h-5 w-5 text-honey" />
          <span>BCC Balance</span>
          <Badge variant="secondary" className="ml-auto">
            Phase {tierInfo.phase}
          </Badge>
        </CardTitle>
        <CardDescription>
          Beehive Credit Coin balance breakdown and availability
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Total Balance Display */}
        <div className="text-center p-4 bg-gradient-to-r from-honey/10 to-honey/5 rounded-lg">
          <div className="text-3xl font-bold text-honey mb-2">
            {balanceBreakdown.total.toLocaleString()} BCC
          </div>
          <div className="text-sm text-muted-foreground">
            Total Balance (All Types)
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {tierInfo.phase && `Phase ${tierInfo.phase} • ${tierInfo.multiplier}x multiplier`}
          </div>
        </div>

        {/* Balance Breakdown */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Balance Breakdown
          </h4>

          {/* Transferable Balance */}
          <div className="flex items-center justify-between p-3 bg-card border rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-full">
                <Unlock className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="font-medium">Transferable</div>
                <div className="text-xs text-muted-foreground">
                  Available for spending
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-green-600 dark:text-green-400">
                {balanceBreakdown.transferable.toLocaleString()} BCC
              </div>
            </div>
          </div>

          {/* Locked - Rewards */}
          {balanceBreakdown.locked_rewards > 0 && (
            <div className="flex items-center justify-between p-3 bg-card border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
                  <Gift className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <div className="font-medium">Reward Claims</div>
                  <div className="text-xs text-muted-foreground">
                    From layer rewards
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-yellow-600 dark:text-yellow-400">
                  {balanceBreakdown.locked_rewards.toLocaleString()} BCC
                </div>
                <div className="text-xs text-muted-foreground">
                  Locked
                </div>
              </div>
            </div>
          )}

          {/* Locked - Level Progression */}
          {balanceBreakdown.locked_level_unlock > 0 && (
            <div className="flex items-center justify-between p-3 bg-card border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                  <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="font-medium">Level Unlock</div>
                  <div className="text-xs text-muted-foreground">
                    NFT Level {memberLevel + 1} reward
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-blue-600 dark:text-blue-400">
                  {balanceBreakdown.locked_level_unlock.toLocaleString()} BCC
                </div>
                <div className="text-xs text-muted-foreground">
                  Locked
                </div>
              </div>
            </div>
          )}

          {/* Pending Activation */}
          {balanceBreakdown.pending_activation > 0 && (
            <div className="flex items-center justify-between p-3 bg-card border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                  <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <div className="font-medium">Activation Bonus</div>
                  <div className="text-xs text-muted-foreground">
                    Level 1 membership unlock
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-purple-600 dark:text-purple-400">
                  {balanceBreakdown.pending_activation.toLocaleString()} BCC
                </div>
                <div className="text-xs text-muted-foreground">
                  Pending
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Balance Utilization Progress */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Tier Information
          </h4>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Current Phase</span>
              <span className="font-medium">Phase {tierInfo.phase}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tier Multiplier</span>
              <span className="font-medium">{tierInfo.multiplier}x</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total Locked (Phase)</span>
              <span className="font-medium">{tierInfo.totalLockedInPhase.toLocaleString()} BCC</span>
            </div>
            {tierInfo.nextPhaseAt && (
              <div className="flex justify-between text-sm">
                <span>Next Phase At</span>
                <span className="font-medium">{tierInfo.nextPhaseAt.toLocaleString()} activations</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1"
            disabled={balanceBreakdown.transferable === 0 || isTransferringBcc}
            onClick={() => {
              // This would open a transfer modal in a real implementation
              console.log('Transfer BCC clicked');
            }}
          >
            <Coins className="h-4 w-4 mr-2" />
            {isTransferringBcc ? 'Transferring...' : 'Transfer BCC'}
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            className="flex-1"
            disabled={balanceBreakdown.lockedRewards === 0 || isClaimingRewards}
            onClick={() => claimLockedRewards()}
          >
            <Gift className="h-4 w-4 mr-2" />
            {isClaimingRewards ? 'Claiming...' : 'Claim Rewards'}
          </Button>
        </div>

        {/* Info Section */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-start space-x-2">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="text-xs text-muted-foreground">
              <p className="mb-1">
                <strong>Transferable:</strong> Can be used immediately for purchases and transfers.
              </p>
              <p className="mb-1">
                <strong>Locked:</strong> BCC that will unlock when specific conditions are met.
              </p>
              <p>
                BCC unlock amounts are determined by your tier phase and halve with each new phase.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BccBalanceCard;