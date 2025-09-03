import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { PendingRewardCard, type PendingReward } from './PendingRewardCard';
import { Clock, DollarSign, AlertTriangle, TrendingUp, RefreshCw } from 'lucide-react';
import { useState } from 'react';

interface RewardSummary {
  claimableRewards: Array<{
    id: string;
    amount: number;
    tokenType: 'USDT';
    triggerLevel: number;
    memberWallet: string;
    createdAt: string;
  }>;
  pendingRewards: PendingReward[];
  totalClaimable: number;
  totalPending: number;
}

interface PendingRewardsSectionProps {
  walletAddress: string;
  currentUserLevel: number;
  className?: string;
}

export function PendingRewardsSection({ 
  walletAddress, 
  currentUserLevel, 
  className = '' 
}: PendingRewardsSectionProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch reward summary
  const { data: rewardSummary, isLoading, refetch } = useQuery<RewardSummary>({
    queryKey: ['/api/rewards/summary', walletAddress],
    enabled: !!walletAddress,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    queryFn: async () => {
      const response = await fetch('/api/rewards/summary', {
        headers: {
          'X-Wallet-Address': walletAddress,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch rewards');
      return response.json();
    },
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleRewardExpiry = () => {
    // Refresh data when a reward expires
    refetch();
  };

  if (isLoading) {
    return (
      <Card className={`border-yellow-400/20 ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-400" />
            Pending Rewards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingRewards = rewardSummary?.pendingRewards || [];
  const totalPending = rewardSummary?.totalPending || 0;
  const totalClaimable = rewardSummary?.totalClaimable || 0;

  // Sort pending rewards by urgency (expiring soonest first)
  const sortedPendingRewards = [...pendingRewards].sort((a, b) => {
    return a.hoursLeft - b.hoursLeft;
  });

  // Count urgent and critical rewards
  const urgentCount = pendingRewards.filter(r => r.hoursLeft <= 24).length;
  const criticalCount = pendingRewards.filter(r => r.hoursLeft <= 6).length;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Summary Card */}
      <Card className="border-yellow-400/20 bg-gradient-to-r from-yellow-950/20 to-orange-950/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-400" />
              Reward Status
            </CardTitle>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              data-testid="refresh-rewards"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Totals */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-green-950/20 rounded-lg border border-green-500/20">
              <DollarSign className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-400">{totalClaimable}</div>
              <div className="text-sm text-gray-400">USDT Claimable</div>
            </div>
            
            <div className="text-center p-3 bg-yellow-950/20 rounded-lg border border-yellow-500/20">
              <Clock className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-yellow-400">{totalPending}</div>
              <div className="text-sm text-gray-400">USDT Pending</div>
            </div>
          </div>

          {/* Urgency indicators */}
          {pendingRewards.length > 0 && (
            <div className="flex gap-2">
              {criticalCount > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {criticalCount} Critical (&lt; 6h)
                </Badge>
              )}
              {urgentCount > 0 && (
                <Badge variant="outline" className="border-yellow-500 text-yellow-400">
                  <Clock className="w-3 h-3 mr-1" />
                  {urgentCount} Urgent (&lt; 24h)
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Rewards List */}
      {pendingRewards.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-200">Pending Rewards</h3>
            <Badge variant="outline" className="border-yellow-400 text-yellow-400">
              {pendingRewards.length}
            </Badge>
          </div>

          {/* Action Alert */}
          <Alert className="border-yellow-500/50 bg-yellow-950/20">
            <TrendingUp className="h-4 w-4" />
            <AlertDescription className="text-yellow-200">
              Upgrade your membership to unlock pending rewards before they expire.
              <strong> Current Level: {currentUserLevel}</strong>
            </AlertDescription>
          </Alert>

          {/* Pending Reward Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {sortedPendingRewards.map((reward) => (
              <PendingRewardCard
                key={reward.id}
                reward={reward}
                currentUserLevel={currentUserLevel}
                onExpiry={handleRewardExpiry}
                data-testid={`pending-reward-card-${reward.id}`}
              />
            ))}
          </div>
        </div>
      ) : (
        <Card className="border-gray-600">
          <CardContent className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">No Pending Rewards</h3>
            <p className="text-gray-500">
              All your rewards are either claimable or none are pending upgrade requirements.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default PendingRewardsSection;