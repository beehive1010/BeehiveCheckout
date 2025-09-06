// Export all Web3 modules from centralized location

// Client configuration
export * from './client';

// Chain definitions and utilities
export * from './chains';

// Wallet configurations
export * from './wallets';

// Smart contract addresses and instances
export * from './contracts';

// Additional utilities and helpers
import { 
  ethereum, 
  polygon, 
  arbitrum, 
  optimism, 
  bsc, 
  base, 
  arbitrumSepolia,
  alphaCentauri,
  supportedChains,
  getChainById,
  getChainMetadata,
  getExplorerUrl,
  getUSDTDecimals 
} from './chains';

import { contractAddresses } from './contracts';

// Payment chain configurations for USDT purchases
export const paymentChains = [
  { 
    chain: ethereum, 
    name: 'Ethereum', 
    symbol: 'ETH',
    id: ethereum?.id || 1,
    usdtAddress: contractAddresses.USDT.ethereum,
    bridgeWallet: contractAddresses.BRIDGE_WALLETS.ethereum,
    icon: 'fab fa-ethereum',
    color: 'text-blue-400'
  },
  { 
    chain: polygon, 
    name: 'Polygon', 
    symbol: 'MATIC',
    id: polygon?.id || 137,
    usdtAddress: contractAddresses.USDT.polygon,
    bridgeWallet: contractAddresses.BRIDGE_WALLETS.polygon,
    icon: 'fas fa-hexagon',
    color: 'text-purple-400'
  },
  { 
    chain: arbitrum, 
    name: 'Arbitrum', 
    symbol: 'ARB',
    id: arbitrum?.id || 42161,
    usdtAddress: contractAddresses.USDT.arbitrum,
    bridgeWallet: contractAddresses.BRIDGE_WALLETS.arbitrum,
    icon: 'fas fa-circle',
    color: 'text-blue-300'
  },
  { 
    chain: optimism, 
    name: 'Optimism', 
    symbol: 'OP',
    id: optimism?.id || 10,
    usdtAddress: contractAddresses.USDT.optimism,
    bridgeWallet: contractAddresses.BRIDGE_WALLETS.optimism,
    icon: 'fas fa-circle',
    color: 'text-red-400'
  },
  { 
    chain: bsc, 
    name: 'BSC', 
    symbol: 'BNB',
    id: bsc?.id || 56,
    usdtAddress: contractAddresses.USDT.bsc,
    bridgeWallet: contractAddresses.BRIDGE_WALLETS.bsc,
    icon: 'fas fa-coins',
    color: 'text-yellow-400'
  },
  { 
    chain: base, 
    name: 'Base', 
    symbol: 'ETH',
    id: base?.id || 8453,
    usdtAddress: contractAddresses.USDT.base,
    bridgeWallet: contractAddresses.BRIDGE_WALLETS.base,
    icon: 'fas fa-cube',
    color: 'text-blue-500'
  },
];

// Helper functions for membership levels and token IDs
export const levelToTokenId = (level: number): bigint => {
  if (level < 1 || level > 19) {
    throw new Error(`Invalid membership level: ${level}. Must be between 1 and 19.`);
  }
  return BigInt(level); // Level 1 maps to Token ID 1
};

export const tokenIdToLevel = (tokenId: bigint): number => {
  const level = Number(tokenId); // Token ID 1 maps to Level 1
  if (level < 1 || level > 19) {
    throw new Error(`Invalid token ID: ${tokenId}. Must be between 1 and 19.`);
  }
  return level;
};

// CTH bridging utilities for Arbitrum Sepolia -> Alpha Centauri L3
export const bridgeUtils = {
  // Check if CTH tokens can be auto-bridged from Arbitrum Sepolia to Alpha Centauri L3
  async canBridgeCTH(amount: number, userAddress: string): Promise<boolean> {
    try {
      // In production, this would check actual CTH balance on Arbitrum Sepolia
      return amount > 0 && userAddress.length === 42;
    } catch (error) {
      console.error('Failed to check CTH bridging eligibility:', error);
      return false;
    }
  },
  
  // Initiate auto-bridge of CTH tokens from Arbitrum Sepolia to Alpha Centauri L3
  async initiateCTHBridge(amount: number, userAddress: string): Promise<{ success: boolean; txHash?: string }> {
    try {
      console.log(`Initiating CTH bridge: ${amount} CTH for ${userAddress}`);
      console.log(`From: Arbitrum Sepolia -> To: Alpha Centauri L3 (native CTH)`);
      
      // Simulate bridge transaction
      const mockTxHash = `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`;
      
      return {
        success: true,
        txHash: mockTxHash
      };
    } catch (error) {
      console.error('CTH bridge failed:', error);
      return { success: false };
    }
  },
  
  // Check bridge status for CTH tokens
  async checkBridgeStatus(txHash: string): Promise<'pending' | 'completed' | 'failed'> {
    try {
      // In production, query the bridge status from Alpha Centauri L3
      return 'completed';
    } catch (error) {
      console.error('Failed to check bridge status:', error);
      return 'failed';
    }
  },
  
  // Get estimated bridge time for CTH tokens (in seconds)
  getEstimatedBridgeTime(): number {
    return 300; // 5 minutes for L2 -> L3 bridge
  }
};

// Referral link utilities
export const generateReferralLink = (walletAddress: string): string => {
  if (!walletAddress) return '';
  const baseUrl = window.location.origin;
  return `${baseUrl}/?ref=${walletAddress}`;
};

export const parseReferralFromUrl = (): string | null => {
  const urlParams = new URLSearchParams(window.location.search);
  const referrer = urlParams.get('ref');
  
  if (referrer && /^0x[a-fA-F0-9]{40}$/.test(referrer)) {
    return referrer;
  }
  
  return null;
};

// Error handling utilities
export const web3ErrorHandler = (error: any): string => {
  if (error?.message) {
    // Handle common Web3 errors
    if (error.message.includes('User denied') || error.message.includes('user rejected')) {
      return 'Transaction was rejected by user';
    }
    if (error.message.includes('insufficient funds')) {
      return 'Insufficient funds for transaction';
    }
    if (error.message.includes('gas')) {
      return 'Transaction failed due to gas issues';
    }
    if (error.message.includes('replacement fee too low')) {
      return 'Transaction fee too low, please try again';
    }
    return error.message;
  }
  
  return 'An unknown error occurred';
};

// Validation utilities
export const validationUtils = {
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  isValidUsername: (username: string): boolean => {
    return username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(username);
  },
  
  isValidPassword: (password: string): boolean => {
    return password.length >= 6;
  },
};

// IPFS utilities
export const ipfsUtils = {
  // Upload metadata to IPFS
  uploadToIPFS: async (metadata: Record<string, any>): Promise<string> => {
    console.log('Uploading metadata to IPFS:', metadata);
    return 'mock-ipfs-hash';
  },
  
  // Get metadata from IPFS
  getFromIPFS: async (hash: string): Promise<Record<string, any> | null> => {
    console.log(`Fetching metadata from IPFS hash: ${hash}`);
    return null;
  },
};

// Payment utilities for USDT purchases
export const paymentUtils = {
  // Create payment intent for membership purchase
  createPaymentIntent: async (amount: number, currency: string, metadata: Record<string, any>) => {
    console.log(`Creating payment intent for ${amount} ${currency}`, metadata);
    return {
      id: 'mock-payment-intent-id',
      client_secret: 'mock-client-secret',
      status: 'requires_payment_method',
    };
  },
  
  // Verify payment completion
  verifyPayment: async (paymentIntentId: string): Promise<boolean> => {
    console.log(`Verifying payment ${paymentIntentId}`);
    return true;
  },
};

// Utility functions for Web3 operations
export const formatWalletAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const isValidWalletAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

// Mock contract interaction functions for testing
export const mockContractFunctions = {
  // Check Bumblebees (BBC) membership level
  checkMembershipLevel: async (walletAddress: string): Promise<number> => {
    console.log(`Checking Bumblebees membership level for ${walletAddress}`);
    return 0; // Return 0 for no membership, 1-19 for levels
  },
  
  // Check Beehive Crypto Coin (BCC) balance
  checkBCCBalance: async (walletAddress: string): Promise<{ transferable: number; restricted: number }> => {
    console.log(`Checking Beehive Crypto Coin balance for ${walletAddress}`);
    return { transferable: 0, restricted: 0 };
  },
  
  // Mint Bumblebees (BBC) membership NFT
  mintMembershipNFT: async (walletAddress: string, level: number, txHash: string): Promise<boolean> => {
    console.log(`Minting Level ${level} Bumblebees NFT for ${walletAddress} with tx ${txHash}`);
    return true;
  },
  
  // Transfer Beehive Crypto Coin (BCC) tokens
  transferBCC: async (from: string, to: string, amount: number): Promise<string> => {
    console.log(`Transferring ${amount} Beehive Crypto Coin from ${from} to ${to}`);
    return 'mock-tx-hash';
  },
  
  // Mint merchant NFT
  mintMerchantNFT: async (walletAddress: string, nftId: string): Promise<string> => {
    console.log(`Minting merchant NFT ${nftId} for ${walletAddress}`);
    return 'mock-nft-tx-hash';
  },
};