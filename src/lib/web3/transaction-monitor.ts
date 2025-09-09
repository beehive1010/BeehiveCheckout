// Cross-Chain Transaction Monitoring and Confirmation System
// Tracks transactions across multiple blockchains with real-time status updates

import { createThirdwebClient, getContract } from 'thirdweb';
import { getRpcClient } from 'thirdweb/rpc';
import { getChainConfig, type ChainConfig } from './multi-chain-config';
import { updatedApiClient } from '../apiClientUpdated';

// Transaction status types
export type TransactionStatus = 'pending' | 'confirmed' | 'failed' | 'dropped';

// Transaction monitoring configuration
export interface TransactionMonitorConfig {
  txHash: string;
  chainId: number;
  requiredConfirmations: number;
  timeoutMinutes: number;
  retryCount: number;
  webhookUrl?: string;
}

// Transaction details from blockchain
export interface TransactionDetails {
  hash: string;
  blockNumber?: number;
  blockHash?: string;
  transactionIndex?: number;
  from: string;
  to?: string;
  value: string;
  gasUsed?: string;
  gasPrice?: string;
  effectiveGasPrice?: string;
  status: TransactionStatus;
  confirmations: number;
  timestamp?: number;
}

// Monitoring result
export interface MonitoringResult {
  success: boolean;
  transaction?: TransactionDetails;
  error?: string;
  isComplete: boolean;
  progress: number; // 0-100%
}

// Transaction event for real-time updates
export interface TransactionEvent {
  txHash: string;
  chainId: number;
  status: TransactionStatus;
  confirmations: number;
  timestamp: number;
  details?: TransactionDetails;
}

// Webhook notification payload
export interface WebhookPayload {
  event: 'transaction_confirmed' | 'transaction_failed' | 'confirmation_update';
  transaction: TransactionDetails;
  metadata?: Record<string, any>;
}

class TransactionMonitor {
  private client = createThirdwebClient({
    clientId: process.env.VITE_THIRDWEB_CLIENT_ID!
  });

  private activeMonitors = new Map<string, NodeJS.Timeout>();
  private eventListeners = new Map<string, ((event: TransactionEvent) => void)[]>();

  /**
   * Start monitoring a transaction
   */
  async startMonitoring(
    config: TransactionMonitorConfig,
    onUpdate?: (result: MonitoringResult) => void
  ): Promise<{
    success: boolean;
    monitorId?: string;
    error?: string;
  }> {
    try {
      const chainConfig = getChainConfig(config.chainId);
      if (!chainConfig) {
        throw new Error(`Unsupported chain: ${config.chainId}`);
      }

      const monitorId = `${config.chainId}-${config.txHash}`;

      // Check if already monitoring
      if (this.activeMonitors.has(monitorId)) {
        return {
          success: false,
          error: 'Transaction is already being monitored'
        };
      }

      // Store transaction in database
      await this.storeTransactionRecord(config, chainConfig);

      // Start the monitoring loop
      const interval = setInterval(async () => {
        try {
          const result = await this.checkTransactionStatus(config);
          
          if (onUpdate) {
            onUpdate(result);
          }

          // Emit event to listeners
          this.emitTransactionEvent({
            txHash: config.txHash,
            chainId: config.chainId,
            status: result.transaction?.status || 'pending',
            confirmations: result.transaction?.confirmations || 0,
            timestamp: Date.now(),
            details: result.transaction
          });

          // Check if monitoring is complete
          if (result.isComplete) {
            this.stopMonitoring(monitorId);
            
            // Send webhook notification if configured
            if (config.webhookUrl && result.transaction) {
              await this.sendWebhookNotification(config.webhookUrl, {
                event: result.transaction.status === 'confirmed' 
                  ? 'transaction_confirmed' 
                  : 'transaction_failed',
                transaction: result.transaction
              });
            }

            // Update database record
            await this.updateTransactionRecord(config.txHash, config.chainId, result.transaction);
          }

        } catch (error) {
          console.error(`Transaction monitoring error for ${monitorId}:`, error);
          
          // Stop monitoring on repeated failures
          config.retryCount--;
          if (config.retryCount <= 0) {
            this.stopMonitoring(monitorId);
            
            if (onUpdate) {
              onUpdate({
                success: false,
                error: 'Monitoring failed after maximum retries',
                isComplete: true,
                progress: 0
              });
            }
          }
        }
      }, 10000); // Check every 10 seconds

      // Set timeout to stop monitoring
      setTimeout(() => {
        this.stopMonitoring(monitorId);
      }, config.timeoutMinutes * 60 * 1000);

      this.activeMonitors.set(monitorId, interval);

      return {
        success: true,
        monitorId
      };

    } catch (error) {
      console.error('Failed to start transaction monitoring:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Monitoring setup failed'
      };
    }
  }

  /**
   * Stop monitoring a transaction
   */
  stopMonitoring(monitorId: string): void {
    const interval = this.activeMonitors.get(monitorId);
    if (interval) {
      clearInterval(interval);
      this.activeMonitors.delete(monitorId);
    }
  }

  /**
   * Check transaction status on blockchain
   */
  async checkTransactionStatus(config: TransactionMonitorConfig): Promise<MonitoringResult> {
    try {
      const chainConfig = getChainConfig(config.chainId);
      if (!chainConfig) {
        throw new Error(`Chain ${config.chainId} not supported`);
      }

      // Get RPC client for the chain
      const rpcClient = getRpcClient({
        client: this.client,
        chain: chainConfig.chain
      });

      // Get transaction receipt
      const receipt = await rpcClient({
        method: 'eth_getTransactionReceipt',
        params: [config.txHash]
      });

      if (!receipt) {
        // Transaction not yet mined
        return {
          success: true,
          transaction: {
            hash: config.txHash,
            status: 'pending' as TransactionStatus,
            confirmations: 0,
            from: '',
            value: '0'
          },
          isComplete: false,
          progress: 0
        };
      }

      // Get current block number
      const currentBlock = await rpcClient({
        method: 'eth_blockNumber',
        params: []
      });

      const currentBlockNumber = parseInt(currentBlock as string, 16);
      const txBlockNumber = parseInt(receipt.blockNumber as string, 16);
      const confirmations = Math.max(0, currentBlockNumber - txBlockNumber + 1);

      // Determine transaction status
      let status: TransactionStatus = 'pending';
      if (receipt.status === '0x0') {
        status = 'failed';
      } else if (confirmations >= config.requiredConfirmations) {
        status = 'confirmed';
      } else if (confirmations > 0) {
        status = 'pending';
      }

      // Get transaction details
      const tx = await rpcClient({
        method: 'eth_getTransactionByHash',
        params: [config.txHash]
      });

      const transaction: TransactionDetails = {
        hash: config.txHash,
        blockNumber: txBlockNumber,
        blockHash: receipt.blockHash as string,
        transactionIndex: parseInt(receipt.transactionIndex as string, 16),
        from: (tx as any)?.from || '',
        to: (tx as any)?.to || '',
        value: (tx as any)?.value || '0',
        gasUsed: parseInt(receipt.gasUsed as string, 16).toString(),
        gasPrice: (tx as any)?.gasPrice || '0',
        effectiveGasPrice: receipt.effectiveGasPrice as string,
        status,
        confirmations,
        timestamp: await this.getBlockTimestamp(chainConfig, txBlockNumber)
      };

      const progress = Math.min((confirmations / config.requiredConfirmations) * 100, 100);
      const isComplete = status === 'confirmed' || status === 'failed';

      return {
        success: true,
        transaction,
        isComplete,
        progress
      };

    } catch (error) {
      console.error('Transaction status check failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Status check failed',
        isComplete: false,
        progress: 0
      };
    }
  }

  /**
   * Get block timestamp
   */
  private async getBlockTimestamp(chainConfig: ChainConfig, blockNumber: number): Promise<number> {
    try {
      const rpcClient = getRpcClient({
        client: this.client,
        chain: chainConfig.chain
      });

      const block = await rpcClient({
        method: 'eth_getBlockByNumber',
        params: [`0x${blockNumber.toString(16)}`, false]
      });

      return parseInt((block as any)?.timestamp || '0', 16) * 1000;
    } catch (error) {
      console.warn('Failed to get block timestamp:', error);
      return Date.now();
    }
  }

  /**
   * Store transaction record in database
   */
  private async storeTransactionRecord(
    config: TransactionMonitorConfig,
    chainConfig: ChainConfig
  ): Promise<void> {
    try {
      await updatedApiClient.makeRequest('/cross-chain-transactions', 'POST', {
        transaction_hash: config.txHash,
        source_chain_id: config.chainId,
        status: 'pending',
        required_confirmations: config.requiredConfirmations,
        metadata: {
          chain_name: chainConfig.name,
          started_at: new Date().toISOString(),
          timeout_minutes: config.timeoutMinutes
        }
      });
    } catch (error) {
      console.warn('Failed to store transaction record:', error);
    }
  }

  /**
   * Update transaction record in database
   */
  private async updateTransactionRecord(
    txHash: string,
    chainId: number,
    transaction?: TransactionDetails
  ): Promise<void> {
    try {
      if (!transaction) return;

      await updatedApiClient.makeRequest('/cross-chain-transactions', 'PUT', {
        transaction_hash: txHash,
        source_chain_id: chainId,
        block_number: transaction.blockNumber,
        status: transaction.status,
        confirmations: transaction.confirmations,
        gas_used: transaction.gasUsed,
        gas_price: transaction.gasPrice,
        confirmed_at: transaction.status === 'confirmed' ? new Date().toISOString() : null,
        metadata: {
          block_hash: transaction.blockHash,
          transaction_index: transaction.transactionIndex,
          effective_gas_price: transaction.effectiveGasPrice,
          timestamp: transaction.timestamp
        }
      });
    } catch (error) {
      console.warn('Failed to update transaction record:', error);
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(url: string, payload: WebhookPayload): Promise<void> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Beehive-TransactionMonitor/1.0'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Webhook notification failed:', error);
    }
  }

  /**
   * Add event listener for transaction updates
   */
  addEventListener(
    txHash: string,
    chainId: number,
    listener: (event: TransactionEvent) => void
  ): void {
    const key = `${chainId}-${txHash}`;
    const listeners = this.eventListeners.get(key) || [];
    listeners.push(listener);
    this.eventListeners.set(key, listeners);
  }

  /**
   * Remove event listener
   */
  removeEventListener(
    txHash: string,
    chainId: number,
    listener: (event: TransactionEvent) => void
  ): void {
    const key = `${chainId}-${txHash}`;
    const listeners = this.eventListeners.get(key) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
      this.eventListeners.set(key, listeners);
    }
  }

  /**
   * Emit transaction event to listeners
   */
  private emitTransactionEvent(event: TransactionEvent): void {
    const key = `${event.chainId}-${event.txHash}`;
    const listeners = this.eventListeners.get(key) || [];
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    });
  }

  /**
   * Get monitoring status for a transaction
   */
  isMonitoring(txHash: string, chainId: number): boolean {
    const monitorId = `${chainId}-${txHash}`;
    return this.activeMonitors.has(monitorId);
  }

  /**
   * Get list of currently monitored transactions
   */
  getActiveMonitors(): string[] {
    return Array.from(this.activeMonitors.keys());
  }

  /**
   * Stop all active monitoring
   */
  stopAllMonitoring(): void {
    this.activeMonitors.forEach((interval, monitorId) => {
      clearInterval(interval);
    });
    this.activeMonitors.clear();
    this.eventListeners.clear();
  }

  /**
   * Get recommended confirmation count for a chain
   */
  getRecommendedConfirmations(chainId: number): number {
    const chainConfig = getChainConfig(chainId);
    if (!chainConfig) return 12;

    // Return the configured confirmation blocks for the chain
    return chainConfig.confirmationBlocks;
  }

  /**
   * Estimate confirmation time
   */
  estimateConfirmationTime(chainId: number, confirmations?: number): number {
    const chainConfig = getChainConfig(chainId);
    if (!chainConfig) return 300; // 5 minutes default

    const requiredConfirmations = confirmations || chainConfig.confirmationBlocks;
    return requiredConfirmations * chainConfig.blockTime; // in seconds
  }
}

// Export singleton instance
export const transactionMonitor = new TransactionMonitor();

// Export types for use in other modules
export type {
  TransactionMonitorConfig,
  TransactionDetails,
  MonitoringResult,
  TransactionEvent,
  WebhookPayload
};