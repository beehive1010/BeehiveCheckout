import React from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';

export function useWallet() {
  const { isConnected, walletAddress } = useWeb3();
  const queryClient = useQueryClient();

  // Log wallet connection when connected
  const logWalletConnection = async (connectionType: string, additionalData?: any) => {
    if (!walletAddress) return;
    
    try {
      await fetch('/api/wallet/log-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': walletAddress,
        },
        body: JSON.stringify({
          connectionType,
          userAgent: navigator.userAgent,
          referrerUrl: document.referrer,
          ...additionalData
        })
      });
    } catch (error) {
      console.error('Failed to log wallet connection:', error);
    }
  };

  // Log initial connection
  React.useEffect(() => {
    if (isConnected && walletAddress) {
      logWalletConnection('connect');
    }
  }, [isConnected, walletAddress]);

  // Enhanced user status check - registration AND NFT ownership
  const userQuery = useQuery({
    queryKey: ['/api/auth/user'],
    enabled: !!walletAddress,
    queryFn: async () => {
      console.log('🔍 Checking wallet status (registration + NFT):', walletAddress);
      const response = await fetch(`/api/auth/user?t=${Date.now()}`, {
        headers: {
          'X-Wallet-Address': walletAddress!,
          'Cache-Control': 'no-cache'
        },
      });
      if (!response.ok) {
        if (response.status === 404) {
          console.log('👤 New user - needs registration');
          return { isRegistered: false, hasNFT: false, userFlow: 'registration' };
        }
        throw new Error('Failed to fetch user data');
      }
      const userStatus = await response.json();
      console.log('📊 User status:', userStatus.userFlow, userStatus);
      return userStatus;
    },
    staleTime: 2000, // 2 seconds
    refetchInterval: (query) => query.state.data?.isRegistered ? 5000 : false, // Only refetch for registered users
    refetchIntervalInBackground: true,
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

  // Activate membership
  const activateMembershipMutation = useMutation({
    mutationFn: async (data: { level: number; txHash?: string }) => {
      const response = await fetch('/api/membership/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': walletAddress!,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to activate membership');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
  });

  // Extract user data from enhanced response
  const userData = userStatus?.user;
  const isRegistered = userStatus?.isRegistered ?? false;
  const hasNFT = userStatus?.hasNFT ?? false;
  const isActivated = userStatus?.isActivated ?? false;
  const currentLevel = userStatus?.membershipLevel || userData?.currentLevel || 0;
  const membershipState = { activeLevel: currentLevel, levelsOwned: currentLevel > 0 ? [currentLevel] : [] };
  const bccBalance = { transferable: 0, restricted: 0 }; // Would be fetched separately
  const cthBalance = 0;
  const referralNode = null; // Would be fetched separately

  // Get user activity
  const { data: userActivity, isLoading: isActivityLoading } = useQuery({
    queryKey: ['/api/user/activity'],
    enabled: !!walletAddress && isRegistered,
    queryFn: async () => {
      const response = await fetch('/api/user/activity?limit=10', {
        headers: {
          'X-Wallet-Address': walletAddress!,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch user activity');
      }
      return response.json();
    },
  });

  // Get user balances  
  const { data: userBalances, isLoading: isBalancesLoading } = useQuery({
    queryKey: ['/api/user/balances'],
    enabled: !!walletAddress && isRegistered,
    queryFn: async () => {
      const response = await fetch('/api/user/balances', {
        headers: {
          'X-Wallet-Address': walletAddress!,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch user balances');
      }
      return response.json();
    },
  });

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
    
    // Actions
    register: registerMutation.mutate,
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error,
    
    activateMembership: activateMembershipMutation.mutate,
    isActivating: activateMembershipMutation.isPending,
    activationError: activateMembershipMutation.error,
  };
}
