// Enhanced useWallet hook using Zustand stores
// 这个新版本将逐步替代原始的useWallet

import { useEffect, useMemo } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { 
  useUserStore, 
  useMembershipStore, 
  useUIStore,
  useWalletState,
  useUserStatus,
  useMembershipStatus,
  useBalances
} from '../stores';

export function useWalletV2() {
  const { isConnected, walletAddress } = useWeb3();
  
  // Get individual store actions directly to avoid reference instability
  const setWalletConnection = useUserStore((state) => state.setWalletConnection);
  const loadUserData = useUserStore((state) => state.loadUserData);
  const resetUser = useUserStore((state) => state.reset);
  const loadMembershipData = useMembershipStore((state) => state.loadMembershipData);
  const resetMembership = useMembershipStore((state) => state.reset);
  const addNotification = useUIStore((state) => state.addNotification);
  const setUIProcessing = useUIStore((state) => state.setProcessing);
  const activateMembership = useMembershipStore((state) => state.activateMembership);
  
  // Get state from stores
  const walletState = useWalletState();
  const userStatus = useUserStatus();
  const membershipStatus = useMembershipStatus();
  const balances = useBalances();
  
  // Sync wallet connection state with stable dependencies
  useEffect(() => {
    if (isConnected && walletAddress && walletState.walletAddress !== walletAddress) {
      console.log('🔗 Wallet connected, loading data...', walletAddress);
      setWalletConnection(walletAddress, true);
      loadUserData(walletAddress);
      loadMembershipData(walletAddress);
    } else if (!isConnected && walletState.isConnected) {
      console.log('🔌 Wallet disconnected, clearing data');
      setWalletConnection(null, false);
      resetUser();
      resetMembership();
    }
  }, [isConnected, walletAddress]);
  
  // Determine user flow based on current state
  const determineUserFlow = (): 'registration' | 'claim_nft' | 'dashboard' => {
    if (!userStatus.isRegistered) {
      return 'registration';
    }
    if (!membershipStatus.isActivated || membershipStatus.currentLevel === 0) {
      return 'claim_nft';
    }
    return 'dashboard';
  };
  
  const userFlow = determineUserFlow();
  
  // Legacy compatibility states
  const isCheckingRegistration = walletState.isLoading;
  const isNewUser = isConnected && !walletState.isLoading && userFlow === 'registration';
  const needsNFTClaim = isConnected && !walletState.isLoading && userFlow === 'claim_nft';
  const isFullyActivated = isConnected && !walletState.isLoading && userFlow === 'dashboard';
  const isRegisteredUser = isConnected && !walletState.isLoading && userStatus.isRegistered;
  
  // Legacy balance format
  const bccBalance = {
    transferable: balances.balances.bcc_transferable || 0,
    restricted: balances.balances.bcc_restricted || 0,
    locked: balances.balances.bcc_locked || 0,
    total: (balances.balances.bcc_balance || 0) + (balances.balances.bcc_locked || 0)
  };
  
  const usdtBalance = {
    totalEarned: balances.balances.total_usdt_earned || 0,
    availableRewards: balances.balances.available_balance || 0,
    totalWithdrawn: balances.balances.total_withdrawn || 0,
  };
  
  const membershipState = {
    activeLevel: membershipStatus.currentLevel,
  };
  
  // Enhanced registration function
  const register = async (registrationData: {
    walletAddress: string;
    username: string;
    email?: string;
    referrerWallet?: string;
  }) => {
    try {
      setUIProcessing(true, 'Registering user...');
      
      // This would call your registration API
      // For now, we'll mock the success
      console.log('📝 Registering user:', registrationData);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Registration successful!',
      });
      
      // Refresh data
      loadUserData(registrationData.walletAddress);
      loadMembershipData(registrationData.walletAddress);
      
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      addNotification({
        type: 'error',
        title: 'Error',
        message: errorMessage,
      });
      throw error;
    } finally {
      setUIProcessing(false);
    }
  };
  
  // Enhanced activation function
  const activateMembershipFunc = async (data: { 
    level: number; 
    txHash?: string; 
    referrerWallet?: string 
  }) => {
    if (!walletAddress) {
      throw new Error('Wallet not connected');
    }
    
    try {
      const success = await activateMembership(data, walletAddress);
      
      if (success) {
        addNotification({
          type: 'success',
          title: 'Success',
          message: `Level ${data.level} membership activated!`,
        });
        return { success: true };
      } else {
        throw new Error('Activation failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Activation failed';
      addNotification({
        type: 'error',
        title: 'Error',
        message: errorMessage,
      });
      throw error;
    }
  };
  
  // Manual refresh function
  const refreshUserData = () => {
    if (walletAddress) {
      loadUserData(walletAddress);
      loadMembershipData(walletAddress);
    }
  };
  
  return {
    // Wallet connection
    isConnected,
    walletAddress,
    
    // Enhanced user status
    userData: userStatus.userData,
    userStatus: {
      isRegistered: userStatus.isRegistered,
      hasNFT: membershipStatus.isActivated,
      isActivated: membershipStatus.isActivated,
      isMember: membershipStatus.isActivated,
      membershipLevel: membershipStatus.currentLevel,
      userFlow,
      user: userStatus.userData,
      memberData: userStatus.memberData,
      error: walletState.error
    },
    
    // Loading.tsx states
    isUserLoading: walletState.isLoading,
    isCheckingRegistration,
    isNewUser,
    needsNFTClaim,
    isFullyActivated,
    isRegisteredUser,
    
    // Membership status
    hasNFT: membershipStatus.isActivated,
    isRegistered: userStatus.isRegistered,
    isActivated: membershipStatus.isActivated,
    currentLevel: membershipStatus.currentLevel,
    membershipState,
    
    // Balances
    bccBalance,
    cthBalance: 0, // Not displayed as requested
    usdtBalance,
    userBalances: balances.balances,
    isBalancesLoading: balances.isLoading,
    
    // Legacy compatibility
    referralNode: null,
    userActivity: [],
    isActivityLoading: false,
    
    // Actions
    register,
    isRegistering: membershipStatus.isProcessing,
    registerError: walletState.error,
    
    activateMembership: activateMembershipFunc,
    isActivating: membershipStatus.isProcessing,
    activationError: walletState.error,
    
    // Utilities
    refreshUserData,
  };
}

// Convenience hook for components that only need basic wallet info
export function useWalletConnection() {
  const { isConnected, walletAddress } = useWeb3();
  const walletState = useWalletState();
  
  return {
    isConnected,
    walletAddress,
    isLoading: walletState.isLoading,
    error: walletState.error,
  };
}

// Convenience hook for components that only need user status
export function useUserData() {
  const userStatus = useUserStatus();
  const walletState = useWalletState();
  
  return {
    ...userStatus,
    isLoading: walletState.isLoading,
    error: walletState.error,
  };
}

// Convenience hook for components that only need membership info
export function useMembershipData() {
  const membershipStatus = useMembershipStatus();
  const membershipStore = useMembershipStore();
  
  return {
    ...membershipStatus,
    memberData: membershipStore.memberData,
    referrerWallet: membershipStore.memberData?.referrer_wallet,
    directReferrals: membershipStore.directReferrals,
    totalDownline: membershipStore.totalDownline,
    isLoading: membershipStore.isLoading,
    error: membershipStore.error,
  };
}