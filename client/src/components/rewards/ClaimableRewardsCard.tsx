import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Gift, DollarSign, CheckCircle, ExternalLink, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

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

interface SupportedChain {
  id: string;
  name: string;
  symbol: string;
  icon: string;
}

interface SupportedChainsResponse {
  supportedChains: SupportedChain[];
}

export default function ClaimableRewardsCard({ walletAddress }: { walletAddress: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [claimingRewards, setClaimingRewards] = useState<string[]>([]);
  const [selectedChain, setSelectedChain] = useState<string>('');
  const [gasConfirmed, setGasConfirmed] = useState(false);
  const [claimingRewardId, setClaimingRewardId] = useState<string | null>(null);

  // Fetch claimable rewards
  const { data: rewardsData, isLoading } = useQuery<ClaimableRewardsResponse>({
    queryKey: ['/api/rewards/claimable'],
    enabled: !!walletAddress,
    refetchInterval: 30000, // Refresh every 30 seconds
    queryFn: async () => {
      const response = await fetch('/api/rewards/claimable', {
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

  // Fetch supported chains
  const { data: chainsData } = useQuery<SupportedChainsResponse>({
    queryKey: ['/api/rewards/supported-chains'],
    enabled: !!walletAddress,
    queryFn: async () => {
      const response = await fetch('/api/rewards/supported-chains', {
        headers: {
          'X-Wallet-Address': walletAddress!,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch supported chains');
      return response.json();
    },
  });

  // Claim reward with transfer mutation
  const claimWithTransferMutation = useMutation({
    mutationFn: async ({ rewardId, targetChain, gasConfirmed }: { rewardId: string; targetChain: string; gasConfirmed: boolean }) => {
      return await apiRequest('POST', `/api/rewards/claim-with-transfer/${rewardId}`, {
        targetChain,
        gasConfirmed
      }, walletAddress);
    },
    onMutate: ({ rewardId }) => {
      setClaimingRewards(prev => [...prev, rewardId]);
    },
    onSuccess: (data: any, { rewardId }) => {
      toast({
        title: "Reward Claimed Successfully!",
        description: `You claimed $${(data.amount / 100).toFixed(2)} USDT on ${data.chain}`,
        variant: 'default',
        action: data.transactionHash ? (
          <a 
            href={`https://etherscan.io/tx/${data.transactionHash}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm underline"
          >
            View TX <ExternalLink className="h-3 w-3" />
          </a>
        ) : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/rewards/claimable'] });
      queryClient.invalidateQueries({ queryKey: ['/api/beehive/user-stats'] });
      setClaimingRewardId(null);
      setSelectedChain('');
      setGasConfirmed(false);
    },
    onError: (error: any, { rewardId }) => {
      toast({
        title: "Claim Failed",
        description: error.message || "Failed to claim reward. Please try again.",
        variant: 'destructive',
      });
    },
    onSettled: (data, error, { rewardId }) => {
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

  const formatMatrixPosition = (matrixPosition: string) => {
    if (matrixPosition?.startsWith('depth_')) {
      const depth = matrixPosition.replace('depth_', '');
      return `Level ${depth} Matrix`;
    }
    if (matrixPosition?.startsWith('spillover_')) {
      return 'Spillover Reward';
    }
    return matrixPosition || 'Matrix Reward';
  };

  const handleClaimReward = (rewardId: string) => {
    setClaimingRewardId(rewardId);
    setSelectedChain('');
    setGasConfirmed(false);
  };

  const handleConfirmClaim = () => {
    if (!claimingRewardId || !selectedChain || !gasConfirmed) return;
    
    claimWithTransferMutation.mutate({
      rewardId: claimingRewardId,
      targetChain: selectedChain,
      gasConfirmed: gasConfirmed
    });
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
                      {formatMatrixPosition(reward.matrixPosition)} • L{reward.triggerLevel} → L{reward.payoutLayer}
                    </div>
                  </div>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      onClick={() => handleClaimReward(reward.id)}
                      disabled={claimingRewards.includes(reward.id)}
                      className="bg-honey text-black hover:bg-honey/90"
                      data-testid={`claim-reward-${reward.id}`}
                    >
                      {claimingRewards.includes(reward.id) ? 'Claiming...' : 'Claim'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-honey" />
                        Claim ${(reward.rewardAmount / 100).toFixed(2)} USDT
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-2">Reward Details:</p>
                        <p className="font-medium">{formatMatrixPosition(reward.matrixPosition)}</p>
                        <p className="text-sm">From Level {reward.triggerLevel} to Layer {reward.payoutLayer}</p>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Select Blockchain:</label>
                        <Select value={selectedChain} onValueChange={setSelectedChain}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose chain for withdrawal" />
                          </SelectTrigger>
                          <SelectContent>
                            {chainsData?.supportedChains?.map((chain) => (
                              <SelectItem key={chain.id || chain.name} value={chain.id || chain.name}>
                                <div className="flex items-center gap-2">
                                  <span>{chain.icon}</span>
                                  <span>{chain.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {chain.symbol}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center space-x-2 p-3 bg-orange-500/10 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        <div className="text-sm">
                          <p className="font-medium text-orange-500">Gas Fee Required</p>
                          <p className="text-muted-foreground">
                            You will pay network gas fees for this withdrawal
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="gas-confirm"
                          checked={gasConfirmed}
                          onCheckedChange={(checked) => setGasConfirmed(checked === true)}
                        />
                        <label htmlFor="gas-confirm" className="text-sm">
                          I understand and agree to pay gas fees for this withdrawal
                        </label>
                      </div>

                      <Button
                        className="w-full bg-honey text-black hover:bg-honey/90"
                        onClick={handleConfirmClaim}
                        disabled={!selectedChain || !gasConfirmed || claimWithTransferMutation.isPending}
                      >
                        {claimWithTransferMutation.isPending ? 'Processing...' : 'Confirm Claim'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
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
                      {formatMatrixPosition(reward.matrixPosition)} • L{reward.triggerLevel} → L{reward.payoutLayer}
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