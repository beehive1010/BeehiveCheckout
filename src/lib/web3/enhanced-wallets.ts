// Enhanced wallet configuration with multi-chain Gas Sponsorship support
import { inAppWallet, createWallet, walletConnect, smartWallet } from 'thirdweb/wallets';
import { client } from './client';
import { 
  ethereum, 
  polygon, 
  arbitrum, 
  optimism, 
  base, 
  bsc, 
  arbitrumSepolia, 
  supportedChains 
} from './chains';
import type { Chain } from 'thirdweb';

// Gas sponsorship configuration per chain
export interface GasSponsorshipConfig {
  enabled: boolean;
  mode: 'EIP7702' | 'ERC4337' | 'paymaster';
  paymasterUrl?: string;
  bundlerUrl?: string;
  sponsorGas: boolean;
  maxGasSponsored?: string; // in wei
  dailyLimit?: string; // daily limit per wallet in wei
}

// Chain-specific gas sponsorship configurations
export const chainGasSponsorshipConfig: Record<number, GasSponsorshipConfig> = {
  // Ethereum Mainnet - Premium sponsorship
  [ethereum?.id || 1]: {
    enabled: true,
    mode: 'EIP7702',
    sponsorGas: true,
    maxGasSponsored: '0x16345785D8A0000', // 0.1 ETH
    dailyLimit: '0x6F05B59D3B20000', // 0.5 ETH daily
  },
  
  // Polygon - High volume, lower costs
  [polygon?.id || 137]: {
    enabled: true,
    mode: 'ERC4337',
    sponsorGas: true,
    paymasterUrl: 'https://api.thirdweb.com/paymaster/137',
    bundlerUrl: 'https://api.thirdweb.com/bundler/137',
    maxGasSponsored: '0xDE0B6B3A7640000', // 1 MATIC
    dailyLimit: '0x2B5E3AF16B1880000', // 50 MATIC daily
  },
  
  // Arbitrum One - L2 optimized with Account Factory
  [arbitrum?.id || 42161]: {
    enabled: true,
    mode: 'ERC4337',
    sponsorGas: true,
    paymasterUrl: 'https://api.thirdweb.com/paymaster/42161',
    bundlerUrl: 'https://api.thirdweb.com/bundler/42161',
    maxGasSponsored: '0x16345785D8A0000', // 0.1 ETH
    dailyLimit: '0x6F05B59D3B20000', // 0.5 ETH daily
  },
  
  // Arbitrum Sepolia - Testnet with Account Factory
  [arbitrumSepolia?.id || 421614]: {
    enabled: true,
    mode: 'ERC4337',
    sponsorGas: true,
    paymasterUrl: 'https://api.thirdweb.com/paymaster/421614',
    bundlerUrl: 'https://api.thirdweb.com/bundler/421614',
    maxGasSponsored: '0xDE0B6B3A7640000', // 1 ETH (testnet)
    dailyLimit: '0x21E19E0C9BAB2400000', // 10 ETH daily (testnet)
  },
  
  // Optimism
  [optimism?.id || 10]: {
    enabled: true,
    mode: 'EIP7702',
    sponsorGas: true,
    maxGasSponsored: '0x16345785D8A0000', // 0.1 ETH
    dailyLimit: '0x6F05B59D3B20000', // 0.5 ETH daily
  },
  
  // Base - Coinbase backed
  [base?.id || 8453]: {
    enabled: true,
    mode: 'EIP7702',
    sponsorGas: true,
    maxGasSponsored: '0x16345785D8A0000', // 0.1 ETH
    dailyLimit: '0x6F05B59D3B20000', // 0.5 ETH daily
  },
  
  // BSC - BNB sponsorship
  [bsc?.id || 56]: {
    enabled: true,
    mode: 'ERC4337',
    sponsorGas: true,
    paymasterUrl: 'https://api.thirdweb.com/paymaster/56',
    bundlerUrl: 'https://api.thirdweb.com/bundler/56',
    maxGasSponsored: '0x6F05B59D3B20000', // 0.5 BNB
    dailyLimit: '0x1BC16D674EC80000', // 2 BNB daily
  },
};

// Enhanced InApp Wallet with multi-chain gas sponsorship
export const createSponsoredInAppWallet = (activeChain?: Chain) => {
  const chainId = activeChain?.id || arbitrum?.id || 42161; // Default to Arbitrum One
  const gasConfig = chainGasSponsorshipConfig[chainId];
  
  return inAppWallet({
    auth: {
      options: [
        'email',
        'google',
        'apple',
        'discord',
        'telegram',
        'farcaster',
        'phone',
        'passkey',
        'wallet', // Enables external wallet connections
      ],
      mode: 'popup',
    },
    metadata: {
      name: "Beehive Sponsored Wallet",
      icon: "🐝",
      description: "Gasless transactions across multiple chains",
    },
    // Enable gasless transactions if supported on this chain
    ...(gasConfig?.enabled && {
      executionMode: {
        mode: gasConfig.mode,
        sponsorGas: gasConfig.sponsorGas,
        ...(gasConfig.paymasterUrl && { paymasterUrl: gasConfig.paymasterUrl }),
        ...(gasConfig.bundlerUrl && { bundlerUrl: gasConfig.bundlerUrl }),
      }
    }),
  });
};

// Smart wallet with advanced gas sponsorship
export const createSponsoredSmartWallet = (activeChain?: Chain) => {
  const chainId = activeChain?.id || arbitrum?.id || 42161; // Default to Arbitrum One
  const gasConfig = chainGasSponsorshipConfig[chainId];
  
  if (!gasConfig?.enabled) {
    // Fallback to regular smart wallet without sponsorship
    return smartWallet({
      chain: activeChain || arbitrum,
      personalWallet: createSponsoredInAppWallet(activeChain),
    });
  }
  
  return smartWallet({
    chain: activeChain || arbitrum,
    personalWallet: createSponsoredInAppWallet(activeChain),
    gasless: true,
    // Advanced smart wallet configuration
    factoryAddress: getSmartWalletFactoryAddress(chainId),
    executionMode: {
      mode: gasConfig.mode,
      sponsorGas: gasConfig.sponsorGas,
      ...(gasConfig.paymasterUrl && { paymasterUrl: gasConfig.paymasterUrl }),
      ...(gasConfig.bundlerUrl && { bundlerUrl: gasConfig.bundlerUrl }),
    },
  });
};

// Get smart wallet factory address per chain
function getSmartWalletFactoryAddress(chainId: number): string {
  // Account Factory address for gas sponsorship across all chains
  const ACCOUNT_FACTORY_ADDRESS = '0x4be0ddfebca9a5a4a617dee4dece99e7c862dceb';
  
  const factoryAddresses: Record<number, string> = {
    1: ACCOUNT_FACTORY_ADDRESS, // Ethereum
    137: ACCOUNT_FACTORY_ADDRESS, // Polygon
    42161: ACCOUNT_FACTORY_ADDRESS, // Arbitrum One - Primary chain
    421614: ACCOUNT_FACTORY_ADDRESS, // Arbitrum Sepolia
    10: ACCOUNT_FACTORY_ADDRESS, // Optimism
    8453: ACCOUNT_FACTORY_ADDRESS, // Base
    56: ACCOUNT_FACTORY_ADDRESS, // BSC
  };
  
  return factoryAddresses[chainId] || ACCOUNT_FACTORY_ADDRESS;
}

// Enhanced wallet configuration with dynamic gas sponsorship
export const createEnhancedWallets = (activeChain?: Chain) => [
  // Primary: Sponsored Smart Wallet
  createSponsoredSmartWallet(activeChain),
  
  // Secondary: Sponsored InApp Wallet
  createSponsoredInAppWallet(activeChain),
  
  // Standard wallets for fallback
  walletConnect(),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("io.zerion.wallet"),
];

// Utility functions for gas sponsorship
export const gasSponsorshipUtils = {
  // Check if gas sponsorship is available for a chain
  isSponsorshipAvailable: (chainId: number): boolean => {
    return chainGasSponsorshipConfig[chainId]?.enabled || false;
  },
  
  // Get gas sponsorship config for a chain
  getGasConfig: (chainId: number): GasSponsorshipConfig | null => {
    return chainGasSponsorshipConfig[chainId] || null;
  },
  
  // Check if user is eligible for gas sponsorship
  checkSponsorshipEligibility: async (walletAddress: string, chainId: number): Promise<{
    eligible: boolean;
    reason?: string;
    dailyUsed?: string;
    dailyLimit?: string;
  }> => {
    const config = chainGasSponsorshipConfig[chainId];
    if (!config?.enabled) {
      return { eligible: false, reason: 'Gas sponsorship not available on this chain' };
    }
    
    // In production, check actual usage from backend
    // For now, return eligible
    return { 
      eligible: true, 
      dailyUsed: '0',
      dailyLimit: config.dailyLimit || '0'
    };
  },
  
  // Estimate gas costs with sponsorship
  estimateGasCosts: async (chainId: number, transactionData: any): Promise<{
    totalGas: string;
    sponsoredGas: string;
    userPays: string;
    currency: string;
  }> => {
    const config = chainGasSponsorshipConfig[chainId];
    
    // Mock estimation - in production, use actual gas estimation
    const totalGas = '21000'; // 21k gas units
    const gasPrice = '20000000000'; // 20 gwei
    const totalCost = (BigInt(totalGas) * BigInt(gasPrice)).toString();
    
    if (config?.enabled && config.sponsorGas) {
      return {
        totalGas: totalCost,
        sponsoredGas: totalCost, // Fully sponsored
        userPays: '0',
        currency: getChainNativeCurrency(chainId),
      };
    }
    
    return {
      totalGas: totalCost,
      sponsoredGas: '0',
      userPays: totalCost,
      currency: getChainNativeCurrency(chainId),
    };
  },
};

// Get native currency for chain
function getChainNativeCurrency(chainId: number): string {
  const currencies: Record<number, string> = {
    1: 'ETH',
    137: 'MATIC',
    42161: 'ETH',
    421614: 'ETH',
    10: 'ETH',
    8453: 'ETH',
    56: 'BNB',
  };
  
  return currencies[chainId] || 'ETH';
}

// Enhanced wallet connection with automatic gas sponsorship setup
export const connectWithGasSponsorship = async (
  walletType: 'sponsored-smart' | 'sponsored-inapp' | 'standard' = 'sponsored-smart',
  preferredChain?: Chain
) => {
  try {
    const targetChain = preferredChain || arbitrum; // Default to Arbitrum One
    let wallet;
    
    switch (walletType) {
      case 'sponsored-smart':
        wallet = createSponsoredSmartWallet(targetChain);
        break;
      case 'sponsored-inapp':
        wallet = createSponsoredInAppWallet(targetChain);
        break;
      default:
        wallet = createSponsoredInAppWallet(targetChain);
    }
    
    const account = await wallet.connect({ client });
    
    // Check sponsorship eligibility
    const eligibility = await gasSponsorshipUtils.checkSponsorshipEligibility(
      account.address,
      targetChain.id
    );
    
    return {
      success: true,
      wallet,
      account,
      gasSponsorship: {
        enabled: gasSponsorshipUtils.isSponsorshipAvailable(targetChain.id),
        eligible: eligibility.eligible,
        config: gasSponsorshipUtils.getGasConfig(targetChain.id),
      },
    };
  } catch (error) {
    console.error('Sponsored wallet connection failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
};

// Multi-chain gas sponsorship status
export const getMultiChainGasStatus = async (walletAddress: string) => {
  const results: Record<number, any> = {};
  
  for (const [chainId, config] of Object.entries(chainGasSponsorshipConfig)) {
    const id = parseInt(chainId);
    const eligibility = await gasSponsorshipUtils.checkSponsorshipEligibility(walletAddress, id);
    
    results[id] = {
      chainName: getChainName(id),
      enabled: config.enabled,
      eligible: eligibility.eligible,
      mode: config.mode,
      dailyUsed: eligibility.dailyUsed,
      dailyLimit: eligibility.dailyLimit,
      maxPerTx: config.maxGasSponsored,
    };
  }
  
  return results;
};

// Get chain name helper
function getChainName(chainId: number): string {
  const names: Record<number, string> = {
    1: 'Ethereum',
    137: 'Polygon',
    42161: 'Arbitrum',
    421614: 'Arbitrum Sepolia',
    10: 'Optimism',
    8453: 'Base',
    56: 'BSC',
  };
  
  return names[chainId] || `Chain ${chainId}`;
}

export default {
  createSponsoredInAppWallet,
  createSponsoredSmartWallet,
  createEnhancedWallets,
  connectWithGasSponsorship,
  gasSponsorshipUtils,
  getMultiChainGasStatus,
  chainGasSponsorshipConfig,
};