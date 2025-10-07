// Automated Cross-Chain Withdrawal Processing System
// Orchestrates the complete withdrawal flow from signature verification to transaction completion

import { 
  serverWalletManager,
  type WithdrawalRequest as ServerWithdrawalRequest,
  type TransactionResult
} from './server-wallet-manager';
import { 
  withdrawalSignatureManager,
  type SignedWithdrawalRequest
} from './withdrawal-signatures';
import { 
  transactionMonitor,
  type TransactionMonitorConfig
} from './transaction-monitor';
import { 
  feeCalculationEngine,
  type FeeCalculationResult
} from './fee-calculation-engine';
import { updatedApiClient } from '../apiClientUpdated';

// Withdrawal processing stages
export type WithdrawalStage = 
  | 'signature_validation'
  | 'fee_calculation' 
  | 'balance_verification'
  | 'transaction_preparation'
  | 'transaction_execution'
  | 'transaction_monitoring'
  | 'completion'
  | 'failed';

// Processing status with detailed information
export interface WithdrawalProcessingStatus {
  id: string;
  stage: WithdrawalStage;
  progress: number; // 0-100%
  message: string;
  transactionHash?: string;
  confirmations?: number;
  estimatedTimeRemaining?: number; // in seconds
  error?: string;
  metadata?: Record<string, any>;
}

// Complete withdrawal processing result
export interface WithdrawalProcessingResult {
  success: boolean;
  withdrawalId: string;
  transactionHash?: string;
  finalStatus: WithdrawalStage;
  totalProcessingTime: number; // in milliseconds
  fees: FeeCalculationResult;
  error?: string;
  stages: WithdrawalProcessingStatus[];
}

// Processing configuration
export interface WithdrawalProcessingConfig {
  enableMonitoring: boolean;
  monitoringTimeout: number; // minutes
  requiredConfirmations?: number;
  webhookUrl?: string;
  retryAttempts: number;
}

// Processing event for real-time updates
export interface WithdrawalProcessingEvent {
  withdrawalId: string;
  stage: WithdrawalStage;
  status: WithdrawalProcessingStatus;
  timestamp: number;
}

class AutomatedWithdrawalProcessor {
  private activeProcessings = new Map<string, WithdrawalProcessingStatus>();
  private eventListeners = new Map<string, ((event: WithdrawalProcessingEvent) => void)[]>();
  
  /**
   * Process a complete withdrawal from signed request to completion
   */
  async processWithdrawal(
    signedRequest: SignedWithdrawalRequest,
    config: WithdrawalProcessingConfig = {
      enableMonitoring: true,
      monitoringTimeout: 30,
      requiredConfirmations: 12,
      retryAttempts: 3
    },
    onStatusUpdate?: (status: WithdrawalProcessingStatus) => void
  ): Promise<WithdrawalProcessingResult> {
    const withdrawalId = `wd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    const stages: WithdrawalProcessingStatus[] = [];
    
    let currentStatus: WithdrawalProcessingStatus = {
      id: withdrawalId,
      stage: 'signature_validation',
      progress: 0,
      message: 'Validating withdrawal signature...'
    };

    const updateStatus = (updates: Partial<WithdrawalProcessingStatus>) => {
      currentStatus = { ...currentStatus, ...updates };
      this.activeProcessings.set(withdrawalId, currentStatus);
      stages.push({ ...currentStatus });
      
      if (onStatusUpdate) {
        onStatusUpdate(currentStatus);
      }

      this.emitEvent({
        withdrawalId,
        stage: currentStatus.stage,
        status: currentStatus,
        timestamp: Date.now()
      });
    };

    try {
      updateStatus({ message: 'Starting withdrawal processing...' });

      // Stage 1: Signature Validation
      updateStatus({
        stage: 'signature_validation',
        progress: 10,
        message: 'Validating withdrawal signature...'
      });

      const signatureValidation = await withdrawalSignatureManager.verifyWithdrawalSignature(signedRequest);
      if (!signatureValidation.isValid) {
        throw new Error(`Signature validation failed: ${signatureValidation.error}`);
      }

      updateStatus({
        progress: 20,
        message: 'Signature validated successfully'
      });

      // Stage 2: Fee Calculation
      updateStatus({
        stage: 'fee_calculation',
        progress: 25,
        message: 'Calculating transaction fees...'
      });

      const feeCalculation = await feeCalculationEngine.calculateFees({
        transactionType: 'withdrawal',
        amount: parseFloat(signedRequest.amount),
        sourceChainId: signedRequest.targetChainId,
        priority: 'standard'
      });

      if (!feeCalculation.success) {
        throw new Error(`Fee calculation failed: ${feeCalculation.error}`);
      }

      updateStatus({
        progress: 35,
        message: `Fees calculated: $${feeCalculation.fees?.totalFee.toFixed(2)}`,
        metadata: { fees: feeCalculation }
      });

      // Stage 3: Balance Verification
      updateStatus({
        stage: 'balance_verification',
        progress: 40,
        message: 'Verifying server wallet balance...'
      });

      const balanceCheck = await serverWalletManager.getWalletBalance(
        signedRequest.targetChainId,
        signedRequest.tokenAddress
      );

      if (balanceCheck.error) {
        throw new Error(`Balance verification failed: ${balanceCheck.error}`);
      }

      const requiredAmount = parseFloat(signedRequest.amount) + (feeCalculation.fees?.networkFee || 0);
      if (parseFloat(balanceCheck.balance) < requiredAmount) {
        throw new Error(`Insufficient server wallet balance. Required: ${requiredAmount}, Available: ${balanceCheck.balance}`);
      }

      updateStatus({
        progress: 50,
        message: `Balance verified: ${balanceCheck.balance} ${balanceCheck.symbol}`,
        metadata: { balance: balanceCheck }
      });

      // Stage 4: Transaction Preparation
      updateStatus({
        stage: 'transaction_preparation',
        progress: 60,
        message: 'Preparing withdrawal transaction...'
      });

      const serverWithdrawalRequest: ServerWithdrawalRequest = {
        id: withdrawalId,
        userWallet: signedRequest.userWallet,
        amount: signedRequest.amount,
        targetChainId: signedRequest.targetChainId,
        tokenAddress: signedRequest.tokenAddress,
        userSignature: signedRequest.signature,
        timestamp: signedRequest.signedAt,
        status: 'pending'
      };

      // Stage 5: Transaction Execution
      updateStatus({
        stage: 'transaction_execution',
        progress: 70,
        message: 'Executing withdrawal transaction...'
      });

      const transactionResult = await serverWalletManager.processWithdrawal(serverWithdrawalRequest);
      
      if (!transactionResult.success) {
        throw new Error(`Transaction execution failed: ${transactionResult.error}`);
      }

      updateStatus({
        progress: 80,
        message: 'Transaction submitted successfully',
        transactionHash: transactionResult.transactionHash
      });

      // Stage 6: Transaction Monitoring (if enabled)
      if (config.enableMonitoring && transactionResult.transactionHash) {
        updateStatus({
          stage: 'transaction_monitoring',
          progress: 85,
          message: 'Monitoring transaction confirmations...'
        });

        const monitoringConfig: TransactionMonitorConfig = {
          txHash: transactionResult.transactionHash,
          chainId: signedRequest.targetChainId,
          requiredConfirmations: config.requiredConfirmations || 12,
          timeoutMinutes: config.monitoringTimeout,
          retryCount: config.retryAttempts,
          webhookUrl: config.webhookUrl
        };

        const confirmationProgress = 85;
        
        await transactionMonitor.startMonitoring(
          monitoringConfig,
          (monitoringResult) => {
            const confirmationPercent = Math.min(
              (monitoringResult.transaction?.confirmations || 0) / monitoringConfig.requiredConfirmations,
              1
            ) * 15; // 15% of total progress for monitoring

            updateStatus({
              progress: confirmationProgress + confirmationPercent,
              message: `Waiting for confirmations: ${monitoringResult.transaction?.confirmations || 0}/${monitoringConfig.requiredConfirmations}`,
              confirmations: monitoringResult.transaction?.confirmations || 0,
              estimatedTimeRemaining: this.calculateRemainingTime(
                monitoringResult.transaction?.confirmations || 0,
                monitoringConfig.requiredConfirmations,
                signedRequest.targetChainId
              )
            });

            if (monitoringResult.isComplete) {
              if (monitoringResult.transaction?.status === 'confirmed') {
                updateStatus({
                  stage: 'completion',
                  progress: 100,
                  message: 'Withdrawal completed successfully'
                });
              } else {
                throw new Error(`Transaction failed: ${monitoringResult.transaction?.status}`);
              }
            }
          }
        );
      } else {
        // Skip monitoring
        updateStatus({
          stage: 'completion',
          progress: 100,
          message: 'Withdrawal transaction submitted (monitoring disabled)'
        });
      }

      // Final result
      return {
        success: true,
        withdrawalId,
        transactionHash: transactionResult.transactionHash,
        finalStatus: 'completion',
        totalProcessingTime: Date.now() - startTime,
        fees: feeCalculation,
        stages
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      updateStatus({
        stage: 'failed',
        progress: currentStatus.progress,
        message: `Processing failed: ${errorMessage}`,
        error: errorMessage
      });

      return {
        success: false,
        withdrawalId,
        finalStatus: 'failed',
        totalProcessingTime: Date.now() - startTime,
        fees: feeCalculation || {
          success: false,
          breakdown: {
            networkFee: { gasLimit: 0, gasPrice: 0, gasPriceGwei: 0, feeInNative: '0', feeInUSD: 0 },
            platformFee: { rate: 0, amount: 0, feeInUSD: 0 }
          },
          estimatedTime: { minutes: 0, confirmationBlocks: 0 }
        },
        error: errorMessage,
        stages
      };
    } finally {
      // Clean up
      this.activeProcessings.delete(withdrawalId);
    }
  }

  /**
   * Get processing status for a withdrawal
   */
  getProcessingStatus(withdrawalId: string): WithdrawalProcessingStatus | null {
    return this.activeProcessings.get(withdrawalId) || null;
  }

  /**
   * Get all ActiveMember processings
   */
  getActiveProcessings(): WithdrawalProcessingStatus[] {
    return Array.from(this.activeProcessings.values());
  }

  /**
   * Cancel an ActiveMember withdrawal processing
   */
  async cancelProcessing(withdrawalId: string): Promise<boolean> {
    const status = this.activeProcessings.get(withdrawalId);
    if (!status) return false;

    // Can only cancel before transaction execution
    if (['transaction_execution', 'transaction_monitoring', 'completion'].includes(status.stage)) {
      return false; // Too late to cancel
    }

    this.activeProcessings.delete(withdrawalId);
    
    this.emitEvent({
      withdrawalId,
      stage: 'failed',
      status: {
        ...status,
        stage: 'failed',
        message: 'Processing cancelled by user',
        error: 'Cancelled'
      },
      timestamp: Date.now()
    });

    return true;
  }

  /**
   * Add event listener for processing updates
   */
  addEventListener(
    withdrawalId: string,
    listener: (event: WithdrawalProcessingEvent) => void
  ): void {
    const listeners = this.eventListeners.get(withdrawalId) || [];
    listeners.push(listener);
    this.eventListeners.set(withdrawalId, listeners);
  }

  /**
   * Remove event listener
   */
  removeEventListener(
    withdrawalId: string,
    listener: (event: WithdrawalProcessingEvent) => void
  ): void {
    const listeners = this.eventListeners.get(withdrawalId) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
      this.eventListeners.set(withdrawalId, listeners);
    }
  }

  /**
   * Emit processing event
   */
  private emitEvent(event: WithdrawalProcessingEvent): void {
    const listeners = this.eventListeners.get(event.withdrawalId) || [];
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Processing event listener error:', error);
      }
    });
  }

  /**
   * Calculate estimated remaining time for confirmations
   */
  private calculateRemainingTime(
    currentConfirmations: number,
    requiredConfirmations: number,
    chainId: number
  ): number {
    const remainingConfirmations = Math.max(0, requiredConfirmations - currentConfirmations);
    const estimatedTimePerConfirmation = transactionMonitor.estimateConfirmationTime(chainId, 1);
    return remainingConfirmations * estimatedTimePerConfirmation;
  }

  /**
   * Get withdrawal processing statistics
   */
  getProcessingStatistics(): {
    activeCount: number;
    stages: Record<WithdrawalStage, number>;
    averageProcessingTime: number;
  } {
    const active = this.getActiveProcessings();
    const stages: Record<WithdrawalStage, number> = {
      signature_validation: 0,
      fee_calculation: 0,
      balance_verification: 0,
      transaction_preparation: 0,
      transaction_execution: 0,
      transaction_monitoring: 0,
      completion: 0,
      failed: 0
    };

    active.forEach(status => {
      stages[status.stage]++;
    });

    return {
      activeCount: active.length,
      stages,
      averageProcessingTime: 120000 // 2 minutes average (would be calculated from historical data)
    };
  }

  /**
   * Validate withdrawal processing prerequisites
   */
  async validateProcessingPrerequisites(signedRequest: SignedWithdrawalRequest): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check signature validity
      const signatureValidation = await withdrawalSignatureManager.verifyWithdrawalSignature(signedRequest);
      if (!signatureValidation.isValid) {
        errors.push(`Invalid signature: ${signatureValidation.error}`);
      }

      // Check server wallet readiness
      const isReady = await serverWalletManager.isReady();
      if (!isReady) {
        errors.push('Server wallet is not ready for operations');
      }

      // Check balance availability
      const balanceCheck = await serverWalletManager.getWalletBalance(
        signedRequest.targetChainId,
        signedRequest.tokenAddress
      );

      if (balanceCheck.error) {
        errors.push(`Balance check failed: ${balanceCheck.error}`);
      } else if (parseFloat(balanceCheck.balance) < parseFloat(signedRequest.amount)) {
        errors.push(`Insufficient server wallet balance`);
      }

      // Calculate fees
      const feeCalculation = await feeCalculationEngine.calculateFees({
        transactionType: 'withdrawal',
        amount: parseFloat(signedRequest.amount),
        sourceChainId: signedRequest.targetChainId,
        priority: 'standard'
      });

      if (!feeCalculation.success) {
        warnings.push(`Fee calculation warning: ${feeCalculation.error}`);
      } else if (feeCalculation.fees) {
        const feePercentage = (feeCalculation.fees.totalFee / parseFloat(signedRequest.amount)) * 100;
        if (feePercentage > 10) {
          warnings.push(`High fees: ${feePercentage.toFixed(1)}% of withdrawal amount`);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { isValid: false, errors, warnings };
    }
  }
}

// Export singleton instance
export const automatedWithdrawalProcessor = new AutomatedWithdrawalProcessor();

// Export types for use in other modules
export type {
  WithdrawalStage,
  WithdrawalProcessingStatus,
  WithdrawalProcessingResult,
  WithdrawalProcessingConfig,
  WithdrawalProcessingEvent
};