import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useActiveAccount, useActiveWalletChain } from 'thirdweb/react';
import { useWallet } from '@/hooks/useWallet';
import { DollarSign, ArrowRight, Loader2, CheckCircle, AlertTriangle, Wallet, Link } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface USDTBalance {
  balance: number;
  balanceUSD: string;
  lastUpdated: string;
}

interface WithdrawalRequest {
  withdrawalId: string;
  amount: number;
  amountUSD: string;
  chain: string;
  recipientAddress: string;
  status: string;
  message: string;
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
  1: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', decimals: 6 },     // Ethereum USDT (6 decimals)
  137: { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', symbol: 'USDT', decimals: 6 },   // Polygon USDT (6 decimals)
  42161: { 
    usdt: { address: '0xfA278827a612BBA895e7F0A4fBA504b22ff3E7C9', symbol: 'USDT', decimals: 18 }, // Arbitrum One USDT (18 decimals)
    testUSDT: { 
      address: import.meta.env.VITE_ARB_TEST_USDT_ADDRESS || '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', 
      symbol: 'TEST-USDT', 
      decimals: 18 
    } // Your custom Test USDT on Arbitrum (18 decimals)
  },
  10: { address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', symbol: 'USDT', decimals: 6 },    // Optimism USDT (6 decimals)
  56: { address: '0x55d398326f99059fF775485246999027B3197955', symbol: 'USDT', decimals: 18 },   // BSC USDT (18 decimals)
  8453: { address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', symbol: 'USDT', decimals: 6 }   // Base USDT (6 decimals)
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

// Gas fee wallet address
const GAS_FEE_WALLET = '0xC2422eae8A56914509b6977E69F7f3aCE7DD6463';

// Helper function to get token address and info for a chain
const getTokenInfo = (chainId: number, tokenType: 'usdt' | 'testUSDT' = 'usdt') => {
  const chainTokens = TOKEN_ADDRESSES[chainId as keyof typeof TOKEN_ADDRESSES];
  
  if (chainId === 42161 && typeof chainTokens === 'object' && 'usdt' in chainTokens) {
    // Arbitrum has multiple tokens
    return chainTokens[tokenType];
  } else if (typeof chainTokens === 'object' && 'address' in chainTokens) {
    // Other chains have single token
    return chainTokens;
  }
  
  // Default to Arbitrum USDT
  return TOKEN_ADDRESSES[42161].usdt;
};

// Legacy helper function for backward compatibility
const getUSDTAddress = (chainId: number, tokenType: 'usdt' | 'testUSDT' = 'usdt') => {
  const tokenInfo = getTokenInfo(chainId, tokenType);
  return tokenInfo.address;
};

// Get withdrawal fee for chain
const getWithdrawalFee = (chainId: number) => {
  return WITHDRAWAL_FEES[chainId as keyof typeof WITHDRAWAL_FEES] || 2.0;
};

export default function USDTWithdrawal() {
  const { toast } = useToast();
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const { userData } = useWallet();
  const queryClient = useQueryClient();
  
  // Use the registered wallet address from user data if available, fallback to connected wallet
  const memberWalletAddress = userData?.wallet_address || account?.address;
  
  // Auto-detect current wallet and chain info
  const currentWalletAddress = account?.address || '';
  const currentChainId = activeChain?.id;
  const currentChainInfo = currentChainId ? CHAIN_INFO[currentChainId as keyof typeof CHAIN_INFO] : null;
  
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalRequest, setWithdrawalRequest] = useState<WithdrawalRequest | null>(null);
  const [step, setStep] = useState<'form' | 'confirm' | 'processing' | 'success'>('form');
  const [selectedToken, setSelectedToken] = useState<'usdt' | 'testUSDT'>('usdt'); // Token selection for Arbitrum

  // Get user USDT balance from user_balances table
  const { data: balance, isLoading: balanceLoading } = useQuery<USDTBalance>({
    queryKey: ['user-balance', memberWalletAddress],
    enabled: !!memberWalletAddress,
    queryFn: async () => {
      const { supabase } = await import('../../lib/supabase');
      const { data, error } = await supabase
        .from('user_balances')
        .select('claimable_reward_balance_usdc, total_rewards_withdrawn_usdc, updated_at')
        .ilike('wallet_address', memberWalletAddress!)
        .single();
      
      if (error) {
        console.warn('Balance query error, returning defaults:', error);
        return {
          balance: 0,
          balanceUSD: '0.00',
          lastUpdated: new Date().toISOString()
        };
      }
      
      const balanceAmount = data?.claimable_reward_balance_usdc || 0;
      return {
        balance: Math.round(balanceAmount * 100), // Convert to cents
        balanceUSD: balanceAmount.toFixed(2),
        lastUpdated: data?.updated_at || new Date().toISOString()
      };
    },
  });

  // Server wallet withdrawal mutation - no user signing required
  const serverWithdrawalMutation = useMutation({
    mutationFn: async (data: { amount: number; recipientAddress: string }) => {
      if (!currentChainInfo) {
        throw new Error('Unsupported chain. Please switch to a supported network.');
      }
      
      // Call server wallet to perform withdrawal using thirdweb
      const response = await fetch('https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/server-wallet/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'wallet-address': memberWalletAddress!,
        },
        body: JSON.stringify({
          user_wallet: data.recipientAddress,
          amount: data.amount.toString(),
          target_chain_id: currentChainId,
          token_address: getUSDTAddress(currentChainId!, selectedToken),
          user_signature: 'server_initiated', // Server wallet doesn't need user signature
          withdrawal_fee: getWithdrawalFee(currentChainId!),
          gas_fee_wallet: GAS_FEE_WALLET,
          metadata: {
            source: 'rewards_withdrawal',
            member_wallet: memberWalletAddress,
            initiated_by: 'user'
          }
        })
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Withdrawal failed');
      }
      
      return await response.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        const fee = getWithdrawalFee(currentChainId!);
        const netAmount = parseFloat(withdrawalAmount) - fee;
        toast({
          title: "Withdrawal Successful! 🎉",
          description: `${netAmount.toFixed(2)} USDT sent to your wallet on ${currentChainInfo?.name} (${fee} USDT fee deducted)`,
        });
        
        // Update user balance cache
        queryClient.invalidateQueries({ queryKey: ['user-balance', memberWalletAddress] });
        setStep('success');
        setWithdrawalRequest({
          withdrawalId: data.transaction_hash || data.withdrawalId || 'completed',
          amount: parseFloat(withdrawalAmount),
          amountUSD: withdrawalAmount,
          chain: currentChainInfo?.name || 'Unknown',
          recipientAddress: currentWalletAddress,
          status: 'completed',
          message: data.message || 'Withdrawal completed successfully'
        });
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


  const handleInitiateWithdrawal = () => {
    const amount = parseFloat(withdrawalAmount);
    
    if (!withdrawalAmount || amount <= 0) {
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
        description: "Please switch to a supported network (Ethereum, Polygon, Arbitrum, Optimism, BSC, or Base)",
        variant: 'destructive',
      });
      return;
    }

    const fee = getWithdrawalFee(currentChainId!);
    if (!balance || (amount + fee) > parseFloat(balance.balanceUSD)) {
      toast({
        title: "Insufficient Balance",
        description: `You need ${(amount + fee).toFixed(2)} USDT (${amount} + ${fee} fee) but only have ${balance?.balanceUSD || '0'}`,
        variant: 'destructive',
      });
      return;
    }

    // Create withdrawal request object for confirmation
    setWithdrawalRequest({
      withdrawalId: '',
      amount: amount,
      amountUSD: withdrawalAmount,
      chain: currentChainInfo.name,
      recipientAddress: currentWalletAddress,
      status: 'pending',
      message: 'Ready for confirmation'
    });
    
    // Show confirmation step
    setStep('confirm');
  };

  const handleConfirmWithdrawal = () => {
    const amount = parseFloat(withdrawalAmount);
    
    if (!currentWalletAddress || !/^0x[a-fA-F0-9]{40}$/.test(currentWalletAddress)) {
      toast({
        title: "Invalid Wallet",
        description: "Please connect a valid wallet address",
        variant: 'destructive',
      });
      return;
    }

    const fee = getWithdrawalFee(currentChainId!);
    if (!balance || (amount + fee) > parseFloat(balance.balanceUSD)) {
      toast({
        title: "Insufficient Balance",
        description: `You need ${(amount + fee).toFixed(2)} USDT (${amount} + ${fee} fee) but only have ${balance?.balanceUSD || '0'}`,
        variant: 'destructive',
      });
      return;
    }

    setStep('processing');
    
    // Call server wallet withdrawal directly - no user signing required
    serverWithdrawalMutation.mutate({
      amount: amount,
      recipientAddress: currentWalletAddress
    });
  };

  const resetForm = () => {
    setStep('form');
    setWithdrawalRequest(null);
    setWithdrawalAmount('');
  };

  if (balanceLoading) {
    return (
      <Card className="bg-secondary border-border">
        <CardContent className="p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-honey" />
          <p className="text-muted-foreground">Loading USDT balance...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-secondary border-border">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-honey flex items-center gap-2">
          <DollarSign className="h-6 w-6" />
          Claimable Rewards Withdrawal
        </CardTitle>
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">Withdraw your claimable rewards to any supported blockchain</p>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Claimable Rewards</p>
            <p className="text-lg font-semibold text-honey">
              ${balance?.balanceUSD || '0.00'} USDT
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {step === 'form' && (
          <>
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
                    Please switch to a supported network: Ethereum, Polygon, Arbitrum One, Arbitrum Sepolia (testnet), Optimism, BSC, or Base
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
                  <p className="text-xs text-muted-foreground">
                    {selectedToken === 'usdt' 
                      ? 'Standard USDT token on Arbitrum One' 
                      : 'Your custom TEST-USDT token on Arbitrum One'}
                  </p>
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
                max={balance?.balanceUSD || "0"}
                placeholder="0.00"
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
                className="bg-muted border-honey/20 focus:border-honey"
                data-testid="input-withdrawal-amount"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Available: ${balance?.balanceUSD || '0.00'} USDT</span>
                <span>Fee: ${getWithdrawalFee(currentChainId || 42161)} USDT</span>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-blue-400 mt-1">
                  <Link className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-blue-400 mb-1">Auto-Detection Active</h4>
                  <p className="text-xs text-muted-foreground">
                    USDT will be sent to your currently connected wallet on the {currentChainInfo?.name || 'selected'} network. 
                    To withdraw to a different network, please switch networks in your wallet first.
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleInitiateWithdrawal}
              disabled={!withdrawalAmount || !currentWalletAddress || !currentChainInfo}
              className="w-full bg-honey text-black hover:bg-honey/90"
              data-testid="button-initiate-withdrawal"
            >
              {serverWithdrawalMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Preparing Withdrawal...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Initiate Withdrawal
                </>
              )}
            </Button>
          </>
        )}

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
                <span className="font-semibold text-honey">{withdrawalRequest.amountUSD} USDT</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Withdrawal Fee:</span>
                <span className="font-semibold text-orange-400">{getWithdrawalFee(currentChainId!)} USDT</span>
              </div>
              <div className="flex justify-between items-center border-t border-border pt-2">
                <span className="text-muted-foreground">You'll Receive:</span>
                <span className="font-semibold text-green-400">{(parseFloat(withdrawalRequest.amountUSD) - getWithdrawalFee(currentChainId!)).toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">To Network:</span>
                <div className="flex items-center gap-2">
                  <span>{currentChainInfo?.icon}</span>
                  <span>{currentChainInfo?.name}</span>
                  <Badge className={`${currentChainInfo?.color} text-xs`}>{currentChainInfo?.symbol}</Badge>
                </div>
              </div>
              {currentChainId === 42161 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Token:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{getTokenInfo(currentChainId, selectedToken).symbol}</span>
                    <Badge variant="outline" className="text-xs">
                      {selectedToken === 'usdt' ? 'Standard' : 'Custom'}
                    </Badge>
                  </div>
                </div>
              )}
              <div className="flex justify-between items-start">
                <span className="text-muted-foreground">To Wallet:</span>
                <span className="font-mono text-xs text-right max-w-[200px] break-all">
                  {withdrawalRequest.recipientAddress}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={resetForm}
                variant="outline"
                className="flex-1"
                data-testid="button-cancel-withdrawal"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmWithdrawal}
                className="flex-1 bg-honey text-black hover:bg-honey/90"
                data-testid="button-confirm-withdrawal"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirm Withdrawal
              </Button>
            </div>
          </div>
        )}


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

        {step === 'success' && (
          <div className="text-center space-y-4">
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-400" />
              <h3 className="text-lg font-semibold text-green-400 mb-2">Withdrawal Complete!</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Your USDT withdrawal has been successfully processed.
              </p>
              
              {/* Transaction details would be shown here in a real implementation */}
              <Button
                onClick={resetForm}
                className="bg-honey text-black hover:bg-honey/90"
                data-testid="button-new-withdrawal"
              >
                New Withdrawal
              </Button>
            </div>
          </div>
        )}

        {/* Withdrawal fees info */}
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-orange-400 mt-1">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-orange-400 mb-1">Withdrawal Fees</h4>
              <p className="text-xs text-muted-foreground">
                A withdrawal fee of {getWithdrawalFee(currentChainId || 42161)} USDT will be deducted and sent to our gas fee wallet for transaction processing. Different networks have different fees.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
