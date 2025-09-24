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

// Safe string operations to prevent "cannot read replace/slice" errors
const safeStringSlice = (str: string | null | undefined, start: number, end?: number) => {
  if (!str || typeof str !== 'string') return '';
  try {
    return end !== undefined ? str.slice(start, end) : str.slice(start);
  } catch (error) {
    console.warn('Safe string slice failed:', error);
    return '';
  }
};

const formatWalletAddress = (address: string | null | undefined) => {
  if (!address || typeof address !== 'string') return 'Unknown';
  try {
    return `${safeStringSlice(address, 0, 6)}...${safeStringSlice(address, -4)}`;
  } catch (error) {
    console.warn('Format wallet address failed:', error);
    return 'Invalid Address';
  }
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
  const { data: balance, isLoading: balanceLoading, error: balanceError, refetch: refetchBalance } = useQuery<USDTBalance>({
    queryKey: ['user-balance', memberWalletAddress],
    enabled: !!memberWalletAddress,
    retry: 3,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      try {
        console.log(`🔍 Querying user balance for wallet: ${memberWalletAddress}`);
        
        if (!memberWalletAddress) {
          console.warn('❌ No memberWalletAddress provided');
          return {
            balance: 0,
            balanceUSD: '0.00',
            lastUpdated: new Date().toISOString(),
            error: 'No wallet address'
          };
        }
        
        const { supabase } = await import('../../lib/supabase');
      
      // First, let's check what columns actually exist
      console.log('🔍 Checking available columns...');
      const { data: schemaCheck } = await supabase
        .from('user_balances')
        .select('*')
        .limit(1);
      
      if (schemaCheck && schemaCheck[0]) {
        console.log('📊 Available columns:', Object.keys(schemaCheck[0]));
      }
      
      // Try different possible column names (put the most likely first based on curl test)
      const possibleQueries = [
        'balance, withdrawn, updated_at, wallet_address', // Most likely based on curl
        'claimable_reward_balance_usdc, total_rewards_withdrawn_usdc, updated_at, wallet_address',
        'claimable_rewards, total_withdrawn, updated_at, wallet_address', 
        'claimable_reward_balance, total_rewards_withdrawn, updated_at, wallet_address',
        '*' // Get all columns as fallback
      ];
      
      let data = null;
      let error = null;
      let usedQuery = '';
      
      for (const queryColumns of possibleQueries) {
        try {
          console.log(`🔄 Trying query with columns: ${queryColumns}`);
          const result = await supabase
            .from('user_balances')
            .select(queryColumns)
            .eq('wallet_address', memberWalletAddress!)
            .single();
          
          if (!result.error) {
            data = result.data;
            error = result.error;
            usedQuery = queryColumns;
            console.log(`✅ Query successful with: ${queryColumns}`);
            break;
          }
        } catch (queryError) {
          console.log(`❌ Query failed with: ${queryColumns}`, queryError);
          continue;
        }
      }
      
      // If no exact match, try case-insensitive with the working query
      if (error && error.code === 'PGRST116' && usedQuery) {
        console.log('🔄 Trying case-insensitive search...');
        const result = await supabase
          .from('user_balances')
          .select(usedQuery)
          .ilike('wallet_address', memberWalletAddress!)
          .single();
        data = result.data;
        error = result.error;
      }
      
      // If still no match, check if any user_balances exist at all
      if (error && error.code === 'PGRST116') {
        console.log('🔍 No balance record found, checking all user_balances...');
        const { data: allBalances } = await supabase
          .from('user_balances')
          .select('wallet_address, claimable_reward_balance_usdc')
          .limit(5);
        
        console.log('📊 Sample user_balances records:', allBalances);
        console.log(`❌ No balance record found for wallet: ${memberWalletAddress}`);
        
        return {
          balance: 0,
          balanceUSD: '0.00',
          lastUpdated: new Date().toISOString(),
          notFound: true
        };
      }
      
      if (error) {
        console.warn('Balance query error:', error);
        return {
          balance: 0,
          balanceUSD: '0.00',
          lastUpdated: new Date().toISOString(),
          error: error.message
        };
      }
      
      // Extract balance from different possible column names (prioritize 'balance' based on curl test)
      let balanceAmount = 0;
      const possibleBalanceFields = [
        'balance', // Most likely based on curl test
        'claimable_reward_balance_usdc',
        'claimable_rewards', 
        'claimable_reward_balance',
        'reward_balance'
      ];
      
      for (const field of possibleBalanceFields) {
        if (data && data[field] !== undefined && data[field] !== null) {
          balanceAmount = data[field];
          console.log(`💰 Found balance in field '${field}': ${balanceAmount} USDT`);
          break;
        }
      }
      
      console.log(`💰 Final balance: ${balanceAmount} USDT for wallet: ${data?.wallet_address}`);
      console.log(`📊 Full data object:`, data);
      
      return {
        balance: Math.round((balanceAmount || 0) * 100),
        balanceUSD: (balanceAmount || 0).toFixed(2),
        lastUpdated: data?.updated_at || data?.created_at || new Date().toISOString(),
        foundWallet: data?.wallet_address || '',
        rawData: data || {} // Include raw data for debugging
      };
      
      } catch (overallError: any) {
        console.error('❌ Overall query function error:', overallError);
        return {
          balance: 0,
          balanceUSD: '0.00',
          lastUpdated: new Date().toISOString(),
          error: `Query function error: ${overallError?.message || 'Unknown error'}`,
          rawData: {}
        };
      }
    },
  });

  // Direct thirdweb API withdrawal mutation
  const serverWithdrawalMutation = useMutation({
    mutationFn: async (data: { amount: number; recipientAddress: string }) => {
      if (!currentChainInfo) {
        throw new Error('Unsupported chain. Please switch to a supported network.');
      }
      
      const fee = getWithdrawalFee(currentChainId!);
      const netAmount = data.amount - fee;
      
      if (netAmount <= 0) {
        throw new Error(`Amount too small. Minimum withdrawal is ${fee + 0.01} USDT (including ${fee} USDT fee)`);
      }
      
      const sourceChainId = 42161; // Arbitrum One (where our USDT is held)
      const sourceTokenAddress = '0xfA278827a612BBA895e7F0A4fBA504b22ff3E7C9'; // Our Arbitrum USDT
      const targetChainId = currentChainId;
      const targetTokenAddress = getUSDTAddress(currentChainId!, selectedToken);
      
      // Check if this is same-chain transfer or cross-chain bridge
      if (sourceChainId === targetChainId) {
        // Same chain transfer - use direct thirdweb SDK
        console.log(`🔄 Direct transfer on Arbitrum One`);
        
        const { createThirdwebClient } = await import('thirdweb');
        const { privateKeyToAccount } = await import('thirdweb/wallets');
        const { getContract, sendTransaction } = await import('thirdweb');
        const { transfer } = await import('thirdweb/extensions/erc20');
        const { defineChain } = await import('thirdweb/chains');
        
        const thirdwebClient = createThirdwebClient({
          clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID!,
          secretKey: import.meta.env.VITE_THIRDWEB_SECRET_KEY!,
        });
        
        // For testing, use a fallback private key or call the server wallet function
        const serverWalletPrivateKey = import.meta.env.VITE_SERVER_WALLET_PRIVATE_KEY || 
          import.meta.env.VITE_THIRDWEB_SECRET_KEY!;
        
        if (!serverWalletPrivateKey) {
          throw new Error('Server wallet private key not configured');
        }
        
        const serverAccount = privateKeyToAccount({
          client: thirdwebClient,
          privateKey: serverWalletPrivateKey,
        });
        
        const tokenDecimals = getTokenInfo(targetChainId, selectedToken).decimals;
        const amountInWei = BigInt(Math.floor(netAmount * Math.pow(10, tokenDecimals)));
        const targetChain = defineChain(targetChainId);
        
        const tokenContract = getContract({
          client: thirdwebClient,
          chain: targetChain,
          address: targetTokenAddress,
        });
        
        // Execute user withdrawal
        const userTransferTransaction = transfer({
          contract: tokenContract,
          to: data.recipientAddress,
          amount: amountInWei,
        });
        
        const userTxResult = await sendTransaction({
          transaction: userTransferTransaction,
          account: serverAccount,
        });
        
        // Fee is already deducted from netAmount, no separate fee transfer needed
        
        var result = {
          transactionHash: userTxResult.transactionHash,
          feeTransactionHash: null, // No separate fee transaction
          bridged: false,
        };
        
      } else {
        // Cross-chain bridge using thirdweb Bridge API
        console.log(`🌉 Cross-chain bridge from Arbitrum to Chain ${targetChainId}`);
        
        const bridgeAmount = netAmount; // Bridge only the net amount (fee already deducted)
        const sourceTokenDecimals = 18; // Arbitrum USDT decimals
        const amountInWei = (bridgeAmount * Math.pow(10, sourceTokenDecimals)).toString();
        
        // Call thirdweb Bridge API
        const bridgeResponse = await fetch('https://api.thirdweb.com/v1/bridge/swap', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_THIRDWEB_SECRET_KEY}`,
          },
          body: JSON.stringify({
            fromChainId: sourceChainId.toString(),
            toChainId: targetChainId.toString(),
            fromTokenAddress: sourceTokenAddress,
            toTokenAddress: targetTokenAddress,
            fromAddress: import.meta.env.VITE_SERVER_WALLET_ADDRESS, // Server wallet as sender
            toAddress: data.recipientAddress, // User as recipient
            amount: amountInWei,
          })
        });
        
        if (!bridgeResponse.ok) {
          const error = await bridgeResponse.text();
          throw new Error(`Bridge API failed: ${error}`);
        }
        
        const bridgeData = await bridgeResponse.json();
        console.log(`✅ Bridge quote received:`, bridgeData);
        
        // Execute the bridge transaction
        if (bridgeData.transaction) {
          const { createThirdwebClient } = await import('thirdweb');
          const { privateKeyToAccount } = await import('thirdweb/wallets');
          const { sendTransaction } = await import('thirdweb');
          const { defineChain } = await import('thirdweb/chains');
          
          const thirdwebClient = createThirdwebClient({
            clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID!,
            secretKey: import.meta.env.VITE_THIRDWEB_SECRET_KEY!,
          });
          
          const serverWalletPrivateKey = import.meta.env.VITE_SERVER_WALLET_PRIVATE_KEY!;
          const serverAccount = privateKeyToAccount({
            client: thirdwebClient,
            privateKey: serverWalletPrivateKey,
          });
          
          const sourceChain = defineChain(sourceChainId);
          
          // Execute bridge transaction
          const bridgeTxResult = await sendTransaction({
            transaction: {
              to: bridgeData.transaction.to,
              data: bridgeData.transaction.data,
              value: BigInt(bridgeData.transaction.value || '0'),
              chain: sourceChain,
              client: thirdwebClient,
            },
            account: serverAccount,
          });
          
          var result = {
            transactionHash: bridgeTxResult.transactionHash,
            feeTransactionHash: null, // Fee is handled within bridge
            bridged: true,
            bridgeQuote: bridgeData,
          };
        } else {
          throw new Error('Bridge transaction data not provided');
        }
      }
      
      // Record withdrawal in database
      const { supabase } = await import('../../lib/supabase');
      const withdrawalId = `wd_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      
      await supabase.from('withdrawal_requests').insert({
        id: withdrawalId,
        user_wallet: data.recipientAddress,
        amount: data.amount.toString(),
        target_chain_id: targetChainId,
        token_address: targetTokenAddress,
        user_signature: result.bridged ? 'thirdweb_bridge_api' : 'thirdweb_sdk_direct',
        status: 'completed',
        user_transaction_hash: result.transactionHash,
        fee_transaction_hash: result.feeTransactionHash,
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        metadata: {
          source: 'rewards_withdrawal',
          member_wallet: memberWalletAddress,
          withdrawal_fee: fee,
          net_amount: netAmount,
          gross_amount: data.amount, // Original amount before fee deduction
          fee_deducted_from_amount: true, // Indicates fee was deducted, not transferred separately
          source_chain_id: sourceChainId,
          target_chain_id: targetChainId,
          source_token_address: sourceTokenAddress,
          target_token_address: targetTokenAddress,
          is_cross_chain: result.bridged,
          withdrawal_method: result.bridged ? 'thirdweb_bridge_api' : 'thirdweb_sdk_direct',
          bridge_quote: result.bridgeQuote || null,
        }
      });
      
      // Update user balance - try different column names
      const { data: currentBalance } = await supabase
        .from('user_balances')
        .select('*')
        .ilike('wallet_address', memberWalletAddress!)
        .single();
      
      if (currentBalance) {
        // Find the correct balance field
        let currentClaimable = 0;
        let currentWithdrawn = 0;
        let claimableField = 'claimable_reward_balance_usdc';
        let withdrawnField = 'total_rewards_withdrawn_usdc';
        
        const balanceFields = [
          { claimable: 'balance', withdrawn: 'withdrawn' }, // Most likely based on curl test
          { claimable: 'claimable_reward_balance_usdc', withdrawn: 'total_rewards_withdrawn_usdc' },
          { claimable: 'claimable_rewards', withdrawn: 'total_withdrawn' },
          { claimable: 'claimable_reward_balance', withdrawn: 'total_rewards_withdrawn' }
        ];
        
        for (const fields of balanceFields) {
          if (currentBalance[fields.claimable] !== undefined) {
            currentClaimable = currentBalance[fields.claimable] || 0;
            currentWithdrawn = currentBalance[fields.withdrawn] || 0;
            claimableField = fields.claimable;
            withdrawnField = fields.withdrawn;
            break;
          }
        }
        
        console.log(`📊 Current balance - ${claimableField}: ${currentClaimable}, ${withdrawnField}: ${currentWithdrawn}`);
        
        const updateData = {
          [claimableField]: Math.max(0, currentClaimable - data.amount),
          [withdrawnField]: currentWithdrawn + data.amount,
          last_withdrawal_at: new Date().toISOString(),
        };
        
        await supabase
          .from('user_balances')
          .update(updateData)
          .ilike('wallet_address', memberWalletAddress!);
          
        console.log(`✅ Balance updated:`, updateData);
      }
      
      return {
        success: true,
        transaction_hash: result.transactionHash,
        fee_transaction_hash: result.feeTransactionHash,
        net_amount: netAmount,
        fee_amount: fee,
        withdrawal_id: withdrawalId,
        is_bridged: result.bridged,
        bridge_quote: result.bridgeQuote
      };
    },
    onSuccess: (data: any) => {
      if (data.success) {
        const fee = getWithdrawalFee(currentChainId!);
        const netAmount = parseFloat(withdrawalAmount) - fee;
        const method = data.is_bridged ? 'bridged' : 'transferred';
        const networkInfo = data.is_bridged ? 
          `cross-chain bridge to ${currentChainInfo?.name}` : 
          `direct transfer on ${currentChainInfo?.name}`;
          
        toast({
          title: `Withdrawal Successful! ${data.is_bridged ? '🌉' : '✅'}`,
          description: `${netAmount.toFixed(2)} USDT ${method} to your wallet via ${networkInfo} (${fee} USDT fee)`,
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
    if (!balance || amount > parseFloat(balance.balanceUSD)) {
      toast({
        title: "Insufficient Balance",
        description: `You need ${amount} USDT but only have ${balance?.balanceUSD || '0'} USDT`,
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
    if (!balance || amount > parseFloat(balance.balanceUSD)) {
      toast({
        title: "Insufficient Balance", 
        description: `You need ${amount} USDT but only have ${balance?.balanceUSD || '0'} USDT`,
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

  // Add comprehensive error handling for the component render
  try {
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
            {balanceLoading && (
              <p className="text-xs text-muted-foreground">Loading balance...</p>
            )}
            {!balanceLoading && memberWalletAddress && (
              <p className="text-xs text-muted-foreground">
                Wallet: {formatWalletAddress(memberWalletAddress)}
              </p>
            )}
            {!memberWalletAddress && (
              <p className="text-xs text-red-400">No wallet address found</p>
            )}
            {balanceError && (
              <div className="text-xs text-red-400 flex items-center gap-2">
                <span>Balance query failed</span>
                <button 
                  onClick={() => refetchBalance()} 
                  className="underline hover:no-underline"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-800/50 rounded-lg p-3 text-xs">
            <h4 className="font-semibold mb-2 text-gray-300">Debug Info:</h4>
            <div className="space-y-1 text-gray-400">
              <p>userData?.wallet_address: {userData?.wallet_address || 'null'}</p>
              <p>account?.address: {account?.address || 'null'}</p>
              <p>memberWalletAddress: {memberWalletAddress || 'null'}</p>
              <p>balance query enabled: {!!memberWalletAddress ? 'true' : 'false'}</p>
              <p>balanceLoading: {balanceLoading ? 'true' : 'false'}</p>
              <p>balance?.balanceUSD: {balance?.balanceUSD || 'null'}</p>
              {balance?.notFound && <p className="text-red-400">❌ No balance record found in database</p>}
              {balance?.foundWallet && <p className="text-green-400">✅ Found wallet: {balance.foundWallet}</p>}
              {balance?.error && <p className="text-red-400">❌ Query error: {balance.error}</p>}
              {balance?.rawData && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-blue-400">Raw Database Data</summary>
                  <pre className="mt-1 p-2 bg-black/50 rounded text-xs overflow-x-auto">
                    {JSON.stringify(balance.rawData || {}, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        )}
        
        {/* No balance record found - offer to create one */}
        {balance?.notFound && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-yellow-400 mt-1">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-yellow-400 mb-1">No Balance Record Found</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Your wallet address ({formatWalletAddress(memberWalletAddress)}) doesn't have a balance record in our system yet.
                </p>
                <button
                  onClick={async () => {
                    const { supabase } = await import('../../lib/supabase');
                    try {
                      // Create test balance record using correct column structure
                      const insertData = {
                        wallet_address: memberWalletAddress,
                        available_balance: 0,
                        reward_balance: 100,
                        total_withdrawn: 0,
                        updated_at: new Date().toISOString()
                      };
                      
                      const { error: insertError } = await supabase
                        .from('user_balances')
                        .insert(insertData);
                      
                      if (insertError) {
                        throw insertError;
                      }
                      
                      console.log('✅ Test balance record created:', insertData);
                      refetchBalance();
                      toast({
                        title: "Test Record Created",
                        description: "Created a test balance record with 100 USDT",
                      });
                    } catch (error) {
                      console.error('Create balance error:', error);
                      toast({
                        title: "Error",
                        description: "Failed to create balance record",
                        variant: 'destructive',
                      });
                    }
                  }}
                  className="px-3 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30 transition-colors"
                >
                  Create Test Balance (100 USDT)
                </button>
                <button
                  onClick={async () => {
                    try {
                      // Test direct API call like the curl command
                      const response = await fetch(`https://cvqibjcbfrwsgkvthccp.supabase.co/rest/v1/user_balances?select=available_balance,reward_balance,total_withdrawn,updated_at,wallet_address&wallet_address=eq.${memberWalletAddress}`, {
                        headers: {
                          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
                          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`,
                        }
                      });
                      const data = await response.json();
                      console.log('🔍 Direct API test result:', data);
                      toast({
                        title: "API Test Complete",
                        description: `Found ${data?.length || 0} records. Check console for details.`,
                      });
                    } catch (error) {
                      console.error('❌ Direct API test failed:', error);
                      toast({
                        title: "API Test Failed",
                        description: "Check console for error details",
                        variant: 'destructive',
                      });
                    }
                  }}
                  className="ml-2 px-3 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors"
                >
                  Test Direct API
                </button>
              </div>
            </div>
          </div>
        )}
        
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
                <span>Fee: {getWithdrawalFee(currentChainId || 42161)} USDT (deducted)</span>
              </div>
              {withdrawalAmount && (
                <div className="text-xs text-green-600 mt-1">
                  You'll receive: {Math.max(0, parseFloat(withdrawalAmount) - getWithdrawalFee(currentChainId || 42161)).toFixed(2)} USDT
                </div>
              )}
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-blue-400 mt-1">
                  <Link className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-blue-400 mb-1">
                    {currentChainId === 42161 ? 'Direct Transfer' : 'Thirdweb Bridge'}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {currentChainId === 42161 
                      ? 'Direct transfer from our Arbitrum server wallet to your wallet using your custom USDT token.' 
                      : `Cross-chain bridge from Arbitrum to ${currentChainInfo?.name} using thirdweb Bridge API. Your custom USDT will be automatically converted to standard USDT on ${currentChainInfo?.name}.`}
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
                <span className="text-muted-foreground">Withdrawal Request:</span>
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
                A withdrawal fee of {getWithdrawalFee(currentChainId || 42161)} USDT will be deducted from your withdrawal amount. You will receive the net amount after the fee deduction. Different networks have different fees.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
  
  } catch (renderError: any) {
    console.error('❌ USDTWithdrawal component render error:', renderError);
    return (
      <Card className="bg-secondary border-border">
        <CardContent className="p-6 text-center">
          <div className="text-red-400 mb-4">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <h3 className="text-lg font-semibold">Component Error</h3>
            <p className="text-sm text-muted-foreground mt-2">
              An error occurred while rendering the withdrawal component.
            </p>
            <details className="mt-3 text-xs text-left">
              <summary className="cursor-pointer">Error Details</summary>
              <pre className="mt-2 p-2 bg-black/50 rounded overflow-x-auto">
                {renderError?.message || 'Unknown error'}
              </pre>
            </details>
            <Button 
              onClick={() => window.location.reload()} 
              className="mt-4 bg-honey text-black hover:bg-honey/90"
            >
              Reload Page
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
}
