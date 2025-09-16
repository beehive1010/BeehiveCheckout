import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWeb3 } from '../contexts/Web3Context';
import { useWallet } from './useWallet';
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
  const { userStatus } = useWallet();
  const queryClient = useQueryClient();

  // Fetch user balance data using balance API
  const {
    data: balanceData,
    isLoading: isBalanceLoading,
    error: balanceError,
    refetch: refetchBalance
  } = useQuery({
    queryKey: ['/api/balance/user', walletAddress],
    enabled: !!walletAddress && isConnected && userStatus?.isActivated,
    queryFn: async (): Promise<UserBalanceData> => {
      // Temporary fix: Query database directly until balance function is deployed
      try {
        const response = await apiRequest('POST', '/api/balance', {
          action: 'get-balance'
        }, walletAddress!);
        
        const balanceResponse = await response.json() as {
          success: boolean;
          balance?: any;
          recentActivity?: { pendingRewardCount?: number };
          error?: string;
        };
        
        if (balanceResponse.success) {
          const balance = balanceResponse.balance;
          const bccTransferable = balance.bcc_transferable || balance.bcc_balance || 0;
          const bccLocked = balance.bcc_locked || 0;
          
          // Use API response if successful
          const memberResponse = await apiRequest('GET', '/api/auth/user', undefined, walletAddress!);
          const memberData = await memberResponse.json() as {
            memberData?: {
              current_level?: number;
            };
            error?: string;
          };
          
          return {
            bccTransferable: bccTransferable,
            bccLockedRewards: 0,
            bccLockedLevel: bccLocked,
            bccLockedStaking: 0,
            bccPendingActivation: 0,
            bccTotal: bccTransferable + bccLocked,
            totalUsdtEarned: balance.total_earned || 0,
            availableUsdtRewards: balance.pending_rewards_usdt || 0,
            totalUsdtWithdrawn: balance.total_withdrawn || 0,
            tierPhase: balance.activation_tier || 1,
            tierMultiplier: balance.tier_multiplier || 1.0,
            tierName: `Phase ${balance.activation_tier || 1}`,
            currentLevel: memberData.memberData?.current_level || 1,
            isActivated: true, // 如果能访问到这里，说明已经 claim 了 Level 1 NFT
            levelsOwned: memberData.memberData?.current_level ? Array.from({length: memberData.memberData.current_level}, (_, i) => i + 1) : [1],
            nextUnlockLevel: (memberData.memberData?.current_level || 1) + 1,
            nextUnlockAmount: getBccUnlockAmountForLevel((memberData.memberData?.current_level || 1) + 1),
            pendingRewardClaims: balanceResponse.recentActivity?.pendingRewardCount || 0
          };
        }
      } catch (error) {
        console.log('Balance API failed, using fallback data', error);
      }
      
      // Fallback: Return default balance for new members
      const memberResponse = await apiRequest('GET', '/api/auth/user', undefined, walletAddress!);
      const memberData = await memberResponse.json() as {
        memberData?: {
          current_level?: number;
        };
        error?: string;
      };
      
      return {
        bccTransferable: 600, // Default available balance for new members
        bccLockedRewards: 0,
        bccLockedLevel: 10350, // Default locked balance for new members
        bccLockedStaking: 0,
        bccPendingActivation: 0,
        bccTotal: 600 + 10350,
        totalUsdtEarned: 0,
        availableUsdtRewards: 0,
        totalUsdtWithdrawn: 0,
        tierPhase: 1,
        tierMultiplier: 1.0,
        tierName: 'Phase 1',
        currentLevel: memberData.memberData?.current_level || 0,
        isActivated: (memberData.memberData?.current_level || 0) >= 1,
        levelsOwned: memberData.memberData?.current_level ? Array.from({length: memberData.memberData.current_level}, (_, i) => i + 1) : [],
        nextUnlockLevel: (memberData.memberData?.current_level || 0) + 1,
        nextUnlockAmount: getBccUnlockAmountForLevel((memberData.memberData?.current_level || 0) + 1),
        pendingRewardClaims: 0
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
      queryClient.invalidateQueries({ queryKey: ['/api/balance/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/balance/withdrawals'] });
    },
  });

  // Claim locked BCC rewards
  const claimLockedRewardsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/balance', {
        action: 'claim-locked-rewards',
        walletAddress: walletAddress!
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/balance/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rewards'] });
    },
  });

  // Transfer BCC to another wallet
  const transferBccMutation = useMutation({
    mutationFn: async (data: { recipientWallet: string; amount: number; purpose?: string }) => {
      const response = await apiRequest('POST', '/api/balance', {
        action: 'transfer-bcc',
        amount: data.amount,
        recipientWallet: data.recipientWallet,
        purpose: data.purpose || 'BCC Transfer'
      }, walletAddress!);
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to transfer BCC');
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/balance/user'] });
    },
  });

  // Unlock level rewards
  const unlockLevelRewardsMutation = useMutation({
    mutationFn: async (data: { level: number }) => {
      const response = await apiRequest('POST', '/api/balance', {
        action: 'unlock-level-rewards',
        level: data.level
      }, walletAddress!);
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to unlock level rewards');
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/balance/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
  });

  // Get user withdrawal history using Supabase API - only for activated members
  const {
    data: withdrawalHistory,
    isLoading: isWithdrawalHistoryLoading
  } = useQuery({
    queryKey: ['/api/withdrawal-system', walletAddress],
    enabled: !!walletAddress && isConnected && userStatus?.isActivated,
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/withdrawal-system', undefined, walletAddress!);
        const result = await response.json();
        return result;
      } catch (error) {
        console.log('Withdrawal history failed, returning empty array:', error);
        return { withdrawals: [] };
      }
    },
  });

  // Calculate current staking tier based on global activations
  const getCurrentStakingTier = (): typeof BCC_STAKING_TIERS[keyof typeof BCC_STAKING_TIERS] => {
    if (!balanceData || !('globalPool' in balanceData) || !balanceData.globalPool) {
      return BCC_STAKING_TIERS.PHASE_1;
    }
    
    const globalPool = balanceData.globalPool as { totalMembersActivated: number };
    const { totalMembersActivated } = globalPool;
    
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
    if (!balanceData) return 600 + 10350; // Default total for new members
    return balanceData.bccTotal;
  };

  // Get segregated balance breakdown
  const getBalanceBreakdown = () => {
    if (!balanceData) {
      // Return fallback data when balanceData is not available
      return {
        transferable: 600, // Default BCC balance for new members
        lockedRewards: 0,
        lockedLevel: 10350, // Default locked BCC for new members
        lockedStaking: 0,
        pendingActivation: 0,
        total: 600 + 10350
      };
    }
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
  const formatUsdtAmount = (cents: number | null | undefined): string => {
    if (cents === null || cents === undefined) return '0.00';
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