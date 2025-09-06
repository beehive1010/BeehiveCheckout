import { db } from '../../db';
import { 
  userBalances, 
  usdtWithdrawals,
  users,
  members,
  bccGlobalPool 
} from '@shared/schema';
import { eq, sql, and, desc } from 'drizzle-orm';

export interface BalanceBreakdown {
  walletAddress: string;
  
  // BCC Balances
  bccTransferable: number; // Can be used for transfers
  bccRestricted: number;   // From rewards, limited use
  bccLocked: number;       // Staked BCC, locked
  totalBcc: number;
  
  // USDT Balances
  totalUsdtEarned: number;    // Total USDT earned (cents)
  availableUsdtRewards: number; // Available for withdrawal (cents)
  totalUsdtWithdrawn: number;   // Already withdrawn (cents)
  
  // Staking Info
  activationTier: number;     // Which activation tier user is in
  activationOrder: number;    // Position in activation queue
  
  // Hidden balances
  cthBalance: number;         // CTH balance (not shown in UI)
  
  // Metadata
  lastUpdated: Date;
  createdAt: Date;
}

export interface WithdrawalRequest {
  walletAddress: string;
  amountUsdt: number;        // Amount in cents
  targetChain: string;       // Chain to withdraw to
  targetWalletAddress: string; // User's wallet on target chain
}

export interface WithdrawalResult {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  netAmount: number;         // Amount after fees (cents)
  gasFeeAmount: number;      // Fee amount (cents)
  gasFeePercentage: number;  // Fee percentage
  targetChain: string;
  estimatedProcessingTime: string;
}

/**
 * Enhanced Balance Management Service
 * Handles the new userBalances schema with BCC/USDT separation
 */
export class EnhancedBalanceService {

  /**
   * Get complete balance breakdown for a user
   */
  async getBalanceBreakdown(walletAddress: string): Promise<BalanceBreakdown> {
    const wallet = walletAddress.toLowerCase();

    // Get user balance record
    const [balance] = await db
      .select()
      .from(userBalances)
      .where(eq(userBalances.walletAddress, wallet));

    if (!balance) {
      // Create initial balance record
      const newBalance = await this.createInitialBalance(wallet);
      return this.formatBalanceBreakdown(newBalance);
    }

    return this.formatBalanceBreakdown(balance);
  }

  /**
   * Initialize balance for new user
   */
  async createInitialBalance(walletAddress: string): Promise<any> {
    const wallet = walletAddress.toLowerCase();

    // Get next activation order
    const activationOrder = await this.getNextActivationOrder();
    const activationTier = this.calculateActivationTier(activationOrder);

    const [newBalance] = await db
      .insert(userBalances)
      .values({
        walletAddress: wallet,
        bccTransferable: 500,     // Initial 500 BCC
        bccRestricted: 0,
        bccLocked: 0,
        totalUsdtEarned: 0,
        availableUsdtRewards: 0,
        totalUsdtWithdrawn: 0,
        activationTier,
        activationOrder,
        cthBalance: 0,
        lastUpdated: new Date(),
        createdAt: new Date()
      })
      .returning();

    console.log(`💰 Initialized balance for ${wallet}: Tier ${activationTier}, Order ${activationOrder}`);
    return newBalance;
  }

  /**
   * Update BCC balance (transferable/restricted/locked)
   */
  async updateBccBalance(
    walletAddress: string, 
    changes: {
      transferable?: number;
      restricted?: number;
      locked?: number;
    }
  ): Promise<BalanceBreakdown> {
    const wallet = walletAddress.toLowerCase();

    // Get current balance
    const current = await this.getBalanceBreakdown(wallet);

    // Calculate new amounts
    const newTransferable = current.bccTransferable + (changes.transferable || 0);
    const newRestricted = current.bccRestricted + (changes.restricted || 0);
    const newLocked = current.bccLocked + (changes.locked || 0);

    // Validate non-negative balances
    if (newTransferable < 0 || newRestricted < 0 || newLocked < 0) {
      throw new Error('Insufficient BCC balance');
    }

    // Update database
    await db
      .update(userBalances)
      .set({
        bccTransferable: newTransferable,
        bccRestricted: newRestricted,
        bccLocked: newLocked,
        lastUpdated: new Date()
      })
      .where(eq(userBalances.walletAddress, wallet));

    console.log(`📊 BCC Balance updated for ${wallet}:`, {
      transferable: changes.transferable || 0,
      restricted: changes.restricted || 0,
      locked: changes.locked || 0
    });

    return await this.getBalanceBreakdown(wallet);
  }

  /**
   * Add USDT earnings to user balance
   */
  async addUsdtEarnings(walletAddress: string, amountCents: number): Promise<void> {
    const wallet = walletAddress.toLowerCase();

    await db
      .update(userBalances)
      .set({
        totalUsdtEarned: sql`${userBalances.totalUsdtEarned} + ${amountCents}`,
        availableUsdtRewards: sql`${userBalances.availableUsdtRewards} + ${amountCents}`,
        lastUpdated: new Date()
      })
      .where(eq(userBalances.walletAddress, wallet));

    console.log(`💰 Added ${amountCents/100} USDT to ${wallet} earnings`);
  }

  /**
   * Request USDT withdrawal
   */
  async requestUsdtWithdrawal(request: WithdrawalRequest): Promise<WithdrawalResult> {
    const { walletAddress, amountUsdt, targetChain, targetWalletAddress } = request;
    const wallet = walletAddress.toLowerCase();

    // Validate balance
    const balance = await this.getBalanceBreakdown(wallet);
    if (balance.availableUsdtRewards < amountUsdt) {
      throw new Error('Insufficient USDT balance for withdrawal');
    }

    // Calculate fees based on target chain
    const gasFeePercentage = this.calculateWithdrawalFee(targetChain);
    const gasFeeAmount = Math.floor(amountUsdt * gasFeePercentage / 100);
    const netAmount = amountUsdt - gasFeeAmount;

    // Create withdrawal request
    const [withdrawal] = await db
      .insert(usdtWithdrawals)
      .values({
        walletAddress: wallet,
        amountUsdt,
        targetChain,
        targetWalletAddress,
        gasFeePercentage,
        gasFeeAmount,
        netAmount,
        status: 'pending',
        requestedAt: new Date()
      })
      .returning();

    // Reserve the USDT (deduct from available balance)
    await db
      .update(userBalances)
      .set({
        availableUsdtRewards: sql`${userBalances.availableUsdtRewards} - ${amountUsdt}`,
        lastUpdated: new Date()
      })
      .where(eq(userBalances.walletAddress, wallet));

    console.log(`📤 USDT withdrawal requested: ${amountUsdt/100} USDT to ${targetChain} (Fee: ${gasFeeAmount/100} USDT)`);

    return {
      id: withdrawal.id,
      status: 'pending',
      netAmount,
      gasFeeAmount,
      gasFeePercentage,
      targetChain,
      estimatedProcessingTime: this.getEstimatedProcessingTime(targetChain)
    };
  }

  /**
   * Get withdrawal history for a user
   */
  async getWithdrawalHistory(walletAddress: string, limit: number = 20): Promise<any[]> {
    const wallet = walletAddress.toLowerCase();

    const withdrawals = await db
      .select()
      .from(usdtWithdrawals)
      .where(eq(usdtWithdrawals.walletAddress, wallet))
      .orderBy(desc(usdtWithdrawals.requestedAt))
      .limit(limit);

    return withdrawals.map(withdrawal => ({
      id: withdrawal.id,
      amount: withdrawal.amountUsdt / 100,
      netAmount: withdrawal.netAmount / 100,
      gasFee: withdrawal.gasFeeAmount / 100,
      gasFeePercentage: withdrawal.gasFeePercentage,
      targetChain: withdrawal.targetChain,
      targetWalletAddress: withdrawal.targetWalletAddress,
      status: withdrawal.status,
      requestedAt: withdrawal.requestedAt.toISOString(),
      processedAt: withdrawal.processedAt?.toISOString(),
      completedAt: withdrawal.completedAt?.toISOString(),
      txHash: withdrawal.serverWalletTxHash || withdrawal.targetChainTxHash,
      failureReason: withdrawal.failureReason
    }));
  }

  /**
   * Process BCC spending (courses, NFTs, etc.)
   */
  async spendBcc(
    walletAddress: string, 
    amount: number, 
    bucketPreference: 'transferable' | 'restricted' | 'auto' = 'auto'
  ): Promise<{ success: boolean; bucketUsed: string; newBalance: BalanceBreakdown }> {
    const wallet = walletAddress.toLowerCase();
    const balance = await this.getBalanceBreakdown(wallet);

    let transferableUsed = 0;
    let restrictedUsed = 0;

    if (bucketPreference === 'transferable') {
      if (balance.bccTransferable < amount) {
        throw new Error('Insufficient transferable BCC balance');
      }
      transferableUsed = amount;
    } else if (bucketPreference === 'restricted') {
      if (balance.bccRestricted < amount) {
        throw new Error('Insufficient restricted BCC balance');
      }
      restrictedUsed = amount;
    } else {
      // Auto: Use transferable first, then restricted
      if (balance.bccTransferable >= amount) {
        transferableUsed = amount;
      } else if (balance.bccTransferable + balance.bccRestricted >= amount) {
        transferableUsed = balance.bccTransferable;
        restrictedUsed = amount - balance.bccTransferable;
      } else {
        throw new Error('Insufficient BCC balance');
      }
    }

    // Update balance
    const newBalance = await this.updateBccBalance(wallet, {
      transferable: -transferableUsed,
      restricted: -restrictedUsed
    });

    const bucketUsed = transferableUsed > 0 && restrictedUsed > 0 
      ? 'mixed' 
      : transferableUsed > 0 
        ? 'transferable' 
        : 'restricted';

    console.log(`🛒 BCC spent: ${amount} from ${bucketUsed} bucket(s) by ${wallet}`);

    return {
      success: true,
      bucketUsed,
      newBalance
    };
  }

  /**
   * Get global BCC pool statistics
   */
  async getGlobalBccPoolStats(): Promise<{
    totalBccLocked: number;
    totalMembersActivated: number;
    currentTier: number;
    tierBreakdown: {
      tier1: number;
      tier2: number;
      tier3: number;
      tier4: number;
    };
  }> {
    const [poolStats] = await db
      .select()
      .from(bccGlobalPool)
      .where(eq(bccGlobalPool.id, 1));

    if (!poolStats) {
      // Initialize global pool
      await db
        .insert(bccGlobalPool)
        .values({
          id: 1,
          totalBccLocked: 0,
          totalMembersActivated: 0,
          currentTier: 1,
          tier1Activations: 0,
          tier2Activations: 0,
          tier3Activations: 0,
          tier4Activations: 0,
          lastUpdated: new Date()
        });

      return {
        totalBccLocked: 0,
        totalMembersActivated: 0,
        currentTier: 1,
        tierBreakdown: { tier1: 0, tier2: 0, tier3: 0, tier4: 0 }
      };
    }

    return {
      totalBccLocked: poolStats.totalBccLocked,
      totalMembersActivated: poolStats.totalMembersActivated,
      currentTier: poolStats.currentTier,
      tierBreakdown: {
        tier1: poolStats.tier1Activations,
        tier2: poolStats.tier2Activations,
        tier3: poolStats.tier3Activations,
        tier4: poolStats.tier4Activations
      }
    };
  }

  /**
   * Helper Functions
   */
  
  private formatBalanceBreakdown(balance: any): BalanceBreakdown {
    return {
      walletAddress: balance.walletAddress,
      bccTransferable: balance.bccTransferable,
      bccRestricted: balance.bccRestricted,
      bccLocked: balance.bccLocked,
      totalBcc: balance.bccTransferable + balance.bccRestricted + balance.bccLocked,
      totalUsdtEarned: balance.totalUsdtEarned,
      availableUsdtRewards: balance.availableUsdtRewards,
      totalUsdtWithdrawn: balance.totalUsdtWithdrawn,
      activationTier: balance.activationTier,
      activationOrder: balance.activationOrder,
      cthBalance: balance.cthBalance,
      lastUpdated: balance.lastUpdated,
      createdAt: balance.createdAt
    };
  }

  private async getNextActivationOrder(): Promise<number> {
    const [result] = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(${userBalances.activationOrder}), 0)` })
      .from(userBalances);
    
    return (result?.maxOrder || 0) + 1;
  }

  private calculateActivationTier(activationOrder: number): number {
    if (activationOrder <= 9999) return 1;
    if (activationOrder <= 19999) return 2;
    if (activationOrder <= 39999) return 3;
    return 4;
  }

  private calculateWithdrawalFee(targetChain: string): number {
    const feeMap: Record<string, number> = {
      'ethereum': 2.5,     // 2.5% fee
      'polygon': 1.0,      // 1.0% fee  
      'arbitrum': 1.5,     // 1.5% fee
      'optimism': 1.5,     // 1.5% fee
      'bsc': 1.0,          // 1.0% fee
    };

    return feeMap[targetChain.toLowerCase()] || 2.0; // Default 2.0% fee
  }

  private getEstimatedProcessingTime(targetChain: string): string {
    const timeMap: Record<string, string> = {
      'ethereum': '15-30 minutes',
      'polygon': '5-10 minutes',
      'arbitrum': '10-20 minutes',
      'optimism': '10-20 minutes',
      'bsc': '5-10 minutes'
    };

    return timeMap[targetChain.toLowerCase()] || '15-30 minutes';
  }
}

export const enhancedBalanceService = new EnhancedBalanceService();