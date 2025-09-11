import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Gift, DollarSign, CheckCircle, ExternalLink, Loader2, ArrowUpLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useWeb3 } from '@/contexts/Web3Context';

interface ClaimableReward {
  id: string;
  rewardAmount: number;
  triggerLevel: number;
  payoutLayer: number;
  matrixPosition: string;
  sourceWallet: string;
  status: 'confirmed' | 'pending';
  requiresLevel?: number;
  unlockCondition?: string;
  expiresAt?: string;
  createdAt: string;
  metadata?: any;
}

interface ClaimableRewardsResponse {
  claimableRewards: ClaimableReward[];
  pendingRewards: ClaimableReward[];
  totalClaimable: number;
  totalPending: number;
}

interface ClaimResponse {
  success: boolean;
  transactionHash?: string;
  explorerUrl?: string;
  message: string;
}

export default function ClaimableRewardsCard({ walletAddress }: { walletAddress: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [claimingRewards, setClaimingRewards] = useState<string[]>([]);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  
  // Use Web3 context for wallet connection
  const { isConnected } = useWeb3();

  // Fetch claimable rewards
  const { data: rewardsData, isLoading } = useQuery<ClaimableRewardsResponse>({
    queryKey: ['/api/rewards/claimable', walletAddress],
    enabled: !!walletAddress,
    refetchInterval: 30000, // Refresh every 30 seconds
    queryFn: async () => {
      // Get claimable and pending rewards from layer_rewards table with matrix position info
      const { data: layerRewards, error } = await supabase
        .from('layer_rewards')
        .select(`
          id,
          amount_usdt,
          layer,
          reward_type,
          is_claimed,
          payer_wallet,
          created_at
        `)
        .eq('recipient_wallet', walletAddress)
        .eq('is_claimed', false)
        .order('created_at', { ascending: false });

      // Simplified matrix position handling (removed dependency on non-existent table)
      const matrixPositions = new Map();
      if (layerRewards && layerRewards.length > 0) {
        // Set default positions since individual_matrix_placements table doesn't exist
        layerRewards.forEach(reward => {
          matrixPositions.set(`${reward.payer_wallet}-${reward.layer}`, 'L');
        });
      }

      if (error) {
        throw new Error(`Failed to fetch rewards: ${error.message}`);
      }

      // Separate claimable and pending rewards
      const claimableRewards: ClaimableReward[] = [];
      const pendingRewards: ClaimableReward[] = [];
      let totalClaimable = 0;
      let totalPending = 0;

      layerRewards?.forEach(reward => {
        const positionKey = `${reward.payer_wallet}-${reward.layer}`;
        const position = matrixPositions.get(positionKey) || '?';
        
        const transformedReward: ClaimableReward = {
          id: reward.id,
          rewardAmount: reward.amount_usdt || 0,
          triggerLevel: reward.layer,
          payoutLayer: reward.layer,
          matrixPosition: `Layer ${reward.layer} (${position})`,
          sourceWallet: reward.payer_wallet || '',
          status: reward.reward_type === 'layer_reward' ? 'confirmed' : 'pending',
          createdAt: reward.created_at,
          expiresAt: reward.countdown_timers?.[0]?.end_time || undefined
        };

        if (reward.reward_type === 'layer_reward') {
          claimableRewards.push(transformedReward);
          totalClaimable += transformedReward.rewardAmount;
        } else if (reward.reward_type === 'pending_layer_reward') {
          pendingRewards.push(transformedReward);
          totalPending += transformedReward.rewardAmount;
        }
      });

      return {
        claimableRewards,
        pendingRewards,
        totalClaimable,
        totalPending
      };
    },
  });

  // Automated claim mutation using Thirdweb Engine
  const claimRewardMutation = useMutation({
    mutationFn: async (rewardId: string): Promise<ClaimResponse> => {
      return await apiRequest('/api/rewards/claim', 'POST', {
        rewardId,
        recipientAddress: walletAddress,
      });
    },
    onMutate: (rewardId) => {
      setClaimingRewards(prev => [...prev, rewardId]);
    },
    onSuccess: (data: ClaimResponse, rewardId) => {
      toast({
        title: "Reward Claimed Successfully! 🎉",
        description: data.transactionHash 
          ? `USDT sent to your wallet. Transaction: ${data.transactionHash.slice(0, 10)}...`
          : data.message,
        action: data.explorerUrl ? (
          <Button variant="outline" size="sm" asChild>
            <a href={data.explorerUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              View Transaction
            </a>
          </Button>
        ) : undefined,
      });
      
      // Refresh rewards data
      queryClient.invalidateQueries({ queryKey: ['/api/rewards/claimable'] });
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

  // Withdraw mutation for withdrawing claimed rewards to wallet
  const withdrawMutation = useMutation({
    mutationFn: async (amount: number): Promise<ClaimResponse> => {
      return await apiRequest('/api/rewards/withdraw', 'POST', {
        amount,
        recipientAddress: walletAddress,
      });
    },
    onMutate: () => {
      setIsWithdrawing(true);
    },
    onSuccess: (data) => {
      toast({
        title: "Withdrawal Successful",
        description: data.message || `Successfully initiated withdrawal to your wallet.`,
        variant: "default",
      });
      // Refresh rewards data
      queryClient.invalidateQueries({ queryKey: ['/api/rewards/claimable'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Withdrawal Failed",
        description: error.message || "Failed to withdraw rewards. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsWithdrawing(false);
    },
  });

  const handleWithdraw = () => {
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to withdraw rewards.",
        variant: "destructive",
      });
      return;
    }

    if (!totalClaimable || totalClaimable <= 0) {
      toast({
        title: "No Balance Available",
        description: "You need to have claimed rewards to withdraw.",
        variant: "destructive",
      });
      return;
    }

    withdrawMutation.mutate(totalClaimable);
  };

  const handleClaimReward = (reward: ClaimableReward) => {
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
    if (!rewardsData?.claimableRewards?.length) return;
    
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to claim rewards.",
        variant: "destructive",
      });
      return;
    }

    rewardsData.claimableRewards.forEach(reward => {
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
          <p className="text-muted-foreground">Loading rewards...</p>
        </CardContent>
      </Card>
    );
  }

  const claimableRewards = rewardsData?.claimableRewards || [];
  const pendingRewards = rewardsData?.pendingRewards || [];
  const totalClaimable = rewardsData?.totalClaimable || 0;
  const totalPending = rewardsData?.totalPending || 0;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-honey">
            <span className="flex items-center gap-2">
              <Gift className="w-5 h-5" />
              Claimable Rewards
            </span>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30">
                ${totalClaimable.toFixed(2)} USDT
              </Badge>
              {totalClaimable > 0 && (
                <Button
                  onClick={handleWithdraw}
                  disabled={isWithdrawing}
                  variant="outline"
                  size="sm"
                  className="border-honey text-honey hover:bg-honey hover:text-secondary"
                  data-testid="button-withdraw-rewards"
                >
                  {isWithdrawing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Withdrawing...
                    </>
                  ) : (
                    <>
                      <ArrowUpLeft className="w-4 h-4 mr-2" />
                      Withdraw
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-primary/5 rounded-lg">
              <div className="text-2xl font-bold text-honey">{claimableRewards.length}</div>
              <div className="text-sm text-muted-foreground">Ready to Claim</div>
            </div>
            <div className="text-center p-3 bg-orange-500/5 rounded-lg">
              <div className="text-2xl font-bold text-orange-400">{pendingRewards.length}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
          </div>
          
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

      {/* Individual Claimable Rewards */}
      {claimableRewards.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-honey">Individual Rewards</h3>
          {claimableRewards.map((reward) => (
            <Card key={reward.id} className="bg-secondary border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30">
                        ${reward.rewardAmount} USDT
                      </Badge>
                      <Badge variant="secondary">
                        Layer {reward.payoutLayer}
                      </Badge>
                      <Badge variant="outline">
                        Level {reward.triggerLevel}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>Position: {reward.matrixPosition}</div>
                      <div>From: {reward.sourceWallet.slice(0, 8)}...{reward.sourceWallet.slice(-6)}</div>
                      <div>Created: {formatDate(reward.createdAt)}</div>
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

      {/* Pending Rewards */}
      {pendingRewards.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-orange-400">Pending Rewards</h3>
          {pendingRewards.map((reward) => (
            <Card key={reward.id} className="bg-secondary border-border opacity-60">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/30">
                        ${reward.rewardAmount} USDT
                      </Badge>
                      <Badge variant="secondary">
                        Layer {reward.payoutLayer}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>Position: {reward.matrixPosition}</div>
                      <div>
                        {reward.unlockCondition && (
                          <span className="text-orange-400">Requires: {reward.unlockCondition}</span>
                        )}
                      </div>
                      {reward.expiresAt && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Expires: {formatDate(reward.expiresAt)}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" disabled>
                    <Clock className="w-4 h-4 mr-2" />
                    Pending
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Rewards Message */}
      {claimableRewards.length === 0 && pendingRewards.length === 0 && (
        <Card className="bg-secondary border-border">
          <CardContent className="p-6 text-center">
            <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-honey mb-2">No Rewards Available</h3>
            <p className="text-muted-foreground">
              Your matrix rewards will appear here when you receive payouts from your downline network.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}