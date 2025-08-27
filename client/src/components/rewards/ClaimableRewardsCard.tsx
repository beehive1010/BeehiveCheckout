import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Gift, DollarSign, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ClaimableReward {
  id: string;
  rewardAmount: number;
  rewardType: string;
  sourceWallet: string;
  level: number;
  status: 'claimable' | 'pending';
  expiresAt?: string;
  createdAt: string;
}

interface ClaimableRewardsResponse {
  claimableRewards: ClaimableReward[];
  pendingRewards: ClaimableReward[];
  totalClaimable: number;
  totalPending: number;
}

export default function ClaimableRewardsCard({ walletAddress }: { walletAddress: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [claimingRewards, setClaimingRewards] = useState<string[]>([]);

  // Fetch claimable rewards
  const { data: rewardsData, isLoading } = useQuery<ClaimableRewardsResponse>({
    queryKey: ['/api/rewards/claimable', walletAddress],
    enabled: !!walletAddress,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Claim single reward mutation
  const claimRewardMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      return await apiRequest(`/api/rewards/claim/${rewardId}`, 'POST');
    },
    onMutate: (rewardId) => {
      setClaimingRewards(prev => [...prev, rewardId]);
    },
    onSuccess: (data: any, rewardId) => {
      toast({
        title: "Reward Claimed Successfully!",
        description: `You claimed $${(data.amount / 100).toFixed(2)} USDT`,
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/rewards/claimable'] });
      queryClient.invalidateQueries({ queryKey: ['/api/beehive/user-stats'] });
    },
    onError: (error: any, rewardId) => {
      toast({
        title: "Claim Failed",
        description: error.message || "Failed to claim reward. Please try again.",
        variant: 'destructive',
      });
    },
    onSettled: (data, error, rewardId) => {
      setClaimingRewards(prev => prev.filter(id => id !== rewardId));
    },
  });

  // Claim all rewards mutation
  const claimAllMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/rewards/claim-all', 'POST');
    },
    onSuccess: (data: any) => {
      toast({
        title: "All Rewards Claimed!",
        description: `Successfully claimed $${(data.totalAmount / 100).toFixed(2)} USDT`,
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/rewards/claimable'] });
      queryClient.invalidateQueries({ queryKey: ['/api/beehive/user-stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Bulk Claim Failed",
        description: error.message || "Failed to claim all rewards. Please try again.",
        variant: 'destructive',
      });
    },
  });

  const formatRewardType = (type: string) => {
    switch (type) {
      case 'direct_referral':
        return 'Direct Referral';
      case 'level_bonus':
        return 'Level Bonus';
      case 'matrix_spillover':
        return 'Matrix Spillover';
      default:
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    
    return `${hours}h ${minutes}m`;
  };

  if (isLoading) {
    return (
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-honey flex items-center space-x-2">
            <Gift className="h-5 w-5" />
            <span>Claimable Rewards</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { claimableRewards = [], pendingRewards = [], totalClaimable = 0 } = rewardsData || {};

  if (claimableRewards.length === 0 && pendingRewards.length === 0) {
    return (
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-honey flex items-center space-x-2">
            <Gift className="h-5 w-5" />
            <span>Claimable Rewards</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Gift className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No rewards available to claim</p>
            <p className="text-sm">Refer new members to earn rewards!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-secondary border-border">
      <CardHeader>
        <CardTitle className="text-honey flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Gift className="h-5 w-5" />
            <span>Claimable Rewards</span>
          </div>
          {claimableRewards.length > 1 && (
            <Button
              size="sm"
              onClick={() => claimAllMutation.mutate()}
              disabled={claimAllMutation.isPending}
              className="bg-honey text-black hover:bg-honey/90"
            >
              Claim All ${(totalClaimable / 100).toFixed(2)}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Claimable Rewards */}
        {claimableRewards.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-honey flex items-center space-x-2">
              <CheckCircle className="h-4 w-4" />
              <span>Ready to Claim ({claimableRewards.length})</span>
            </h4>
            {claimableRewards.map((reward) => (
              <div key={reward.id} className="flex items-center justify-between p-3 bg-background rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-honey/10 rounded-full flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-honey" />
                  </div>
                  <div>
                    <div className="font-medium">${(reward.rewardAmount / 100).toFixed(2)} USDT</div>
                    <div className="text-sm text-muted-foreground">
                      {formatRewardType(reward.rewardType)} • Level {reward.level}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => claimRewardMutation.mutate(reward.id)}
                  disabled={claimingRewards.includes(reward.id)}
                  className="bg-honey text-black hover:bg-honey/90"
                  data-testid={`claim-reward-${reward.id}`}
                >
                  {claimingRewards.includes(reward.id) ? 'Claiming...' : 'Claim'}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Pending Rewards with Countdown */}
        {pendingRewards.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-orange-400 flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Pending Rewards ({pendingRewards.length})</span>
            </h4>
            {pendingRewards.map((reward) => (
              <div key={reward.id} className="flex items-center justify-between p-3 bg-background rounded-lg border-l-4 border-orange-400">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-400/10 rounded-full flex items-center justify-center">
                    <Clock className="h-5 w-5 text-orange-400" />
                  </div>
                  <div>
                    <div className="font-medium">${(reward.rewardAmount / 100).toFixed(2)} USDT</div>
                    <div className="text-sm text-muted-foreground">
                      {formatRewardType(reward.rewardType)} • Level {reward.level}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="secondary" className="bg-orange-400/10 text-orange-400">
                    {reward.expiresAt ? getTimeRemaining(reward.expiresAt) : 'Pending'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}