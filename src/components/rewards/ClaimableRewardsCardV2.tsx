import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Gift, DollarSign, CheckCircle, ExternalLink, Loader2, ArrowUpLeft, Timer, Target, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWeb3 } from '@/contexts/Web3Context';
import { rewardsV2Client, LayerReward, PendingReward } from '@/api/v2/rewards.client';
import { useClaimableRewardsV2, usePendingRewardsV2 } from '@/hooks/useMatrixData';

export default function ClaimableRewardsCardV2({ walletAddress }: { walletAddress: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [claimingRewards, setClaimingRewards] = useState<string[]>([]);
  
  // Use Web3 context for wallet connection
  const { isConnected } = useWeb3();

  // Fetch rewards using v2 hooks
  const { data: claimableData, isLoading: isLoadingClaimable } = useClaimableRewardsV2(walletAddress);
  const { data: pendingData, isLoading: isLoadingPending } = usePendingRewardsV2(walletAddress);

  const isLoading = isLoadingClaimable || isLoadingPending;

  // Enhanced claim mutation using v2 API
  const claimRewardMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      return await rewardsV2Client.claimReward(rewardId, walletAddress);
    },
    onMutate: (rewardId) => {
      setClaimingRewards(prev => [...prev, rewardId]);
    },
    onSuccess: (data, rewardId) => {
      toast({
        title: "Reward Claimed Successfully! 🎉",
        description: `${data.amountClaimed} ${data.currency} added to your balance. ${data.message}`,
        action: data.txHash ? (
          <Button variant="outline" size="sm" asChild>
            <a href={`#tx-${data.txHash}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              View Details
            </a>
          </Button>
        ) : undefined,
      });
      
      // Refresh all rewards data
      queryClient.invalidateQueries({ queryKey: ['claimable-rewards-v2'] });
      queryClient.invalidateQueries({ queryKey: ['pending-rewards-v2'] });
      queryClient.invalidateQueries({ queryKey: ['balance-breakdown-v2'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-v2'] });
    },
    onError: (error: Error, rewardId) => {
      toast({
        title: "Claim Failed",
        description: error.message || "Failed to claim reward. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: (_, __, rewardId) => {
      setClaimingRewards(prev => prev.filter(id => id !== rewardId));
    },
  });

  const handleClaimReward = (reward: LayerReward) => {
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to claim rewards.",
        variant: "destructive",
      });
      return;
    }

    claimRewardMutation.mutate(reward.id);
  };

  const handleClaimAll = () => {
    if (!claimableData?.rewards?.length) return;
    
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to claim rewards.",
        variant: "destructive",
      });
      return;
    }

    claimableData.rewards.forEach(reward => {
      if (!claimingRewards.includes(reward.id)) {
        claimRewardMutation.mutate(reward.id);
      }
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getLayerDisplayName = (layerNumber: number): string => {
    if (layerNumber === 0) return 'Root';
    return `Layer ${layerNumber}`;
  };

  const getRewardTypeIcon = (layerNumber: number, triggerLevel: number) => {
    if (layerNumber === 0) return <TrendingUp className="w-4 h-4 text-purple-400" />;
    if (layerNumber <= 3) return <Target className="w-4 h-4 text-honey" />;
    return <Gift className="w-4 h-4 text-blue-400" />;
  };

  const formatTimeRemaining = (timeRemaining: string): string => {
    if (timeRemaining === 'Expired') {
      return '⏰ Expired - Rollup in progress';
    }
    return `⏰ ${timeRemaining} remaining`;
  };

  const isClaimingReward = (rewardId: string) => claimingRewards.includes(rewardId);

  if (!walletAddress) {
    return (
      <Card className="bg-secondary border-border">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Connect your wallet to view claimable rewards</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="bg-secondary border-border">
        <CardContent className="p-6 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading layer rewards...</p>
        </CardContent>
      </Card>
    );
  }

  const claimableRewards = claimableData?.rewards || [];
  const pendingRewards = pendingData?.rewards || [];
  const totalClaimable = claimableData?.totalClaimable || 0;
  const totalPending = pendingData?.totalPending || 0;

  return (
    <div className="space-y-6">
      {/* Enhanced Summary Card */}
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-honey">
            <span className="flex items-center gap-2">
              <Gift className="w-5 h-5" />
              Layer-Based Rewards
            </span>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30">
                ${totalClaimable.toFixed(2)} USDT
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-green-500/5 rounded-lg border border-green-500/20">
              <div className="text-2xl font-bold text-green-400">{claimableRewards.length}</div>
              <div className="text-sm text-muted-foreground">Ready to Claim</div>
            </div>
            <div className="text-center p-3 bg-orange-500/5 rounded-lg border border-orange-500/20">
              <div className="text-2xl font-bold text-orange-400">{pendingRewards.length}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
            <div className="text-center p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
              <div className="text-2xl font-bold text-blue-400">${totalPending.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Pending Value</div>
            </div>
          </div>
          
          {/* Enhanced Info Box */}
          {pendingData?.info && (
            <div className="bg-muted/40 rounded-lg p-3 border border-border/30">
              <div className="text-xs text-muted-foreground space-y-1">
                <div>• {pendingData.info.unlockRequirement}</div>
                <div>• {pendingData.info.timeLimit}</div>
                <div>• {pendingData.info.rollupBehavior}</div>
              </div>
            </div>
          )}
          
          {claimableRewards.length > 0 && (
            <Button 
              onClick={handleClaimAll}
              className="w-full bg-honey hover:bg-honey/90 text-secondary"
              disabled={claimingRewards.length > 0}
            >
              {claimingRewards.length > 0 ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Claiming Rewards...
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Claim All Rewards (${totalClaimable.toFixed(2)} USDT)
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Individual Claimable Rewards */}
      {claimableRewards.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-honey flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Claimable Layer Rewards
          </h3>
          {claimableRewards.map((reward) => (
            <Card key={reward.id} className="bg-secondary border-border hover:border-honey/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30">
                        ${reward.rewardAmount} USDT
                      </Badge>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        {getRewardTypeIcon(reward.layerNumber, reward.triggerLevel)}
                        {getLayerDisplayName(reward.layerNumber)}
                      </Badge>
                      <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">
                        L{reward.triggerLevel} Trigger
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div className="flex items-center gap-4">
                        <span>From: {reward.triggerWallet.slice(0, 8)}...{reward.triggerWallet.slice(-6)}</span>
                        <span>•</span>
                        <span>Created: {formatDate(reward.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleClaimReward(reward)}
                    disabled={isClaimingReward(reward.id)}
                    className="bg-honey hover:bg-honey/90 text-secondary"
                  >
                    {isClaimingReward(reward.id) ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Claiming...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Claim ${reward.rewardAmount}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Enhanced Pending Rewards with Timer Info */}
      {pendingRewards.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-orange-400 flex items-center gap-2">
            <Timer className="w-5 h-5" />
            Pending Rewards (Level Up Required)
          </h3>
          {pendingRewards.map((reward) => (
            <Card key={reward.id} className="bg-secondary border-border border-orange-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/30">
                        ${reward.rewardAmount} USDT
                      </Badge>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        {getRewardTypeIcon(reward.layerNumber, reward.triggerLevel)}
                        {getLayerDisplayName(reward.layerNumber)}
                      </Badge>
                      <Badge variant="destructive" className="bg-red-500/10 text-red-400 border-red-500/30">
                        Requires L{reward.requiresLevel}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>
                        <span className="text-orange-400 font-medium">
                          {reward.unlockCondition}
                        </span>
                        <span className="text-muted-foreground ml-2">
                          (Currently L{reward.currentRecipientLevel})
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>From: {reward.triggerWallet.slice(0, 8)}...{reward.triggerWallet.slice(-6)}</span>
                        <span className="text-orange-400 font-medium">
                          {formatTimeRemaining(reward.timeRemaining)}
                        </span>
                      </div>
                      {reward.expiresAt && (
                        <div className="flex items-center gap-1 text-xs">
                          <Clock className="w-3 h-3" />
                          Expires: {formatDate(reward.expiresAt)}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" disabled className="border-orange-500/30">
                    <Clock className="w-4 h-4 mr-2" />
                    Pending
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Enhanced No Rewards Message */}
      {claimableRewards.length === 0 && pendingRewards.length === 0 && (
        <Card className="bg-secondary border-border">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-honey/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Gift className="w-8 h-8 text-honey" />
            </div>
            <h3 className="text-lg font-semibold text-honey mb-2">No Layer Rewards Available</h3>
            <p className="text-muted-foreground mb-4">
              Your layer-based matrix rewards will appear here when members in your downline upgrade their levels.
            </p>
            <div className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-3">
              <p className="font-medium mb-2">How Layer Rewards Work:</p>
              <ul className="text-left space-y-1 max-w-md mx-auto">
                <li>• Layer 1-19 rewards from matrix downline upgrades</li>
                <li>• 72-hour timer for pending rewards</li>
                <li>• Automatic rollup to next qualified upline</li>
                <li>• Level requirements protect reward distribution</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}