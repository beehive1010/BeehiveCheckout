import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useActiveAccount, useActiveWalletChain } from 'thirdweb/react';
import { useWallet } from '@/hooks/useWallet';
import { 
  DollarSign, 
  ArrowRight, 
  Loader2, 
  CheckCircle, 
  AlertTriangle, 
  Wallet, 
  Link,
  Gift,
  Target,
  Timer,
  RefreshCw,
  Award
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { CompactCountdownTimer } from '../bcc/CountdownTimer';

interface WithdrawRewardsV2Props {
  walletAddress: string;
}

interface LayerReward {
  id: string;
  reward_amount: number;
  status: string;
  expires_at: string;
  claimed_at: string | null;
  matrix_layer: number;
  layer_position: string;
  triggering_member_wallet: string;
  roll_up_reason: string | null;
}

interface UserBalance {
  reward_balance: number;
  total_withdrawn: number;
  available_balance: number;
}

interface WithdrawalRequest {
  withdrawalId: string;
  amount: number;
  chain: string;
  recipientAddress: string;
  status: string;
  message: string;
  transactionHash?: string;
}

// Chain mapping from thirdweb chain IDs to readable names
const CHAIN_INFO = {
  1: { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', icon: '🔷', color: 'text-blue-400', testnet: false },
  137: { id: 'polygon', name: 'Polygon', symbol: 'MATIC', icon: '🟣', color: 'text-purple-400', testnet: false },
  42161: { id: 'arbitrum', name: 'Arbitrum One', symbol: 'ARB', icon: '🔵', color: 'text-blue-300', testnet: false },
  421614: { id: 'arbitrum-sepolia', name: 'Arbitrum Sepolia', symbol: 'ETH', icon: '🧪', color: 'text-orange-400', testnet: true },
  10: { id: 'optimism', name: 'Optimism', symbol: 'OP', icon: '🔴', color: 'text-red-400', testnet: false },
  56: { id: 'bsc', name: 'BSC', symbol: 'BNB', icon: '🟡', color: 'text-yellow-400', testnet: false },
  8453: { id: 'base', name: 'Base', symbol: 'BASE', icon: '🔵', color: 'text-blue-500', testnet: false },
};

// USDT Token contract addresses for each chain
const TOKEN_ADDRESSES = {
  1: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', decimals: 6 },
  137: { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', symbol: 'USDT', decimals: 6 },
  42161: { 
    usdt: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', symbol: 'USDT', decimals: 6 },
    testUSDT: { address: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', symbol: 'TEST-USDT', decimals: 18 }
  },
  10: { address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', symbol: 'USDT', decimals: 6 },
  56: { address: '0x55d398326f99059fF775485246999027B3197955', symbol: 'USDT', decimals: 18 },
  8453: { address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', symbol: 'USDT', decimals: 6 }
};

// Withdrawal fees for each chain (in USDT)
const WITHDRAWAL_FEES = {
  1: 15.0,      // Ethereum - higher gas fees
  137: 1.0,     // Polygon - low fees
  42161: 2.0,   // Arbitrum - moderate fees
  10: 1.5,      // Optimism - low-moderate fees
  56: 1.0,      // BSC - low fees
  8453: 1.5     // Base - low-moderate fees
};

// Helper functions
const getTokenInfo = (chainId: number, tokenType: 'usdt' | 'testUSDT' = 'usdt') => {
  const chainTokens = TOKEN_ADDRESSES[chainId as keyof typeof TOKEN_ADDRESSES];
  
  if (chainId === 42161 && typeof chainTokens === 'object' && 'usdt' in chainTokens) {
    return chainTokens[tokenType];
  } else if (typeof chainTokens === 'object' && 'address' in chainTokens) {
    return chainTokens;
  }
  
  return TOKEN_ADDRESSES[42161].usdt;
};

const getWithdrawalFee = (chainId: number) => {
  return WITHDRAWAL_FEES[chainId as keyof typeof WITHDRAWAL_FEES] || 2.0;
};

export const WithdrawRewardsV2: React.FC<WithdrawRewardsV2Props> = ({ walletAddress }) => {
  const { toast } = useToast();
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const { userData } = useWallet();
  const queryClient = useQueryClient();
  
  // Use the registered wallet address from user data if available, fallback to connected wallet
  const memberWalletAddress = userData?.wallet_address || account?.address || walletAddress;
  
  // Auto-detect current wallet and chain info
  const currentWalletAddress = account?.address || '';
  const currentChainId = activeChain?.id;
  const currentChainInfo = currentChainId ? CHAIN_INFO[currentChainId as keyof typeof CHAIN_INFO] : null;
  
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [selectedToken, setSelectedToken] = useState<'usdt' | 'testUSDT'>('usdt');
  const [step, setStep] = useState<'form' | 'confirm' | 'processing' | 'success'>('form');
  const [withdrawalRequest, setWithdrawalRequest] = useState<WithdrawalRequest | null>(null);

  // Get claimable and pending rewards
  const { data: rewards, isLoading: rewardsLoading, refetch: refetchRewards } = useQuery<LayerReward[]>({
    queryKey: ['layer-rewards', memberWalletAddress],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('layer_rewards')
        .select('*')
        .eq('reward_recipient_wallet', memberWalletAddress.toLowerCase())
        .in('status', ['claimable', 'pending'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!memberWalletAddress,
    refetchInterval: 5000,
  });

  // Get user balance
  const { data: balance, refetch: refetchBalance } = useQuery<UserBalance>({
    queryKey: ['user-balance', memberWalletAddress],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_balances')
        .select('reward_balance, total_withdrawn, available_balance')
        .eq('wallet_address', memberWalletAddress.toLowerCase())
        .single();

      if (error) {
        console.warn('Balance query error, returning defaults:', error);
        return {
          reward_balance: 0,
          total_withdrawn: 0,
          available_balance: 0
        };
      }
      return data;
    },
    enabled: !!memberWalletAddress,
  });

  // Claim reward mutation
  const claimRewardMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      const { data, error } = await supabase.rpc('claim_layer_reward', {
        p_member_wallet: memberWalletAddress,
        p_reward_id: rewardId
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Reward Claimed Successfully! 🎉",
        description: "Your reward has been added to your withdrawable balance",
      });
      refetchRewards();
      refetchBalance();
    },
    onError: (error: any) => {
      toast({
        title: "Claim Failed",
        description: error.message || "Failed to claim reward",
        variant: 'destructive',
      });
    },
  });

  // Server wallet withdrawal mutation
  const withdrawMutation = useMutation({
    mutationFn: async (data: { amount: number; recipientAddress: string }) => {
      if (!currentChainInfo) {
        throw new Error('Unsupported chain. Please switch to a supported network.');
      }
      
      // Call server-wallet function via supabase functions
      const response = await fetch('https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/server-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'wallet-address': memberWalletAddress,
        },
        body: JSON.stringify({
          action: 'withdraw',
          user_wallet: data.recipientAddress,
          amount: data.amount.toString(),
          target_chain_id: currentChainId,
          token_address: getTokenInfo(currentChainId!, selectedToken).address,
          user_signature: 'server_initiated',
          withdrawal_fee: getWithdrawalFee(currentChainId!),
          gas_fee_wallet: '0xC2422eae8A56914509b6977E69F7f3aCE7DD6463',
          metadata: {
            source: 'rewards_withdrawal',
            member_wallet: memberWalletAddress,
            initiated_by: 'user',
            token_type: selectedToken
          }
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Withdrawal failed');
      }
      
      return await response.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        const fee = getWithdrawalFee(currentChainId!);
        const netAmount = parseFloat(withdrawAmount) - fee;
        
        toast({
          title: "Withdrawal Successful! 🎉",
          description: `${netAmount.toFixed(2)} USDT sent to your wallet on ${currentChainInfo?.name} (${fee} USDT fee deducted)`,
        });
        
        setWithdrawalRequest({
          withdrawalId: data.transaction_hash || data.withdrawalId || 'completed',
          amount: parseFloat(withdrawAmount),
          chain: currentChainInfo?.name || 'Unknown',
          recipientAddress: currentWalletAddress,
          status: 'completed',
          message: data.message || 'Withdrawal completed successfully',
          transactionHash: data.transaction_hash
        });
        
        setStep('success');
        refetchBalance();
      } else {
        throw new Error(data.error || 'Withdrawal failed');
      }
    },
    onError: (error: any) => {
      toast({
        title: "Withdrawal Failed",
        description: error.message || "Failed to process withdrawal",
        variant: 'destructive',
      });
      setStep('form');
    },
  });

  const claimableRewards = rewards?.filter(r => r.status === 'claimable') || [];
  const pendingRewards = rewards?.filter(r => r.status === 'pending') || [];
  const totalClaimable = claimableRewards.reduce((sum, r) => sum + r.reward_amount, 0);
  const availableToWithdraw = (balance?.available_balance || 0) + totalClaimable;

  const handleClaimReward = (rewardId: string) => {
    claimRewardMutation.mutate(rewardId);
  };

  const handleClaimAllRewards = () => {
    claimableRewards.forEach(reward => {
      claimRewardMutation.mutate(reward.id);
    });
  };

  const handleInitiateWithdrawal = () => {
    const amount = parseFloat(withdrawAmount);
    
    if (!withdrawAmount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid withdrawal amount",
        variant: 'destructive',
      });
      return;
    }

    if (!currentWalletAddress) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to proceed",
        variant: 'destructive',
      });
      return;
    }

    if (!currentChainInfo) {
      toast({
        title: "Unsupported Chain",
        description: "Please switch to a supported network",
        variant: 'destructive',
      });
      return;
    }

    const fee = getWithdrawalFee(currentChainId!);
    const totalNeeded = amount + fee;
    
    if (totalNeeded > availableToWithdraw) {
      toast({
        title: "Insufficient Balance",
        description: `You need ${totalNeeded.toFixed(2)} USDT (${amount} + ${fee} fee) but only have ${availableToWithdraw.toFixed(2)} available`,
        variant: 'destructive',
      });
      return;
    }

    // Auto-claim all claimable rewards if needed
    if (totalClaimable > 0 && (balance?.available_balance || 0) < totalNeeded) {
      handleClaimAllRewards();
      setTimeout(() => setStep('confirm'), 2000); // Wait for claims to process
    } else {
      setStep('confirm');
    }

    setWithdrawalRequest({
      withdrawalId: '',
      amount: amount,
      chain: currentChainInfo.name,
      recipientAddress: currentWalletAddress,
      status: 'pending',
      message: 'Ready for confirmation'
    });
  };

  const handleConfirmWithdrawal = () => {
    const amount = parseFloat(withdrawAmount);
    
    if (!currentWalletAddress || !/^0x[a-fA-F0-9]{40}$/.test(currentWalletAddress)) {
      toast({
        title: "Invalid Wallet",
        description: "Please connect a valid wallet address",
        variant: 'destructive',
      });
      return;
    }

    const fee = getWithdrawalFee(currentChainId!);
    if ((amount + fee) > availableToWithdraw) {
      toast({
        title: "Insufficient Balance",
        description: `Insufficient funds for withdrawal including fees`,
        variant: 'destructive',
      });
      return;
    }

    setStep('processing');
    withdrawMutation.mutate({
      amount: amount,
      recipientAddress: currentWalletAddress
    });
  };

  const resetForm = () => {
    setStep('form');
    setWithdrawalRequest(null);
    setWithdrawAmount('');
  };

  if (rewardsLoading) {
    return (
      <div className="space-y-6">
        <Card className="bg-secondary border-border">
          <CardContent className="p-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-honey" />
            <p className="text-muted-foreground">Loading rewards data...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Overview */}
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-honey">
            <DollarSign className="h-6 w-6" />
            Rewards Balance & Withdrawal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-lg p-4 border border-green-500/20">
              <div className="flex items-center justify-between mb-2">
                <Target className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-2xl font-bold text-green-400">
                ${(balance?.available_balance || 0).toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">Available to Withdraw</div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-lg p-4 border border-blue-500/20">
              <div className="flex items-center justify-between mb-2">
                <Gift className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-blue-400">
                ${totalClaimable.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">Claimable Rewards</div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-lg p-4 border border-purple-500/20">
              <div className="flex items-center justify-between mb-2">
                <Award className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-purple-400">
                ${(balance?.total_withdrawn || 0).toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">Total Withdrawn</div>
            </div>
          </div>

          {/* Withdrawal Form */}
          {step === 'form' && (
            <div className="space-y-6">
              {/* Current Wallet & Chain Info */}
              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-honey flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Connected Wallet Information
                </h4>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Wallet Address:</span>
                    <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                      {currentWalletAddress ? `${currentWalletAddress.slice(0, 6)}...${currentWalletAddress.slice(-4)}` : 'Not Connected'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Current Network:</span>
                    {currentChainInfo ? (
                      <div className="flex items-center gap-2">
                        <span>{currentChainInfo.icon}</span>
                        <span className="font-medium">{currentChainInfo.name}</span>
                        <Badge className={`${currentChainInfo.color} text-xs`}>{currentChainInfo.symbol}</Badge>
                        {currentChainInfo.testnet && (
                          <Badge variant="outline" className="text-xs text-orange-500 border-orange-500">
                            TESTNET
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <Badge variant="destructive" className="text-xs">Unsupported Chain</Badge>
                    )}
                  </div>
                </div>
                
                {!currentChainInfo && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Please switch to a supported network: Ethereum, Polygon, Arbitrum One, Optimism, BSC, or Base
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Token Selection for Arbitrum */}
                {currentChainId === 42161 && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Select Token to Withdraw:</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={selectedToken === 'usdt' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedToken('usdt')}
                        className={selectedToken === 'usdt' ? 'bg-honey text-black' : ''}
                      >
                        USDT (Standard)
                      </Button>
                      <Button
                        variant={selectedToken === 'testUSDT' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedToken('testUSDT')}
                        className={selectedToken === 'testUSDT' ? 'bg-honey text-black' : ''}
                      >
                        TEST-USDT (Custom)
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount" className="text-honey">Withdrawal Amount (USDT)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={availableToWithdraw}
                  placeholder="0.00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="bg-muted border-honey/20 focus:border-honey"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Available: ${availableToWithdraw.toFixed(2)} USDT</span>
                  <span>Fee: ${getWithdrawalFee(currentChainId || 42161)} USDT</span>
                </div>
              </div>

              <Button
                onClick={handleInitiateWithdrawal}
                disabled={!withdrawAmount || !currentWalletAddress || !currentChainInfo || withdrawMutation.isPending}
                className="w-full bg-honey text-black hover:bg-honey/90"
              >
                {withdrawMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Initiate Withdrawal
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Confirmation Step */}
          {step === 'confirm' && withdrawalRequest && (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Please review your withdrawal details carefully. This action cannot be undone.
                </AlertDescription>
              </Alert>

              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-semibold text-honey">{withdrawalRequest.amount} USDT</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Withdrawal Fee:</span>
                  <span className="font-semibold text-orange-400">{getWithdrawalFee(currentChainId!)} USDT</span>
                </div>
                <div className="flex justify-between items-center border-t border-border pt-2">
                  <span className="text-muted-foreground">You'll Receive:</span>
                  <span className="font-semibold text-green-400">{(withdrawalRequest.amount - getWithdrawalFee(currentChainId!)).toFixed(2)} USDT</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">To Network:</span>
                  <div className="flex items-center gap-2">
                    <span>{currentChainInfo?.icon}</span>
                    <span>{currentChainInfo?.name}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={resetForm} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleConfirmWithdrawal} className="flex-1 bg-honey text-black hover:bg-honey/90">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm Withdrawal
                </Button>
              </div>
            </div>
          )}

          {/* Processing Step */}
          {step === 'processing' && (
            <div className="text-center space-y-4">
              <div className="bg-muted/30 rounded-lg p-6">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-honey" />
                <h3 className="text-lg font-semibold text-honey mb-2">Processing Withdrawal</h3>
                <p className="text-muted-foreground text-sm">
                  Your withdrawal is being processed on the blockchain. This may take a few moments.
                </p>
              </div>
            </div>
          )}

          {/* Success Step */}
          {step === 'success' && withdrawalRequest && (
            <div className="text-center space-y-4">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-400" />
                <h3 className="text-lg font-semibold text-green-400 mb-2">Withdrawal Complete!</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Your USDT withdrawal has been successfully processed.
                </p>
                
                {withdrawalRequest.transactionHash && (
                  <div className="text-xs text-muted-foreground mb-4">
                    Transaction: {withdrawalRequest.transactionHash.slice(0, 10)}...{withdrawalRequest.transactionHash.slice(-10)}
                  </div>
                )}
                
                <Button onClick={resetForm} className="bg-honey text-black hover:bg-honey/90">
                  New Withdrawal
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Claimable Rewards */}
      {claimableRewards.length > 0 && (
        <Card className="bg-secondary border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-400">
              <Gift className="h-5 w-5" />
              Ready to Claim ({claimableRewards.length})
            </CardTitle>
            {claimableRewards.length > 1 && (
              <Button 
                onClick={handleClaimAllRewards}
                disabled={claimRewardMutation.isPending}
                className="bg-green-600 text-white hover:bg-green-700"
                size="sm"
              >
                {claimRewardMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Claiming...
                  </>
                ) : (
                  'Claim All'
                )}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {claimableRewards.map((reward) => (
                <div key={reward.id} className="flex items-center justify-between p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                  <div>
                    <div className="font-semibold text-green-400">
                      ${reward.reward_amount.toFixed(2)} USDT
                    </div>
                    <div className="text-sm text-green-300">
                      Layer {reward.matrix_layer} • Position {reward.layer_position}
                    </div>
                    {reward.roll_up_reason && (
                      <div className="text-xs text-green-200">
                        Roll-up: {reward.roll_up_reason}
                      </div>
                    )}
                  </div>
                  
                  <Button
                    onClick={() => handleClaimReward(reward.id)}
                    disabled={claimRewardMutation.isPending}
                    className="bg-green-600 text-white hover:bg-green-700"
                    size="sm"
                  >
                    {claimRewardMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Claiming...
                      </>
                    ) : (
                      'Claim'
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Rewards with Countdown */}
      {pendingRewards.length > 0 && (
        <Card className="bg-secondary border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-400">
              <Timer className="h-5 w-5" />
              Pending Rewards ({pendingRewards.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRewards.map((reward) => (
                <div key={reward.id} className="flex items-center justify-between p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                  <div>
                    <div className="font-semibold text-orange-400">
                      ${reward.reward_amount.toFixed(2)} USDT
                    </div>
                    <div className="text-sm text-orange-300">
                      Layer {reward.matrix_layer} • Position {reward.layer_position}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm text-orange-300 mb-1">Available in:</div>
                    <CompactCountdownTimer
                      targetDate={reward.expires_at}
                      className="text-orange-400 font-medium"
                      onComplete={() => {
                        refetchRewards();
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Rewards Message */}
      {claimableRewards.length === 0 && pendingRewards.length === 0 && (
        <Card className="bg-secondary border-border">
          <CardContent className="text-center py-8">
            <div className="text-muted-foreground mb-2">No rewards available</div>
            <div className="text-sm text-muted-foreground">
              Rewards will appear here when team members upgrade their memberships
            </div>
          </CardContent>
        </Card>
      )}

      {/* Withdrawal fees info */}
      <Card className="bg-orange-500/10 border border-orange-500/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="text-orange-400 mt-1">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-orange-400 mb-1">Cross-Chain Withdrawal Information</h4>
              <p className="text-xs text-muted-foreground">
                Withdrawals are processed using our secure server wallet through thirdweb. 
                Gas fees vary by network: Ethereum (~$15), Arbitrum (~$2), Polygon (~$1), BSC (~$1), Base (~$1.5), Optimism (~$1.5).
                The system automatically detects your connected wallet and network.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};