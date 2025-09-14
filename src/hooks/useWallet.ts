import React from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService, balanceService, callEdgeFunction } from '../lib/supabaseClient';

export function useWallet() {
  const { isConnected, walletAddress, isSupabaseAuthenticated } = useWeb3();
  const queryClient = useQueryClient();

  // Remove old logging - now handled by Web3Context authentication

  // Enhanced user status check using new Supabase client - only when wallet is connected
  const userQuery = useQuery({
    queryKey: ['user-status', walletAddress],
    enabled: !!walletAddress && isConnected,
    queryFn: async () => {
      console.log('🔍 Checking user status (Direct Supabase):', walletAddress);
      try {
        // Check if user exists
        const { exists } = await authService.userExists(walletAddress!);
        
        if (!exists) {
          console.log('👤 New user - needs registration');
          return { 
            isRegistered: false, 
            hasNFT: false, 
            isActivated: false,
            isMember: false,
            membershipLevel: 0,
            userFlow: 'registration' 
          };
        }

        // Check if user is an activated member and get membership info
        const { isActivated, memberData } = await authService.isActivatedMember(walletAddress!);
        
        // Get user data
        const { data: userData } = await authService.getUser(walletAddress!);
        
        // Get the correct membership level from members table
        let membershipLevel = 0;
        if (isActivated && memberData) {
          membershipLevel = memberData.current_level || 1;
          console.log('📊 Member level from members table:', membershipLevel);
        }
        
        const userStatus = {
          isRegistered: true,
          hasNFT: isActivated,
          isActivated,
          isMember: isActivated,
          membershipLevel,
          userFlow: isActivated ? 'dashboard' : 'claim_nft',
          user: userData,
          memberData // Include member data for additional info
        };
        
        console.log('📊 User status (Direct Supabase):', userStatus.userFlow, userStatus);
        return userStatus;
        
      } catch (error: any) {
        console.error('❌ User status check error:', error);
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
  const { data: userBalances, isLoading: isBalancesLoading } = useQuery({
    queryKey: ['user-balances', walletAddress],
    enabled: !!walletAddress && isConnected && userStatus?.isRegistered,
    queryFn: async () => {
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
    transferable: userBalances?.data?.bcc_balance || userBalances?.bccTransferable || 0, 
    restricted: userBalances?.data?.bcc_total_unlocked || userBalances?.bccRestricted || 0,
    locked: userBalances?.data?.bcc_locked || userBalances?.bccLocked || 0,
    total: (userBalances?.data?.bcc_balance || userBalances?.bccTransferable || 0) + (userBalances?.data?.bcc_total_unlocked || userBalances?.bccRestricted || 0)
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
  const { data: userActivity, isLoading: isActivityLoading } = useQuery({
    queryKey: ['user-activity', walletAddress],
    enabled: !!walletAddress && isConnected && isRegistered,
    queryFn: async () => {
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
  };
}
