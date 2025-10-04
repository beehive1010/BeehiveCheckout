// Network Configuration for Beehive Platform
// According to MarketingPlan.md requirements:
// - Mainnet: Arbitrum One 
// - Testnet: Arbitrum Sepolia

import { arbitrum, arbitrumSepolia } from 'thirdweb/chains';
import { contractAddresses } from './contracts';

// Primary Network Configuration as per MarketingPlan.md
export const NETWORK_CONFIG = {
  // Primary mainnet for production
  MAINNET: {
    chain: arbitrum,
    name: 'Arbitrum One',
    chainId: arbitrum.id, // 42161
    isTestnet: false,
    environment: 'production'
  },
  
  // Primary testnet for development and testing
  TESTNET: {
    chain: arbitrumSepolia,
    name: 'Arbitrum Sepolia',
    chainId: arbitrumSepolia.id, // 421614
    isTestnet: true,
    environment: 'development'
  }
} as const;

// Get the primary network based on environment
export function getPrimaryNetwork() {
  const isDevelopment = import.meta.env.DEV;
  return isDevelopment ? NETWORK_CONFIG.TESTNET : NETWORK_CONFIG.MAINNET;
}

// Get primary network chain
export function getPrimaryChain() {
  return getPrimaryNetwork().chain;
}

// Get primary network contract addresses
export function getPrimaryContracts() {
  const network = getPrimaryNetwork();
  const networkKey = network.isTestnet ? 'arbitrumSepolia' : 'arbitrum';
  
  return {
    membership: contractAddresses.BBC_MEMBERSHIP[networkKey],
    bccToken: contractAddresses.BCC_TOKEN[networkKey],
    merchantNfts: contractAddresses.MERCHANT_NFTS[networkKey],
    usdt: contractAddresses.USDT[networkKey],
    bridgeWallet: contractAddresses.BRIDGE_WALLETS[networkKey],
  };
}

// Network validation
export function validatePrimaryNetwork() {
  const network = getPrimaryNetwork();
  const contracts = getPrimaryContracts();
  
  if (!network.chain || !network.chainId) {
    throw new Error('Invalid primary network configuration');
  }
  
  if (!contracts.membership || contracts.membership === '0x0000000000000000000000000000000000000000') {
    console.warn('Primary network membership contract not configured');
  }
  
  return true;
}

// Export primary network info for UI components
export const PRIMARY_NETWORK_INFO = {
  get current() {
    return getPrimaryNetwork();
  },
  get chain() {
    return getPrimaryChain();
  },
  get contracts() {
    return getPrimaryContracts();
  },
  get isTestnet() {
    return getPrimaryNetwork().isTestnet;
  },
  get displayName() {
    return getPrimaryNetwork().name;
  }
};

// Network switching utilities
export function getNetworkDisplayInfo(chainId: number) {
  if (chainId === NETWORK_CONFIG.MAINNET.chainId) {
    return {
      name: 'Arbitrum One',
      isTestnet: false,
      isPrimary: true,
      environment: 'production'
    };
  }
  
  if (chainId === NETWORK_CONFIG.TESTNET.chainId) {
    return {
      name: 'Arbitrum Sepolia',
      isTestnet: true,
      isPrimary: true,
      environment: 'development'
    };
  }
  
  return {
    name: 'Unknown Network',
    isTestnet: false,
    isPrimary: false,
    environment: 'unknown'
  };
}

// Membership activation button configuration per MarketingPlan.md
export const ACTIVATION_BUTTONS = {
  MAINNET: {
    label: 'Mainnet (Arbitrum One)',
    chain: NETWORK_CONFIG.MAINNET.chain,
    network: NETWORK_CONFIG.MAINNET,
    cost: '130 USDT', // Per MarketingPlan.md: 100 USDT NFT + 30 USDT activation fee
    description: 'Activate on Arbitrum One mainnet'
  },
  TESTNET: {
    label: 'Testnet (Arbitrum Sepolia)', 
    chain: NETWORK_CONFIG.TESTNET.chain,
    network: NETWORK_CONFIG.TESTNET,
    cost: '130 USDT', // Same cost structure for testing
    description: 'Activate on Arbitrum Sepolia testnet'
  },
  SIMULATION: {
    label: 'Simulation button',
    chain: NETWORK_CONFIG.TESTNET.chain, // Use testnet for simulation
    network: NETWORK_CONFIG.TESTNET,
    cost: '0 USDT', // Free for testing
    description: 'Simulate activation for testing'
  }
} as const;