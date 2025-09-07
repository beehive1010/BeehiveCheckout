// Server Wallet Management System for Cross-Chain Operations
// Handles secure server wallet operations for automated withdrawals and cross-chain transactions

import { createThirdwebClient, getContract } from 'thirdweb';
import { privateKeyToAccount, smartWallet } from 'thirdweb/wallets';
import { sendTransaction, readContract, prepareContractCall } from 'thirdweb/transaction';
import { MULTI_CHAIN_CONFIG, getChainConfig, type ChainConfig } from './multi-chain-config';
import { contractAddresses } from './contracts';

// Server wallet configuration
export interface ServerWalletConfig {
  privateKey: string;
  address: string;
  chainId: number;
  gasLimit?: number;
  maxGasPrice?: bigint;
}

// Transaction request structure
export interface TransactionRequest {
  chainId: number;
  to: string;
  amount: string; // in USDC (human readable)
  contractAddress: string;
  gasLimit?: number;
  priority?: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
}

// Transaction result structure
export interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  effectiveGasPrice?: string;
  error?: string;
  chainId: number;
  timestamp: number;
}

// Withdrawal request structure
export interface WithdrawalRequest {
  id: string;
  userWallet: string;
  amount: string;
  targetChainId: number;
  tokenAddress: string;
  userSignature: string;
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

class ServerWalletManager {
  private client = createThirdwebClient({
    clientId: process.env.VITE_THIRDWEB_CLIENT_ID!
  });

  private wallets: Map<number, any> = new Map();
  private serverWalletAddress = process.env.VITE_SERVER_WALLET_ADDRESS!;
  private serverPrivateKey = process.env.VITE_THIRDWEB_SECRET_KEY!;

  constructor() {
    this.initializeWallets();
  }

  /**
   * Initialize server wallets for all supported chains
   */
  private async initializeWallets() {
    try {
      const supportedChains = Object.values(MULTI_CHAIN_CONFIG);
      
      for (const chainConfig of supportedChains) {
        // Skip testnet initialization in production
        if (chainConfig.isTestnet && process.env.NODE_ENV === 'production') {
          continue;
        }

        const account = privateKeyToAccount({
          client: this.client,
          privateKey: this.serverPrivateKey
        });

        const wallet = smartWallet({
          chain: chainConfig.chain,
          sponsorGas: true
        });

        await wallet.connect({
          client: this.client,
          personalAccount: account
        });

        this.wallets.set(chainConfig.chainId, wallet);
        
        console.log(`✅ Server wallet initialized for ${chainConfig.name} (${chainConfig.chainId})`);
      }
    } catch (error) {
      console.error('❌ Server wallet initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get server wallet for specific chain
   */
  private getWallet(chainId: number) {
    const wallet = this.wallets.get(chainId);
    if (!wallet) {
      throw new Error(`Server wallet not initialized for chain ${chainId}`);
    }
    return wallet;
  }

  /**
   * Get server wallet balance for specific chain and token
   */
  async getWalletBalance(chainId: number, tokenAddress: string): Promise<{
    balance: string;
    decimals: number;
    symbol: string;
    error?: string;
  }> {
    try {
      const chainConfig = getChainConfig(chainId);
      if (!chainConfig) {
        throw new Error(`Unsupported chain: ${chainId}`);
      }

      const contract = getContract({
        client: this.client,
        chain: chainConfig.chain,
        address: tokenAddress
      });

      // Read balance
      const balance = await readContract({
        contract,
        method: "function balanceOf(address) view returns (uint256)",
        params: [this.serverWalletAddress]
      });

      // Read decimals
      const decimals = await readContract({
        contract,
        method: "function decimals() view returns (uint8)",
        params: []
      });

      // Read symbol
      const symbol = await readContract({
        contract,
        method: "function symbol() view returns (string)",
        params: []
      });

      // Convert balance to human readable format
      const balanceFormatted = (Number(balance) / Math.pow(10, Number(decimals))).toString();

      return {
        balance: balanceFormatted,
        decimals: Number(decimals),
        symbol: String(symbol)
      };

    } catch (error) {
      console.error(`Balance check failed for chain ${chainId}:`, error);
      return {
        balance: '0',
        decimals: 6,
        symbol: 'USDC',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Execute USDC transfer from server wallet
   */
  async executeTransfer(request: TransactionRequest): Promise<TransactionResult> {
    try {
      const chainConfig = getChainConfig(request.chainId);
      if (!chainConfig) {
        throw new Error(`Unsupported chain: ${request.chainId}`);
      }

      const wallet = this.getWallet(request.chainId);
      
      // Convert amount to wei (assuming 6 decimals for USDC)
      const amountWei = BigInt(Math.floor(parseFloat(request.amount) * 1000000));

      // Get contract instance
      const contract = getContract({
        client: this.client,
        chain: chainConfig.chain,
        address: request.contractAddress
      });

      // Prepare transfer transaction
      const transaction = prepareContractCall({
        contract,
        method: "function transfer(address to, uint256 amount) returns (bool)",
        params: [request.to, amountWei]
      });

      // Execute transaction
      const result = await sendTransaction({
        transaction,
        account: wallet
      });

      return {
        success: true,
        transactionHash: result.transactionHash,
        chainId: request.chainId,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error(`Transfer failed for chain ${request.chainId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        chainId: request.chainId,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Process withdrawal request with user signature validation
   */
  async processWithdrawal(withdrawalRequest: WithdrawalRequest): Promise<TransactionResult> {
    try {
      // Validate withdrawal request
      const validation = await this.validateWithdrawalRequest(withdrawalRequest);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Check server wallet balance
      const balance = await this.getWalletBalance(
        withdrawalRequest.targetChainId,
        withdrawalRequest.tokenAddress
      );

      if (parseFloat(balance.balance) < parseFloat(withdrawalRequest.amount)) {
        throw new Error(`Insufficient server wallet balance. Available: ${balance.balance} ${balance.symbol}, Required: ${withdrawalRequest.amount}`);
      }

      // Execute transfer
      const transferRequest: TransactionRequest = {
        chainId: withdrawalRequest.targetChainId,
        to: withdrawalRequest.userWallet,
        amount: withdrawalRequest.amount,
        contractAddress: withdrawalRequest.tokenAddress,
        metadata: {
          withdrawalId: withdrawalRequest.id,
          userSignature: withdrawalRequest.userSignature
        }
      };

      const result = await this.executeTransfer(transferRequest);

      if (result.success) {
        console.log(`✅ Withdrawal ${withdrawalRequest.id} completed: ${result.transactionHash}`);
      } else {
        console.error(`❌ Withdrawal ${withdrawalRequest.id} failed: ${result.error}`);
      }

      return result;

    } catch (error) {
      console.error(`Withdrawal processing failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        chainId: withdrawalRequest.targetChainId,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Validate withdrawal request and user signature
   */
  async validateWithdrawalRequest(request: WithdrawalRequest): Promise<{
    isValid: boolean;
    error?: string;
  }> {
    try {
      // Basic validation
      if (!request.userWallet || !request.amount || !request.targetChainId) {
        return { isValid: false, error: 'Missing required fields' };
      }

      if (parseFloat(request.amount) <= 0) {
        return { isValid: false, error: 'Invalid amount' };
      }

      const chainConfig = getChainConfig(request.targetChainId);
      if (!chainConfig) {
        return { isValid: false, error: `Unsupported chain: ${request.targetChainId}` };
      }

      // Amount limits (configurable)
      const maxWithdrawal = 10000; // $10,000 USDC max
      const minWithdrawal = 1;     // $1 USDC min

      if (parseFloat(request.amount) > maxWithdrawal) {
        return { isValid: false, error: `Amount exceeds maximum withdrawal limit of ${maxWithdrawal} USDC` };
      }

      if (parseFloat(request.amount) < minWithdrawal) {
        return { isValid: false, error: `Amount below minimum withdrawal limit of ${minWithdrawal} USDC` };
      }

      // TODO: Implement signature validation
      // This would verify that the user actually signed the withdrawal request
      // For now, we'll assume signature is valid if present
      if (!request.userSignature || request.userSignature.length < 10) {
        return { isValid: false, error: 'Invalid user signature' };
      }

      return { isValid: true };

    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Validation failed'
      };
    }
  }

  /**
   * Get supported withdrawal chains
   */
  getSupportedChains(): ChainConfig[] {
    return Object.values(MULTI_CHAIN_CONFIG).filter(chain => {
      // Filter out testnets in production
      if (chain.isTestnet && process.env.NODE_ENV === 'production') {
        return false;
      }
      return true;
    });
  }

  /**
   * Estimate gas for withdrawal transaction
   */
  async estimateWithdrawalGas(request: Partial<WithdrawalRequest>): Promise<{
    estimatedGas: string;
    gasPrice: string;
    totalFeeUSD: number;
    error?: string;
  }> {
    try {
      const chainConfig = getChainConfig(request.targetChainId!);
      if (!chainConfig) {
        throw new Error(`Unsupported chain: ${request.targetChainId}`);
      }

      // For USDC transfers, gas is typically around 65,000
      const estimatedGas = '65000';
      
      // Use average gas fee from chain config (in USD)
      const totalFeeUSD = chainConfig.averageGasFee;

      return {
        estimatedGas,
        gasPrice: chainConfig.averageGasFee.toString(),
        totalFeeUSD
      };

    } catch (error) {
      return {
        estimatedGas: '0',
        gasPrice: '0',
        totalFeeUSD: 0,
        error: error instanceof Error ? error.message : 'Gas estimation failed'
      };
    }
  }

  /**
   * Check if server wallet is ready for operations
   */
  async isReady(): Promise<boolean> {
    try {
      const supportedChains = this.getSupportedChains();
      
      for (const chain of supportedChains) {
        const wallet = this.wallets.get(chain.chainId);
        if (!wallet) {
          console.warn(`Server wallet not ready for chain: ${chain.name}`);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Server wallet readiness check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const serverWalletManager = new ServerWalletManager();

// Export types for use in other modules
export type {
  ServerWalletConfig,
  TransactionRequest,
  TransactionResult,
  WithdrawalRequest
};