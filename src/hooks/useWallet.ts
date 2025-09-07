import React from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';

export function useWallet() {
  const { isConnected, walletAddress, isSupabaseAuthenticated } = useWeb3();
  const queryClient = useQueryClient();

  // Remove old logging - now handled by Web3Context authentication

  // Enhanced user status check using Supabase API - only when both auths are ready
  const userQuery = useQuery({
    queryKey: ['/api/auth/user'],
    enabled: !!walletAddress && isSupabaseAuthenticated,
    queryFn: async () => {
      console.log('🔍 Checking user status (Supabase API):', walletAddress);
      try {
        const response = await apiRequest('GET', '/api/auth/user', { t: Date.now() }, walletAddress!);
        const userStatus = await response.json();
        console.log('📊 User status (Supabase):', userStatus.userFlow, userStatus);
        
        // TEMPORARILY DISABLED: Auto-sync blockchain status - causing UUID errors
        // Auto-sync blockchain status if user is registered but not activated
        // BUT skip auto-sync if user is in claim_nft flow (they need to manually claim)
        if (false && userStatus.isRegistered && !userStatus.isMember && userStatus.userFlow !== 'claim_nft') {
          console.log('🔄 User registered but not activated - attempting blockchain sync');
          try {
            const syncResponse = await apiRequest('POST', '/api/auth/sync-blockchain-status', {}, walletAddress!);
            if (syncResponse.ok) {
              const syncResult = await syncResponse.json();
              console.log('✅ Blockchain sync result:', syncResult);
              // Refetch user status after sync
              if (syncResult.success) {
                const refreshResponse = await apiRequest('GET', '/api/auth/user', { t: Date.now() }, walletAddress!);
                const refreshedStatus = await refreshResponse.json();
                console.log('🔄 Refreshed user status after sync:', refreshedStatus);
                return refreshedStatus;
              }
            }
          } catch (syncError) {
            console.warn('⚠️ Auto-sync failed (non-critical):', syncError);
          }
        }
        
        return userStatus;
      } catch (error: any) {
        if (error.status === 404) {
          console.log('👤 New user - needs registration');
          return { 
            isRegistered: false, 
            hasNFT: false, 
            isActivated: false,
            userFlow: 'registration' 
          };
        }
        throw error;
      }
    },
    staleTime: 2000,
    refetchInterval: (query) => {
      // Only refetch if user is registered AND both wallet and Supabase are authenticated
      return (query.state.data?.isRegistered && walletAddress && isSupabaseAuthenticated) ? 5000 : false;
    },
    refetchIntervalInBackground: false, // Disable background refetching to prevent auth errors
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
      const response = await apiRequest('POST', '/api/auth/register', registrationData);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
  });

  // Activate membership using Supabase API
  const activateMembershipMutation = useMutation({
    mutationFn: async (data: { level: number; txHash?: string }) => {
      const response = await apiRequest('POST', '/api/membership/activate', data, walletAddress!);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
  });

  // Get user balances using Supabase API - only when both auths are ready
  const { data: userBalances, isLoading: isBalancesLoading } = useQuery({
    queryKey: ['/api/balance/user'],
    enabled: !!walletAddress && isSupabaseAuthenticated && userStatus?.isRegistered,
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/balance/user', undefined, walletAddress!);
      return response.json();
    },
  });

  // Extract user data from enhanced response
  const userData = userStatus?.user;
  const isRegistered = userStatus?.isRegistered ?? false;
  const hasNFT = userStatus?.hasNFT ?? false;
  const isActivated = userStatus?.isActivated ?? false;
  const currentLevel = userStatus?.membershipLevel || userData?.currentLevel || 0;
  const membershipState = { activeLevel: currentLevel, levelsOwned: currentLevel > 0 ? [currentLevel] : [] };
  const bccBalance = { 
    transferable: userBalances?.bccTransferable || 0, 
    restricted: userBalances?.bccRestricted || 0,
    locked: userBalances?.bccLocked || 0,
    total: (userBalances?.bccTransferable || 0) + (userBalances?.bccRestricted || 0)
  };
  // CTH balance not displayed as requested by user
  const cthBalance = 0;
  
  // USDT reward balance for withdrawal functionality  
  const usdtBalance = {
    totalEarned: userBalances?.totalUsdtEarned || 0,
    availableRewards: userBalances?.availableUsdtRewards || 0,
    totalWithdrawn: userBalances?.totalUsdtWithdrawn || 0,
  };
  const referralNode = null; // Would be fetched separately
  const { data: userActivity, isLoading: isActivityLoading } = useQuery({
    queryKey: ['/api/dashboard/activity'],
    enabled: !!walletAddress && isSupabaseAuthenticated && isRegistered,
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/dashboard/activity', { limit: 10 }, walletAddress!);
      return response.json();
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
