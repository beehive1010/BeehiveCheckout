import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useActiveAccount, useActiveWalletChain } from 'thirdweb/react';
import { useWallet } from '@/hooks/useWallet';
import { DollarSign, ArrowRight, Loader2, CheckCircle, AlertTriangle, Wallet, Link } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface USDTBalance {
  available_balance: number;
  reward_balance: number;
  total_withdrawn: number;
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
  1: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', decimals: 6 },
  137: { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', symbol: 'USDT', decimals: 6 },
  42161: { 
    usdt: { address: '0xfA278827a612BBA895e7F0A4fBA504b22ff3E7C9', symbol: 'USDT', decimals: 18 },
    testUSDT: { 
      address: import.meta.env.VITE_ARB_TEST_USDT_ADDRESS || '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', 
      symbol: 'TEST-USDT', 
      decimals: 18 
    }
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

const getUSDTAddress = (chainId: number, tokenType: 'usdt' | 'testUSDT' = 'usdt') => {
  const tokenInfo = getTokenInfo(chainId, tokenType);
  return tokenInfo.address;
};

const getWithdrawalFee = (chainId: number) => {
  return WITHDRAWAL_FEES[chainId as keyof typeof WITHDRAWAL_FEES] || 2.0;
};

const formatWalletAddress = (address: string | null | undefined) => {
  if (!address || typeof address !== 'string') return 'Unknown';
  try {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  } catch (error) {
    return 'Invalid Address';
  }
};

export default function USDTWithdrawalFixed() {
  const { toast } = useToast();
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const { userData } = useWallet();
  const queryClient = useQueryClient();
  
  const memberWalletAddress = userData?.wallet_address || account?.address;
  
  const currentWalletAddress = account?.address || '';
  const currentChainId = activeChain?.id;
  const currentChainInfo = currentChainId ? CHAIN_INFO[currentChainId as keyof typeof CHAIN_INFO] : null;
  
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalRequest, setWithdrawalRequest] = useState<WithdrawalRequest | null>(null);
  const [step, setStep] = useState<'form' | 'confirm' | 'processing' | 'success'>('form');
  const [selectedToken, setSelectedToken] = useState<'usdt' | 'testUSDT'>('usdt');

  // Get user balance using correct table structure
  const { data: balance, isLoading: balanceLoading, error: balanceError, refetch: refetchBalance } = useQuery<USDTBalance>({
    queryKey: ['user-balance', memberWalletAddress],
    enabled: !!memberWalletAddress,
    retry: 3,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      try {
        console.log(`🔍 Querying balance for wallet: ${memberWalletAddress}`);
        
        if (!memberWalletAddress) {
          throw new Error('No wallet address provided');
        }
        
        const { supabase } = await import('../../lib/supabase');
        
        // Query using correct column names based on database structure
        const { data, error } = await supabase
          .from('user_balances')
          .select('available_balance, reward_balance, total_withdrawn, last_updated, wallet_address')
          .ilike('wallet_address', memberWalletAddress)
          .single();
        
        if (error) {
          console.error('Balance query error:', error);
          if (error.code === 'PGRST116') {
            // No record found
            console.log(`❌ No balance record found for wallet: ${memberWalletAddress}`);
            return {
              available_balance: 0,
              reward_balance: 0,
              total_withdrawn: 0,
              lastUpdated: new Date().toISOString(),
              notFound: true
            } as USDTBalance & { notFound: boolean };
          }
          throw error;
        }
        
        console.log(`💰 Balance data:`, data);
        
        return {
          available_balance: data.available_balance || 0,
          reward_balance: data.reward_balance || 0,
          total_withdrawn: data.total_withdrawn || 0,
          lastUpdated: data.last_updated || new Date().toISOString(),
        };
        
      } catch (error: any) {
        console.error('❌ Balance query error:', error);
        throw error;
      }
    },
  });

  // Thirdweb withdrawal mutation with proper error handling
  const serverWithdrawalMutation = useMutation({
    mutationFn: async (data: { amount: number; recipientAddress: string }) => {
      console.log('🚀 Starting withdrawal mutation:', data);
      
      if (!currentChainInfo) {
        throw new Error('Unsupported chain. Please switch to a supported network.');
      }
      
      if (!memberWalletAddress) {
        throw new Error('No member wallet address found.');
      }
      
      const fee = getWithdrawalFee(currentChainId!);
      const netAmount = data.amount - fee;
      
      if (netAmount <= 0) {
        throw new Error(`Amount too small. Minimum withdrawal is ${fee + 0.01} USDT (including ${fee} USDT fee)`);
      }
      
      // Check balance again before withdrawal
      if (!balance || data.amount > balance.available_balance) {
        throw new Error(`Insufficient balance. You have ${balance?.available_balance || 0} USDT but trying to withdraw ${data.amount} USDT`);
      }
      
      try {
        // Import thirdweb modules
        const { createThirdwebClient } = await import('thirdweb');
        const { privateKeyToAccount } = await import('thirdweb/wallets');
        const { getContract, sendTransaction } = await import('thirdweb');
        const { transfer } = await import('thirdweb/extensions/erc20');
        const { defineChain } = await import('thirdweb/chains');
        
        // Check environment variables
        const clientId = import.meta.env.VITE_THIRDWEB_CLIENT_ID;
        const secretKey = import.meta.env.VITE_THIRDWEB_SECRET_KEY;
        const serverWalletPrivateKey = import.meta.env.VITE_SERVER_WALLET_PRIVATE_KEY;
        
        if (!clientId) throw new Error('VITE_THIRDWEB_CLIENT_ID not configured');
        if (!secretKey) throw new Error('VITE_THIRDWEB_SECRET_KEY not configured');
        if (!serverWalletPrivateKey) throw new Error('VITE_SERVER_WALLET_PRIVATE_KEY not configured');
        
        console.log('✅ Environment variables found');
        
        // Create thirdweb client
        const thirdwebClient = createThirdwebClient({
          clientId: clientId,
          secretKey: secretKey,
        });
        
        console.log('✅ Thirdweb client created');
        
        // Create server account
        const serverAccount = privateKeyToAccount({
          client: thirdwebClient,
          privateKey: serverWalletPrivateKey,
        });
        
        console.log('✅ Server account created:', serverAccount.address);
        
        // Get token info and calculate amount
        const sourceChainId = 42161; // Arbitrum One (where our USDT is held)
        const targetChainId = currentChainId!;
        const tokenInfo = getTokenInfo(targetChainId, selectedToken);
        const targetTokenAddress = tokenInfo.address;
        
        console.log(`💰 Transfer details:`, {
          sourceChainId,
          targetChainId,
          tokenAddress: targetTokenAddress,
          amount: netAmount,
          decimals: tokenInfo.decimals
        });
        
        // Convert amount to token units (considering decimals)
        const amountInWei = BigInt(Math.floor(netAmount * Math.pow(10, tokenInfo.decimals)));
        console.log(`🔢 Amount in wei: ${amountInWei}`);
        
        // Define the target chain
        const targetChain = defineChain(targetChainId);
        
        // Get token contract
        const tokenContract = getContract({
          client: thirdwebClient,
          chain: targetChain,
          address: targetTokenAddress,
        });
        
        console.log('✅ Token contract created');
        
        // Create transfer transaction
        const transferTransaction = transfer({
          contract: tokenContract,
          to: data.recipientAddress,
          amount: amountInWei,
        });
        
        console.log('✅ Transfer transaction prepared');
        
        // Execute transaction
        const txResult = await sendTransaction({
          transaction: transferTransaction,
          account: serverAccount,
        });
        
        console.log('✅ Transaction sent:', txResult.transactionHash);
        
        // Update database - both withdrawal record and user balance
        const { supabase } = await import('../../lib/supabase');
        const withdrawalId = `wd_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        
        // Record withdrawal
        await supabase.from('withdrawal_requests').insert({
          id: withdrawalId,
          user_wallet: data.recipientAddress,
          amount: data.amount.toString(),
          target_chain_id: targetChainId,
          token_address: targetTokenAddress,
          user_signature: 'thirdweb_sdk_direct',
          status: 'completed',
          user_transaction_hash: txResult.transactionHash,
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          metadata: {
            source: 'rewards_withdrawal',
            member_wallet: memberWalletAddress,
            withdrawal_fee: fee,
            net_amount: netAmount,
            gross_amount: data.amount,
            fee_deducted_from_amount: true,
            source_chain_id: sourceChainId,
            target_chain_id: targetChainId,
            token_address: targetTokenAddress,
          }
        });
        
        console.log('✅ Withdrawal recorded in database');
        
        // Update user balance
        const { error: updateError } = await supabase
          .from('user_balances')
          .update({
            available_balance: Math.max(0, (balance?.available_balance || 0) - data.amount),
            reward_balance: Math.max(0, (balance?.reward_balance || 0) - data.amount),
            total_withdrawn: (balance?.total_withdrawn || 0) + data.amount,
            last_updated: new Date().toISOString(),
          })
          .ilike('wallet_address', memberWalletAddress);
        
        if (updateError) {
          console.error('❌ Balance update error:', updateError);
          // Don't throw error here as withdrawal was successful
        } else {
          console.log('✅ Balance updated successfully');
        }
        
        return {
          success: true,
          transaction_hash: txResult.transactionHash,
          net_amount: netAmount,
          fee_amount: fee,
          withdrawal_id: withdrawalId,
          is_bridged: false,
        };
        
      } catch (error: any) {
        console.error('❌ Thirdweb withdrawal error:', error);
        throw new Error(`Withdrawal failed: ${error.message || 'Unknown error'}`);
      }
    },
    onSuccess: (data: any) => {
      if (data.success) {
        const fee = getWithdrawalFee(currentChainId!);
        const netAmount = parseFloat(withdrawalAmount) - fee;
        
        toast({
          title: "Withdrawal Successful! ✅",
          description: `${netAmount.toFixed(2)} USDT transferred to your wallet on ${currentChainInfo?.name} (${fee} USDT fee)`,
        });
        
        // Invalidate balance cache
        queryClient.invalidateQueries({ queryKey: ['user-balance', memberWalletAddress] });
        setStep('success');
        setWithdrawalRequest({
          withdrawalId: data.withdrawal_id || 'completed',
          amount: parseFloat(withdrawalAmount),
          amountUSD: withdrawalAmount,
          chain: currentChainInfo?.name || 'Unknown',
          recipientAddress: currentWalletAddress,
          status: 'completed',
          message: 'Withdrawal completed successfully'
        });
      }
    },
    onError: (error: any) => {
      console.error('❌ Withdrawal mutation error:', error);
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
        description: "Please switch to a supported network",
        variant: 'destructive',
      });
      return;
    }

    const fee = getWithdrawalFee(currentChainId!);
    if (!balance || amount > balance.available_balance) {
      toast({
        title: "Insufficient Balance",
        description: `You need ${amount} USDT but only have ${balance?.available_balance || 0} USDT`,
        variant: 'destructive',
      });
      return;
    }
    
    if (amount <= fee) {
      toast({
        title: "Amount Too Small",
        description: `Minimum withdrawal is ${(fee + 0.01).toFixed(2)} USDT (fee: ${fee} USDT)`,
        variant: 'destructive',
      });
      return;
    }

    // Create withdrawal request for confirmation
    setWithdrawalRequest({
      withdrawalId: '',
      amount: amount,
      amountUSD: withdrawalAmount,
      chain: currentChainInfo.name,
      recipientAddress: currentWalletAddress,
      status: 'pending',
      message: 'Ready for confirmation'
    });
    
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

    setStep('processing');
    
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
          <p className="text-muted-foreground">Loading balance...</p>
        </CardContent>
      </Card>
    );
  }

  if (balanceError) {
    return (
      <Card className="bg-secondary border-border">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-400" />
          <p className="text-red-400 mb-4">Failed to load balance</p>
          <Button onClick={() => refetchBalance()} variant="outline">
            <ArrowRight className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-secondary border-border">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-honey flex items-center gap-2">
          <DollarSign className="h-6 w-6" />
          USDT Withdrawal
        </CardTitle>
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">Withdraw your rewards to any supported blockchain</p>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Available Balance</p>
            <p className="text-lg font-semibold text-honey">
              ${balance?.available_balance?.toFixed(2) || '0.00'} USDT
            </p>
            <p className="text-xs text-muted-foreground">
              Wallet: {formatWalletAddress(memberWalletAddress)}
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
                    {currentWalletAddress ? formatWalletAddress(currentWalletAddress) : 'Not Connected'}
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="text-honey">Withdrawal Amount (USDT)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                max={balance?.available_balance?.toString() || "0"}
                placeholder="0.00"
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
                className="bg-muted border-honey/20 focus:border-honey"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Available: ${balance?.available_balance?.toFixed(2) || '0.00'} USDT</span>
                <span>Fee: {getWithdrawalFee(currentChainId || 42161)} USDT (deducted)</span>
              </div>
              {withdrawalAmount && (
                <div className="text-xs text-green-600 mt-1">
                  You'll receive: {Math.max(0, parseFloat(withdrawalAmount) - getWithdrawalFee(currentChainId || 42161)).toFixed(2)} USDT
                </div>
              )}
            </div>

            <Button
              onClick={handleInitiateWithdrawal}
              disabled={!withdrawalAmount || !currentWalletAddress || !currentChainInfo || serverWithdrawalMutation.isPending}
              className="w-full bg-honey text-black hover:bg-honey/90"
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
                <span className="text-muted-foreground">Withdrawal Amount:</span>
                <span className="font-semibold text-honey">{withdrawalRequest.amountUSD} USDT</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Withdrawal Fee (deducted):</span>
                <span className="font-semibold text-orange-400">-{getWithdrawalFee(currentChainId!)} USDT</span>
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
            </div>

            <div className="flex gap-3">
              <Button
                onClick={resetForm}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmWithdrawal}
                className="flex-1 bg-honey text-black hover:bg-honey/90"
                disabled={serverWithdrawalMutation.isPending}
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
              
              <Button
                onClick={resetForm}
                className="bg-honey text-black hover:bg-honey/90"
              >
                New Withdrawal
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}