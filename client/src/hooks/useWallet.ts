import { useWeb3 } from '../contexts/Web3Context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';

export function useWallet() {
  const { isConnected, walletAddress, connectWallet, disconnectWallet } = useWeb3();
  const queryClient = useQueryClient();

  // Get user data including membership state
  const { data: userData, isLoading: isUserLoading } = useQuery({
    queryKey: ['/api/auth/user'],
    enabled: !!walletAddress,
    queryFn: async () => {
      const response = await fetch('/api/auth/user', {
        headers: {
          'X-Wallet-Address': walletAddress!,
        },
      });
      if (!response.ok) {
        if (response.status === 404) {
          return null; // User not registered
        }
        throw new Error('Failed to fetch user data');
      }
      return response.json();
    },
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
  const referralNode = userData?.referralNode;

  return {
    // Wallet connection
    isConnected,
    walletAddress,
    connectWallet,
    disconnectWallet,
    
    // User state
    userData,
    isUserLoading,
    isRegistered,
    isActivated,
    currentLevel,
    membershipState,
    bccBalance,
    referralNode,
    
    // Actions
    register: registerMutation.mutate,
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error,
    
    activateMembership: activateMembershipMutation.mutate,
    isActivating: activateMembershipMutation.isPending,
    activationError: activateMembershipMutation.error,
  };
}
