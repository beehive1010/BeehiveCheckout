import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWeb3 } from '../contexts/Web3Context';
import { apiRequest } from '../lib/queryClient';

// BCC Staking Tier Configuration
export const BCC_STAKING_TIERS = {
  PHASE_1: { id: 1, maxMembers: 9999, unlockAmount: 100, lockDeduction: 100 },
  PHASE_2: { id: 2, maxMembers: 9999, unlockAmount: 50, lockDeduction: 50 },
  PHASE_3: { id: 3, maxMembers: 19999, unlockAmount: 25, lockDeduction: 25 },
  PHASE_4: { id: 4, maxMembers: Infinity, unlockAmount: 12, lockDeduction: 12 },
} as const;

export interface UserBalanceData {
  // BCC balances
  bccTransferable: number;
  bccRestricted: number;
  bccLocked: number;
  
  // USDT rewards
  totalUsdtEarned: number;
  availableUsdtRewards: number;
  totalUsdtWithdrawn: number;
  
  // Activation tracking
  activationTier: number | null;
  activationOrder: number | null;
  
  // Global pool info
  globalPool: {
    totalBccLocked: number;
    totalMembersActivated: number;
    currentTier: number;
    tier1Activations: number;
    tier2Activations: number;
    tier3Activations: number;
    tier4Activations: number;
  } | null;
}

export interface WithdrawalData {
  amountUsdt: number;
  targetChain: string;
  targetWalletAddress: string;
  gasFeePercentage: number;
}

export function useBalance() {
  const { walletAddress, isConnected } = useWeb3();
  const queryClient = useQueryClient();

  // Fetch user balance data
  const {
    data: balanceData,
    isLoading: isBalanceLoading,
    error: balanceError,
    refetch: refetchBalance
  } = useQuery({
    queryKey: ['/api/balance/user', walletAddress],
    enabled: !!walletAddress && isConnected,
    queryFn: async (): Promise<UserBalanceData> => {
      const response = await fetch('/api/balance/user', {
        headers: {
          'X-Wallet-Address': walletAddress!,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch balance data');
      }
      return response.json();
    },
    staleTime: 30000, // 30 seconds
  });

  // Initialize user balance (creates balance record with 500 BCC)
  const initializeBalanceMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/balance/initialize', {
        walletAddress: walletAddress!,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/balance/user'] });
    },
  });

  // Activate Level 1 membership with BCC unlock logic
  const activateLevel1Mutation = useMutation({
    mutationFn: async (data: { txHash?: string }) => {
      return apiRequest('POST', '/api/balance/activate-level1', {
        walletAddress: walletAddress!,
        ...data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/balance/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
  });

  // Request USDT withdrawal
  const withdrawUsdtMutation = useMutation({
    mutationFn: async (withdrawalData: WithdrawalData) => {
      return apiRequest('POST', '/api/balance/withdraw-usdt', {
        walletAddress: walletAddress!,
        ...withdrawalData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/balance/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/balance/withdrawals'] });
    },
  });

  // Get user withdrawal history
  const {
    data: withdrawalHistory,
    isLoading: isWithdrawalHistoryLoading
  } = useQuery({
    queryKey: ['/api/balance/withdrawals', walletAddress],
    enabled: !!walletAddress && isConnected,
    queryFn: async () => {
      const response = await fetch('/api/balance/withdrawals', {
        headers: {
          'X-Wallet-Address': walletAddress!,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch withdrawal history');
      }
      return response.json();
    },
  });

  // Calculate current staking tier based on global activations
  const getCurrentStakingTier = (): typeof BCC_STAKING_TIERS[keyof typeof BCC_STAKING_TIERS] => {
    if (!balanceData?.globalPool) return BCC_STAKING_TIERS.PHASE_1;
    
    const { totalMembersActivated } = balanceData.globalPool;
    
    if (totalMembersActivated <= 9999) return BCC_STAKING_TIERS.PHASE_1;
    if (totalMembersActivated <= 19999) return BCC_STAKING_TIERS.PHASE_2;
    if (totalMembersActivated <= 39999) return BCC_STAKING_TIERS.PHASE_3;
    return BCC_STAKING_TIERS.PHASE_4;
  };

  // Calculate BCC unlock amount for user's activation tier
  const getBccUnlockAmount = (): number => {
    if (!balanceData?.activationTier) return 0;
    
    const tierConfig = Object.values(BCC_STAKING_TIERS).find(
      tier => tier.id === balanceData.activationTier
    );
    
    return tierConfig?.unlockAmount || 0;
  };

  // Calculate total BCC balance
  const getTotalBccBalance = (): number => {
    if (!balanceData) return 0;
    return balanceData.bccTransferable + balanceData.bccRestricted;
  };

  // Check if user can withdraw USDT
  const canWithdrawUsdt = (): boolean => {
    return balanceData ? balanceData.availableUsdtRewards > 0 : false;
  };

  // Format USDT amount (cents to dollars)
  const formatUsdtAmount = (cents: number): string => {
    return (cents / 100).toFixed(2);
  };

  // Calculate withdrawal fee for given amount and percentage
  const calculateWithdrawalFee = (amountCents: number, feePercentage: number) => {
    const feeAmount = Math.floor(amountCents * (feePercentage / 100));
    const netAmount = amountCents - feeAmount;
    return {
      feeAmount,
      netAmount,
      feeAmountFormatted: formatUsdtAmount(feeAmount),
      netAmountFormatted: formatUsdtAmount(netAmount),
    };
  };

  return {
    // Balance data
    balanceData,
    isBalanceLoading,
    balanceError,
    refetchBalance,
    
    // Withdrawal history
    withdrawalHistory: withdrawalHistory?.withdrawals || [],
    isWithdrawalHistoryLoading,
    
    // Actions
    initializeBalance: initializeBalanceMutation.mutate,
    isInitializingBalance: initializeBalanceMutation.isPending,
    initializeError: initializeBalanceMutation.error,
    
    activateLevel1: activateLevel1Mutation.mutate,
    isActivatingLevel1: activateLevel1Mutation.isPending,
    activationError: activateLevel1Mutation.error,
    
    withdrawUsdt: withdrawUsdtMutation.mutate,
    isWithdrawingUsdt: withdrawUsdtMutation.isPending,
    withdrawalError: withdrawUsdtMutation.error,
    
    // Utility functions
    getCurrentStakingTier,
    getBccUnlockAmount,
    getTotalBccBalance,
    canWithdrawUsdt,
    formatUsdtAmount,
    calculateWithdrawalFee,
    
    // Constants
    BCC_STAKING_TIERS,
  };
}