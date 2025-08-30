import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Gift, DollarSign, CheckCircle, ExternalLink, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useSendTransaction, useWalletBalance, useReadContract } from 'thirdweb/react';
import { toWei } from 'thirdweb';
import { transfer } from 'thirdweb/extensions/erc20';
import { getChainById, getUSDTContract, getExplorerUrl, getUSDTDecimals, web3ErrorHandler, client } from '@/lib/web3';
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
  const [estimatedGas, setEstimatedGas] = useState<string>('');
  const [isEstimatingGas, setIsEstimatingGas] = useState(false);
  
  // Use Web3 context for wallet connection
  const { wallet, activeChain, isConnected } = useWeb3();
  const currentChain = getChainById(activeChain?.id);
  
  // Auto-use active chain for claims
  useEffect(() => {
    if (activeChain?.id) {
      setSelectedChain(activeChain.id.toString());
    }
  }, [activeChain?.id]);
  
  // Get wallet ETH balance for gas fees
  const { data: ethBalance } = useWalletBalance({
    address: walletAddress,
    chain: currentChain,
    client,
  });
  
  // Get USDT contract for current chain
  const usdtContract = currentChain ? (() => {
    try {
      return getUSDTContract(currentChain.id);
    } catch {
      return null;
    }
  })() : null;
  
  // Get USDT balance on current chain
  const usdtBalanceQuery = useReadContract({
    contract: usdtContract!,
    method: "function balanceOf(address) view returns (uint256)",
    params: [walletAddress],
  });
  
  const usdtBalance = usdtContract && walletAddress ? usdtBalanceQuery.data : undefined;
  
  // Transaction hook for USDT transfers
  const { mutate: sendTransaction, isPending: isTransactionPending } = useSendTransaction();

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

  // Helper function to convert wei to readable format
  const fromWei = (value: bigint, decimals: number): string => {
    const divisor = BigInt(10 ** decimals);
    const quotient = value / divisor;
    const remainder = value % divisor;
    return `${quotient}.${remainder.toString().padStart(decimals, '0').slice(0, 6)}`;
  };
  
  // Estimate gas fees for USDT transfer
  const estimateGasFees = async (reward: ClaimableReward) => {
    if (!wallet || !currentChain || !usdtContract) return;
    
    setIsEstimatingGas(true);
    try {
      // In a real implementation, you'd estimate gas here
      // For now, showing typical gas fees
      const gasLimit = 65000; // Typical for USDT transfer
      const gasPrice = 20; // 20 Gwei
      const gasCostWei = BigInt(gasLimit * gasPrice * 1e9);
      const gasCostEth = fromWei(gasCostWei, 18);
      
      setEstimatedGas(`~${parseFloat(gasCostEth).toFixed(6)} ETH`);
    } catch (error) {
      console.error('Gas estimation failed:', error);
      setEstimatedGas('Gas estimation unavailable');
    } finally {
      setIsEstimatingGas(false);
    }
  };
  
  // Direct blockchain claim mutation
  const claimWithTransferMutation = useMutation({
    mutationFn: async ({ reward }: { reward: ClaimableReward }) => {
      if (!wallet || !currentChain || !usdtContract) {
        throw new Error('Wallet not connected or USDT not supported on this chain');
      }
      
      // First, mark reward as claimed in backend
      const claimResponse = await apiRequest('POST', `/api/rewards/claim/${reward.id}`, {}, walletAddress);
      
      // Then execute USDT transfer
      const decimals = getUSDTDecimals(currentChain.id);
      const amount = BigInt(reward.rewardAmount) * BigInt(10 ** decimals);
      
      const transaction = transfer({
        contract: usdtContract,
        to: walletAddress,
        amount: amount.toString(),
      });
      
      return new Promise((resolve, reject) => {
        sendTransaction(transaction, {
          onSuccess: (result) => {
            resolve({
              ...claimResponse,
              transactionHash: result.transactionHash,
              amount: reward.rewardAmount,
              chainId: currentChain.id,
              chainName: currentChain.name
            });
          },
          onError: (error) => {
            reject(new Error(web3ErrorHandler(error)));
          }
        });
      });
    },
    onMutate: ({ reward }) => {
      setClaimingRewards(prev => [...prev, reward.id]);
    },
    onSuccess: (data: any, { reward }) => {
      toast({
        title: "Reward Claimed Successfully!",
        description: `You received ${reward.rewardAmount} USDT on ${data.chainName}`,
        variant: 'default',
        action: data.transactionHash ? (
          <a 
            href={getExplorerUrl(data.chainId, data.transactionHash)} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm underline"
          >
            View Transaction <ExternalLink className="h-3 w-3" />
          </a>
        ) : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/rewards/claimable'] });
      queryClient.invalidateQueries({ queryKey: ['/api/beehive/user-stats'] });
      setClaimingRewardId(null);
      setSelectedChain('');
      setGasConfirmed(false);
      setEstimatedGas('');
    },
    onError: (error: any, { reward }) => {
      toast({
        title: "Claim Failed",
        description: error.message || "Failed to claim reward. Please try again.",
        variant: 'destructive',
      });
    },
    onSettled: (data, error, { reward }) => {
      setClaimingRewards(prev => prev.filter(id => id !== reward.id));
    },
  });

  // Bulk claim all rewards mutation  
  const claimAllMutation = useMutation({
    mutationFn: async () => {
      if (!wallet || !currentChain || !usdtContract) {
        throw new Error('Wallet not connected or USDT not supported on this chain');
      }
      
      // Get all claimable rewards and sum amounts
      if (!rewardsData?.claimableRewards?.length) {
        throw new Error('No rewards available to claim');
      }
      
      const totalAmount = rewardsData.claimableRewards.reduce((sum, r) => sum + r.rewardAmount, 0);
      const decimals = getUSDTDecimals(currentChain.id);
      const amount = BigInt(totalAmount) * BigInt(10 ** decimals);
      
      // First, mark all rewards as claimed in backend
      const claimResponse = await apiRequest('POST', '/api/rewards/claim-all', {}, walletAddress);
      
      // Then execute bulk USDT transfer
      const transaction = transfer({
        contract: usdtContract,
        to: walletAddress,
        amount: amount.toString(),
      });
      
      return new Promise((resolve, reject) => {
        sendTransaction(transaction, {
          onSuccess: (result) => {
            resolve({
              ...claimResponse,
              transactionHash: result.transactionHash,
              totalAmount,
              chainId: currentChain.id,
              chainName: currentChain.name
            });
          },
          onError: (error) => {
            reject(new Error(web3ErrorHandler(error)));
          }
        });
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "All Rewards Claimed!",
        description: `Successfully received ${data.totalAmount} USDT on ${data.chainName}`,
        variant: 'default',
        action: data.transactionHash ? (
          <a 
            href={getExplorerUrl(data.chainId, data.transactionHash)} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm underline"
          >
            View Transaction <ExternalLink className="h-3 w-3" />
          </a>
        ) : undefined,
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

  const handleClaimReward = (reward: ClaimableReward) => {
    setClaimingRewardId(reward.id);
    setSelectedChain('');
    setGasConfirmed(false);
    setEstimatedGas('');
    
    // Auto-estimate gas fees
    estimateGasFees(reward);
  };

  const handleConfirmClaim = () => {
    if (!claimingRewardId || !gasConfirmed) return;
    
    const reward = claimableRewards.find(r => r.id === claimingRewardId);
    if (!reward) return;
    
    claimWithTransferMutation.mutate({ reward });
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
              disabled={claimAllMutation.isPending || !isConnected || !usdtContract}
              className="bg-honey text-black hover:bg-honey/90"
              data-testid="claim-all-button"
            >
              {claimAllMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-1" />Claiming...</>
              ) : (
                `Claim All ${totalClaimable} USDT`
              )}
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
                    <div className="font-medium">{reward.rewardAmount} USDT</div>
                    <div className="text-sm text-muted-foreground">
                      {formatMatrixPosition(reward.matrixPosition)} • L{reward.triggerLevel} → L{reward.payoutLayer}
                    </div>
                  </div>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      onClick={() => handleClaimReward(reward)}
                      disabled={claimingRewards.includes(reward.id) || !isConnected || !usdtContract}
                      className="bg-honey text-black hover:bg-honey/90"
                      data-testid={`claim-reward-${reward.id}`}
                    >
                      {claimingRewards.includes(reward.id) ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-1" />Claiming...</>
                      ) : (
                        'Claim'
                      )}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-honey" />
                        Claim {reward.rewardAmount} USDT
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-2">Reward Details:</p>
                        <p className="font-medium">{formatMatrixPosition(reward.matrixPosition)}</p>
                        <p className="text-sm">From Level {reward.triggerLevel} to Layer {reward.payoutLayer}</p>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Withdrawal Blockchain:</label>
                        {currentChain && usdtContract ? (
                          <div className="p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                              <span className="font-medium">{currentChain.name}</span>
                              <Badge variant="outline" className="text-xs">
                                Connected
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              USDT will be transferred to: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                            </p>
                            {usdtBalance && typeof usdtBalance === 'bigint' && usdtBalance > BigInt(0) ? (
                              <p className="text-xs text-muted-foreground mt-1">
                                Current balance: {fromWei(usdtBalance, getUSDTDecimals(currentChain.id))} USDT
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <div className="p-3 bg-red-500/10 rounded-lg">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                              <span className="text-red-500 text-sm">USDT not supported on this chain</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 p-3 bg-orange-500/10 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        <div className="text-sm">
                          <p className="font-medium text-orange-500">Gas Fee Required</p>
                          <p className="text-muted-foreground">
                            {isEstimatingGas ? (
                              <span className="flex items-center gap-1">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Estimating gas...
                              </span>
                            ) : estimatedGas ? (
                              `Estimated: ${estimatedGas}`
                            ) : (
                              'You will pay network gas fees for this transaction'
                            )}
                          </p>
                          {ethBalance && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Available for gas: {parseFloat(ethBalance.displayValue).toFixed(6)} {ethBalance.symbol}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="gas-confirm"
                          checked={gasConfirmed}
                          onCheckedChange={(checked) => setGasConfirmed(checked === true)}
                        />
                        <label htmlFor="gas-confirm" className="text-sm">
                          I understand and agree to pay gas fees for this transaction
                        </label>
                      </div>

                      <Button
                        className="w-full bg-honey text-black hover:bg-honey/90"
                        onClick={handleConfirmClaim}
                        disabled={!gasConfirmed || !usdtContract || claimWithTransferMutation.isPending || isTransactionPending}
                        data-testid="confirm-claim-button"
                      >
                        {claimWithTransferMutation.isPending || isTransactionPending ? (
                          <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing Transaction...</>
                        ) : (
                          'Confirm Claim'
                        )}
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
                    <div className="font-medium">{reward.rewardAmount} USDT</div>
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