// Store exports and unified state management
import { useCallback, useMemo } from 'react';
export { useUserStore } from './userStore';
export { useMembershipStore } from './membershipStore';
export { useUIStore } from './uiStore';
export { useNFTStore } from './nftStore';

// Combined store hook for convenience
import { useUserStore } from './userStore';
import { useMembershipStore } from './membershipStore';
import { useUIStore } from './uiStore';
import { useNFTStore } from './nftStore';

// Type definitions for store state
export interface AppState {
  user: ReturnType<typeof useUserStore.getState>;
  membership: ReturnType<typeof useMembershipStore.getState>;
  ui: ReturnType<typeof useUIStore.getState>;
  nft: ReturnType<typeof useNFTStore.getState>;
}

// Unified store hook - use sparingly, prefer individual stores
export const useAppStore = () => ({
  user: useUserStore(),
  membership: useMembershipStore(),
  ui: useUIStore(),
  nft: useNFTStore(),
});

// Selector hooks for specific state slices with shallow comparison
export const useWalletState = () => useUserStore((state) => ({
  walletAddress: state.walletAddress,
  isConnected: state.isConnected,
  isLoading: state.isLoading,
  error: state.error,
}), (a, b) => 
  a.walletAddress === b.walletAddress && 
  a.isConnected === b.isConnected && 
  a.isLoading === b.isLoading && 
  a.error === b.error
);

export const useUserStatus = () => {
  const userState = useUserStore((state) => ({
    isRegistered: state.isRegistered,
    isActivated: state.isActivated,
    userData: state.userData,
  }));
  
  const membershipState = useMembershipStore((state) => ({
    isActivated: state.isActivated,
    memberData: state.memberData,
  }));
  
  return {
    ...userState,
    membershipLevel: membershipState.memberData?.current_level || 0,
    isMemberActivated: membershipState.isActivated,
    memberData: membershipState.memberData,
  };
};

export const useMembershipStatus = () => useMembershipStore((state) => ({
  currentLevel: state.memberData?.current_level || 0,
  canUpgrade: state.canUpgrade,
  nextLevel: state.nextLevel,
  isActivated: state.isActivated,
  isProcessing: state.isProcessing,
  currentStep: state.currentStep,
  memberData: state.memberData,
}));

export const useBalances = () => useUserStore((state) => ({
  balances: state.balances,
  isLoading: state.isLoading,
}));

export const useNotifications = () => useUIStore((state) => ({
  notifications: state.notifications,
  addNotification: state.addNotification,
  removeNotification: state.removeNotification,
  markAsRead: state.markNotificationAsRead,
  clearAll: state.clearAllNotifications,
}));

export const useLoadingStates = () => {
  const userLoading = useUserStore((state) => state.isLoading);
  const membershipLoading = useMembershipStore((state) => state.isLoading);
  const membershipProcessing = useMembershipStore((state) => state.isProcessing);
  const uiLoading = useUIStore((state) => state.isLoading);
  const uiProcessing = useUIStore((state) => state.isProcessing);
  const nftLoading = useNFTStore((state) => state.isLoading);
  const nftProcessing = useNFTStore((state) => state.isProcessing);
  
  return {
    isLoading: userLoading || membershipLoading || uiLoading || nftLoading,
    isProcessing: membershipProcessing || uiProcessing || nftProcessing,
    userLoading,
    membershipLoading,
    membershipProcessing,
    uiLoading,
    uiProcessing,
    nftLoading,
    nftProcessing,
  };
};

// NFT store selectors
export const useNFTData = () => useNFTStore((state) => ({
  advertisementNFTs: state.advertisementNFTs,
  merchantNFTs: state.merchantNFTs,
  myPurchases: state.myPurchases,
  isLoading: state.isLoading,
  error: state.error,
  lastUpdated: state.lastUpdated,
}));

export const useNFTPurchase = () => useNFTStore((state) => ({
  purchaseState: state.purchaseState,
  purchaseNFT: state.purchaseNFT,
  isProcessing: state.isProcessing,
  currentStep: state.currentStep,
}));

// Actions hook for common operations with stable references
export const useStoreActions = () => {
  // Get individual actions with stable references
  const setWalletConnection = useUserStore((state) => state.setWalletConnection);
  const loadUserData = useUserStore((state) => state.loadUserData);
  const refreshUserAll = useUserStore((state) => state.refreshAll);
  const resetUser = useUserStore((state) => state.reset);
  
  const loadMembershipData = useMembershipStore((state) => state.loadMembershipData);
  const activateMembership = useMembershipStore((state) => state.activateMembership);
  const upgradeMembership = useMembershipStore((state) => state.upgradeMembership);
  const refreshMembershipAll = useMembershipStore((state) => state.refreshAll);
  const resetMembership = useMembershipStore((state) => state.reset);
  
  const addNotification = useUIStore((state) => state.addNotification);
  const setLoading = useUIStore((state) => state.setLoading);
  const setProcessing = useUIStore((state) => state.setProcessing);
  const openModal = useUIStore((state) => state.openModal);
  const closeModal = useUIStore((state) => state.closeModal);
  const resetUI = useUIStore((state) => state.reset);
  
  const loadAdvertisementNFTs = useNFTStore((state) => state.loadAdvertisementNFTs);
  const loadMerchantNFTs = useNFTStore((state) => state.loadMerchantNFTs);
  const loadMyPurchases = useNFTStore((state) => state.loadMyPurchases);
  const purchaseNFT = useNFTStore((state) => state.purchaseNFT);
  const refreshNFTAll = useNFTStore((state) => state.refreshAll);
  const resetNFT = useNFTStore((state) => state.reset);
  
  // Use useMemo to stabilize the returned object reference
  return useMemo(() => ({
    user: {
      setWalletConnection,
      loadUserData,
      refreshAll: refreshUserAll,
      reset: resetUser,
    },
    membership: {
      loadMembershipData,
      activateMembership,
      upgradeMembership,
      refreshAll: refreshMembershipAll,
      reset: resetMembership,
    },
    ui: {
      addNotification,
      setLoading,
      setProcessing,
      openModal,
      closeModal,
      reset: resetUI,
    },
    nft: {
      loadAdvertisementNFTs,
      loadMerchantNFTs,
      loadMyPurchases,
      purchaseNFT,
      refreshAll: refreshNFTAll,
      reset: resetNFT,
    },
    
    // Convenience methods
    connectWallet: (address: string) => {
      setWalletConnection(address, true);
      loadUserData(address);
      loadMembershipData(address);
    },
    
    disconnectWallet: () => {
      setWalletConnection(null, false);
      resetUser();
      resetMembership();
    },
    
    refreshUserData: (address: string) => {
      refreshUserAll(address);
      refreshMembershipAll(address);
    },
    
    showSuccess: (message: string) => {
      addNotification({
        type: 'success',
        title: 'Success',
        message,
      });
    },
    
    showError: (message: string) => {
      addNotification({
        type: 'error',
        title: 'Error',
        message,
      });
    },
  }), [
    // Individual action dependencies
    setWalletConnection, loadUserData, refreshUserAll, resetUser,
    loadMembershipData, activateMembership, upgradeMembership, refreshMembershipAll, resetMembership,
    addNotification, setLoading, setProcessing, openModal, closeModal, resetUI,
    loadAdvertisementNFTs, loadMerchantNFTs, loadMyPurchases, purchaseNFT, refreshNFTAll, resetNFT
  ]);
};