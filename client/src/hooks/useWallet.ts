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

  // Check user registration status after wallet connection
  const userQuery = useQuery({
    queryKey: ['/api/auth/user'],
    enabled: !!walletAddress,
    queryFn: async () => {
      console.log('🔍 Checking if wallet is registered:', walletAddress);
      const response = await fetch(`/api/auth/user?t=${Date.now()}`, {
        headers: {
          'X-Wallet-Address': walletAddress!,
          'Cache-Control': 'no-cache'
        },
      });
      if (!response.ok) {
        if (response.status === 404) {
          console.log('👤 New user - wallet not registered');
          return null; // User not registered
        }
        throw new Error('Failed to fetch user data');
      }
      const user = await response.json();
      console.log('✅ Existing user found:', user.username || user.walletAddress);
      return user;
    },
    staleTime: 2000, // 2 seconds
    refetchInterval: (data) => data ? 5000 : false, // Only refetch for existing users
    refetchIntervalInBackground: true,
  });
  
  const { data: userData, isLoading: isUserLoading, error: userError } = userQuery;
  
  // Determine user status for UX
  const isCheckingRegistration = isConnected && isUserLoading;
  const isRegisteredUser = isConnected && !isUserLoading && userData !== null;
  const isNewUser = isConnected && !isUserLoading && userData === null;

  // Register new user
  const registerMutation = useMutation({
    mutationFn: async (registrationData: {
      email: string;
      username: string;
      secondaryPasswordHash: string;
      ipfsHash?: string;
      referrerWallet?: string;
      preferredLanguage?: string;
      isCompanyDirectReferral?: boolean;
      referralCode?: string;
    }) => {
      const response = await apiRequest('POST', '/api/auth/register', {
        walletAddress,
        ...registrationData,
      });
      return response.json();
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

  const isRegistered = !!userData?.user;
  const isActivated = userData?.user?.memberActivated;
  const currentLevel = userData?.user?.currentLevel || 0;
  const membershipState = userData?.membershipState;
  const bccBalance = userData?.bccBalance;
  const cthBalance = userData?.cthBalance;
  const referralNode = userData?.referralNode;

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
    
    // User registration status (enhanced)
    userData,
    isUserLoading,
    isCheckingRegistration,  // NEW: Checking if wallet is registered
    isRegisteredUser,        // NEW: Wallet is registered
    isNewUser,              // NEW: Wallet not registered, needs signup
    
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
