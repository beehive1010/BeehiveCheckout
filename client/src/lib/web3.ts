import { createThirdwebClient, getContract } from 'thirdweb';
import { ethereum, polygon, arbitrum, optimism, arbitrumSepolia, bsc, base } from 'thirdweb/chains';
import { defineChain } from 'thirdweb/chains';
import { inAppWallet, createWallet, walletConnect } from 'thirdweb/wallets';

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

// Supported chains - matching user selection: Base, Arbitrum One, OP Mainnet, BSC, Polygon
export const supportedChains = [ethereum, polygon, arbitrum, arbitrumSepolia, optimism, bsc, base, alphaCentauri];

// Safe chain getter with fallback
export function getChainById(chainId: number | string | undefined) {
  if (!chainId) return ethereum; // Return default chain
  
  const id = typeof chainId === 'string' ? parseInt(chainId) : chainId;
  if (isNaN(id)) return ethereum; // Return default chain
  
  const foundChain = supportedChains.find(chain => chain?.id === id);
  return foundChain || ethereum; // Always return a valid chain
}

// Enhanced chain validation
export function validateChain(chain: any) {
  if (!chain) return false;
  if (typeof chain.id === 'undefined') return false;
  if (!chain.name) return false;
  return true;
}

// Enhanced wallet configuration with social login options and WalletConnect
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
        "wallet", // Enables external wallet connections
      ],
    },
    metadata: {
      name: "Beehive Wallet",
      icon: "🐝",
    },
  }),
  walletConnect(),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("io.rabby"),
  createWallet("io.zerion.wallet"),
];

// Simple wallet connection - no complex authentication needed
// Just use thirdweb's built-in wallet connection

// Contract addresses (these would be set after deployment)
export const contractAddresses = {
  BBC_MEMBERSHIP: {
    arbitrumSepolia: '0xAc8c8662726b72f8DB4F5D1d1a16aC5b06B7a90D',
    alphaCentauri: '0x5f6045Cc578b9f7E20416ede382f31FC151f32E7',
    demo: '0x99265477249389469929CEA07c4a337af9e12cdA', // Demo Beehive Member NFT
  },
  BCC_TOKEN: import.meta.env.VITE_BCC_CONTRACT_ADDRESS || '0x1234567890123456789012345678901234567891',
  CTH_TOKEN: {
    arbitrumSepolia: '0x4022797e9EC167Fd48281fa452Ee49d7c169f125',
    alphaCentauri: '0x0000000000000000000000000000000000000000', // Native CTH on Alpha Centauri L3
  },
  MERCHANT_NFTS: import.meta.env.VITE_MERCHANT_CONTRACT_ADDRESS || '0x1234567890123456789012345678901234567892',
  USDT: {
    ethereum: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    polygon: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    arbitrum: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    arbitrumSepolia: '0x4470734620414168Aa1673A30849DB25E5886E2A', // Test USDT
    optimism: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    bsc: '0x55d398326f99059fF775485246999027B3197955', // BSC USDT
    base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base USDC (native stablecoin)
    alphaCentauri: '0x1234567890123456789012345678901234567893',
  },
  // Test wallet addresses for receiving USDT payments (testing without bridge)
  BRIDGE_WALLETS: {
    ethereum: import.meta.env.VITE_BRIDGE_WALLET_ETH || '0x1234567890123456789012345678901234567894',
    polygon: import.meta.env.VITE_BRIDGE_WALLET_POLYGON || '0x1234567890123456789012345678901234567895',
    arbitrum: import.meta.env.VITE_BRIDGE_WALLET_ARB || '0x1234567890123456789012345678901234567896',
    arbitrumSepolia: '0x6366573ff5f6b07BE1E96b024C8862F5502d13E3', // Test wallet for direct USDT payments
    optimism: import.meta.env.VITE_BRIDGE_WALLET_OP || '0x1234567890123456789012345678901234567897',
    bsc: import.meta.env.VITE_BRIDGE_WALLET_BSC || '0x1234567890123456789012345678901234567899',
    base: import.meta.env.VITE_BRIDGE_WALLET_BASE || '0x1234567890123456789012345678901234567898',
  },
};

// Supported chains for USDT payments
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

// Helper function to convert membership level to token ID
// Level 1 = Token ID 1, Level 2 = Token ID 2, ..., Level 19 = Token ID 19
export const levelToTokenId = (level: number): bigint => {
  if (level < 1 || level > 19) {
    throw new Error(`Invalid membership level: ${level}. Must be between 1 and 19.`);
  }
  return BigInt(level); // Level 1 maps to Token ID 1
};

// Helper function to convert token ID to membership level  
// Token ID 1 = Level 1, Token ID 2 = Level 2, ..., Token ID 19 = Level 19
export const tokenIdToLevel = (tokenId: bigint): number => {
  const level = Number(tokenId); // Token ID 1 maps to Level 1
  if (level < 1 || level > 19) {
    throw new Error(`Invalid token ID: ${tokenId}. Must be between 1 and 19.`);
  }
  return level;
};

// Contract instances for multiple chains
export const bbcMembershipContracts = {
  arbitrumSepolia: getContract({
    client,
    address: contractAddresses.BBC_MEMBERSHIP.arbitrumSepolia,
    chain: arbitrumSepolia,
  }),
  alphaCentauri: getContract({
    client,
    address: contractAddresses.BBC_MEMBERSHIP.alphaCentauri,
    chain: alphaCentauri,
  }),
};

// Legacy single contract for backward compatibility (Alpha Centauri)
export const bbcMembershipContract = bbcMembershipContracts.alphaCentauri;

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

// CTH bridging functions for Arbitrum Sepolia -> Alpha Centauri L3
export const bridgeUtils = {
  // Check if CTH tokens can be auto-bridged from Arbitrum Sepolia to Alpha Centauri L3
  async canBridgeCTH(amount: number, userAddress: string): Promise<boolean> {
    try {
      // Check CTH balance on Arbitrum Sepolia
      const cthContract = getContract({
        client,
        address: contractAddresses.CTH_TOKEN.arbitrumSepolia,
        chain: arbitrumSepolia,
      });
      
      // Return true for demo - in production, check actual balance
      return amount > 0 && userAddress.length === 42;
    } catch (error) {
      console.error('Failed to check CTH bridging eligibility:', error);
      return false;
    }
  },
  
  // Initiate auto-bridge of CTH tokens from Arbitrum Sepolia to Alpha Centauri L3
  async initiateCTHBridge(amount: number, userAddress: string): Promise<{ success: boolean; txHash?: string }> {
    try {
      // In production, this would:
      // 1. Lock CTH tokens on Arbitrum Sepolia
      // 2. Submit bridge transaction
      // 3. Wait for L3 confirmation
      // 4. Return bridge transaction hash
      
      console.log(`Initiating CTH bridge: ${amount} CTH for ${userAddress}`);
      console.log(`From: Arbitrum Sepolia (${contractAddresses.CTH_TOKEN.arbitrumSepolia})`);
      console.log(`To: Alpha Centauri L3 (native CTH)`);
      
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
      // For demo, simulate bridge completion after 30 seconds
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
// Get USDT contract for specific chain
export function getUSDTContract(chainId: number) {
  const chain = getChainById(chainId);
  const chainKey = Object.keys(contractAddresses.USDT).find(key => {
    const chainMap = { ethereum: 1, polygon: 137, arbitrum: 42161, optimism: 10, bsc: 56, base: 8453, alphaCentauri: 141941, arbitrumSepolia: 421614 };
    return chainMap[key as keyof typeof chainMap] === chainId;
  });
  
  if (!chainKey || !contractAddresses.USDT[chainKey as keyof typeof contractAddresses.USDT]) {
    throw new Error(`USDT not supported on chain ${chainId}`);
  }
  
  return getContract({
    client,
    chain,
    address: contractAddresses.USDT[chainKey as keyof typeof contractAddresses.USDT],
  });
}

// Get blockchain explorer URL for transaction  
export function getExplorerUrl(chainId: number, txHash: string): string {
  const explorers = {
    1: 'https://etherscan.io/tx/',
    137: 'https://polygonscan.com/tx/', 
    42161: 'https://arbiscan.io/tx/',
    10: 'https://optimistic.etherscan.io/tx/',
    56: 'https://bscscan.com/tx/',
    8453: 'https://basescan.org/tx/',
    421614: 'https://sepolia.arbiscan.io/tx/', // Arbitrum Sepolia
    141941: 'https://explorer.alpha-centauri.io/tx/',
  };
  
  return `${explorers[chainId as keyof typeof explorers] || explorers[1]}${txHash}`;
}

// USDT decimal places for different chains
export function getUSDTDecimals(chainId: number): number {
  // Most USDT contracts use 6 decimals, except some that use 18
  const decimalsMap = {
    1: 6, // Ethereum USDT
    137: 6, // Polygon USDT  
    42161: 6, // Arbitrum USDT
    10: 6, // Optimism USDT
    56: 18, // BSC USDT 
    8453: 6, // Base USDC
    421614: 6, // Arbitrum Sepolia test USDT
    141941: 18, // Alpha Centauri USDT
  };
  
  return decimalsMap[chainId as keyof typeof decimalsMap] || 6;
}

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
