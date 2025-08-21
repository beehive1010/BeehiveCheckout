import { createThirdwebClient } from 'thirdweb';
import { ethereum, polygon, arbitrum, optimism } from 'thirdweb/chains';

// Initialize Thirdweb client
export const client = createThirdwebClient({
  clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID || process.env.VITE_THIRDWEB_CLIENT_ID || 'demo-client-id'
});

// Supported chains
export const supportedChains = [ethereum, polygon, arbitrum, optimism];

// Contract addresses (these would be set after deployment)
export const contractAddresses = {
  BBC_MEMBERSHIP: process.env.VITE_BBC_CONTRACT_ADDRESS || '',
  BCC_TOKEN: process.env.VITE_BCC_CONTRACT_ADDRESS || '',
  MERCHANT_NFTS: process.env.VITE_MERCHANT_CONTRACT_ADDRESS || '',
  USDT: {
    ethereum: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    polygon: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    arbitrum: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    optimism: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
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

export const generateReferralLink = (walletAddress: string): string => {
  if (!walletAddress) return '';
  const baseUrl = window.location.origin;
  return `${baseUrl}/?ref=${walletAddress}`;
};

export const parseReferralFromUrl = (): string | null => {
  const urlParams = new URLSearchParams(window.location.search);
  const referrer = urlParams.get('ref');
  
  if (referrer && isValidWalletAddress(referrer)) {
    return referrer;
  }
  
  return null;
};

// Mock contract interaction functions
// In a real implementation, these would interact with actual smart contracts
export const mockContractFunctions = {
  // Check BBC membership level
  checkMembershipLevel: async (walletAddress: string): Promise<number> => {
    // Mock implementation - would call actual BBC contract
    console.log(`Checking membership level for ${walletAddress}`);
    return 0; // Return 0 for no membership, 1-19 for levels
  },
  
  // Check BCC balance
  checkBCCBalance: async (walletAddress: string): Promise<{ transferable: number; restricted: number }> => {
    // Mock implementation - would call actual BCC contract
    console.log(`Checking BCC balance for ${walletAddress}`);
    return { transferable: 0, restricted: 0 };
  },
  
  // Mint BBC membership NFT
  mintMembershipNFT: async (walletAddress: string, level: number, txHash: string): Promise<boolean> => {
    // Mock implementation - would call BBC contract mint function
    console.log(`Minting Level ${level} BBC NFT for ${walletAddress} with tx ${txHash}`);
    return true;
  },
  
  // Transfer BCC tokens
  transferBCC: async (from: string, to: string, amount: number): Promise<string> => {
    // Mock implementation - would call BCC contract transfer function
    console.log(`Transferring ${amount} BCC from ${from} to ${to}`);
    return 'mock-tx-hash';
  },
  
  // Mint merchant NFT
  mintMerchantNFT: async (walletAddress: string, nftId: string): Promise<string> => {
    // Mock implementation - would call merchant contract mint function
    console.log(`Minting merchant NFT ${nftId} for ${walletAddress}`);
    return 'mock-nft-tx-hash';
  },
};

// IPFS utilities
export const ipfsUtils = {
  // Upload metadata to IPFS
  uploadToIPFS: async (metadata: Record<string, any>): Promise<string> => {
    // Mock implementation - would use Thirdweb storage or IPFS client
    console.log('Uploading metadata to IPFS:', metadata);
    return 'mock-ipfs-hash';
  },
  
  // Get metadata from IPFS
  getFromIPFS: async (hash: string): Promise<Record<string, any> | null> => {
    // Mock implementation - would fetch from IPFS
    console.log(`Fetching metadata from IPFS hash: ${hash}`);
    return null;
  },
};

// Payment utilities for USDT purchases
export const paymentUtils = {
  // Create payment intent for membership purchase
  createPaymentIntent: async (amount: number, currency: string, metadata: Record<string, any>) => {
    // Mock implementation - would integrate with payment processor
    console.log(`Creating payment intent for ${amount} ${currency}`, metadata);
    return {
      id: 'mock-payment-intent-id',
      client_secret: 'mock-client-secret',
      status: 'requires_payment_method',
    };
  },
  
  // Verify payment completion
  verifyPayment: async (paymentIntentId: string): Promise<boolean> => {
    // Mock implementation - would verify payment with processor
    console.log(`Verifying payment ${paymentIntentId}`);
    return true;
  },
};

// Error handling utilities
export const web3ErrorHandler = (error: any): string => {
  if (error?.message) {
    // Handle common Web3 errors
    if (error.message.includes('User denied')) {
      return 'Transaction was rejected by user';
    }
    if (error.message.includes('insufficient funds')) {
      return 'Insufficient funds for transaction';
    }
    if (error.message.includes('gas')) {
      return 'Transaction failed due to gas issues';
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
