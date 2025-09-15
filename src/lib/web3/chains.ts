import { defineChain } from 'thirdweb/chains';
import { ethereum, polygon, arbitrum, optimism, arbitrumSepolia, bsc, base } from 'thirdweb/chains';

// Export standard chains
export { ethereum, polygon, arbitrum, optimism, arbitrumSepolia, bsc, base };

// Define custom Alpha Centauri chain (ACC)
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

// All supported chains in the platform
export const supportedChains = [
  ethereum, 
  polygon, 
  arbitrum, 
  arbitrumSepolia, 
  optimism, 
  bsc, 
  base, 
  alphaCentauri
];

// Chain utilities
export function getChainById(chainId: number | string | undefined) {
  if (!chainId) return arbitrum; // Return Arbitrum One as default
  
  const id = typeof chainId === 'string' ? parseInt(chainId) : chainId;
  if (isNaN(id)) return arbitrum; // Return Arbitrum One as default
  
  const foundChain = supportedChains.find(chain => chain && chain.id === id);
  
  // Log chain lookup for debugging
  if (!foundChain) {
    console.warn(`⚠️ Unknown chain ID ${id}, falling back to Arbitrum One (${arbitrum.id})`);
  }
  
  return foundChain || arbitrum; // Return Arbitrum One if not found
}

// Enhanced chain validation
export function validateChain(chain: any) {
  if (!chain || typeof chain !== 'object') return false;
  if (typeof chain.id === 'undefined' || chain.id === null) return false;
  if (!chain.name || typeof chain.name !== 'string') return false;
  return true;
}

// Chain metadata for UI display
export const chainMetadata = {
  [ethereum.id]: {
    name: 'Ethereum',
    symbol: 'ETH',
    icon: 'fab fa-ethereum',
    color: 'text-blue-400',
    isTestnet: false,
  },
  [polygon.id]: {
    name: 'Polygon',
    symbol: 'MATIC', 
    icon: 'fas fa-hexagon',
    color: 'text-purple-400',
    isTestnet: false,
  },
  [arbitrum.id]: {
    name: 'Arbitrum',
    symbol: 'ARB',
    icon: 'fas fa-circle',
    color: 'text-blue-300',
    isTestnet: false,
  },
  [arbitrumSepolia.id]: {
    name: 'Arbitrum Sepolia',
    symbol: 'ARB',
    icon: 'fas fa-circle',
    color: 'text-blue-300',
    isTestnet: true,
  },
  [optimism.id]: {
    name: 'Optimism',
    symbol: 'OP',
    icon: 'fas fa-circle',
    color: 'text-red-400',
    isTestnet: false,
  },
  [bsc.id]: {
    name: 'BSC',
    symbol: 'BNB',
    icon: 'fas fa-coins',
    color: 'text-yellow-400',
    isTestnet: false,
  },
  [base.id]: {
    name: 'Base',
    symbol: 'ETH',
    icon: 'fas fa-cube',
    color: 'text-blue-500',
    isTestnet: false,
  },
  [alphaCentauri.id]: {
    name: 'Alpha Centauri',
    symbol: 'CTH',
    icon: 'fas fa-star',
    color: 'text-honey',
    isTestnet: true,
  },
};

// Get chain metadata by ID
export function getChainMetadata(chainId: number) {
  if (!chainId || typeof chainId !== 'number') {
    return chainMetadata[arbitrum.id];
  }
  return chainMetadata[chainId as keyof typeof chainMetadata] || chainMetadata[arbitrum.id];
}

// Check if chain is testnet
export function isTestnetChain(chainId: number) {
  const metadata = getChainMetadata(chainId);
  return metadata?.isTestnet || false;
}

// Get blockchain explorer URL for transaction  
export function getExplorerUrl(chainId: number, txHash: string): string {
  const explorers = {
    [ethereum.id]: 'https://etherscan.io/tx/',
    [polygon.id]: 'https://polygonscan.com/tx/', 
    [arbitrum.id]: 'https://arbiscan.io/tx/',
    [optimism.id]: 'https://optimistic.etherscan.io/tx/',
    [bsc.id]: 'https://bscscan.com/tx/',
    [base.id]: 'https://basescan.org/tx/',
    [arbitrumSepolia.id]: 'https://sepolia.arbiscan.io/tx/',
    [alphaCentauri.id]: 'https://explorer.alpha-centauri.io/tx/',
  };
  
  const explorerUrl = explorers[chainId as keyof typeof explorers] || explorers[ethereum.id];
  return `${explorerUrl}${txHash}`;
}

// USDT decimal places for different chains
export function getUSDTDecimals(chainId: number): number {
  const decimalsMap = {
    [ethereum.id]: 6, // Ethereum USDT
    [polygon.id]: 6, // Polygon USDT  
    [arbitrum.id]: 6, // Arbitrum USDT
    [optimism.id]: 6, // Optimism USDT
    [bsc.id]: 18, // BSC USDT 
    [base.id]: 6, // Base USDC
    [arbitrumSepolia.id]: 6, // Arbitrum Sepolia test USDT
    [alphaCentauri.id]: 18, // Alpha Centauri USDT
  };
  
  return decimalsMap[chainId as keyof typeof decimalsMap] || 6;
}