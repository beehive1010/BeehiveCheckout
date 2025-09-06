import { inAppWallet, createWallet, walletConnect } from 'thirdweb/wallets';

// Enhanced wallet configuration with social login options and WalletConnect
export const wallets = [
  // In-app wallet with multiple auth options
  inAppWallet({
    auth: {
      options: [
        "google",
        "discord", 
        "telegram",
        "farcaster",
        "email",
        "x",
        "passkey",
        "phone",
        "apple",
        "wallet", // Enables external wallet connections
      ],
    },
    metadata: {
      name: "Beehive Wallet",
      icon: "🐝",
    },
  }),
  
  // WalletConnect for mobile wallet connections
  walletConnect(),
  
  // Popular external wallets
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("io.rabby"),
  createWallet("io.zerion.wallet"),
  createWallet("com.trustwallet.app"),
];

// Wallet categories for UI organization
export const walletCategories = {
  social: [
    {
      id: "beehive",
      name: "Beehive Wallet",
      description: "Sign in with email, Google, or social accounts",
      icon: "🐝",
      type: "social",
    },
  ],
  mobile: [
    {
      id: "walletconnect",
      name: "Mobile Wallets",
      description: "Connect with any mobile wallet via WalletConnect",
      icon: "📱",
      type: "walletconnect",
    },
  ],
  browser: [
    {
      id: "metamask",
      name: "MetaMask",
      description: "Connect using MetaMask browser extension",
      icon: "🦊",
      type: "injected",
    },
    {
      id: "coinbase",
      name: "Coinbase Wallet",
      description: "Connect using Coinbase Wallet",
      icon: "💙",
      type: "injected",
    },
    {
      id: "rainbow",
      name: "Rainbow",
      description: "Connect using Rainbow wallet",
      icon: "🌈",
      type: "injected",
    },
  ],
  hardware: [
    {
      id: "ledger",
      name: "Ledger",
      description: "Connect your Ledger hardware wallet",
      icon: "🔐",
      type: "hardware",
    },
  ],
};

// Wallet configuration options
export const walletConfig = {
  // App metadata for wallet connection modals
  appMetadata: {
    name: "BeeHive Platform",
    description: "Web3 membership and learning platform",
    logoUrl: "https://your-domain.com/logo.png",
    url: "https://your-domain.com",
  },
  
  // Connection options
  modalOptions: {
    size: "compact" as const,
    welcomeScreen: {
      title: "Welcome to BeeHive",
      subtitle: "Connect your wallet to access the hive",
    },
    termsOfServiceUrl: "https://your-domain.com/terms",
    privacyPolicyUrl: "https://your-domain.com/privacy",
  },
  
  // Supported authentication methods
  authOptions: {
    enableGuestMode: false,
    requireAuth: true,
    sessionLength: "7d", // 7 days
  },
};

// Helper functions for wallet management
export const walletUtils = {
  // Check if wallet is connected
  isWalletConnected: (wallet: any) => {
    return wallet && wallet.getAccount();
  },
  
  // Format wallet address for display
  formatWalletAddress: (address: string): string => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  },
  
  // Validate wallet address format
  isValidWalletAddress: (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  },
  
  // Get wallet type from wallet ID
  getWalletType: (walletId: string): string => {
    if (walletId.includes('metamask')) return 'MetaMask';
    if (walletId.includes('coinbase')) return 'Coinbase';
    if (walletId.includes('walletconnect')) return 'WalletConnect';
    if (walletId.includes('inapp')) return 'Social Login';
    return 'Unknown';
  },
};

// Wallet connection error handling
export const walletErrorHandler = (error: any): string => {
  if (error?.message) {
    // Handle common wallet connection errors
    if (error.message.includes('User denied') || error.message.includes('user rejected')) {
      return 'Connection was rejected by user';
    }
    if (error.message.includes('No provider')) {
      return 'Wallet not detected. Please install the wallet extension.';
    }
    if (error.message.includes('Unsupported chain')) {
      return 'Please switch to a supported network';
    }
    if (error.message.includes('Already pending')) {
      return 'Connection request already pending. Check your wallet.';
    }
    return error.message;
  }
  
  return 'Failed to connect wallet';
};