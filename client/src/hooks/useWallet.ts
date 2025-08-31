import React from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';
import { useNFTVerification } from './useNFTVerification';

export function useWallet() {
  const { isConnected, walletAddress } = useWeb3();
  const queryClient = useQueryClient();
  
  // Use existing registration status from NFT verification hook to avoid duplicate queries
  const { registrationStatus } = useNFTVerification();

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

  // Get user data including membership state with real-time updates
  // Only fetch user data if user is registered to avoid 404 errors
  const { data: userData, isLoading: isUserLoading } = useQuery({
    queryKey: ['/api/auth/user'],
    enabled: !!walletAddress && !!registrationStatus?.registered,
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/auth/user?t=${Date.now()}`, undefined, walletAddress || undefined);
      return response.json();
    },
    staleTime: 2000, // 2 seconds
    refetchInterval: 5000, // Refetch every 5 seconds for real-time member status
    refetchIntervalInBackground: true,
  });

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
      const response = await apiRequest('POST', '/api/membership/activate', data, walletAddress || undefined);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
  });

  const isRegistered = !!registrationStatus?.registered;
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
    
    // User state
    userData,
    isUserLoading,
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
