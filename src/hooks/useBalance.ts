import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWeb3 } from '../contexts/Web3Context';
import { apiRequest } from '../lib/queryClient';

// BCC Level-based unlock amounts (base amounts for Phase 1)
export const BCC_LEVEL_UNLOCK_AMOUNTS = {
  1: 100,   // Level 1: 100 BCC (130 USDT paid but 100 BCC unlocked)
  2: 150,   // Level 2: 150 BCC (150 USDT paid, 150 BCC unlocked)
  3: 200,   // Level 3: 200 BCC
  4: 250,   // Level 4: 250 BCC
  5: 300,   // Level 5: 300 BCC
  6: 350,   // Level 6: 350 BCC
  7: 400,   // Level 7: 400 BCC
  8: 450,   // Level 8: 450 BCC
  9: 500,   // Level 9: 500 BCC
  10: 550,  // Level 10: 550 BCC
  11: 600,  // Level 11: 600 BCC
  12: 650,  // Level 12: 650 BCC
  13: 700,  // Level 13: 700 BCC
  14: 750,  // Level 14: 750 BCC
  15: 800,  // Level 15: 800 BCC
  16: 850,  // Level 16: 850 BCC
  17: 900,  // Level 17: 900 BCC
  18: 950,  // Level 18: 950 BCC
  19: 1000, // Level 19: 1000 BCC
} as const;

// Total locked BCC pool for Phase 1: 100+150+200+...+1000 = 10,450 BCC
export const TOTAL_BCC_LOCKED_PHASE_1 = Object.values(BCC_LEVEL_UNLOCK_AMOUNTS).reduce((sum, amount) => sum + amount, 0);

// BCC Staking Tier Configuration with halving mechanism
export const BCC_STAKING_TIERS = {
  PHASE_1: { id: 1, maxMembers: 9999, multiplier: 1.0 },    // Full amounts
  PHASE_2: { id: 2, maxMembers: 9999, multiplier: 0.5 },   // Half amounts
  PHASE_3: { id: 3, maxMembers: 19999, multiplier: 0.25 }, // Quarter amounts
  PHASE_4: { id: 4, maxMembers: Infinity, multiplier: 0.125 }, // Eighth amounts
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

  // Fetch user balance data using Supabase API
  const {
    data: balanceData,
    isLoading: isBalanceLoading,
    error: balanceError,
    refetch: refetchBalance
  } = useQuery({
    queryKey: ['/api/balance/user', walletAddress],
    enabled: !!walletAddress && isConnected,
    queryFn: async (): Promise<UserBalanceData> => {
      const response = await apiRequest('GET', '/api/dashboard/balances', undefined, walletAddress!);
      const data = await response.json();
      
      // Transform to match UserBalanceData interface
      return {
        bccTransferable: data.bccTransferable || 0,
        bccRestricted: data.bccRestricted || 0,
        bccLocked: data.bccRestricted || 0,
        totalUsdtEarned: data.usdt || 0,
        availableUsdtRewards: data.usdt || 0,
        totalUsdtWithdrawn: 0,
        activationTier: null,
        activationOrder: null,
        globalPool: null
      };
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

  // Get user withdrawal history using Supabase API
  const {
    data: withdrawalHistory,
    isLoading: isWithdrawalHistoryLoading
  } = useQuery({
    queryKey: ['/api/balance/withdrawals', walletAddress],
    enabled: !!walletAddress && isConnected,
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/balance/withdrawals', undefined, walletAddress!);
      return response.json();
    },
  });

  // Calculate current staking tier based on global activations
  const getCurrentStakingTier = (): typeof BCC_STAKING_TIERS[keyof typeof BCC_STAKING_TIERS] => {
    if (!balanceData?.globalPool) return BCC_STAKING_TIERS.PHASE_1;
    
    const { totalMembersActivated } = balanceData.globalPool;
    
    if (totalMembersActivated <= 9999) return BCC_STAKING_TIERS.PHASE_1;
    if (totalMembersActivated <= 19998) return BCC_STAKING_TIERS.PHASE_2; // 9999 + 9999
    if (totalMembersActivated <= 39997) return BCC_STAKING_TIERS.PHASE_3; // 19998 + 19999
    return BCC_STAKING_TIERS.PHASE_4;
  };
  
  // Get tier info with BCC amounts
  const getTierInfo = () => {
    const currentTier = getCurrentStakingTier();
    const totalLocked = getTotalBccLockedForTier(currentTier.id);
    
    return {
      phase: currentTier.id,
      multiplier: currentTier.multiplier,
      totalLockedInPhase: totalLocked,
      nextPhaseAt: currentTier.id === 1 ? 10000 : 
                   currentTier.id === 2 ? 19999 : 
                   currentTier.id === 3 ? 39998 : null,
    };
  };

  // Calculate BCC unlock amount for specific level (now using server-side calculation)
  const getBccUnlockAmountForLevel = (level: number): number => {
    // New BCC calculation: Level 1 = 100, Level 2 = 150, ... Level 19 = 1000
    // Formula: Level 1 = 100, 每升一级增加50 BCC
    if (level < 1 || level > 19) return 0;
    return 50 + (level * 50);
  };
  
  // Calculate total BCC that would be locked for user's tier
  const getTotalBccLockedForTier = (tierId: number): number => {
    const tierConfig = Object.values(BCC_STAKING_TIERS).find(tier => tier.id === tierId);
    if (!tierConfig) return 0;
    
    // Apply tier multiplier to total locked amount
    return Math.floor(TOTAL_BCC_LOCKED_PHASE_1 * tierConfig.multiplier);
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
    getBccUnlockAmountForLevel,
    getTotalBccLockedForTier,
    getTierInfo,
    getTotalBccBalance,
    canWithdrawUsdt,
    formatUsdtAmount,
    calculateWithdrawalFee,
    
    // Constants
    BCC_STAKING_TIERS,
    BCC_LEVEL_UNLOCK_AMOUNTS,
    TOTAL_BCC_LOCKED_PHASE_1,
  };
}