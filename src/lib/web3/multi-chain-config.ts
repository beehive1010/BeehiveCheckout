// Multi-Chain Payment Configuration for Beehive Platform
// Supports cross-chain USDC payments via Thirdweb on multiple networks
// User requirement: ETH, BSC, OP, ARB, POL, BASE

import { 
  ethereum, 
  polygon, 
  arbitrum, 
  optimism, 
  bsc, 
  base,
  arbitrumSepolia 
} from 'thirdweb/chains';
import { contractAddresses } from './contracts';

export interface ChainConfig {
  chain: any;
  chainId: number;
  name: string;
  symbol: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  usdcAddress: string;
  bridgeWalletAddress: string;
  icon: string;
  color: string;
  isTestnet: boolean;
  averageGasFee: number; // in USD
  confirmationBlocks: number;
  blockTime: number; // in seconds
  rpcEndpoint?: string;
  explorerUrl: string;
}

// Multi-chain payment configuration supporting all required chains
export const MULTI_CHAIN_CONFIG: Record<string, ChainConfig> = {
  // Ethereum Mainnet
  ethereum: {
    chain: ethereum,
    chainId: ethereum.id, // 1
    name: 'Ethereum',
    symbol: 'ETH',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    usdcAddress: contractAddresses.USDT.ethereum, // Using USDT for now
    bridgeWalletAddress: contractAddresses.BRIDGE_WALLETS.ethereum,
    icon: 'fab fa-ethereum',
    color: 'text-blue-400',
    isTestnet: false,
    averageGasFee: 15, // USD
    confirmationBlocks: 12,
    blockTime: 12,
    explorerUrl: 'https://etherscan.io'
  },

  // Binance Smart Chain
  bsc: {
    chain: bsc,
    chainId: bsc.id, // 56
    name: 'BSC',
    symbol: 'BNB',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18
    },
    usdcAddress: contractAddresses.USDT.bsc,
    bridgeWalletAddress: contractAddresses.BRIDGE_WALLETS.bsc,
    icon: 'fas fa-coins',
    color: 'text-yellow-400',
    isTestnet: false,
    averageGasFee: 0.5, // USD
    confirmationBlocks: 15,
    blockTime: 3,
    explorerUrl: 'https://bscscan.com'
  },

  // Optimism
  optimism: {
    chain: optimism,
    chainId: optimism.id, // 10
    name: 'Optimism',
    symbol: 'OP',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    usdcAddress: contractAddresses.USDT.optimism,
    bridgeWalletAddress: contractAddresses.BRIDGE_WALLETS.optimism,
    icon: 'fas fa-circle',
    color: 'text-red-400',
    isTestnet: false,
    averageGasFee: 0.5, // USD
    confirmationBlocks: 10,
    blockTime: 2,
    explorerUrl: 'https://optimistic.etherscan.io'
  },

  // Arbitrum One
  arbitrum: {
    chain: arbitrum,
    chainId: arbitrum.id, // 42161
    name: 'Arbitrum',
    symbol: 'ARB',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    usdcAddress: contractAddresses.USDT.arbitrum,
    bridgeWalletAddress: contractAddresses.BRIDGE_WALLETS.arbitrum,
    icon: 'fas fa-circle',
    color: 'text-blue-300',
    isTestnet: false,
    averageGasFee: 0.8, // USD
    confirmationBlocks: 10,
    blockTime: 1,
    explorerUrl: 'https://arbiscan.io'
  },

  // Polygon
  polygon: {
    chain: polygon,
    chainId: polygon.id, // 137
    name: 'Polygon',
    symbol: 'MATIC',
    nativeCurrency: {
      name: 'Polygon',
      symbol: 'MATIC',
      decimals: 18
    },
    usdcAddress: contractAddresses.USDT.polygon,
    bridgeWalletAddress: contractAddresses.BRIDGE_WALLETS.polygon,
    icon: 'fas fa-hexagon',
    color: 'text-purple-400',
    isTestnet: false,
    averageGasFee: 0.02, // USD
    confirmationBlocks: 128,
    blockTime: 2,
    explorerUrl: 'https://polygonscan.com'
  },

  // Base
  base: {
    chain: base,
    chainId: base.id, // 8453
    name: 'Base',
    symbol: 'BASE',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    usdcAddress: contractAddresses.USDT.base,
    bridgeWalletAddress: contractAddresses.BRIDGE_WALLETS.base,
    icon: 'fas fa-square',
    color: 'text-blue-500',
    isTestnet: false,
    averageGasFee: 0.3, // USD
    confirmationBlocks: 10,
    blockTime: 2,
    explorerUrl: 'https://basescan.org'
  },

  // Arbitrum Sepolia (Testnet)
  arbitrumSepolia: {
    chain: arbitrumSepolia,
    chainId: arbitrumSepolia.id, // 421614
    name: 'Arbitrum Sepolia',
    symbol: 'ARB',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    usdcAddress: contractAddresses.USDT.arbitrumSepolia,
    bridgeWalletAddress: contractAddresses.BRIDGE_WALLETS.arbitrumSepolia,
    icon: 'fas fa-circle',
    color: 'text-blue-300',
    isTestnet: true,
    averageGasFee: 0, // Free for testnet
    confirmationBlocks: 1,
    blockTime: 1,
    explorerUrl: 'https://sepolia-explorer.arbitrum.io'
  }
};

// Get all supported payment chains
export function getSupportedPaymentChains(): ChainConfig[] {
  return Object.values(MULTI_CHAIN_CONFIG);
}

// Get mainnet payment chains only  
export function getMainnetPaymentChains(): ChainConfig[] {
  return getSupportedPaymentChains().filter(config => !config.isTestnet);
}

// Get testnet payment chains only
export function getTestnetPaymentChains(): ChainConfig[] {
  return getSupportedPaymentChains().filter(config => config.isTestnet);
}

// Get chain config by chain ID
export function getChainConfig(chainId: number): ChainConfig | undefined {
  return getSupportedPaymentChains().find(config => config.chainId === chainId);
}

// Get chain config by name
export function getChainConfigByName(name: string): ChainConfig | undefined {
  return MULTI_CHAIN_CONFIG[name.toLowerCase()];
}

// Payment Method Configuration
export interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  chains: ChainConfig[];
  minAmount: number; // in USDC
  maxAmount: number; // in USDC
  processingTime: string;
  supportsBridge: boolean;
}

// Available payment methods for multi-chain USDC
export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'direct_usdc',
    name: 'Direct USDC Payment',
    description: 'Pay directly with USDC on any supported chain',
    chains: getSupportedPaymentChains(),
    minAmount: 1,
    maxAmount: 10000,
    processingTime: '1-5 minutes',
    supportsBridge: false
  },
  {
    id: 'bridge_usdc', 
    name: 'Cross-Chain Bridge Payment',
    description: 'Bridge USDC from any chain to our primary network',
    chains: getMainnetPaymentChains(),
    minAmount: 10,
    maxAmount: 50000,
    processingTime: '10-30 minutes',
    supportsBridge: true
  }
];

// Bridge Configuration for Cross-Chain Operations
export interface BridgeConfig {
  sourceChain: ChainConfig;
  targetChain: ChainConfig;
  bridgeFee: number; // in USDC
  estimatedTime: number; // in minutes
  minAmount: number;
  maxAmount: number;
  isAvailable: boolean;
}

// Generate bridge configurations for all chain pairs
export function generateBridgeConfigs(): BridgeConfig[] {
  const configs: BridgeConfig[] = [];
  const chains = getMainnetPaymentChains();
  const targetChain = MULTI_CHAIN_CONFIG.arbitrum; // Bridge to Arbitrum as primary
  
  chains.forEach(sourceChain => {
    if (sourceChain.chainId !== targetChain.chainId) {
      configs.push({
        sourceChain,
        targetChain,
        bridgeFee: calculateBridgeFee(sourceChain, targetChain),
        estimatedTime: calculateBridgeTime(sourceChain, targetChain),
        minAmount: 10,
        maxAmount: 50000,
        isAvailable: true
      });
    }
  });
  
  return configs;
}

// Calculate bridge fee based on source chain
function calculateBridgeFee(source: ChainConfig, target: ChainConfig): number {
  // Base bridge fee + source chain gas cost estimate
  const baseFee = 1; // 1 USDC base fee
  const gasMultiplier = source.averageGasFee / 10; // Scale gas fee
  return Math.max(baseFee, baseFee + gasMultiplier);
}

// Calculate estimated bridge time
function calculateBridgeTime(source: ChainConfig, target: ChainConfig): number {
  // Faster chains = faster bridge times
  const sourceTime = source.blockTime * source.confirmationBlocks / 60; // minutes
  const targetTime = target.blockTime * target.confirmationBlocks / 60; // minutes
  return Math.ceil(sourceTime + targetTime + 5); // Add 5min processing buffer
}

// Fee Calculation Utilities
export function calculateTransactionFee(chainId: number, amount: number): {
  networkFee: number;
  platformFee: number;
  totalFee: number;
  netAmount: number;
} {
  const config = getChainConfig(chainId);
  if (!config) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  
  // Network fee (gas cost)
  const networkFee = config.averageGasFee;
  
  // Platform fee (0.5% of transaction amount, min $0.10, max $5.00)
  const platformFeeRate = 0.005; // 0.5%
  const platformFee = Math.min(Math.max(amount * platformFeeRate, 0.10), 5.00);
  
  const totalFee = networkFee + platformFee;
  const netAmount = amount - totalFee;
  
  return {
    networkFee,
    platformFee,
    totalFee,
    netAmount
  };
}

// Validation utilities
export function validatePaymentAmount(amount: number, chainId: number): {
  isValid: boolean;
  error?: string;
} {
  const config = getChainConfig(chainId);
  if (!config) {
    return { isValid: false, error: 'Unsupported chain' };
  }
  
  if (amount < 1) {
    return { isValid: false, error: 'Minimum amount is $1 USDC' };
  }
  
  if (amount > 10000) {
    return { isValid: false, error: 'Maximum amount is $10,000 USDC per transaction' };
  }
  
  return { isValid: true };
}

// Format display utilities
export function formatChainName(chainId: number): string {
  const config = getChainConfig(chainId);
  return config ? config.name : `Chain ${chainId}`;
}

export function formatTransactionUrl(chainId: number, txHash: string): string {
  const config = getChainConfig(chainId);
  if (!config) return '';
  return `${config.explorerUrl}/tx/${txHash}`;
}

// Export commonly used chains for easy access
export const SUPPORTED_CHAINS = {
  ETHEREUM: MULTI_CHAIN_CONFIG.ethereum,
  BSC: MULTI_CHAIN_CONFIG.bsc, 
  OPTIMISM: MULTI_CHAIN_CONFIG.optimism,
  ARBITRUM: MULTI_CHAIN_CONFIG.arbitrum,
  POLYGON: MULTI_CHAIN_CONFIG.polygon,
  BASE: MULTI_CHAIN_CONFIG.base,
  ARBITRUM_SEPOLIA: MULTI_CHAIN_CONFIG.arbitrumSepolia
};