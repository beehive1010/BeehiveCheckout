import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Gift, DollarSign, CheckCircle, ExternalLink, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
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

interface RewardSummary {
  claimableRewards: Array<{
    id: string;
    amount: number;
    tokenType: 'USDT';
    triggerLevel: number;
    memberWallet: string;
    createdAt: string;
  }>;
  pendingRewards: Array<{
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
    createdAt: string;
  }>;
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
  const [isClaimingAll, setIsClaimingAll] = useState(false);
  
  // Use Web3 context for wallet connection
  const { isConnected } = useWeb3();

  // Fetch claimable rewards using the same endpoint as summary for consistency
  const { data: rewardsData, isLoading } = useQuery<RewardSummary>({
    queryKey: ['/api/rewards/summary', walletAddress],
    enabled: !!walletAddress,
    refetchInterval: 30000, // Refresh every 30 seconds
    queryFn: async () => {
      const response = await fetch('/api/rewards/summary', {
        headers: {
          'X-Wallet-Address': walletAddress!,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch claimable rewards');
      }
      return response.json();
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
      queryClient.invalidateQueries({ queryKey: ['/api/rewards/summary', walletAddress] });
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

    setIsClaimingAll(true);
    let claimedCount = 0;
    const totalRewards = rewardsData.claimableRewards.length;

    rewardsData.claimableRewards.forEach(reward => {
      if (!claimingRewards.includes(reward.id)) {
        claimRewardMutation.mutate(reward.id, {
          onSettled: () => {
            claimedCount++;
            if (claimedCount === totalRewards) {
              setIsClaimingAll(false);
            }
          }
        });
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
            <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30">
              ${totalClaimable.toFixed(2)} USDT
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-primary/5 rounded-lg">
              <div className="text-2xl font-bold text-honey">{claimableRewards.length}</div>
              <div className="text-sm text-muted-foreground">Ready to Claim</div>
            </div>
            <div className="text-center p-3 bg-green-500/5 rounded-lg">
              <div className="text-2xl font-bold text-green-400">${totalClaimable.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Total Value</div>
            </div>
          </div>
          
          {/* Claim All Button */}
          {claimableRewards.length > 0 && (
            <Button 
              onClick={handleClaimAll}
              disabled={isClaimingAll || claimableRewards.length === 0}
              className="w-full bg-honey hover:bg-honey/90 text-black font-semibold"
              data-testid="claim-all-button"
            >
              {isClaimingAll ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Claiming All...
                </>
              ) : (
                <>
                  <Gift className="w-4 h-4 mr-2" />
                  Claim All ${totalClaimable.toFixed(2)} USDT
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
                        ${reward.amount} USDT
                      </Badge>
                      <Badge variant="outline">
                        Level {reward.triggerLevel}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>Trigger Level: {reward.triggerLevel}</div>
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
                        Claim ${reward.amount}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}


      {/* No Rewards Message */}
      {claimableRewards.length === 0 && (
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