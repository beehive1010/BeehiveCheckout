import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWeb3 } from '../contexts/Web3Context';
import { apiRequest } from '../lib/queryClient';
import { updatedApiClient } from '../lib/apiClientUpdated';

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
  // BCC balances (segregated)
  bccTransferable: number;
  bccLockedRewards: number;
  bccLockedLevel: number;
  bccLockedStaking: number;
  bccPendingActivation: number;
  bccTotal: number;
  
  // USDT rewards
  totalUsdtEarned: number;
  availableUsdtRewards: number;
  totalUsdtWithdrawn: number;
  
  // Tier information
  tierPhase: number;
  tierMultiplier: number;
  tierName: string;
  
  // Member info
  currentLevel: number;
  isActivated: boolean;
  levelsOwned: number[];
  
  // Breakdown details
  nextUnlockLevel?: number;
  nextUnlockAmount?: number;
  pendingRewardClaims: number;
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

  // Fetch user balance data using enhanced Supabase API
  const {
    data: balanceData,
    isLoading: isBalanceLoading,
    error: balanceError,
    refetch: refetchBalance
  } = useQuery({
    queryKey: ['/api/balance-enhanced/breakdown', walletAddress],
    enabled: !!walletAddress && isConnected,
    queryFn: async (): Promise<UserBalanceData> => {
      const balanceResponse = await updatedApiClient.getBalanceBreakdown(walletAddress!);
      
      if (!balanceResponse.success) {
        throw new Error(balanceResponse.error || 'Failed to fetch balance data');
      }
      
      const breakdown = balanceResponse.balance_breakdown!;
      const memberInfo = balanceResponse.member_info!;
      const tierInfo = balanceResponse.tier_info!;
      
      // Transform to match UserBalanceData interface
      return {
        bccTransferable: breakdown.transferable || 0,
        bccLockedRewards: breakdown.locked_rewards || 0,
        bccLockedLevel: breakdown.locked_level_unlock || 0,
        bccLockedStaking: breakdown.locked_staking_rewards || 0,
        bccPendingActivation: breakdown.pending_activation || 0,
        bccTotal: breakdown.total || 0,
        totalUsdtEarned: 0, // Will be fetched from rewards API
        availableUsdtRewards: 0, // Will be fetched from rewards API
        totalUsdtWithdrawn: 0,
        tierPhase: tierInfo.current_phase || 1,
        tierMultiplier: tierInfo.multiplier || 1.0,
        tierName: tierInfo.phase_name || 'Phase 1',
        currentLevel: memberInfo.current_level || 0,
        isActivated: memberInfo.is_activated || false,
        levelsOwned: memberInfo.levels_owned || [],
        nextUnlockLevel: breakdown.breakdown_details.next_unlock_level,
        nextUnlockAmount: breakdown.breakdown_details.next_unlock_amount,
        pendingRewardClaims: breakdown.breakdown_details.pending_reward_claims || 0
      };
    },
    staleTime: 30000, // 30 seconds
    retry: 2,
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
      queryClient.invalidateQueries({ queryKey: ['/api/balance-enhanced/breakdown'] });
      queryClient.invalidateQueries({ queryKey: ['/api/balance/withdrawals'] });
    },
  });

  // Claim locked BCC rewards
  const claimLockedRewardsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/balance-enhanced?action=claim-locked-rewards', {
        walletAddress: walletAddress!
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/balance-enhanced/breakdown'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rewards'] });
    },
  });

  // Transfer BCC to another wallet
  const transferBccMutation = useMutation({
    mutationFn: async (data: { recipientWallet: string; amount: number; purpose?: string }) => {
      const response = await updatedApiClient.transferBCC(walletAddress!, {
        recipient_wallet: data.recipientWallet,
        amount: data.amount,
        purpose: data.purpose || 'BCC Transfer'
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to transfer BCC');
      }
      
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/balance-enhanced/breakdown'] });
    },
  });

  // Unlock level rewards
  const unlockLevelRewardsMutation = useMutation({
    mutationFn: async (data: { level: number }) => {
      const response = await updatedApiClient.unlockLevelRewards(walletAddress!, data.level);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to unlock level rewards');
      }
      
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/balance-enhanced/breakdown'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
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
    return balanceData.bccTotal;
  };

  // Get segregated balance breakdown
  const getBalanceBreakdown = () => {
    if (!balanceData) return null;
    return {
      transferable: balanceData.bccTransferable,
      lockedRewards: balanceData.bccLockedRewards,
      lockedLevel: balanceData.bccLockedLevel,
      lockedStaking: balanceData.bccLockedStaking,
      pendingActivation: balanceData.bccPendingActivation,
      total: balanceData.bccTotal
    };
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
    
    // Balance initialization
    initializeBalance: initializeBalanceMutation.mutate,
    isInitializingBalance: initializeBalanceMutation.isPending,
    initializeError: initializeBalanceMutation.error,
    
    // Level 1 activation
    activateLevel1: activateLevel1Mutation.mutate,
    isActivatingLevel1: activateLevel1Mutation.isPending,
    activationError: activateLevel1Mutation.error,
    
    // USDT operations
    withdrawUsdt: withdrawUsdtMutation.mutate,
    isWithdrawingUsdt: withdrawUsdtMutation.isPending,
    withdrawalError: withdrawUsdtMutation.error,
    
    // BCC operations
    claimLockedRewards: claimLockedRewardsMutation.mutate,
    isClaimingRewards: claimLockedRewardsMutation.isPending,
    claimRewardsError: claimLockedRewardsMutation.error,
    
    transferBcc: transferBccMutation.mutate,
    isTransferringBcc: transferBccMutation.isPending,
    transferBccError: transferBccMutation.error,
    
    unlockLevelRewards: unlockLevelRewardsMutation.mutate,
    isUnlockingLevel: unlockLevelRewardsMutation.isPending,
    unlockLevelError: unlockLevelRewardsMutation.error,
    
    // Utility functions
    getCurrentStakingTier,
    getBccUnlockAmountForLevel,
    getTotalBccLockedForTier,
    getTierInfo,
    getTotalBccBalance,
    getBalanceBreakdown,
    canWithdrawUsdt,
    formatUsdtAmount,
    calculateWithdrawalFee,
    
    // Constants
    BCC_STAKING_TIERS,
    BCC_LEVEL_UNLOCK_AMOUNTS,
    TOTAL_BCC_LOCKED_PHASE_1,
  };
}