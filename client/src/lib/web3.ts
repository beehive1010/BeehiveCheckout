import { createThirdwebClient, getContract } from 'thirdweb';
import { ethereum, polygon, arbitrum, optimism } from 'thirdweb/chains';
import { defineChain } from 'thirdweb/chains';
import { inAppWallet, createWallet } from 'thirdweb/wallets';

// Initialize Thirdweb client
export const client = createThirdwebClient({
  clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID || '3123b1ac2ebdb966dd415c6e964dc335'
});

// Define Alpha Centauri chain (ACC)
export const alphaCentauri = defineChain({
  id: 141941,
  name: 'Alpha-centauri (ACC)',
  nativeCurrency: {
    name: 'Centauri Honey',
    symbol: 'CTH',
    decimals: 18,
  },
  rpc: 'https://rpc.alpha-centauri.io',
  blockExplorers: [
    {
      name: 'Alpha Centauri Explorer',
      url: 'https://explorer.alpha-centauri.io',
      apiUrl: 'https://explorer.alpha-centauri.io/api',
    },
  ],
});

// Supported chains
export const supportedChains = [ethereum, polygon, arbitrum, optimism, alphaCentauri];

// Enhanced wallet configuration with social login options
export const wallets = [
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
      ],
    },
  }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("io.rabby"),
  createWallet("io.zerion.wallet"),
];

// Authentication hooks for backend integration
export const authConfig = {
  async doLogin(params: any) {
    // Call backend to verify the signed payload
    try {
      // Extract data from Thirdweb's parameter structure
      const address = params.payload?.address || params.address;
      const message = params.payload?.message || params.message;
      const signature = params.signature;
      
      // Validate required fields
      if (!address || !signature || !message) {
        console.error('Authentication failed: Missing required fields');
        throw new Error('Missing required authentication fields');
      }
      
      const response = await fetch('/api/auth/verify-signature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: address,
          signature: signature,
          message: message,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Authentication successful:', data);
        // Store auth token or session info
        localStorage.setItem('beehive-auth-token', data.token);
      } else {
        const errorData = await response.json();
        console.error('Authentication failed:', errorData);
        throw new Error(errorData.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('Login verification failed:', error);
      throw error; // Re-throw to ensure Thirdweb handles the error
    }
  },
  
  async doLogout() {
    // Call backend to logout the user
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('beehive-auth-token')}`,
        },
      });
      
      // Clear local auth data
      localStorage.removeItem('beehive-auth-token');
      localStorage.removeItem('beehive-user');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  },
  
  async getLoginPayload(params: any) {
    // Call backend and return the payload for signing
    try {
      if (!params.address) {
        throw new Error('Wallet address is required');
      }
      
      const response = await fetch('/api/auth/login-payload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: params.address,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.payload;
      } else {
        const errorData = await response.json();
        console.error('Failed to get login payload:', errorData);
        throw new Error(errorData.error || 'Failed to get login payload');
      }
    } catch (error) {
      console.error('Failed to get login payload:', error);
      throw error;
    }
  },
  
  async isLoggedIn() {
    // Check if user is logged in by validating token
    try {
      const token = localStorage.getItem('beehive-auth-token');
      if (!token) return false;
      
      const response = await fetch('/api/auth/verify-token', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      return response.ok;
    } catch (error) {
      console.error('Token verification failed:', error);
      return false;
    }
  },
};

// Contract addresses (these would be set after deployment)
export const contractAddresses = {
  BBC_MEMBERSHIP: import.meta.env.VITE_BBC_CONTRACT_ADDRESS || '0x6D513487bd63430Ca71Cd1d9A7DeA5aAcDbf0322',
  BCC_TOKEN: import.meta.env.VITE_BCC_CONTRACT_ADDRESS || '0x1234567890123456789012345678901234567891',
  MERCHANT_NFTS: import.meta.env.VITE_MERCHANT_CONTRACT_ADDRESS || '0x1234567890123456789012345678901234567892',
  USDT: {
    ethereum: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    polygon: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    arbitrum: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    optimism: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    alphaCentauri: '0x1234567890123456789012345678901234567893',
  },
  // Bridge wallet addresses for receiving USDT payments
  BRIDGE_WALLETS: {
    ethereum: import.meta.env.VITE_BRIDGE_WALLET_ETH || '0x1234567890123456789012345678901234567894',
    polygon: import.meta.env.VITE_BRIDGE_WALLET_POLYGON || '0x1234567890123456789012345678901234567895',
    arbitrum: import.meta.env.VITE_BRIDGE_WALLET_ARB || '0x1234567890123456789012345678901234567896',
    optimism: import.meta.env.VITE_BRIDGE_WALLET_OP || '0x1234567890123456789012345678901234567897',
  },
};

// Supported chains for USDT payments
export const paymentChains = [
  { 
    chain: ethereum, 
    name: 'Ethereum', 
    symbol: 'ETH',
    usdtAddress: contractAddresses.USDT.ethereum,
    bridgeWallet: contractAddresses.BRIDGE_WALLETS.ethereum,
    icon: 'fab fa-ethereum',
    color: 'text-blue-400'
  },
  { 
    chain: polygon, 
    name: 'Polygon', 
    symbol: 'MATIC',
    usdtAddress: contractAddresses.USDT.polygon,
    bridgeWallet: contractAddresses.BRIDGE_WALLETS.polygon,
    icon: 'fas fa-hexagon',
    color: 'text-purple-400'
  },
  { 
    chain: arbitrum, 
    name: 'Arbitrum', 
    symbol: 'ARB',
    usdtAddress: contractAddresses.USDT.arbitrum,
    bridgeWallet: contractAddresses.BRIDGE_WALLETS.arbitrum,
    icon: 'fas fa-circle',
    color: 'text-blue-300'
  },
  { 
    chain: optimism, 
    name: 'Optimism', 
    symbol: 'OP',
    usdtAddress: contractAddresses.USDT.optimism,
    bridgeWallet: contractAddresses.BRIDGE_WALLETS.optimism,
    icon: 'fas fa-circle',
    color: 'text-red-400'
  },
];

// Helper function to convert membership level to token ID
// Level 1 = Token ID 0, Level 2 = Token ID 1, ..., Level 18 = Token ID 17
export const levelToTokenId = (level: number): bigint => {
  if (level < 1 || level > 18) {
    throw new Error(`Invalid membership level: ${level}. Must be between 1 and 18.`);
  }
  return BigInt(level - 1);
};

// Helper function to convert token ID to membership level  
// Token ID 0 = Level 1, Token ID 1 = Level 2, ..., Token ID 17 = Level 18
export const tokenIdToLevel = (tokenId: bigint): number => {
  const level = Number(tokenId) + 1;
  if (level < 1 || level > 18) {
    throw new Error(`Invalid token ID: ${tokenId}. Must be between 0 and 17.`);
  }
  return level;
};

// Contract instances
export const bbcMembershipContract = getContract({
  client,
  address: contractAddresses.BBC_MEMBERSHIP,
  chain: alphaCentauri,
});

export const bccTokenContract = getContract({
  client,
  address: contractAddresses.BCC_TOKEN,
  chain: alphaCentauri,
});

export const merchantNFTContract = getContract({
  client,
  address: contractAddresses.MERCHANT_NFTS,
  chain: alphaCentauri,
});

export const usdtContract = getContract({
  client,
  address: contractAddresses.USDT.alphaCentauri,
  chain: alphaCentauri,
});

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
  // Check Bumblebees (BBC) membership level
  checkMembershipLevel: async (walletAddress: string): Promise<number> => {
    // Mock implementation - would call actual Bumblebees contract
    console.log(`Checking Bumblebees membership level for ${walletAddress}`);
    return 0; // Return 0 for no membership, 1-19 for levels
  },
  
  // Check Beehive Crypto Coin (BCC) balance
  checkBCCBalance: async (walletAddress: string): Promise<{ transferable: number; restricted: number }> => {
    // Mock implementation - would call actual BCC contract
    console.log(`Checking Beehive Crypto Coin balance for ${walletAddress}`);
    return { transferable: 0, restricted: 0 };
  },
  
  // Mint Bumblebees (BBC) membership NFT
  mintMembershipNFT: async (walletAddress: string, level: number, txHash: string): Promise<boolean> => {
    // Mock implementation - would call Bumblebees contract mint function
    console.log(`Minting Level ${level} Bumblebees NFT for ${walletAddress} with tx ${txHash}`);
    return true;
  },
  
  // Transfer Beehive Crypto Coin (BCC) tokens
  transferBCC: async (from: string, to: string, amount: number): Promise<string> => {
    // Mock implementation - would call BCC contract transfer function
    console.log(`Transferring ${amount} Beehive Crypto Coin from ${from} to ${to}`);
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
