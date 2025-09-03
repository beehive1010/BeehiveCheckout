import { getContract, createThirdwebClient } from 'thirdweb';
import { arbitrum, arbitrumSepolia, ethereum, polygon, optimism, bsc, base } from 'thirdweb/chains';
import { defineChain } from 'thirdweb/chains';

// Import client and custom chain
const client = createThirdwebClient({
  clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID || '3123b1ac2ebdb966dd415c6e964dc335'
});

// Alpha Centauri chain definition
const alphaCentauri = defineChain({
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

// Contract addresses for different chains
export const contractAddresses = {
  // Membership contracts across chains
  BBC_MEMBERSHIP: {
    // Arbitrum mainnet
    arbitrum: import.meta.env.VITE_BBC_MEMBERSHIP_ARB || '0x0000000000000000000000000000000000000000',
    // Arbitrum Sepolia testnet  
    arbitrumSepolia: '0xAc8c8662726b72f8DB4F5D1d1a16aC5b06B7a90D',
    // Alpha Centauri L3 testnet
    alphaCentauri: '0x5f6045Cc578b9f7E20416ede382f31FC151f32E7',
    demo: '0x99265477249389469929CEA07c4a337af9e12cdA', // Demo Beehive Member NFT
  },

  // BCC Token contracts across chains
  BCC_TOKEN: {
    arbitrum: import.meta.env.VITE_BCC_CONTRACT_ARB || '0x0000000000000000000000000000000000000000',
    arbitrumSepolia: import.meta.env.VITE_BCC_CONTRACT_ARB_SEPOLIA || '0x0000000000000000000000000000000000000000',
    alphaCentauri: import.meta.env.VITE_BCC_CONTRACT_ADDRESS || '0x1234567890123456789012345678901234567891',
  },

  // CTH Token contracts
  CTH_TOKEN: {
    arbitrumSepolia: '0x4022797e9EC167Fd48281fa452Ee49d7c169f125',
    alphaCentauri: '0x0000000000000000000000000000000000000000', // Native CTH on Alpha Centauri L3
  },

  // Merchant NFTs contract
  MERCHANT_NFTS: {
    arbitrum: import.meta.env.VITE_MERCHANT_CONTRACT_ARB || '0x0000000000000000000000000000000000000000',
    arbitrumSepolia: import.meta.env.VITE_MERCHANT_CONTRACT_ARB_SEPOLIA || '0x0000000000000000000000000000000000000000',
    alphaCentauri: import.meta.env.VITE_MERCHANT_CONTRACT_ADDRESS || '0x1234567890123456789012345678901234567892',
  },

  // USDT/Stablecoin contracts for purchasing
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

  // Bridge wallet addresses for receiving USDT payments
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

// Contract instances for BBC Membership across chains
export const bbcMembershipContracts = {
  arbitrum: getContract({
    client,
    address: contractAddresses.BBC_MEMBERSHIP.arbitrum,
    chain: arbitrum,
  }),
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

// BCC Token contract instances across chains
export const bccTokenContracts = {
  arbitrum: getContract({
    client,
    address: contractAddresses.BCC_TOKEN.arbitrum,
    chain: arbitrum,
  }),
  arbitrumSepolia: getContract({
    client,
    address: contractAddresses.BCC_TOKEN.arbitrumSepolia,
    chain: arbitrumSepolia,
  }),
  alphaCentauri: getContract({
    client,
    address: contractAddresses.BCC_TOKEN.alphaCentauri,
    chain: alphaCentauri,
  }),
};

// CTH Token contract instances
export const cthTokenContracts = {
  arbitrumSepolia: getContract({
    client,
    address: contractAddresses.CTH_TOKEN.arbitrumSepolia,
    chain: arbitrumSepolia,
  }),
  // Alpha Centauri uses native CTH, no contract needed
};

// Merchant NFT contract instances
export const merchantNFTContracts = {
  arbitrum: getContract({
    client,
    address: contractAddresses.MERCHANT_NFTS.arbitrum,
    chain: arbitrum,
  }),
  arbitrumSepolia: getContract({
    client,
    address: contractAddresses.MERCHANT_NFTS.arbitrumSepolia,
    chain: arbitrumSepolia,
  }),
  alphaCentauri: getContract({
    client,
    address: contractAddresses.MERCHANT_NFTS.alphaCentauri,
    chain: alphaCentauri,
  }),
};

// Legacy single contracts for backward compatibility (Alpha Centauri defaults)
export const bbcMembershipContract = bbcMembershipContracts.alphaCentauri;
export const bccTokenContract = bccTokenContracts.alphaCentauri;
export const merchantNFTContract = merchantNFTContracts.alphaCentauri;

// USDT contract for Alpha Centauri (default)
export const usdtContract = getContract({
  client,
  address: contractAddresses.USDT.alphaCentauri,
  chain: alphaCentauri,
});

// Helper function to get contract by chain ID
export function getUSDTContract(chainId: number) {
  const chainMap = { 
    1: 'ethereum', 
    137: 'polygon', 
    42161: 'arbitrum', 
    10: 'optimism', 
    56: 'bsc', 
    8453: 'base', 
    141941: 'alphaCentauri', 
    421614: 'arbitrumSepolia' 
  };
  
  const chainKey = chainMap[chainId as keyof typeof chainMap];
  if (!chainKey || !contractAddresses.USDT[chainKey as keyof typeof contractAddresses.USDT]) {
    throw new Error(`USDT not supported on chain ${chainId}`);
  }
  
  // Get chain based on chainId
  let chain;
  switch(chainId) {
    case 1: chain = ethereum; break;
    case 137: chain = polygon; break;
    case 42161: chain = arbitrum; break;
    case 10: chain = optimism; break;
    case 56: chain = bsc; break;
    case 8453: chain = base; break;
    case 141941: chain = alphaCentauri; break;
    case 421614: chain = arbitrumSepolia; break;
    default: chain = ethereum; break;
  }
  
  return getContract({
    client,
    chain,
    address: contractAddresses.USDT[chainKey as keyof typeof contractAddresses.USDT],
  });
}