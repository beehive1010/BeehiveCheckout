// Multi-Chain Payment Processor for Beehive Platform
// Handles cross-chain USDC payments with Thirdweb integration

import { getContract, prepareTransaction, sendAndConfirmTransaction } from 'thirdweb';
import { transfer, approve, balanceOf } from 'thirdweb/extensions/erc20';
import { client } from './client';
import { 
  MULTI_CHAIN_CONFIG, 
  ChainConfig, 
  getChainConfig, 
  calculateTransactionFee,
  validatePaymentAmount,
  formatTransactionUrl
} from './multi-chain-config';
import { updatedApiClient } from '../apiClientUpdated';

export interface PaymentRequest {
  amount: number; // USDC amount
  sourceChainId: number;
  targetChainId?: number; // Optional for bridge payments
  payerAddress: string;
  recipientAddress?: string; // If not provided, uses bridge wallet
  paymentPurpose: 'membership_activation' | 'nft_upgrade' | 'token_purchase';
  level?: number; // For NFT upgrades
  referenceId?: string; // Order/transaction reference
}

export interface PaymentResult {
  success: boolean;
  transactionHash?: string;
  chainId: number;
  amount: number;
  fees: {
    networkFee: number;
    platformFee: number;
    bridgeFee?: number;
    totalFee: number;
  };
  netAmount: number;
  estimatedConfirmationTime: number; // minutes
  explorerUrl?: string;
  error?: string;
  bridgeTransactionId?: string; // For cross-chain payments
}

export class MultiChainPaymentProcessor {
  
  /**
   * Process a multi-chain USDC payment
   */
  async processPayment(
    request: PaymentRequest, 
    account: any
  ): Promise<PaymentResult> {
    try {
      // Validate payment request
      const validation = this.validatePaymentRequest(request);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
          chainId: request.sourceChainId,
          amount: request.amount,
          fees: { networkFee: 0, platformFee: 0, totalFee: 0 },
          netAmount: 0,
          estimatedConfirmationTime: 0
        };
      }

      const sourceConfig = getChainConfig(request.sourceChainId)!;
      const fees = calculateTransactionFee(request.sourceChainId, request.amount);

      // Check if user has sufficient USDC balance
      const hasBalance = await this.checkUSDCBalance(
        request.payerAddress, 
        sourceConfig,
        request.amount
      );

      if (!hasBalance.sufficient) {
        return {
          success: false,
          error: `Insufficient USDC balance. Required: $${request.amount}, Available: $${hasBalance.balance}`,
          chainId: request.sourceChainId,
          amount: request.amount,
          fees,
          netAmount: fees.netAmount,
          estimatedConfirmationTime: 0
        };
      }

      // Determine payment flow: direct or bridge
      if (request.targetChainId && request.targetChainId !== request.sourceChainId) {
        return await this.processBridgePayment(request, account, sourceConfig, fees);
      } else {
        return await this.processDirectPayment(request, account, sourceConfig, fees);
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        chainId: request.sourceChainId,
        amount: request.amount,
        fees: { networkFee: 0, platformFee: 0, totalFee: 0 },
        netAmount: 0,
        estimatedConfirmationTime: 0
      };
    }
  }

  /**
   * Process direct USDC payment on same chain
   */
  private async processDirectPayment(
    request: PaymentRequest,
    account: any,
    sourceConfig: ChainConfig,
    fees: ReturnType<typeof calculateTransactionFee>
  ): Promise<PaymentResult> {
    try {
      // Get USDC contract on source chain
      const usdcContract = getContract({
        client,
        address: sourceConfig.usdcAddress,
        chain: sourceConfig.chain
      });

      // Recipient is bridge wallet for this chain
      const recipientAddress = request.recipientAddress || sourceConfig.bridgeWalletAddress;

      // Prepare USDC transfer transaction
      const transferTransaction = transfer({
        contract: usdcContract,
        to: recipientAddress,
        amount: request.amount.toString() // Amount in USDC (with proper decimals)
      });

      // Send transaction
      const txResult = await sendAndConfirmTransaction({
        transaction: transferTransaction,
        account: account
      });

      // Record payment in database
      await this.recordPaymentInDatabase({
        ...request,
        transactionHash: txResult.transactionHash,
        chainId: sourceConfig.chainId,
        fees,
        status: 'completed'
      });

      return {
        success: true,
        transactionHash: txResult.transactionHash,
        chainId: sourceConfig.chainId,
        amount: request.amount,
        fees,
        netAmount: fees.netAmount,
        estimatedConfirmationTime: Math.ceil(
          (sourceConfig.blockTime * sourceConfig.confirmationBlocks) / 60
        ),
        explorerUrl: formatTransactionUrl(sourceConfig.chainId, txResult.transactionHash)
      };

    } catch (error) {
      throw new Error(`Direct payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process bridge payment across chains
   */
  private async processBridgePayment(
    request: PaymentRequest,
    account: any,
    sourceConfig: ChainConfig,
    fees: ReturnType<typeof calculateTransactionFee>
  ): Promise<PaymentResult> {
    try {
      // For now, implement as direct payment to bridge wallet
      // The server wallet will handle the actual bridging
      const bridgeFee = 2; // $2 USDC bridge fee
      const totalAmount = request.amount + bridgeFee;

      // Update fees to include bridge fee
      const bridgeFees = {
        ...fees,
        bridgeFee,
        totalFee: fees.totalFee + bridgeFee
      };

      // Send USDC to bridge wallet with bridge metadata
      const result = await this.processDirectPayment(
        {
          ...request,
          amount: totalAmount,
          recipientAddress: sourceConfig.bridgeWalletAddress
        },
        account,
        sourceConfig,
        bridgeFees
      );

      if (result.success) {
        // Create bridge request in database
        const bridgeTransactionId = await this.createBridgeRequest({
          sourceChainId: request.sourceChainId,
          targetChainId: request.targetChainId!,
          amount: request.amount,
          transactionHash: result.transactionHash!,
          payerAddress: request.payerAddress,
          paymentPurpose: request.paymentPurpose
        });

        return {
          ...result,
          fees: bridgeFees,
          bridgeTransactionId,
          estimatedConfirmationTime: 30 // Bridge operations take longer
        };
      }

      return result;

    } catch (error) {
      throw new Error(`Bridge payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check USDC balance for user
   */
  private async checkUSDCBalance(
    userAddress: string, 
    chainConfig: ChainConfig,
    requiredAmount: number
  ): Promise<{ sufficient: boolean; balance: number }> {
    try {
      const usdcContract = getContract({
        client,
        address: chainConfig.usdcAddress,
        chain: chainConfig.chain
      });

      const balance = await balanceOf({
        contract: usdcContract,
        address: userAddress
      });

      // Convert balance from wei to USDC (6 decimals for USDC)
      const balanceInUSDC = Number(balance) / 1e6;
      
      return {
        sufficient: balanceInUSDC >= requiredAmount,
        balance: balanceInUSDC
      };

    } catch (error) {
      console.error('Balance check failed:', error);
      return { sufficient: false, balance: 0 };
    }
  }

  /**
   * Validate payment request
   */
  private validatePaymentRequest(request: PaymentRequest): { isValid: boolean; error?: string } {
    // Basic validation
    if (!request.payerAddress || !request.payerAddress.startsWith('0x')) {
      return { isValid: false, error: 'Invalid payer address' };
    }

    // Amount validation
    const amountValidation = validatePaymentAmount(request.amount, request.sourceChainId);
    if (!amountValidation.isValid) {
      return amountValidation;
    }

    // Chain validation
    const sourceConfig = getChainConfig(request.sourceChainId);
    if (!sourceConfig) {
      return { isValid: false, error: 'Unsupported source chain' };
    }

    if (request.targetChainId) {
      const targetConfig = getChainConfig(request.targetChainId);
      if (!targetConfig) {
        return { isValid: false, error: 'Unsupported target chain' };
      }
    }

    return { isValid: true };
  }

  /**
   * Record payment in database via API
   */
  private async recordPaymentInDatabase(paymentData: {
    transactionHash: string;
    chainId: number;
    amount: number;
    payerAddress: string;
    paymentPurpose: string;
    fees: any;
    status: string;
    level?: number;
    referenceId?: string;
  }): Promise<void> {
    try {
      console.log('Recording payment in database:', paymentData);
      
      // Record payment via API client
      const result = await updatedApiClient.recordMultiChainPayment(paymentData);
      
      if (!result.success) {
        console.warn('Payment recording failed:', result.error);
      } else {
        console.log('Payment successfully recorded in database');
      }
      
    } catch (error) {
      console.error('Failed to record payment in database:', error);
      // Don't throw here - payment already succeeded on chain
    }
  }

  /**
   * Create bridge request for cross-chain operations
   */
  private async createBridgeRequest(bridgeData: {
    sourceChainId: number;
    targetChainId: number;
    amount: number;
    transactionHash: string;
    payerAddress: string;
    paymentPurpose: string;
  }): Promise<string> {
    try {
      // Generate bridge transaction ID
      const bridgeTransactionId = `bridge_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      
      console.log('Creating bridge request:', { ...bridgeData, bridgeTransactionId });
      
      // TODO: Implement actual bridge request creation
      // await updatedApiClient.createBridgeRequest({ ...bridgeData, bridgeTransactionId });
      
      return bridgeTransactionId;
      
    } catch (error) {
      console.error('Failed to create bridge request:', error);
      return `bridge_error_${Date.now()}`;
    }
  }

  /**
   * Get payment methods available for a chain
   */
  getAvailablePaymentMethods(chainId: number): string[] {
    const config = getChainConfig(chainId);
    if (!config) return [];
    
    const methods = ['direct_usdc'];
    
    // Add bridge method if not on primary chain
    if (chainId !== MULTI_CHAIN_CONFIG.arbitrum.chainId) {
      methods.push('bridge_usdc');
    }
    
    return methods;
  }

  /**
   * Estimate payment completion time
   */
  estimatePaymentTime(sourceChainId: number, targetChainId?: number): number {
    const sourceConfig = getChainConfig(sourceChainId);
    if (!sourceConfig) return 0;
    
    let baseTime = Math.ceil((sourceConfig.blockTime * sourceConfig.confirmationBlocks) / 60);
    
    // Add bridge time if cross-chain
    if (targetChainId && targetChainId !== sourceChainId) {
      baseTime += 20; // Additional bridge processing time
    }
    
    return baseTime;
  }
}

// Export singleton instance
export const multiChainPaymentProcessor = new MultiChainPaymentProcessor();

// Export utility functions for UI components
export async function getUSDCBalance(
  userAddress: string, 
  chainId: number
): Promise<{ balance: number; error?: string }> {
  try {
    const config = getChainConfig(chainId);
    if (!config) {
      return { balance: 0, error: 'Unsupported chain' };
    }

    const processor = new MultiChainPaymentProcessor();
    const result = await processor['checkUSDCBalance'](userAddress, config, 0);
    
    return { balance: result.balance };
  } catch (error) {
    return { 
      balance: 0, 
      error: error instanceof Error ? error.message : 'Failed to check balance' 
    };
  }
}

export function formatUSDCAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  }).format(amount);
}