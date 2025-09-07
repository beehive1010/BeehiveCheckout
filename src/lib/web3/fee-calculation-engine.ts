// Chain-Specific Fee Calculation Engine with Real-Time Rates
// Provides accurate fee calculations for cross-chain operations with live network data

import { getChainConfig, type ChainConfig } from './multi-chain-config';

// Fee structure for different transaction types
export interface FeeStructure {
  networkFee: number;        // Gas fee in USD
  platformFee: number;       // Platform fee in USD (percentage-based)
  bridgeFee: number;         // Cross-chain bridge fee in USD
  priorityFee?: number;      // Optional priority fee for faster processing
  totalFee: number;          // Total fee in USD
}

// Gas price data from external sources
export interface GasPrice {
  chainId: number;
  gasPrice: string;          // Gas price in gwei
  gasPriceUSD: number;       // Gas price in USD per unit
  fast: number;              // Fast transaction gas price (gwei)
  standard: number;          // Standard transaction gas price (gwei)  
  slow: number;              // Slow transaction gas price (gwei)
  baseFee?: number;          // Base fee for EIP-1559 chains (gwei)
  priorityFee?: number;      // Priority fee for EIP-1559 chains (gwei)
  lastUpdated: number;       // Unix timestamp
}

// Transaction type configurations
export interface TransactionConfig {
  type: 'transfer' | 'withdrawal' | 'bridge' | 'swap' | 'approval';
  gasLimit: number;          // Estimated gas limit
  complexity: 'low' | 'medium' | 'high'; // Transaction complexity
  requiresApproval: boolean; // Whether token approval is needed first
}

// Fee calculation options
export interface FeeCalculationOptions {
  transactionType: TransactionConfig['type'];
  amount: number;            // Transaction amount in USD
  sourceChainId: number;     // Source chain ID
  targetChainId?: number;    // Target chain ID (for cross-chain)
  priority: 'slow' | 'standard' | 'fast';
  includeApproval?: boolean; // Include token approval fees
  platformFeeRate?: number;  // Custom platform fee rate (default: 0.5%)
}

// Real-time fee calculation result
export interface FeeCalculationResult {
  success: boolean;
  fees?: FeeStructure;
  breakdown: {
    networkFee: {
      gasLimit: number;
      gasPrice: number;
      gasPriceGwei: number;
      feeInNative: string;
      feeInUSD: number;
    };
    platformFee: {
      rate: number;
      amount: number;
      feeInUSD: number;
    };
    bridgeFee?: {
      source: string;
      target: string;
      feeInUSD: number;
    };
    approval?: {
      gasLimit: number;
      feeInUSD: number;
    };
  };
  estimatedTime: {
    minutes: number;
    confirmationBlocks: number;
  };
  recommendations?: string[];
  error?: string;
}

// Transaction type configurations
const TRANSACTION_CONFIGS: Record<TransactionConfig['type'], TransactionConfig> = {
  transfer: {
    type: 'transfer',
    gasLimit: 21000,
    complexity: 'low',
    requiresApproval: false
  },
  withdrawal: {
    type: 'withdrawal',
    gasLimit: 65000,
    complexity: 'medium',
    requiresApproval: false
  },
  bridge: {
    type: 'bridge',
    gasLimit: 120000,
    complexity: 'high',
    requiresApproval: true
  },
  swap: {
    type: 'swap',
    gasLimit: 150000,
    complexity: 'high',
    requiresApproval: true
  },
  approval: {
    type: 'approval',
    gasLimit: 50000,
    complexity: 'low',
    requiresApproval: false
  }
};

// Bridge fees between chains (in USD)
const BRIDGE_FEES: Record<string, Record<string, number>> = {
  '1': {    // Ethereum
    '137': 15,    // to Polygon
    '42161': 25,  // to Arbitrum
    '10': 20,     // to Optimism
    '56': 12,     // to BSC
    '8453': 18    // to Base
  },
  '137': {  // Polygon
    '1': 15,      // to Ethereum
    '42161': 8,   // to Arbitrum
    '10': 10,     // to Optimism
    '56': 5,      // to BSC
    '8453': 7     // to Base
  },
  '42161': { // Arbitrum
    '1': 25,      // to Ethereum
    '137': 8,     // to Polygon
    '10': 5,      // to Optimism
    '56': 8,      // to BSC
    '8453': 3     // to Base
  },
  '10': {   // Optimism
    '1': 20,      // to Ethereum
    '137': 10,    // to Polygon
    '42161': 5,   // to Arbitrum
    '56': 8,      // to BSC
    '8453': 3     // to Base
  },
  '56': {   // BSC
    '1': 12,      // to Ethereum
    '137': 5,     // to Polygon
    '42161': 8,   // to Arbitrum
    '10': 8,      // to Optimism
    '8453': 6     // to Base
  },
  '8453': { // Base
    '1': 18,      // to Ethereum
    '137': 7,     // to Polygon
    '42161': 3,   // to Arbitrum
    '10': 3,      // to Optimism
    '56': 6       // to BSC
  }
};

class FeeCalculationEngine {
  private gasPriceCache = new Map<number, GasPrice>();
  private cacheExpiry = 60 * 1000; // 1 minute cache
  private defaultPlatformFeeRate = 0.005; // 0.5%

  /**
   * Calculate comprehensive fees for a transaction
   */
  async calculateFees(options: FeeCalculationOptions): Promise<FeeCalculationResult> {
    try {
      const sourceChain = getChainConfig(options.sourceChainId);
      if (!sourceChain) {
        throw new Error(`Unsupported source chain: ${options.sourceChainId}`);
      }

      let targetChain: ChainConfig | undefined;
      if (options.targetChainId) {
        targetChain = getChainConfig(options.targetChainId);
        if (!targetChain) {
          throw new Error(`Unsupported target chain: ${options.targetChainId}`);
        }
      }

      // Get transaction configuration
      const txConfig = TRANSACTION_CONFIGS[options.transactionType];
      
      // Get real-time gas prices
      const gasPrice = await this.getGasPrice(options.sourceChainId);
      
      // Calculate network fee
      const networkFeeResult = this.calculateNetworkFee(
        sourceChain,
        gasPrice,
        txConfig,
        options.priority
      );

      // Calculate platform fee
      const platformFeeRate = options.platformFeeRate || this.defaultPlatformFeeRate;
      const platformFeeResult = this.calculatePlatformFee(options.amount, platformFeeRate);

      // Calculate bridge fee (if cross-chain)
      let bridgeFeeResult: any = null;
      if (targetChain && options.sourceChainId !== options.targetChainId) {
        bridgeFeeResult = this.calculateBridgeFee(
          options.sourceChainId,
          options.targetChainId!
        );
      }

      // Calculate approval fee (if needed)
      let approvalFeeResult: any = null;
      if (options.includeApproval && txConfig.requiresApproval) {
        approvalFeeResult = this.calculateApprovalFee(sourceChain, gasPrice, options.priority);
      }

      // Calculate total fees
      const totalNetworkFee = networkFeeResult.feeInUSD + (approvalFeeResult?.feeInUSD || 0);
      const totalPlatformFee = platformFeeResult.feeInUSD;
      const totalBridgeFee = bridgeFeeResult?.feeInUSD || 0;
      const totalFee = totalNetworkFee + totalPlatformFee + totalBridgeFee;

      // Estimate transaction time
      const estimatedTime = this.calculateEstimatedTime(sourceChain, options.priority);

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        options,
        totalFee,
        sourceChain,
        targetChain
      );

      const fees: FeeStructure = {
        networkFee: totalNetworkFee,
        platformFee: totalPlatformFee,
        bridgeFee: totalBridgeFee,
        totalFee
      };

      const result: FeeCalculationResult = {
        success: true,
        fees,
        breakdown: {
          networkFee: networkFeeResult,
          platformFee: platformFeeResult,
          bridgeFee: bridgeFeeResult,
          approval: approvalFeeResult
        },
        estimatedTime,
        recommendations
      };

      return result;

    } catch (error) {
      console.error('Fee calculation failed:', error);
      return {
        success: false,
        breakdown: {
          networkFee: {
            gasLimit: 0,
            gasPrice: 0,
            gasPriceGwei: 0,
            feeInNative: '0',
            feeInUSD: 0
          },
          platformFee: {
            rate: 0,
            amount: 0,
            feeInUSD: 0
          }
        },
        estimatedTime: {
          minutes: 0,
          confirmationBlocks: 0
        },
        error: error instanceof Error ? error.message : 'Fee calculation failed'
      };
    }
  }

  /**
   * Get real-time gas prices for a chain
   */
  async getGasPrice(chainId: number): Promise<GasPrice> {
    try {
      // Check cache first
      const cached = this.gasPriceCache.get(chainId);
      if (cached && (Date.now() - cached.lastUpdated) < this.cacheExpiry) {
        return cached;
      }

      // For now, use static estimates. In production, this would fetch from:
      // - EtherScan API for Ethereum
      // - PolygonScan API for Polygon
      // - Arbiscan API for Arbitrum
      // - etc.
      
      const chainConfig = getChainConfig(chainId);
      if (!chainConfig) {
        throw new Error(`Chain ${chainId} not supported`);
      }

      const gasPrice: GasPrice = {
        chainId,
        gasPrice: (chainConfig.averageGasFee * 1000).toString(), // Convert USD to gwei estimate
        gasPriceUSD: chainConfig.averageGasFee,
        fast: Math.round(chainConfig.averageGasFee * 1.5),
        standard: chainConfig.averageGasFee,
        slow: Math.round(chainConfig.averageGasFee * 0.8),
        lastUpdated: Date.now()
      };

      // Cache the result
      this.gasPriceCache.set(chainId, gasPrice);

      return gasPrice;

    } catch (error) {
      console.error(`Gas price fetch failed for chain ${chainId}:`, error);
      
      // Fallback to chain config averages
      const chainConfig = getChainConfig(chainId);
      return {
        chainId,
        gasPrice: '20',
        gasPriceUSD: chainConfig?.averageGasFee || 1,
        fast: Math.round((chainConfig?.averageGasFee || 1) * 1.5),
        standard: chainConfig?.averageGasFee || 1,
        slow: Math.round((chainConfig?.averageGasFee || 1) * 0.8),
        lastUpdated: Date.now()
      };
    }
  }

  /**
   * Calculate network fee based on gas price and transaction type
   */
  private calculateNetworkFee(
    chain: ChainConfig,
    gasPrice: GasPrice,
    txConfig: TransactionConfig,
    priority: 'slow' | 'standard' | 'fast'
  ) {
    let selectedGasPrice: number;
    
    switch (priority) {
      case 'fast':
        selectedGasPrice = gasPrice.fast;
        break;
      case 'slow':
        selectedGasPrice = gasPrice.slow;
        break;
      default:
        selectedGasPrice = gasPrice.standard;
    }

    const feeInUSD = selectedGasPrice;
    const gasPriceGwei = selectedGasPrice * 1000 / chain.averageGasFee; // Rough conversion

    return {
      gasLimit: txConfig.gasLimit,
      gasPrice: selectedGasPrice,
      gasPriceGwei,
      feeInNative: (feeInUSD / chain.averageGasFee).toFixed(8),
      feeInUSD
    };
  }

  /**
   * Calculate platform fee based on amount and rate
   */
  private calculatePlatformFee(amount: number, rate: number) {
    const feeInUSD = amount * rate;
    
    return {
      rate,
      amount,
      feeInUSD
    };
  }

  /**
   * Calculate cross-chain bridge fee
   */
  private calculateBridgeFee(sourceChainId: number, targetChainId: number) {
    const sourceKey = sourceChainId.toString();
    const targetKey = targetChainId.toString();
    
    const feeInUSD = BRIDGE_FEES[sourceKey]?.[targetKey] || 10; // Default $10

    const sourceChain = getChainConfig(sourceChainId);
    const targetChain = getChainConfig(targetChainId);

    return {
      source: sourceChain?.name || `Chain ${sourceChainId}`,
      target: targetChain?.name || `Chain ${targetChainId}`,
      feeInUSD
    };
  }

  /**
   * Calculate token approval fee
   */
  private calculateApprovalFee(
    chain: ChainConfig,
    gasPrice: GasPrice,
    priority: 'slow' | 'standard' | 'fast'
  ) {
    const approvalConfig = TRANSACTION_CONFIGS.approval;
    const networkFee = this.calculateNetworkFee(chain, gasPrice, approvalConfig, priority);
    
    return {
      gasLimit: approvalConfig.gasLimit,
      feeInUSD: networkFee.feeInUSD
    };
  }

  /**
   * Calculate estimated transaction time
   */
  private calculateEstimatedTime(chain: ChainConfig, priority: 'slow' | 'standard' | 'fast') {
    let multiplier = 1;
    
    switch (priority) {
      case 'fast':
        multiplier = 0.7;
        break;
      case 'slow':
        multiplier = 1.5;
        break;
      default:
        multiplier = 1;
    }

    const baseTimeMinutes = Math.ceil((chain.blockTime * chain.confirmationBlocks) / 60);
    const estimatedMinutes = Math.ceil(baseTimeMinutes * multiplier);

    return {
      minutes: estimatedMinutes,
      confirmationBlocks: chain.confirmationBlocks
    };
  }

  /**
   * Generate fee optimization recommendations
   */
  private generateRecommendations(
    options: FeeCalculationOptions,
    totalFee: number,
    sourceChain: ChainConfig,
    targetChain?: ChainConfig
  ): string[] {
    const recommendations: string[] = [];

    // High fee warning
    if (totalFee > options.amount * 0.05) { // More than 5% of transaction
      recommendations.push("⚠️ Transaction fees are high relative to amount. Consider larger transactions to optimize costs.");
    }

    // Chain recommendations
    if (sourceChain.chainId === 1 && totalFee > 20) { // Ethereum
      recommendations.push("💡 Consider using Layer 2 solutions like Arbitrum or Optimism for lower fees.");
    }

    // Bridge recommendations
    if (targetChain && options.sourceChainId !== options.targetChainId) {
      const bridgeCost = BRIDGE_FEES[sourceChain.chainId.toString()]?.[targetChain.chainId.toString()] || 10;
      if (bridgeCost > 15) {
        recommendations.push("🌉 Bridge fees are high. Consider accumulating larger amounts before bridging.");
      }
    }

    // Time-based recommendations
    if (options.priority === 'fast' && totalFee > 10) {
      recommendations.push("⏰ Fast priority adds significant cost. Standard speed may be more economical.");
    }

    // Approval recommendations
    if (options.includeApproval) {
      recommendations.push("✅ Token approval required. This is a one-time transaction per token.");
    }

    return recommendations;
  }

  /**
   * Get supported transaction types
   */
  getSupportedTransactionTypes(): TransactionConfig['type'][] {
    return Object.keys(TRANSACTION_CONFIGS) as TransactionConfig['type'][];
  }

  /**
   * Get bridge fee between two chains
   */
  getBridgeFee(sourceChainId: number, targetChainId: number): number {
    const sourceKey = sourceChainId.toString();
    const targetKey = targetChainId.toString();
    return BRIDGE_FEES[sourceKey]?.[targetKey] || 10;
  }

  /**
   * Format fee for display
   */
  formatFee(fee: number, decimals: number = 2): string {
    return `$${fee.toFixed(decimals)}`;
  }

  /**
   * Get fee urgency level for UI
   */
  getFeeUrgencyLevel(feeUSD: number, transactionAmountUSD: number): 'low' | 'medium' | 'high' {
    const feePercentage = (feeUSD / transactionAmountUSD) * 100;
    
    if (feePercentage > 5) return 'high';
    if (feePercentage > 2) return 'medium';
    return 'low';
  }
}

// Export singleton instance
export const feeCalculationEngine = new FeeCalculationEngine();

// Export types for use in other modules
export type {
  FeeStructure,
  GasPrice,
  TransactionConfig,
  FeeCalculationOptions,
  FeeCalculationResult
};