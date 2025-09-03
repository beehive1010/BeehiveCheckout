import { 
  users, 
  orders, 
  bccUnlockHistory, 
  userWallet,
  type User 
} from "@shared/schema";
import { db } from "../../db";
import { eq, sum, sql } from "drizzle-orm";

export class BCCCalculationService {
  
  /**
   * 根据Level计算BCC释放数量
   * Level 1 = 100 BCC, Level 2 = 150 BCC, Level 3 = 200 BCC ... Level 19 = 1000 BCC
   * 公式: Level 1 = 100, 每升一级增加50 BCC
   */
  private calculateBCCReleaseByLevel(level: number): number {
    if (level < 1 || level > 19) return 0;
    
    // Level 1 = 100, Level 2 = 150, Level 3 = 200, ..., Level 19 = 1000
    return 50 + (level * 50);
  }

  /**
   * 计算用户总的NFT购买花费 (USDT cents)
   */
  private async calculateTotalNFTSpending(walletAddress: string): Promise<number> {
    try {
      const result = await db
        .select({ 
          totalSpent: sum(orders.amountUSDT).mapWith(Number)
        })
        .from(orders)
        .where(eq(orders.walletAddress, walletAddress.toLowerCase()));

      return result[0]?.totalSpent || 0;
    } catch (error) {
      console.error('Orders table not found, returning 0 USDT spent:', error.message);
      // 如果表不存在，返回0（新用户还没有购买记录）
      return 0;
    }
  }

  /**
   * 计算用户已经解锁的BCC总量
   */
  private async calculateTotalUnlockedBCC(walletAddress: string): Promise<number> {
    try {
      // 检查表是否存在，如果不存在则返回0
      const result = await db
        .select({ 
          totalUnlocked: sum(bccUnlockHistory.unlockAmount).mapWith(Number)
        })
        .from(bccUnlockHistory)
        .where(eq(bccUnlockHistory.walletAddress, walletAddress.toLowerCase()));

      return result[0]?.totalUnlocked || 0;
    } catch (error) {
      console.error('BCC unlock history table not found, returning 0:', error.message);
      // 如果表不存在，返回0（新用户还没有解锁历史）
      return 0;
    }
  }

  /**
   * 根据用户当前等级计算应释放的BCC (第一阶段)
   */
  async calculateReleasableBCC(walletAddress: string, currentLevel: number): Promise<{
    totalSpent: number;
    shouldRelease: number;
    alreadyUnlocked: number;
    availableToRelease: number;
  }> {
    // 1. 计算用户总花费
    const totalSpent = await this.calculateTotalNFTSpending(walletAddress);
    
    // 2. 计算应该释放的BCC (根据当前等级)
    let shouldRelease = 0;
    for (let level = 1; level <= currentLevel; level++) {
      shouldRelease += this.calculateBCCReleaseByLevel(level);
    }
    
    // 3. 计算已经解锁的BCC
    const alreadyUnlocked = await this.calculateTotalUnlockedBCC(walletAddress);
    
    // 4. 计算可用于释放的BCC
    const availableToRelease = Math.max(0, shouldRelease - alreadyUnlocked);
    
    return {
      totalSpent,
      shouldRelease,
      alreadyUnlocked,
      availableToRelease
    };
  }

  /**
   * 计算用户的BCC余额状态
   */
  async calculateBCCBalances(walletAddress: string): Promise<{
    transferable: number;
    restricted: number;
    total: number;
    details: {
      currentLevel: number;
      totalSpent: number;
      totalReleasable: number;
      alreadyUnlocked: number;
      pendingRelease: number;
    }
  }> {
    try {
      // 获取用户信息
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.walletAddress, walletAddress.toLowerCase()));

      if (!user) {
        return {
          transferable: 0,
          restricted: 0,
          total: 0,
          details: {
            currentLevel: 0,
            totalSpent: 0,
            totalReleasable: 0,
            alreadyUnlocked: 0,
            pendingRelease: 0
          }
        };
      }

      // 计算释放数据
      const releaseData = await this.calculateReleasableBCC(walletAddress, user.currentLevel);
      
      // 获取当前钱包余额
      const [wallet] = await db
        .select()
        .from(userWallet)
        .where(eq(userWallet.walletAddress, walletAddress.toLowerCase()));

      // 计算实际余额
      // transferable = 当前可转账余额 + 待释放的BCC
      // restricted = 已释放但仍锁定的BCC (可用于购买课程等)
      const transferable = (wallet?.bccBalance || 0) + releaseData.availableToRelease;
      const restricted = wallet?.bccLocked || 0;

      return {
        transferable,
        restricted,
        total: transferable + restricted,
        details: {
          currentLevel: user.currentLevel,
          totalSpent: releaseData.totalSpent / 100, // 转换为美元
          totalReleasable: releaseData.shouldRelease,
          alreadyUnlocked: releaseData.alreadyUnlocked,
          pendingRelease: releaseData.availableToRelease
        }
      };
    } catch (error) {
      console.error('Error calculating BCC balances:', error);
      return {
        transferable: 0,
        restricted: 0,
        total: 0,
        details: {
          currentLevel: 0,
          totalSpent: 0,
          totalReleasable: 0,
          alreadyUnlocked: 0,
          pendingRelease: 0
        }
      };
    }
  }

  /**
   * 执行BCC释放 (当用户升级时调用)
   */
  async releaseBCC(walletAddress: string, level: number, tier: string = 'full'): Promise<{
    success: boolean;
    unlocked: number;
    newBalance: number;
  }> {
    try {
      // 计算该等级应释放的BCC
      const releaseAmount = this.calculateBCCReleaseByLevel(level);
      
      if (releaseAmount <= 0) {
        return { success: false, unlocked: 0, newBalance: 0 };
      }

      // 记录解锁历史
      await db.insert(bccUnlockHistory).values({
        walletAddress: walletAddress.toLowerCase(),
        unlockLevel: level,
        unlockAmount: releaseAmount,
        unlockTier: tier,
        unlockedAt: new Date()
      });

      // 更新用户钱包余额
      const [updatedWallet] = await db
        .update(userWallet)
        .set({ 
          bccBalance: sql`${userWallet.bccBalance} + ${releaseAmount}`,
          lastUpdated: new Date()
        })
        .where(eq(userWallet.walletAddress, walletAddress.toLowerCase()))
        .returning();

      console.log(`🔓 BCC Released: ${releaseAmount} BCC for Level ${level} → ${walletAddress}`);

      return {
        success: true,
        unlocked: releaseAmount,
        newBalance: updatedWallet?.bccBalance || 0
      };
    } catch (error) {
      console.error('Error releasing BCC:', error);
      return { success: false, unlocked: 0, newBalance: 0 };
    }
  }

  /**
   * 获取BCC释放规则信息 (用于前端显示)
   */
  getBCCReleaseRules(): Array<{ level: number; bccAmount: number; name: string }> {
    const levels = [
      'Warrior', 'Bronze', 'Silver', 'Gold', 'Elite', 
      'Platinum', 'Master', 'Diamond', 'Grandmaster', 'Star Shine',
      'Epic', 'Hall', 'Strongest King', 'King of Kings', 'Glory King',
      'Legendary Overlord', 'Supreme Lord', 'Supreme Myth', 'Mythical Peak'
    ];

    return Array.from({ length: 19 }, (_, i) => ({
      level: i + 1,
      bccAmount: this.calculateBCCReleaseByLevel(i + 1),
      name: levels[i] || `Level ${i + 1}`
    }));
  }
}

export const bccCalculationService = new BCCCalculationService();