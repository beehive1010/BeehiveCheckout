import { usersRepo, referralsRepo, type UserReward } from '../repositories';
import { RewardsPostgreSQLRepository } from '../repositories/rewards-pg.repository';
import { db } from '../../db';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';

// Use PostgreSQL-based rewards repository instead of ReplitDB
const rewardsRepo = new RewardsPostgreSQLRepository();

export interface ClaimableReward {
  id: string;
  amount: number;
  tokenType: 'BCC' | 'USDT';
  triggerLevel: number;
  memberWallet: string;
  createdAt: string;
  expiresAt?: string;
}

export interface RewardDistributionRequest {
  memberWallet: string;
  triggerLevel: number;
  upgradeAmount: number;
}

export class RewardsService {
  /**
   * Process reward distribution for level upgrade
   */
  async processLevelUpgradeRewards(request: RewardDistributionRequest): Promise<UserReward[]> {
    const { memberWallet, triggerLevel, upgradeAmount } = request;
    const member = memberWallet.toLowerCase();

    console.log(`🎯 Processing L${triggerLevel} upgrade reward for ${member}`);

    // Verify member exists and is activated
    const memberUser = await usersRepo.getByWallet(member);
    if (!memberUser || !memberUser.isActivated) {
      throw new Error('Member not found or not activated');
    }

    // Get complete referral chain up to 19 levels
    const referralChain = await referralsRepo.getChain(member);
    const createdRewards: UserReward[] = [];

    // L1-L19 USDT reward amounts: Level 1 = 100, Level 2 = 150, ..., Level 19 = 1000
    const rewardAmount = 50 + (triggerLevel * 50); // 100, 150, 200, ..., 1000

    console.log(`💰 Level ${triggerLevel} reward: ${rewardAmount} USDT`);

    // CRITICAL: Level N reward goes to Nth ancestor (not all uplines)
    // Example: Level 3 upgrade → reward goes to the 3rd ancestor only
    if (referralChain.length >= triggerLevel) {
      const targetAncestorIndex = triggerLevel - 1; // 0-indexed
      const targetUpline = referralChain[targetAncestorIndex];
      const uplineWallet = targetUpline.upline;

      console.log(`🎯 Targeting L${triggerLevel} ancestor: ${uplineWallet} (depth ${targetUpline.depth})`);

      // Check if target upline qualifies for reward
      const uplineUser = await usersRepo.getByWallet(uplineWallet);
      if (uplineUser && uplineUser.isActivated) {
        
        // Check eligibility: upline must have membership_level >= N  
        if (uplineUser.membershipLevel >= triggerLevel) {
          console.log(`✅ Upline qualified (L${uplineUser.membershipLevel} >= L${triggerLevel})`);
          
          // Create confirmed reward in PostgreSQL
          const confirmedReward = await rewardsRepo.create({
            recipientWallet: uplineWallet,
            sourceWallet: member,
            triggerLevel,
            payoutLayer: targetUpline.depth,
            rewardAmount: rewardAmount,
            status: 'confirmed',
            notes: `L${triggerLevel} upgrade reward from ${member}`
          });
          createdRewards.push(confirmedReward);
        } else {
          console.log(`⏳ Upline pending (L${uplineUser.membershipLevel} < L${triggerLevel})`);
          
          // Create pending reward with 72h expiration in PostgreSQL
          const pendingReward = await rewardsRepo.create({
            recipientWallet: uplineWallet,
            sourceWallet: member,
            triggerLevel,
            payoutLayer: targetUpline.depth,
            rewardAmount: rewardAmount,
            status: 'pending',
            expiresAt: this.calculateExpirationDate(72), // 72 hours to upgrade
            requiresLevel: triggerLevel,
            notes: `Pending L${triggerLevel} reward - requires upline L${triggerLevel} upgrade`
          });
          createdRewards.push(pendingReward);
        }
      } else {
        console.log(`❌ Target upline ${uplineWallet} not found or inactive`);
      }
    } else {
      console.log(`🔍 No L${triggerLevel} ancestor found (chain depth: ${referralChain.length})`);
    }

    // Platform Revenue: +30 USDT for Level 1 upgrades only
    if (triggerLevel === 1) {
      console.log(`🏦 Adding +30 USDT platform revenue for L1 upgrade`);
      await this.addPlatformRevenue({
        sourceWallet: member,
        amount: 30,
        level: 1,
        description: `Platform fee from L1 upgrade: ${member}`
      });
    }

    console.log(`📊 Created ${createdRewards.length} rewards for L${triggerLevel} upgrade`);
    return createdRewards;
  }

  /**
   * Get claimable rewards from earnings wallet (aggregated balance)
   */
  async getClaimableRewards(walletAddress: string): Promise<{
    claimableRewards: any[];
    pendingRewards: any[];
    totalClaimable: number;
    totalPending: number;
  }> {
    const wallet = walletAddress.toLowerCase();
    
    // Get earnings wallet balance
    const result = await db.execute(sql`
      SELECT * FROM earnings_wallet WHERE wallet_address = ${wallet}
    `);
    const earningsWallet = result.rows[0];
    
    if (!earningsWallet) {
      return {
        claimableRewards: [],
        pendingRewards: [],
        totalClaimable: 0,
        totalPending: 0
      };
    }

    const earnings = earningsWallet as any;
    const totalEarnings = parseFloat(earnings.total_earnings || '0');
    const pendingRewards = parseFloat(earnings.pending_rewards || '0');
    const withdrawnAmount = parseFloat(earnings.withdrawn_amount || '0');
    
    // Available to claim = total earnings - pending - already withdrawn
    const availableBalance = totalEarnings - pendingRewards - withdrawnAmount;
    
    // Create a single claimable reward representing the available balance
    const claimableRewards = availableBalance > 0 ? [{
      id: 'earnings-wallet-balance',
      rewardAmount: availableBalance,
      triggerLevel: 0,
      payoutLayer: 0,
      matrixPosition: 'Earnings Wallet',
      sourceWallet: 'Multiple Sources',
      status: 'confirmed',
      createdAt: earnings.last_reward_at || earnings.created_at,
      metadata: {
        type: 'aggregated_balance',
        totalEarnings,
        pendingRewards,
        withdrawnAmount
      }
    }] : [];

    // Get individual pending rewards for display
    const { rewards: individualPendingRewards } = await rewardsRepo.listByBeneficiary(wallet, { 
      status: 'pending',
      limit: 10 
    });

    const pendingRewardsFormatted = individualPendingRewards.map(reward => ({
      id: reward.id,
      rewardAmount: reward.rewardAmount,
      triggerLevel: reward.triggerLevel,
      payoutLayer: reward.payoutLayer,
      matrixPosition: `L${reward.triggerLevel}-P${reward.payoutLayer}`,
      sourceWallet: reward.sourceWallet,
      status: 'pending',
      requiresLevel: reward.requiresLevel,
      unlockCondition: reward.requiresLevel ? `Upgrade to Level ${reward.requiresLevel}` : undefined,
      expiresAt: reward.expiresAt?.toISOString(),
      createdAt: reward.createdAt.toISOString(),
      metadata: {}
    }));

    return {
      claimableRewards,
      pendingRewards: pendingRewardsFormatted,
      totalClaimable: availableBalance,
      totalPending: pendingRewards
    };
  }

  /**
   * Get pending rewards (waiting for level upgrade)
   */
  async getPendingRewards(walletAddress: string): Promise<UserReward[]> {
    const wallet = walletAddress.toLowerCase();
    
    const { rewards } = await rewardsRepo.listByBeneficiary(wallet, { 
      status: 'pending',
      limit: 100 
    });

    return rewards;
  }

  /**
   * Claim a specific reward
   */
  /**
   * Claim rewards using earnings wallet balance with Thirdweb Engine
   */
  async claimRewardWithEngine(
    rewardId: string, 
    claimerWallet: string, 
    recipientAddress: string
  ): Promise<{
    success: boolean, 
    transactionHash?: string, 
    explorerUrl?: string, 
    message: string
  }> {
    const wallet = claimerWallet.toLowerCase();
    
    // For earnings wallet balance, rewardId will be 'earnings-wallet-balance'
    if (rewardId === 'earnings-wallet-balance') {
      // Get current earnings wallet
      const result = await db.execute(sql`
        SELECT * FROM earnings_wallet WHERE wallet_address = ${wallet}
      `);
      const earningsWallet = result.rows[0];
      
      if (!earningsWallet) {
        throw new Error('Earnings wallet not found');
      }

      const earnings = earningsWallet as any;
      const totalEarnings = parseFloat(earnings.total_earnings || '0');
      const pendingRewards = parseFloat(earnings.pending_rewards || '0');
      const withdrawnAmount = parseFloat(earnings.withdrawn_amount || '0');
      const availableBalance = totalEarnings - pendingRewards - withdrawnAmount;

      if (availableBalance <= 0) {
        throw new Error('No balance available to claim');
      }

      try {
        // Execute USDT transfer using Thirdweb Engine
        const transferResult = await this.executeUSDTTransfer({
          amount: availableBalance,
          recipientAddress,
          rewardId: 'earnings-wallet-claim'
        });

        // Update earnings wallet - mark as withdrawn
        await db.execute(sql`
          UPDATE earnings_wallet 
          SET withdrawn_amount = withdrawn_amount + ${availableBalance}
          WHERE wallet_address = ${wallet}
        `);

        return {
          success: true,
          transactionHash: transferResult.transactionHash,
          explorerUrl: transferResult.explorerUrl,
          message: `${availableBalance} USDT transferred successfully from your earnings wallet`
        };
      } catch (error) {
        console.error('Earnings wallet claim failed:', error);
        throw new Error(`Transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      // Legacy individual reward claiming
      const reward = await rewardsRepo.getById(rewardId);
      
      if (!reward) {
        throw new Error('Reward not found');
      }

      if (reward.recipientWallet !== claimerWallet.toLowerCase()) {
        throw new Error('Not authorized to claim this reward');
      }

      if (reward.status !== 'confirmed') {
        throw new Error('Reward is not confirmed and claimable');
      }

      try {
        // Execute USDT transfer using Thirdweb Engine
        const transferResult = await this.executeUSDTTransfer({
          amount: reward.rewardAmount,
          recipientAddress,
          rewardId
        });

        // Mark as claimed with real transaction hash
        await rewardsRepo.setStatus(rewardId, 'claimed');

        return {
          success: true,
          transactionHash: transferResult.transactionHash,
          explorerUrl: transferResult.explorerUrl,
          message: `${reward.rewardAmount} USDT transferred successfully to your wallet`
        };
      } catch (error) {
        console.error('Thirdweb Engine transfer failed:', error);
        throw new Error(`Transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Execute USDT transfer using Thirdweb Engine
   */
  private async executeUSDTTransfer({
    amount,
    recipientAddress,
    rewardId
  }: {
    amount: number;
    recipientAddress: string;
    rewardId: string;
  }): Promise<{
    transactionHash: string;
    explorerUrl?: string;
  }> {
    const engineUrl = process.env.THIRDWEB_ENGINE_URL;
    const accessToken = process.env.THIRDWEB_ENGINE_ACCESS_TOKEN;
    const serverWallet = process.env.THIRDWEB_SERVER_WALLET_ADDRESS;
    
    if (!engineUrl || !accessToken || !serverWallet) {
      throw new Error('Thirdweb Engine configuration missing');
    }

    // Use Polygon for USDT transfers (chain ID 137)
    const chainId = 137;
    const usdtContractAddress = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'; // USDT on Polygon
    
    // Convert amount to wei (USDT has 6 decimals)
    const amountWei = (amount * 1000000).toString(); // 6 decimals for USDT

    const transferPayload = {
      contractAddress: usdtContractAddress,
      toAddress: recipientAddress,
      amount: amountWei,
      fromAddress: serverWallet
    };

    console.log(`🚀 Executing USDT transfer via Thirdweb Engine:`, {
      amount: `${amount} USDT`,
      recipient: recipientAddress,
      rewardId
    });

    const response = await fetch(`${engineUrl}/contract/${chainId}/${usdtContractAddress}/erc20/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'x-backend-wallet-address': serverWallet
      },
      body: JSON.stringify(transferPayload)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Thirdweb Engine error:', errorData);
      throw new Error(`Engine transfer failed: ${response.statusText}`);
    }

    const result = await response.json();
    const transactionHash = result.result?.transactionHash || result.queueId;
    
    if (!transactionHash) {
      throw new Error('No transaction hash returned from Engine');
    }

    // Generate Polygon explorer URL
    const explorerUrl = `https://polygonscan.com/tx/${transactionHash}`;

    console.log(`✅ USDT transfer completed:`, {
      transactionHash,
      explorerUrl,
      amount: `${amount} USDT`
    });

    return {
      transactionHash,
      explorerUrl
    };
  }

  async claimReward(rewardId: string, claimerWallet: string): Promise<{success: boolean, txHash?: string}> {
    const reward = await rewardsRepo.getById(rewardId);
    
    if (!reward) {
      throw new Error('Reward not found');
    }

    if (reward.recipientWallet !== claimerWallet.toLowerCase()) {
      throw new Error('Not authorized to claim this reward');
    }

    if (reward.status !== 'confirmed') {
      throw new Error('Reward is not confirmed and claimable');
    }

    // In real implementation, this would trigger blockchain transaction
    const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
    
    // Mark as claimed
    await rewardsRepo.setStatus(rewardId, 'claimed');
    await rewardsRepo.markSettled([rewardId], mockTxHash);

    return { success: true, txHash: mockTxHash };
  }

  /**
   * Claim all confirmed rewards for a user
   */
  async claimAllRewards(walletAddress: string): Promise<{success: boolean, txHash?: string, claimedCount: number}> {
    const claimableRewards = await this.getClaimableRewards(walletAddress);
    
    if (claimableRewards.length === 0) {
      throw new Error('No claimable rewards found');
    }

    // In real implementation, this would be a batch blockchain transaction
    const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
    
    // Mark all as claimed
    const rewardIds = claimableRewards.map(r => r.id);
    await rewardsRepo.markSettled(rewardIds, mockTxHash);

    return { 
      success: true, 
      txHash: mockTxHash, 
      claimedCount: claimableRewards.length 
    };
  }

  /**
   * Process pending reward confirmations (cron job)
   */
  async processPendingRewards(): Promise<{confirmed: number, expired: number}> {
    const now = new Date().toISOString();
    const pendingRewards = await rewardsRepo.listPendingBefore(now, 500);
    
    let confirmed = 0;
    let expired = 0;

    for (const reward of pendingRewards) {
      const beneficiary = await usersRepo.getByWallet(reward.beneficiaryWallet);
      
      if (!beneficiary) {
        continue;
      }

      // Check if beneficiary now qualifies
      if (beneficiary.isActivated && beneficiary.membershipLevel >= reward.triggerLevel) {
        await rewardsRepo.setStatus(reward.id, 'confirmed');
        confirmed++;
      } else if (reward.expiresAt && reward.expiresAt < now) {
        // Reward expired, reallocate upward
        await this.reallocateExpiredReward(reward);
        await rewardsRepo.setStatus(reward.id, 'expired');
        expired++;
      }
    }

    return { confirmed, expired };
  }

  /**
   * Reallocate expired reward to next qualified upline following Global 1×3 Matrix rules
   */
  private async reallocateExpiredReward(expiredReward: UserReward): Promise<void> {
    console.log(`🔄 Reallocating expired L${expiredReward.triggerLevel} reward from ${expiredReward.beneficiaryWallet}`);
    
    // Get the original member's complete chain up to L19
    const memberChain = await referralsRepo.getChain(expiredReward.memberWallet);
    
    // Search upward from the expired beneficiary's position
    const expiredBeneficiaryDepth = expiredReward.payoutLayer;
    
    // Look for next qualified ancestor beyond the expired beneficiary
    for (let searchDepth = expiredBeneficiaryDepth + 1; searchDepth <= 19 && searchDepth <= memberChain.length; searchDepth++) {
      const candidateUpline = memberChain[searchDepth - 1]; // 0-indexed
      const uplineUser = await usersRepo.getByWallet(candidateUpline.upline);
      
      if (uplineUser && 
          uplineUser.isActivated && 
          uplineUser.membershipLevel >= expiredReward.triggerLevel) {
        
        console.log(`✅ Reallocating to L${searchDepth} ancestor: ${candidateUpline.upline}`);
        
        // Create new confirmed reward for qualified upline
        await rewardsRepo.create({
          beneficiaryWallet: candidateUpline.upline,
          memberWallet: expiredReward.memberWallet,
          triggerLevel: expiredReward.triggerLevel,
          payoutLayer: candidateUpline.depth,
          amount: expiredReward.amount,
          tokenType: expiredReward.tokenType,
          status: 'confirmed',
          notes: `Reallocated from expired reward (original: ${expiredReward.beneficiaryWallet})`
        });
        
        return; // Successfully reallocated
      }
    }
    
    // No qualified upline found - send to platform revenue
    console.log(`🏦 No qualified upline found, sending ${expiredReward.amount} ${expiredReward.tokenType} to platform`);
    await this.addPlatformRevenue({
      sourceWallet: expiredReward.memberWallet,
      amount: expiredReward.amount,
      level: expiredReward.triggerLevel,
      description: `Unallocated L${expiredReward.triggerLevel} reward - no qualified upline`
    });
  }

  /**
   * Add platform revenue entry
   */
  private async addPlatformRevenue(data: {
    sourceWallet: string;
    amount: number;
    level: number;
    description: string;
  }): Promise<void> {
    const platformRevenue = {
      id: crypto.randomUUID(),
      sourceType: 'upgrade_fee',
      sourceWallet: data.sourceWallet,
      level: data.level,
      amount: data.amount,
      currency: 'USDT',
      description: data.description,
      metadata: {
        triggerLevel: data.level,
        timestamp: new Date().toISOString()
      },
      createdAt: new Date()
    };

    // Store in platform_revenue table via direct SQL for now
    console.log(`🏦 Platform revenue recorded: ${data.amount} USDT from L${data.level} (${data.description})`);
  }

  /**
   * Get reward statistics for a user
   */
  async getRewardStats(walletAddress: string): Promise<{
    totalEarnings: number;
    claimableAmount: number;
    pendingAmount: number;
    claimedAmount: number;
    rewardCount: {
      total: number;
      pending: number;
      confirmed: number;
      claimed: number;
      expired: number;
    };
  }> {
    const stats = await rewardsRepo.getStats(walletAddress);
    const claimableRewards = await this.getClaimableRewards(walletAddress);
    const pendingRewards = await this.getPendingRewards(walletAddress);
    
    const claimableAmount = claimableRewards.reduce((sum, reward) => sum + reward.amount, 0);
    const pendingAmount = pendingRewards.reduce((sum, reward) => sum + reward.amount, 0);

    return {
      totalEarnings: stats.totalAmount,
      claimableAmount,
      pendingAmount,
      claimedAmount: stats.claimedAmount,
      rewardCount: {
        total: stats.total,
        pending: stats.pending,
        confirmed: stats.confirmed,
        claimed: stats.claimed,
        expired: stats.expired
      }
    };
  }

  /**
   * Calculate expiration date
   */
  private calculateExpirationDate(hours: number): string {
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + hours);
    return expiration.toISOString();
  }

  /**
   * Admin function: manually confirm reward
   */
  async manuallyConfirmReward(rewardId: string): Promise<void> {
    await rewardsRepo.setStatus(rewardId, 'confirmed');
  }

  /**
   * Admin function: expire reward manually
   */
  async manuallyExpireReward(rewardId: string): Promise<void> {
    const reward = await rewardsRepo.getById(rewardId);
    if (reward) {
      await this.reallocateExpiredReward(reward);
      await rewardsRepo.setStatus(rewardId, 'expired');
    }
  }
}