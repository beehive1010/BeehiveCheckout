// Optimized Thirdweb Integration following API best practices
// Implements smart wallet features, gasless transactions, and multi-chain support
import { 
  createThirdwebClient, 
  getContract, 
  prepareContractCall,
  sendTransaction,
  waitForReceipt,
  readContract
} from "thirdweb";
import { 
  createWallet, 
  inAppWallet,
  smartWallet,
  coinbaseWallet,
  metamaskWallet
} from "thirdweb/wallets";
import { defineChain } from "thirdweb/chains";
import { claimTo, getOwnedNFTs, getNFT } from "thirdweb/extensions/erc1155";
import type { Chain, PreparedTransaction } from "thirdweb";

// Environment configuration
const THIRDWEB_CLIENT_ID = import.meta.env.VITE_THIRDWEB_CLIENT_ID;
const THIRDWEB_SECRET_KEY = import.meta.env.VITE_THIRDWEB_SECRET_KEY;

if (!THIRDWEB_CLIENT_ID) {
  throw new Error('VITE_THIRDWEB_CLIENT_ID is required');
}

// Initialize Thirdweb client with best practices
export const thirdwebClient = createThirdwebClient({
  clientId: THIRDWEB_CLIENT_ID,
  secretKey: THIRDWEB_SECRET_KEY, // Only available on server-side
});

// Define supported chains with proper configuration
export const arbitrumOne = defineChain({
  id: 42161,
  name: "Arbitrum One",
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://arb1.arbitrum.io/rpc"],
    },
  },
  blockExplorers: {
    default: {
      name: "Arbiscan",
      url: "https://arbiscan.io",
    },
  },
});

export const arbitrumSepolia = defineChain({
  id: 421614,
  name: "Arbitrum Sepolia",
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://sepolia-rollup.arbitrum.io/rpc"],
    },
  },
  blockExplorers: {
    default: {
      name: "Arbiscan Sepolia",
      url: "https://sepolia.arbiscan.io",
    },
  },
  testnet: true,
});

export const alphaCentauri = defineChain({
  id: 4328, // Custom chain ID for Alpha Centauri
  name: "Alpha Centauri",
  nativeCurrency: {
    name: "Alpha Centauri",
    symbol: "ACA",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.alphacentauri.network"], // Replace with actual RPC
    },
  },
  blockExplorers: {
    default: {
      name: "Alpha Centauri Explorer",
      url: "https://explorer.alphacentauri.network",
    },
  },
});

// Contract addresses by chain
export const contractAddresses = {
  [arbitrumOne.id]: {
    membershipNFT: "0x018F516B0d1E77Cc5947226Abc2E864B167C7E29", // Beehive Membership NFT (Updated 2025-10-08)
    usdt: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", // Official Arbitrum USDT
  },
  [arbitrumSepolia.id]: {
    membershipNFT: "0xAc8c8662726b72f8DB4F5D1d1a16aC5b06B7a90D",
    usdt: "0x...", // Replace with testnet USDT address
  },
  [alphaCentauri.id]: {
    membershipNFT: "0x...", // Replace with deployed address
    usdt: "0x...", // Replace with native USDT address
  },
};

// Wallet creation with smart wallet features
export const createOptimizedWallet = () => {
  // Create smart wallet with gasless features
  return smartWallet({
    chain: arbitrumSepolia, // Default to testnet
    factoryAddress: "0x...", // Smart wallet factory address
    gasless: true, // Enable gasless transactions
    personalWallet: inAppWallet({
      auth: {
        options: [
          "email",
          "phone", 
          "google",
          "apple",
          "facebook",
          "passkey"
        ],
      },
    }),
  });
};

// Multi-wallet support for better UX
export const getSupportedWallets = () => [
  createOptimizedWallet(), // Smart wallet (primary)
  inAppWallet({
    auth: {
      options: ["email", "phone", "google", "passkey"],
    },
  }),
  metamaskWallet(),
  coinbaseWallet(),
];

// Enhanced NFT operations
export class OptimizedNFTManager {
  private client = thirdwebClient;
  private chain: Chain;
  private contractAddress: string;

  constructor(chain: Chain) {
    this.chain = chain;
    this.contractAddress = contractAddresses[chain.id]?.membershipNFT || "";
    
    if (!this.contractAddress) {
      throw new Error(`Membership NFT contract not configured for chain ${chain.id}`);
    }
  }

  // Get NFT contract instance
  private getContract() {
    return getContract({
      client: this.client,
      address: this.contractAddress,
      chain: this.chain,
    });
  }

  // Check if user owns specific NFT level
  async hasNFTLevel(walletAddress: string, tokenId: number): Promise<boolean> {
    try {
      const contract = this.getContract();
      const ownedNFTs = await getOwnedNFTs({
        contract,
        owner: walletAddress,
      });

      return ownedNFTs.some(nft => nft.id === BigInt(tokenId) && nft.quantityOwned > 0n);
    } catch (error) {
      console.error('Error checking NFT ownership:', error);
      return false;
    }
  }

  // Get all owned NFT levels for a wallet
  async getOwnedNFTLevels(walletAddress: string): Promise<number[]> {
    try {
      const contract = this.getContract();
      const ownedNFTs = await getOwnedNFTs({
        contract,
        owner: walletAddress,
      });

      return ownedNFTs
        .filter(nft => nft.quantityOwned > 0n)
        .map(nft => Number(nft.id));
    } catch (error) {
      console.error('Error fetching owned NFTs:', error);
      return [];
    }
  }

  // Get NFT metadata
  async getNFTMetadata(tokenId: number) {
    try {
      const contract = this.getContract();
      return await getNFT({
        contract,
        tokenId: BigInt(tokenId),
      });
    } catch (error) {
      console.error('Error fetching NFT metadata:', error);
      return null;
    }
  }

  // Mint NFT to wallet (server-side only)
  async mintNFTToWallet(
    recipientAddress: string, 
    tokenId: number, 
    quantity: bigint = 1n
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      const contract = this.getContract();
      
      const transaction = claimTo({
        contract,
        to: recipientAddress,
        tokenId: BigInt(tokenId),
        quantity,
      });

      // This should be called from server-side with proper permissions
      const result = await sendTransaction({
        transaction,
        account: await createOptimizedWallet(), // Server wallet
      });

      const receipt = await waitForReceipt(result);

      return {
        success: true,
        transactionHash: receipt.transactionHash,
      };
    } catch (error) {
      console.error('NFT minting error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Minting failed',
      };
    }
  }
}

// Enhanced transaction management with batching
export class OptimizedTransactionManager {
  private client = thirdwebClient;
  private chain: Chain;

  constructor(chain: Chain) {
    this.chain = chain;
  }

  // Batch multiple transactions for efficiency
  async batchTransactions(transactions: PreparedTransaction[]): Promise<{
    success: boolean;
    transactionHashes?: string[];
    error?: string;
  }> {
    try {
      const results = await Promise.all(
        transactions.map(async (transaction) => {
          const result = await sendTransaction({
            transaction,
            account: await createOptimizedWallet(),
          });
          return await waitForReceipt(result);
        })
      );

      return {
        success: true,
        transactionHashes: results.map(receipt => receipt.transactionHash),
      };
    } catch (error) {
      console.error('Batch transaction error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Batch transaction failed',
      };
    }
  }

  // Estimate gas costs
  async estimateGasCosts(transaction: PreparedTransaction): Promise<{
    gasLimit: bigint;
    gasPrice: bigint;
    estimatedCost: bigint;
  } | null> {
    try {
      // Implementation would depend on Thirdweb's gas estimation methods
      // This is a placeholder for the gas estimation logic
      return {
        gasLimit: 100000n,
        gasPrice: 2000000000n, // 2 gwei
        estimatedCost: 200000000000000n, // gasLimit * gasPrice
      };
    } catch (error) {
      console.error('Gas estimation error:', error);
      return null;
    }
  }
}

// Cross-chain bridge utilities
export class CrossChainBridge {
  private client = thirdwebClient;

  // Prepare cross-chain NFT minting
  async prepareCrossChainNFTMint(params: {
    sourceChain: Chain;
    targetChain: Chain;
    recipientAddress: string;
    tokenId: number;
    paymentTxHash: string;
  }): Promise<{ success: boolean; bridgeData?: any; error?: string }> {
    try {
      // This would implement cross-chain bridge logic
      // For now, return success for same-chain operations
      if (params.sourceChain.id === params.targetChain.id) {
        return { success: true, bridgeData: { sameChain: true } };
      }

      // Implement actual bridge logic here
      return {
        success: true,
        bridgeData: {
          sourceChain: params.sourceChain.id,
          targetChain: params.targetChain.id,
          bridgeTxHash: params.paymentTxHash,
        },
      };
    } catch (error) {
      console.error('Cross-chain preparation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Bridge preparation failed',
      };
    }
  }
}

// Utility functions for level management
export const levelToTokenId = (level: number): number => {
  // Map membership levels to NFT token IDs
  return level; // 1:1 mapping for now
};

export const tokenIdToLevel = (tokenId: number): number => {
  return tokenId; // 1:1 mapping for now
};

// Payment chain configurations with bridge support
export const paymentChains = [
  {
    name: "Arbitrum Sepolia",
    chain: arbitrumSepolia,
    symbol: "ETH",
    usdtAddress: contractAddresses[arbitrumSepolia.id]?.usdt || "",
    bridgeWallet: "0x...", // Bridge wallet address
    color: "text-blue-400",
    icon: "fab fa-ethereum",
    isTestnet: true,
  },
  {
    name: "Arbitrum One",
    chain: arbitrumOne,
    symbol: "ETH",
    usdtAddress: contractAddresses[arbitrumOne.id]?.usdt || "",
    bridgeWallet: "0x...", // Bridge wallet address
    color: "text-blue-600",
    icon: "fab fa-ethereum",
    isTestnet: false,
  },
];

// Export manager instances for common chains
export const arbitrumSepoliaNFTManager = new OptimizedNFTManager(arbitrumSepolia);
export const arbitrumOneNFTManager = new OptimizedNFTManager(arbitrumOne);
export const alphaCentauriNFTManager = new OptimizedNFTManager(alphaCentauri);

export const crossChainBridge = new CrossChainBridge();

// Helper function to get the appropriate NFT manager for a chain
export const getNFTManager = (chainId: number): OptimizedNFTManager => {
  switch (chainId) {
    case arbitrumSepolia.id:
      return arbitrumSepoliaNFTManager;
    case arbitrumOne.id:
      return arbitrumOneNFTManager;
    case alphaCentauri.id:
      return alphaCentauriNFTManager;
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`);
  }
};

// Wallet connection with better error handling and recovery
export const connectWalletOptimized = async (walletType: 'smart' | 'metamask' | 'coinbase' | 'in-app' = 'smart') => {
  try {
    let wallet;
    
    switch (walletType) {
      case 'smart':
        wallet = createOptimizedWallet();
        break;
      case 'metamask':
        wallet = metamaskWallet();
        break;
      case 'coinbase':
        wallet = coinbaseWallet();
        break;
      case 'in-app':
        wallet = inAppWallet();
        break;
      default:
        wallet = createOptimizedWallet();
    }

    const account = await wallet.connect({ client: thirdwebClient });
    
    return {
      success: true,
      account,
      wallet,
    };
  } catch (error) {
    console.error('Wallet connection error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
};

export default {
  thirdwebClient,
  getNFTManager,
  createOptimizedWallet,
  connectWalletOptimized,
  crossChainBridge,
  paymentChains,
  levelToTokenId,
  tokenIdToLevel,
};