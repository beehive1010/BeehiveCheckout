import { useWeb3 } from '../contexts/Web3Context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService, callEdgeFunction } from '../lib/supabase-unified';
import { balanceService } from '../lib/supabaseClient';

interface UserStatus {
  isRegistered: boolean;
  hasNFT: boolean;
  isActivated: boolean;
  isMember: boolean;
  membershipLevel: number;
  userFlow: 'registration' | 'claim_nft' | 'dashboard';
  user?: any;
  memberData?: {
    current_level?: number;
  };
}

interface UserBalances {
  data?: {
    bcc_balance?: number;
    bcc_total_unlocked?: number;
    bcc_locked?: number;
    total_earned?: number;
    available_balance?: number;
    total_withdrawn?: number;
  };
  totalUsdtEarned?: number;
  availableUsdtRewards?: number;
  totalUsdtWithdrawn?: number;
}

export function useWallet() {
  const { isConnected, walletAddress} = useWeb3();
  const queryClient = useQueryClient();

  // Remove old logging - now handled by Web3Context authentication

  // Enhanced user status check using new Supabase client - only when wallet is connected
  const userQuery = useQuery<UserStatus>({
    queryKey: ['user-status', walletAddress],
    enabled: !!walletAddress && isConnected,
    queryFn: async (): Promise<UserStatus> => {
      console.log('🔍 Checking user status (Direct Supabase):', walletAddress);
      try {
        // 保持原始大小写格式进行查询，但使用case-insensitive比较
        const { exists } = await authService.userExists(walletAddress!);
        
        if (!exists) {
          console.log('👤 New user - needs registration');
          return { 
            isRegistered: false, 
            hasNFT: false, 
            isActivated: false,
            isMember: false,
            membershipLevel: 0,
            userFlow: 'registration' as const
          };
        }

        // Check if user is an activated member and get membership info
        // 确保authService使用case-insensitive查询
        const { isActivated, memberData } = await authService.isActivatedMember(walletAddress!);
        
        // Get user data with original case format
        const { data: userData } = await authService.getUser(walletAddress!);
        
        // Special handling for admin123_new user (0xa212A85f7434A5EBAa5b468971EC3972cE72a544)
        const isAdminUser = walletAddress!.toLowerCase() === '0xa212a85f7434a5ebaa5b468971ec3972ce72a544';
        
        // Get the correct membership level from members table
        let membershipLevel = 0;
        let finalIsActivated = isActivated;
        let finalMemberData = memberData;
        
        if (isAdminUser) {
          // Use real data from database for admin user
          finalIsActivated = true;
          membershipLevel = memberData?.current_level || 2; // Use actual level from database
          finalMemberData = {
            current_level: memberData?.current_level || 2,
            is_activated: true,
            levels_owned: memberData?.current_level ? Array.from({length: memberData.current_level}, (_, i) => i + 1) : [1, 2]
          };
          console.log('🔧 Applied admin user override - using actual database level:', membershipLevel);
        } else if (isActivated && memberData) {
          membershipLevel = memberData.current_level || 1;
          console.log('📊 Member level from members table:', membershipLevel);
        }
        
        const userStatus = {
          isRegistered: true,
          hasNFT: finalIsActivated,
          isActivated: finalIsActivated,
          isMember: finalIsActivated,
          membershipLevel,
          userFlow: finalIsActivated ? ('dashboard' as const) : ('claim_nft' as const),
          user: {
            ...userData,
            username: isAdminUser ? 'admin123_new' : userData?.username,
            isMember: finalIsActivated,
            membershipLevel,
            canAccessReferrals: finalIsActivated
          },
          memberData: finalMemberData // Include member data for additional info
        };
        
        console.log('📊 User status (Direct Supabase):', userStatus.userFlow, userStatus);
        return userStatus;
        
      } catch (error: any) {
        console.error('❌ User status check error:', error);
        
        // If error indicates user needs registration, return registration flow
        if (error.message?.includes('REGISTRATION REQUIRED') || 
            error.message?.includes('User not found in database') ||
            error.message?.includes('not found') ||
            error.message?.includes('404')) {
          console.log('👤 Error indicates user needs registration');
          return { 
            isRegistered: false, 
            hasNFT: false, 
            isActivated: false,
            isMember: false,
            membershipLevel: 0,
            userFlow: 'registration' as const
          };
        }
        
        throw error;
      }
    },
    staleTime: 5000,
    refetchInterval: (query) => {
      // Only refetch if user is registered
      return query.state.data?.isRegistered ? 10000 : false;
    },
    refetchIntervalInBackground: false,
  });
  
  const { data: userStatus, isLoading: isUserLoading, error: userError } = userQuery;
  
  // Enhanced user state management
  const isCheckingRegistration = isConnected && isUserLoading;
  const isNewUser = isConnected && !isUserLoading && userStatus?.userFlow === 'registration';
  const needsNFTClaim = isConnected && !isUserLoading && userStatus?.userFlow === 'claim_nft';
  const isFullyActivated = isConnected && !isUserLoading && userStatus?.userFlow === 'dashboard';
  const isRegisteredUser = isConnected && !isUserLoading && userStatus?.isRegistered;

  // Enhanced user registration with referrer validation
  const registerMutation = useMutation({
    mutationFn: async (registrationData: {
      walletAddress: string;
      username: string;
      email?: string;
      secondaryPasswordHash?: string;
      referrerWallet?: string;
    }) => {
      const result = await authService.registerUser(
        registrationData.walletAddress,
        registrationData.username,
        registrationData.email,
        registrationData.referrerWallet
      );
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-status', walletAddress] });
    },
  });

  // Activate membership using Supabase Edge Function
  const activateMembershipMutation = useMutation({
    mutationFn: async (data: { level: number; txHash?: string }) => {
      const result = await callEdgeFunction('activate-membership', {
        transactionHash: data.txHash,
        level: data.level,
        paymentMethod: 'nft_claim',
        paymentAmount: data.level === 1 ? 130 : data.level * 50 + 50
      }, walletAddress!);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-status', walletAddress] });
      queryClient.invalidateQueries({ queryKey: ['user-balances', walletAddress] });
    },
  });

  // Get user balances using new Supabase services - only when user is registered
  const { data: userBalances, isLoading: isBalancesLoading } = useQuery<UserBalances>({
    queryKey: ['user-balances', walletAddress],
    enabled: !!walletAddress && isConnected && userStatus?.isRegistered,
    queryFn: async (): Promise<UserBalances> => {
      const balances = await balanceService.getUserBalance(walletAddress!);
      return balances;
    },
  });

  // Extract user data from enhanced response
  const userData = userStatus?.user;
  const isRegistered = userStatus?.isRegistered ?? false;
  const hasNFT = userStatus?.hasNFT ?? false;
  const isActivated = userStatus?.isMember ?? userStatus?.isActivated ?? false;
  const currentLevel = userStatus?.membershipLevel || userData?.currentLevel || 0;
  const membershipState = { activeLevel: currentLevel, levelsOwned: currentLevel > 0 ? [currentLevel] : [] };
  const bccBalance = { 
    transferable: userBalances?.data?.bcc_balance || 0, 
    restricted: userBalances?.data?.bcc_total_unlocked || 0,
    locked: userBalances?.data?.bcc_locked || 0,
    total: (userBalances?.data?.bcc_balance || 0) + (userBalances?.data?.bcc_locked || 0)
  };
  // CTH balance not displayed as requested by user
  const cthBalance = 0;
  
  // USDT reward balance for withdrawal functionality  
  const usdtBalance = {
    totalEarned: userBalances?.data?.total_earned || userBalances?.totalUsdtEarned || 0,
    availableRewards: userBalances?.data?.available_balance || userBalances?.availableUsdtRewards || 0,
    totalWithdrawn: userBalances?.data?.total_withdrawn || userBalances?.totalUsdtWithdrawn || 0,
  };
  const referralNode = null; // Would be fetched separately
  const { data: userActivity, isLoading: isActivityLoading } = useQuery<{ activity: any[] }>({
    queryKey: ['user-activity', walletAddress],
    enabled: !!walletAddress && isConnected && isRegistered,
    queryFn: async (): Promise<{ activity: any[] }> => {
      // For now, return empty activity until we implement activity tracking
      return { activity: [] };
    },
  });

  // Get user activity using new database framework

  return {
    // Wallet connection
    isConnected,
    walletAddress,
    
    // Enhanced user status (registration + NFT)
    userData,
    userStatus,
    isUserLoading,
    isCheckingRegistration,  // 🔍 Checking registration + NFT status
    isNewUser,              // 👤 Not registered, needs signup  
    needsNFTClaim,          // 🎫 Registered but needs Level 1 NFT
    isFullyActivated,       // ✅ Has NFT, ready for dashboard
    isRegisteredUser,       // Registered (legacy compatibility)
    hasNFT,                 // Has Level 1 NFT
    
    // Legacy compatibility
    isRegistered,
    isActivated,
    currentLevel,
    membershipState,
    bccBalance,
    cthBalance,
    referralNode,
    
    // User activity and balances
    userActivity: userActivity?.activity || [],
    isActivityLoading,
    userBalances,
    isBalancesLoading,
    usdtBalance, // USDT rewards for withdrawal
    
    // Actions
    register: registerMutation.mutate,
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error,
    
    activateMembership: activateMembershipMutation.mutate,
    isActivating: activateMembershipMutation.isPending,
    activationError: activateMembershipMutation.error,
    
    // Manual refresh function for cache invalidation
    refreshUserData: () => {
      if (walletAddress) {
        queryClient.invalidateQueries({ queryKey: ['user-status', walletAddress] });
        queryClient.invalidateQueries({ queryKey: ['user-balances', walletAddress] });
        queryClient.refetchQueries({ queryKey: ['user-status', walletAddress] });
      }
    },
  };
}
