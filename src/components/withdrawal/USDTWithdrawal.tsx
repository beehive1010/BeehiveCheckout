import {useState} from 'react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useToast} from '@/hooks/use-toast';
import {useActiveAccount, useActiveWalletChain} from 'thirdweb/react';
import {useWallet} from '@/hooks/useWallet';
import {useIsMobile} from '@/hooks/use-mobile';
import {AlertTriangle, ArrowRight, CheckCircle, DollarSign, Link, Loader2, Wallet} from 'lucide-react';
import {Badge} from '@/components/ui/badge';
import {Alert, AlertDescription} from '@/components/ui/alert';

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

// Helper function to get token address and info for a chain with error handling
const getTokenInfo = (chainId: number, tokenType: 'usdt' | 'testUSDT' = 'usdt') => {
  try {
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
  } catch (error) {
    console.warn('Error getting token info:', error);
    // Fallback to Arbitrum USDT
    return TOKEN_ADDRESSES[42161].usdt;
  }
};

// Helper function to safely calculate amounts with proper decimal precision
const calculateAmountWithDecimals = (amount: number, decimals: number): string => {
  try {
    // Use BigInt for precise calculation to avoid floating point errors
    const factor = BigInt(10) ** BigInt(decimals);
    const amountBigInt = BigInt(Math.floor(amount * 1000000)) * factor / BigInt(1000000);
    return amountBigInt.toString();
  } catch (error) {
    console.warn('Decimal calculation error:', error);
    // Fallback to simple multiplication
    return (amount * Math.pow(10, decimals)).toString();
  }
};

// Environment variable validation with fallbacks
const getEnvVar = (key: string, fallback: string = '') => {
  const value = import.meta.env[key];
  if (!value && !fallback) {
    console.warn(`Missing environment variable: ${key}`);
  }
  return value || fallback;
};

// 示例：构建批量转账请求体的辅助函数
const buildBatchTransferRequest = (
  fromWallet: string, 
  chainId: number, 
  recipients: Array<{address: string, quantity: string}>,
  tokenAddress?: string
) => {
  return {
    from: fromWallet,           // 钱包地址
    chainId: chainId,          // 区块链ID，如 42161 (Arbitrum)
    recipients: recipients,     // 多个接收者数组
    ...(tokenAddress && { tokenAddress }) // 代币合约地址（可选，不填则为原生代币）
  };
};

// 示例用法：
// const batchRequest = buildBatchTransferRequest(
//   "0x服务器钱包地址",
//   42161,
//   [
//     { address: "0x接收者1地址", quantity: "1000000000000000000" },  // 1 USDT (18 decimals)
//     { address: "0x接收者2地址", quantity: "2000000000000000000" }   // 2 USDT (18 decimals)
//   ],
//   "0xfA278827a612BBA895e7F0A4fBA504b22ff3E7C9"  // Arbitrum USDT 合约地址
// );

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
  const isMobile = useIsMobile();
  
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

  // Get user USDT balance using the same balance API as other components
  const { data: balance, isLoading: balanceLoading, error: balanceError, refetch: refetchBalance } = useQuery<USDTBalance>({
    queryKey: ['user-balance', memberWalletAddress],
    enabled: !!memberWalletAddress,
    retry: 3,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      try {
        console.log(`🔍 Querying user balance via balance API for wallet: ${memberWalletAddress}`);
        
        if (!memberWalletAddress) {
          console.warn('❌ No memberWalletAddress provided');
          return {
            balance: 0,
            balanceUSD: '0.00',
            lastUpdated: new Date().toISOString(),
            error: 'No wallet address'
          };
        }
        
        const supabaseUrl = getEnvVar('VITE_SUPABASE_URL', 'https://cvqibjcbfrwsgkvthccp.supabase.co');
        const anonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');
        
        if (!anonKey) {
          throw new Error('Missing Supabase anonymous key');
        }
        
        // Use the same balance Edge Function as other components
        const response = await fetch(`${supabaseUrl}/functions/v1/balance`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${anonKey}`,
            'apikey': anonKey,
            'Content-Type': 'application/json',
            'x-wallet-address': memberWalletAddress,
          },
          body: JSON.stringify({
            action: 'get-balance'
          }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.warn('Balance API error:', errorText);
          return {
            balance: 0,
            balanceUSD: '0.00',
            lastUpdated: new Date().toISOString(),
            error: `Balance API error: ${response.status} ${errorText}`
          };
        }
        
        const result = await response.json();
        console.log(`🔍 Balance API result:`, result);
        
        if (!result.success) {
          if (result.balance && !result.isRegistered) {
            console.log(`📝 User not registered, using default balance`);
            return {
              balance: 0,
              balanceUSD: '0.00',
              lastUpdated: new Date().toISOString(),
              notFound: true,
              isRegistered: false
            };
          }
          
          console.warn('Balance API returned error:', result.error);
          return {
            balance: 0,
            balanceUSD: '0.00',
            lastUpdated: new Date().toISOString(),
            error: result.error || 'Balance query failed'
          };
        }
        
        // Use reward_balance from the balance API response
        const balanceData = result.balance;
        const balanceAmount = balanceData?.reward_balance || 0;
        console.log(`💰 Claimable balance from API: ${balanceAmount} USDT for wallet: ${balanceData?.wallet_address}`);
        console.log(`📊 Full balance data from API:`, balanceData);
        
        return {
          balance: Math.round((balanceAmount || 0) * 100),
          balanceUSD: (balanceAmount || 0).toFixed(2),
          lastUpdated: balanceData?.last_updated || new Date().toISOString(),
          foundWallet: balanceData?.wallet_address || '',
          rawData: balanceData || {},
          isRegistered: result.isRegistered !== false
        };
      
      } catch (overallError: any) {
        console.error('❌ Balance API call error:', overallError);
        return {
          balance: 0,
          balanceUSD: '0.00',
          lastUpdated: new Date().toISOString(),
          error: `Balance API call error: ${overallError?.message || 'Unknown error'}`,
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
      
      const supabaseUrl = getEnvVar('VITE_SUPABASE_URL', 'https://cvqibjcbfrwsgkvthccp.supabase.co');
      const anonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');
      
      if (!anonKey) {
        throw new Error('Missing Supabase anonymous key');
      }
      
      const sourceChainId = 42161; // Arbitrum One (where our USDT is held)
      const targetChainId = currentChainId;
      const targetTokenInfo = getTokenInfo(targetChainId!, selectedToken);
      
      // Calculate amount with proper decimals
      const amountInWei = calculateAmountWithDecimals(netAmount, targetTokenInfo.decimals);
      
      // Get environment variables
      const thirdwebSecretKey = getEnvVar('VITE_THIRDWEB_SECRET_KEY');
      const serverWalletAddress = getEnvVar('VITE_SERVER_WALLET_ADDRESS');
      
      if (!thirdwebSecretKey || !serverWalletAddress) {
        throw new Error('Missing thirdweb configuration');
      }
      
      let transactionHash: string;
      let isBridged = false;
      
      // Check if this is same-chain transfer or cross-chain bridge
      if (sourceChainId === targetChainId) {
        // Direct transfer using thirdweb wallets API
        console.log('🔄 Direct transfer using thirdweb wallets/send API');
        
        // 构建 thirdweb API 请求体，使用您指定的格式
        const requestBody = {
          from: serverWalletAddress,     // 钱包地址
          chainId: targetChainId,        // 区块链ID，如 42161 (Arbitrum)
          recipients: [{
            address: data.recipientAddress,  // 接收地址
            quantity: amountInWei           // 数量
          }],
          tokenAddress: targetTokenInfo.address  // 代币合约地址
        };
        
        console.log('🔄 发送 thirdweb API 请求:', JSON.stringify(requestBody, null, 2));
        
        const walletResponse = await fetch('https://api.thirdweb.com/v1/wallets/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-secret-key': thirdwebSecretKey,
          },
          body: JSON.stringify(requestBody)
        });

        if (!walletResponse.ok) {
          const errorText = await walletResponse.text();
          throw new Error(`Thirdweb API failed: ${walletResponse.status} ${errorText}`);
        }

        const walletData = await walletResponse.json();
        
        if (!walletData.result) {
          throw new Error(`Thirdweb API error: ${walletData.error || 'No result returned'}`);
        }

        transactionHash = walletData.result.transactionHash || walletData.result.txHash;
        
      } else {
        // Cross-chain bridge would need additional implementation
        throw new Error('Cross-chain bridging not yet implemented. Please use same-chain transfers.');
      }
      
      // Record withdrawal request in database for webhook tracking
      const withdrawalId = `wd_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      
      try {
        // Create withdrawal request record
        const recordResponse = await fetch(`${supabaseUrl}/rest/v1/withdrawal_requests`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${anonKey}`,
            'apikey': anonKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            id: withdrawalId,
            user_wallet: data.recipientAddress,
            amount: data.amount.toString(),
            target_chain_id: targetChainId,
            token_address: targetTokenInfo.address,
            user_signature: 'thirdweb_direct_api',
            status: 'processing', // Will be updated by webhook
            user_transaction_hash: transactionHash,
            created_at: new Date().toISOString(),
            metadata: {
              source: 'rewards_withdrawal',
              member_wallet: memberWalletAddress,
              withdrawal_fee: fee,
              net_amount: netAmount,
              gross_amount: data.amount,
              fee_deducted_from_amount: true,
              source_chain_id: sourceChainId,
              target_chain_id: targetChainId,
              source_token_address: '0xfA278827a612BBA895e7F0A4fBA504b22ff3E7C9',
              target_token_address: targetTokenInfo.address,
              is_cross_chain: isBridged,
              withdrawal_method: 'thirdweb_direct_api',
              api_request_body: {
                from: serverWalletAddress,
                chainId: targetChainId,
                recipients: [{ address: data.recipientAddress, quantity: amountInWei }],
                tokenAddress: targetTokenInfo.address
              }
            }
          })
        });
        
        if (recordResponse.ok) {
          console.log('✅ Withdrawal request recorded for webhook tracking');
        } else {
          console.warn('⚠️ Failed to record withdrawal request, but transaction succeeded');
        }
        
        // Update user balance
        const balanceUpdateResponse = await fetch(`${supabaseUrl}/functions/v1/balance`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${anonKey}`,
            'apikey': anonKey,
            'Content-Type': 'application/json',
            'x-wallet-address': memberWalletAddress!,
          },
          body: JSON.stringify({
            action: 'update-balance',
            amount: -data.amount, // Negative amount for withdrawal
            transaction_type: 'withdrawal',
            description: `USDT withdrawal to ${data.recipientAddress}`,
            reference: withdrawalId
          }),
        });
        
        if (balanceUpdateResponse.ok) {
          console.log('✅ Balance updated via API');
        } else {
          console.warn('⚠️ Balance update failed, but withdrawal succeeded');
        }
        
      } catch (recordError) {
        console.warn('Error recording withdrawal:', recordError);
      }

      return {
        success: true,
        transaction_hash: transactionHash,
        net_amount: netAmount,
        fee_amount: fee,
        is_bridged: isBridged,
        withdrawal_method: 'thirdweb_direct_api'
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
        <Card className="bg-gradient-to-br from-secondary/60 to-secondary border-border shadow-lg">
          <CardContent className={`text-center ${isMobile ? 'p-4' : 'p-6'}`}>
            <div className="bg-gradient-to-br from-honey/20 to-amber-500/20 rounded-full p-4 w-fit mx-auto mb-4 animate-pulse">
              <Loader2 className={`animate-spin text-honey ${isMobile ? 'h-6 w-6' : 'h-8 w-8'}`} />
            </div>
            <p className={`text-muted-foreground ${isMobile ? 'text-sm' : 'text-base'}`}>Loading USDT balance...</p>
          </CardContent>
        </Card>
      );
    }

  return (
    <Card className="bg-gradient-to-br from-secondary/60 to-secondary border-border shadow-xl hover:shadow-2xl transition-all duration-300">
      <CardHeader className={isMobile ? 'p-4' : 'p-6'}>
        <CardTitle className={`font-bold text-transparent bg-gradient-to-r from-honey to-amber-400 bg-clip-text flex items-center gap-2 ${isMobile ? 'text-lg' : 'text-xl'}`}>
          <div className="bg-gradient-to-br from-honey/20 to-amber-500/20 p-2 rounded-lg">
            <DollarSign className={`text-honey ${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} />
          </div>
          {isMobile ? 'Rewards Withdrawal' : 'Claimable Rewards Withdrawal'}
        </CardTitle>
        <div className={`${isMobile ? 'space-y-3' : 'flex items-center justify-between'}`}>
          <p className={`text-muted-foreground ${isMobile ? 'text-sm' : 'text-base'}`}>
            {isMobile ? 'Withdraw rewards to any supported blockchain' : 'Withdraw your claimable rewards to any supported blockchain'}
          </p>
          <div className={`${isMobile ? 'bg-gradient-to-r from-honey/10 to-amber-500/10 rounded-lg p-3 border border-honey/20' : 'text-right'}`}>
            <p className={`text-muted-foreground ${isMobile ? 'text-xs mb-1' : 'text-sm'}`}>Reward Balance</p>
            <p className={`font-bold text-transparent bg-gradient-to-r from-honey to-amber-400 bg-clip-text ${isMobile ? 'text-xl' : 'text-2xl'}`}>
              ${balance?.balanceUSD || '0.00'} USDT
            </p>
            {balanceLoading && (
              <div className={`flex items-center gap-2 text-muted-foreground ${isMobile ? 'text-xs justify-center' : 'text-xs'}`}>
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading balance...
              </div>
            )}
            {!balanceLoading && memberWalletAddress && (
              <p className={`text-muted-foreground ${isMobile ? 'text-xs text-center' : 'text-xs'}`}>
                Wallet: {formatWalletAddress(memberWalletAddress)}
              </p>
            )}
            {!memberWalletAddress && (
              <p className={`text-red-400 ${isMobile ? 'text-xs text-center' : 'text-xs'}`}>No wallet address found</p>
            )}
            {balanceError && (
              <div className={`text-red-400 flex items-center gap-2 ${isMobile ? 'text-xs justify-center flex-wrap' : 'text-xs'}`}>
                <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                <span>Balance query failed</span>
                <button 
                  onClick={() => refetchBalance()} 
                  className="underline hover:no-underline text-blue-400"
                >
                  Retry
                </button>
              </div>
            )}
            {balance && !balanceLoading && !balanceError && (
              <div className={`text-green-400 ${isMobile ? 'mt-1 text-xs text-center' : 'mt-1 text-xs'}`}>
                ✓ Balance loaded successfully
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className={`${isMobile ? 'p-4 space-y-4' : 'p-6 space-y-6'}`}>
        
        {/* No balance record found - show user registration status */}
        {(balance?.notFound || balance?.isRegistered === false) && (
          <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-xl p-4 shadow-lg">
            <div className={`flex items-start ${isMobile ? 'gap-2' : 'gap-3'}`}>
              <div className="text-yellow-400 mt-1 bg-yellow-500/20 p-1 rounded-lg">
                <svg className={`fill-current ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className={`font-medium text-yellow-400 mb-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  {balance?.isRegistered === false ? 'User Not Registered' : 'No Balance Record Found'}
                </h4>
                <p className={`text-muted-foreground mb-3 ${isMobile ? 'text-xs leading-relaxed' : 'text-xs'}`}>
                  {balance?.isRegistered === false 
                    ? `Your wallet address (${formatWalletAddress(memberWalletAddress)}) is not registered in our system yet. You need to register and activate membership to have reward balances.`
                    : `Your wallet address (${formatWalletAddress(memberWalletAddress)}) doesn't have a balance record in our system yet.`
                  }
                </p>
                <button
                  onClick={() => refetchBalance()}
                  className={`bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-400 rounded-lg hover:from-blue-500/30 hover:to-blue-600/30 transition-all duration-200 shadow-md hover:shadow-lg ${isMobile ? 'px-2 py-1 text-xs' : 'px-3 py-1 text-xs'}`}
                >
                  Refresh Balance
                </button>
              </div>
            </div>
          </div>
        )}
        
        {step === 'form' && (
          <>
            {/* Current Wallet & Chain Info */}
            <div className="bg-gradient-to-r from-muted/30 to-muted/20 rounded-xl p-4 space-y-3 border border-muted/30 shadow-lg">
              <h4 className={`font-semibold text-transparent bg-gradient-to-r from-honey to-amber-400 bg-clip-text flex items-center gap-2 ${isMobile ? 'text-sm' : 'text-base'}`}>
                <div className="bg-gradient-to-br from-honey/20 to-amber-500/20 p-1 rounded-lg">
                  <Wallet className={`text-honey ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                </div>
                {isMobile ? 'Wallet Info' : 'Connected Wallet Information'}
              </h4>
              
              <div className="space-y-3">
                <div className={`${isMobile ? 'space-y-1' : 'flex justify-between items-center'}`}>
                  <span className={`text-muted-foreground ${isMobile ? 'text-xs block' : 'text-sm'}`}>Wallet Address:</span>
                  <span className={`font-mono bg-gradient-to-r from-muted to-muted/70 px-2 py-1 rounded-lg border border-muted/50 ${isMobile ? 'text-xs block mt-1' : 'text-xs'}`}>
                    {currentWalletAddress ? formatWalletAddress(currentWalletAddress) : 'Not Connected'}
                  </span>
                </div>
                
                <div className={`${isMobile ? 'space-y-1' : 'flex justify-between items-center'}`}>
                  <span className={`text-muted-foreground ${isMobile ? 'text-xs block' : 'text-sm'}`}>Current Network:</span>
                  {currentChainInfo ? (
                    <div className={`flex items-center gap-2 ${isMobile ? 'mt-1 flex-wrap' : ''}`}>
                      <span className={isMobile ? 'text-lg' : 'text-base'}>{currentChainInfo.icon}</span>
                      <span className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>{currentChainInfo.name}</span>
                      <Badge className={`${currentChainInfo.color} ${isMobile ? 'text-xs px-1 py-0' : 'text-xs'}`}>{currentChainInfo.symbol}</Badge>
                      {currentChainInfo.testnet && (
                        <Badge variant="outline" className={`text-orange-500 border-orange-500 ${isMobile ? 'text-xs px-1 py-0' : 'text-xs'}`}>
                          TESTNET
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <Badge variant="destructive" className={isMobile ? 'text-xs px-1 py-0 mt-1' : 'text-xs'}>Unsupported Chain</Badge>
                  )}
                </div>
              </div>
              
              {!currentChainInfo && (
                <Alert className="border-red-500/30 bg-red-500/10">
                  <AlertTriangle className={`text-red-400 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                  <AlertDescription className={`text-red-300 ${isMobile ? 'text-xs leading-relaxed' : 'text-sm'}`}>
                    Please switch to a supported network: Ethereum, Polygon, Arbitrum One, Arbitrum Sepolia (testnet), Optimism, BSC, or Base
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Token Selection for Arbitrum */}
              {currentChainId === 42161 && (
                <div className="space-y-3">
                  <Label className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>Select Token to Withdraw:</Label>
                  <div className={`${isMobile ? 'flex flex-col gap-2' : 'flex gap-2'}`}>
                    <Button
                      variant={selectedToken === 'usdt' ? 'default' : 'outline'}
                      size={isMobile ? 'sm' : 'sm'}
                      onClick={() => setSelectedToken('usdt')}
                      className={`transition-all duration-200 ${selectedToken === 'usdt' ? 'bg-gradient-to-r from-honey to-amber-400 text-black shadow-lg hover:shadow-xl' : 'hover:bg-honey/10 hover:border-honey/50'} ${isMobile ? 'text-xs py-2' : ''}`}
                    >
                      USDT {isMobile ? '(Std)' : '(Standard)'}
                    </Button>
                    <Button
                      variant={selectedToken === 'testUSDT' ? 'default' : 'outline'}
                      size={isMobile ? 'sm' : 'sm'}
                      onClick={() => setSelectedToken('testUSDT')}
                      className={`transition-all duration-200 ${selectedToken === 'testUSDT' ? 'bg-gradient-to-r from-honey to-amber-400 text-black shadow-lg hover:shadow-xl' : 'hover:bg-honey/10 hover:border-honey/50'} ${isMobile ? 'text-xs py-2' : ''}`}
                    >
                      TEST-USDT {isMobile ? '(Custom)' : '(Custom)'}
                    </Button>
                  </div>
                  <p className={`text-muted-foreground ${isMobile ? 'text-xs leading-relaxed' : 'text-xs'}`}>
                    {selectedToken === 'usdt' 
                      ? 'Standard USDT token on Arbitrum One' 
                      : 'Your custom TEST-USDT token on Arbitrum One'}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="amount" className={`text-transparent bg-gradient-to-r from-honey to-amber-400 bg-clip-text font-medium ${isMobile ? 'text-sm' : 'text-base'}`}>Withdrawal Amount (USDT)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                max={balance?.balanceUSD || "0"}
                placeholder="0.00"
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
                className={`bg-gradient-to-r from-muted/50 to-muted/30 border-honey/30 focus:border-honey focus:ring-honey/20 focus:ring-2 transition-all duration-200 shadow-md ${isMobile ? 'text-sm py-3' : 'text-base'}`}
                data-testid="input-withdrawal-amount"
              />
              <div className={`${isMobile ? 'space-y-1' : 'flex justify-between'} text-muted-foreground ${isMobile ? 'text-xs' : 'text-xs'}`}>
                <span className={isMobile ? 'block' : ''}>Available: ${balance?.balanceUSD || '0.00'} USDT</span>
                <span className={isMobile ? 'block text-orange-400' : 'text-orange-400'}>Fee: {getWithdrawalFee(currentChainId || 42161)} USDT (deducted)</span>
              </div>
              {withdrawalAmount && (
                <div className={`text-green-400 font-medium bg-green-500/10 px-3 py-2 rounded-lg border border-green-500/20 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  💰 You'll receive: {Math.max(0, parseFloat(withdrawalAmount) - getWithdrawalFee(currentChainId || 42161)).toFixed(2)} USDT
                </div>
              )}
            </div>

            <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl p-4 shadow-lg">
              <div className={`flex items-start ${isMobile ? 'gap-2' : 'gap-3'}`}>
                <div className="text-blue-400 mt-1 bg-blue-500/20 p-1 rounded-lg">
                  <Link className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                </div>
                <div className="flex-1">
                  <h4 className={`font-medium text-blue-400 mb-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    {currentChainId === 42161 ? '⚡ Direct Transfer' : '🌉 Thirdweb Bridge'}
                  </h4>
                  <p className={`text-muted-foreground ${isMobile ? 'text-xs leading-relaxed' : 'text-xs'}`}>
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
              className={`w-full bg-gradient-to-r from-honey to-amber-400 text-black hover:from-honey/90 hover:to-amber-400/90 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold ${isMobile ? 'py-3 text-sm' : 'py-2 text-base'}`}
              data-testid="button-initiate-withdrawal"
            >
              {serverWithdrawalMutation.isPending ? (
                <>
                  <Loader2 className={`animate-spin mr-2 ${isMobile ? 'h-4 w-4' : 'h-4 w-4'}`} />
                  {isMobile ? 'Preparing...' : 'Preparing Withdrawal...'}
                </>
              ) : (
                <>
                  <ArrowRight className={`mr-2 ${isMobile ? 'h-4 w-4' : 'h-4 w-4'}`} />
                  {isMobile ? 'Initiate' : 'Initiate Withdrawal'}
                </>
              )}
            </Button>
          </>
        )}

        {step === 'confirm' && withdrawalRequest && (
          <div className={isMobile ? 'space-y-3' : 'space-y-4'}>
            <Alert className="border-orange-500/30 bg-orange-500/10">
              <AlertTriangle className={`text-orange-400 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
              <AlertDescription className={`text-orange-300 ${isMobile ? 'text-xs leading-relaxed' : 'text-sm'}`}>
                Please review your withdrawal details carefully. This action cannot be undone.
              </AlertDescription>
            </Alert>

            <div className="bg-gradient-to-br from-muted/40 to-muted/20 rounded-xl p-4 space-y-3 border border-muted/30 shadow-lg">
              <div className={`${isMobile ? 'space-y-1' : 'flex justify-between items-center'}`}>
                <span className={`text-muted-foreground ${isMobile ? 'text-xs block' : 'text-sm'}`}>Withdrawal Request:</span>
                <span className={`font-semibold text-transparent bg-gradient-to-r from-honey to-amber-400 bg-clip-text ${isMobile ? 'text-sm block' : 'text-base'}`}>{withdrawalRequest.amountUSD} USDT</span>
              </div>
              <div className={`${isMobile ? 'space-y-1' : 'flex justify-between items-center'}`}>
                <span className={`text-muted-foreground ${isMobile ? 'text-xs block' : 'text-sm'}`}>Withdrawal Fee (deducted):</span>
                <span className={`font-semibold text-orange-400 ${isMobile ? 'text-sm block' : 'text-base'}`}>-{getWithdrawalFee(currentChainId!)} USDT</span>
              </div>
              <div className={`border-t border-border pt-2 ${isMobile ? 'space-y-1' : 'flex justify-between items-center'}`}>
                <span className={`text-muted-foreground ${isMobile ? 'text-xs block' : 'text-sm'}`}>You'll Receive:</span>
                <span className={`font-semibold text-green-400 ${isMobile ? 'text-sm block' : 'text-base'}`}>{(parseFloat(withdrawalRequest.amountUSD) - getWithdrawalFee(currentChainId!)).toFixed(2)} USDT</span>
              </div>
              <div className={`${isMobile ? 'space-y-1' : 'flex justify-between items-center'}`}>
                <span className={`text-muted-foreground ${isMobile ? 'text-xs block' : 'text-sm'}`}>To Network:</span>
                <div className={`flex items-center gap-2 ${isMobile ? 'flex-wrap' : ''}`}>
                  <span className={isMobile ? 'text-lg' : 'text-base'}>{currentChainInfo?.icon}</span>
                  <span className={isMobile ? 'text-xs' : 'text-sm'}>{currentChainInfo?.name}</span>
                  <Badge className={`${currentChainInfo?.color} ${isMobile ? 'text-xs px-1 py-0' : 'text-xs'}`}>{currentChainInfo?.symbol}</Badge>
                </div>
              </div>
              {currentChainId === 42161 && (
                <div className={`${isMobile ? 'space-y-1' : 'flex justify-between items-center'}`}>
                  <span className={`text-muted-foreground ${isMobile ? 'text-xs block' : 'text-sm'}`}>Token:</span>
                  <div className={`flex items-center gap-2 ${isMobile ? 'flex-wrap' : ''}`}>
                    <span className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>{getTokenInfo(currentChainId, selectedToken).symbol}</span>
                    <Badge variant="outline" className={isMobile ? 'text-xs px-1 py-0' : 'text-xs'}>
                      {selectedToken === 'usdt' ? 'Standard' : 'Custom'}
                    </Badge>
                  </div>
                </div>
              )}
              <div className={`${isMobile ? 'space-y-1' : 'flex justify-between items-start'}`}>
                <span className={`text-muted-foreground ${isMobile ? 'text-xs block' : 'text-sm'}`}>To Wallet:</span>
                <span className={`font-mono text-right break-all bg-muted/50 px-2 py-1 rounded ${isMobile ? 'text-xs block mt-1 max-w-full' : 'text-xs max-w-[200px]'}`}>
                  {withdrawalRequest.recipientAddress}
                </span>
              </div>
            </div>

            <div className={`${isMobile ? 'flex flex-col gap-2' : 'flex gap-3'}`}>
              <Button
                onClick={resetForm}
                variant="outline"
                className={`${isMobile ? 'w-full' : 'flex-1'} hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400 transition-all duration-200 ${isMobile ? 'py-2 text-sm' : ''}`}
                data-testid="button-cancel-withdrawal"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmWithdrawal}
                className={`${isMobile ? 'w-full' : 'flex-1'} bg-gradient-to-r from-honey to-amber-400 text-black hover:from-honey/90 hover:to-amber-400/90 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold ${isMobile ? 'py-2 text-sm' : ''}`}
                data-testid="button-confirm-withdrawal"
              >
                <CheckCircle className={`mr-2 ${isMobile ? 'h-4 w-4' : 'h-4 w-4'}`} />
                {isMobile ? 'Confirm' : 'Confirm Withdrawal'}
              </Button>
            </div>
          </div>
        )}


        {step === 'processing' && (
          <div className="text-center space-y-4">
            <div className={`bg-gradient-to-br from-muted/40 to-muted/20 rounded-xl border border-muted/30 shadow-xl ${isMobile ? 'p-4' : 'p-6'}`}>
              <div className="bg-gradient-to-br from-honey/20 to-amber-500/20 rounded-full p-4 w-fit mx-auto mb-4 animate-pulse">
                <Loader2 className={`animate-spin text-honey ${isMobile ? 'h-6 w-6' : 'h-8 w-8'}`} />
              </div>
              <h3 className={`font-semibold text-transparent bg-gradient-to-r from-honey to-amber-400 bg-clip-text mb-2 ${isMobile ? 'text-base' : 'text-lg'}`}>⚡ Processing Withdrawal</h3>
              <p className={`text-muted-foreground ${isMobile ? 'text-xs leading-relaxed' : 'text-sm'}`}>
                Your withdrawal is being processed on the blockchain. This may take a few moments.
              </p>
              <div className="mt-4 flex justify-center">
                <div className="flex space-x-1">
                  <div className="h-2 w-2 bg-honey rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                  <div className="h-2 w-2 bg-amber-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                  <div className="h-2 w-2 bg-honey rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center space-y-4">
            <div className={`bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl shadow-xl ${isMobile ? 'p-4' : 'p-6'}`}>
              <div className="bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-full p-4 w-fit mx-auto mb-4">
                <CheckCircle className={`text-green-400 ${isMobile ? 'h-8 w-8' : 'h-12 w-12'}`} />
              </div>
              <h3 className={`font-semibold text-green-400 mb-2 ${isMobile ? 'text-base' : 'text-lg'}`}>✅ Withdrawal Complete!</h3>
              <p className={`text-muted-foreground mb-4 ${isMobile ? 'text-xs leading-relaxed' : 'text-sm'}`}>
                Your USDT withdrawal has been successfully processed.
              </p>
              
              {/* Transaction details would be shown here in a real implementation */}
              <Button
                onClick={resetForm}
                className={`bg-gradient-to-r from-honey to-amber-400 text-black hover:from-honey/90 hover:to-amber-400/90 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold ${isMobile ? 'w-full py-2 text-sm' : 'px-6 py-2'}`}
                data-testid="button-new-withdrawal"
              >
                {isMobile ? 'New Withdrawal' : 'New Withdrawal'}
              </Button>
            </div>
          </div>
        )}

        {/* Withdrawal fees info */}
        <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/30 rounded-xl p-4 shadow-lg">
          <div className={`flex items-start ${isMobile ? 'gap-2' : 'gap-3'}`}>
            <div className="text-orange-400 mt-1 bg-orange-500/20 p-1 rounded-lg">
              <svg className={`fill-current ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className={`font-medium text-orange-400 mb-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>💸 Withdrawal Fees</h4>
              <p className={`text-muted-foreground ${isMobile ? 'text-xs leading-relaxed' : 'text-xs'}`}>
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
      <Card className="bg-gradient-to-br from-secondary/60 to-secondary border-border shadow-xl">
        <CardContent className={`text-center ${isMobile ? 'p-4' : 'p-6'}`}>
          <div className="text-red-400 mb-4">
            <div className="bg-red-500/20 rounded-full p-4 w-fit mx-auto mb-4">
              <AlertTriangle className={`mx-auto text-red-400 ${isMobile ? 'h-6 w-6' : 'h-8 w-8'}`} />
            </div>
            <h3 className={`font-semibold ${isMobile ? 'text-base' : 'text-lg'}`}>Component Error</h3>
            <p className={`text-muted-foreground mt-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              An error occurred while rendering the withdrawal component.
            </p>
            <details className={`mt-3 text-left ${isMobile ? 'text-xs' : 'text-xs'}`}>
              <summary className="cursor-pointer text-blue-400 hover:text-blue-300">Error Details</summary>
              <pre className="mt-2 p-2 bg-black/50 rounded overflow-x-auto text-red-300">
                {renderError?.message || 'Unknown error'}
              </pre>
            </details>
            <Button 
              onClick={() => window.location.reload()} 
              className={`mt-4 bg-gradient-to-r from-honey to-amber-400 text-black hover:from-honey/90 hover:to-amber-400/90 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold ${isMobile ? 'w-full py-2 text-sm' : 'px-6 py-2'}`}
            >
              Reload Page
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
}
