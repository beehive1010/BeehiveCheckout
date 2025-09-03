import { 
  users, 
  orders, 
  bccUnlockHistory, 
  userWallet,
  type User 
} from "@shared/schema";
import { db } from "../../db";
import { eq, sum, sql } from "drizzle-orm";

/**
 * 正确的BCC锁仓计算服务
 * 
 * 核心逻辑：
 * 1. 总锁仓量 = 100+150+200+...+1000 = 10,450 BCC
 * 2. 新会员初始 = +500 BCC (transferable)
 * 3. 激活顺序 = 1~9999个激活会员，根据激活顺序解锁锁仓量
 * 4. BCC余额 = 初始500 + 解锁部分，锁仓 = 总锁仓量 - 已解锁
 */
export class BCCCalculationService {
  
  /**
   * 总锁仓量：100+150+200+...+1000 = 10,450 BCC
   */
  private readonly TOTAL_LOCKUP_AMOUNT = 10450;
  
  /**
   * 新会员初始BCC数量
   */
  private readonly INITIAL_MEMBER_BCC = 500;
  
  /**
   * 最大激活会员数量
   */
  private readonly MAX_ACTIVATIONS = 9999;

  /**
   * 根据Level计算BCC释放数量（用于参考）
   * Level 1 = 100 BCC, Level 2 = 150 BCC, Level 3 = 200 BCC ... Level 19 = 1000 BCC
   */
  private calculateBCCReleaseByLevel(level: number): number {
    if (level < 1 || level > 19) return 0;
    
    // Level 1 = 100, Level 2 = 150, Level 3 = 200, ..., Level 19 = 1000
    return 50 + (level * 50);
  }

  /**
   * 计算用户总的NFT购买花费 (USDT cents) - 保持现有逻辑
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
    } catch (error: any) {
      console.error('Orders table not found, returning 0 USDT spent:', error?.message);
      return 0;
    }
  }

  /**
   * 根据激活顺序计算用户解锁的BCC数量
   * 激活顺序：1~9999个激活会员
   * 
   * TODO: 实际应该根据用户激活时间/顺序计算解锁比例
   * 这里暂时使用简化逻辑，等数据库schema完善后实现
   */
  private async calculateUnlockedBCCByActivationOrder(walletAddress: string): Promise<number> {
    try {
      // TODO: 实际应该查询用户激活时间/顺序
      // 这里暂时假设为早期激活会员，返回小部分解锁
      
      // 简化版本：根据用户等级估算激活顺序
      const user = await this.getUserLevel(walletAddress);
      const currentLevel = user?.currentLevel || 1;
      
      // 假设激活顺序与等级相关（简化逻辑）
      const estimatedActivationOrder = Math.min(currentLevel * 100, this.MAX_ACTIVATIONS);
      
      // 计算解锁比例
      const unlockRatio = estimatedActivationOrder / this.MAX_ACTIVATIONS;
      
      return Math.floor(this.TOTAL_LOCKUP_AMOUNT * unlockRatio);
    } catch (error: any) {
      console.error('Unable to calculate unlock ratio, returning 0:', error?.message);
      return 0;
    }
  }

  /**
   * 计算用户已经解锁的BCC总量（从历史记录）
   */
  private async calculateTotalUnlockedBCC(walletAddress: string): Promise<number> {
    try {
      const result = await db
        .select({ 
          totalUnlocked: sum(bccUnlockHistory.unlockAmount).mapWith(Number)
        })
        .from(bccUnlockHistory)
        .where(eq(bccUnlockHistory.walletAddress, walletAddress.toLowerCase()));

      return result[0]?.totalUnlocked || 0;
    } catch (error: any) {
      console.error('BCC unlock history table not found, returning 0:', error?.message);
      return 0;
    }
  }

  /**
   * 根据用户当前等级计算BCC余额（修正版）
   */
  async calculateReleasableBCC(walletAddress: string, currentLevel: number): Promise<{
    initialBCC: number;
    totalLockup: number;
    unlockedBCC: number;
    restrictedBCC: number;
  }> {
    // 1. 初始BCC (新会员获得)
    const initialBCC = this.INITIAL_MEMBER_BCC;
    
    // 2. 总锁仓量
    const totalLockup = this.TOTAL_LOCKUP_AMOUNT;
    
    // 3. 根据激活顺序计算已解锁的BCC
    const unlockedBCC = await this.calculateUnlockedBCCByActivationOrder(walletAddress);
    
    // 4. 剩余锁仓的BCC
    const restrictedBCC = Math.max(0, totalLockup - unlockedBCC);
    
    return {
      initialBCC,
      totalLockup,
      unlockedBCC,
      restrictedBCC
    };
  }

  /**
   * 获取用户等级信息
   */
  private async getUserLevel(walletAddress: string): Promise<{ currentLevel: number } | null> {
    try {
      const [user] = await db
        .select({ currentLevel: users.currentLevel })
        .from(users)
        .where(eq(users.walletAddress, walletAddress.toLowerCase()));
      
      return user ? { currentLevel: user.currentLevel || 1 } : null;
    } catch (error: any) {
      console.error('Error fetching user level:', error?.message);
      return { currentLevel: 1 };
    }
  }

  /**
   * 主要BCC计算接口 - 计算用户的BCC余额（修正版）
   */
  async calculateBCCBalances(walletAddress: string): Promise<{
    transferable: number;
    restricted: number;
    totalAvailable: number;
    calculationBreakdown: {
      initialBCC: number;
      totalLockup: number;
      unlockedBCC: number;
      userLevel: number;
    };
  }> {
    try {
      // 获取用户当前等级
      const user = await this.getUserLevel(walletAddress);
      const currentLevel = user?.currentLevel || 1;
      
      // 计算BCC余额
      const releasableBCC = await this.calculateReleasableBCC(walletAddress, currentLevel);
      
      // 计算余额：transferable = 初始BCC + 解锁的BCC, restricted = 剩余锁仓的BCC
      const transferable = releasableBCC.initialBCC + releasableBCC.unlockedBCC;
      const restricted = releasableBCC.restrictedBCC;
      const totalAvailable = transferable + restricted;
      
      console.log(`💰 BCC计算结果 [${walletAddress}]: transferable=${transferable}, restricted=${restricted}, level=${currentLevel}`);
      
      return {
        transferable,
        restricted, 
        totalAvailable,
        calculationBreakdown: {
          initialBCC: releasableBCC.initialBCC,
          totalLockup: releasableBCC.totalLockup,
          unlockedBCC: releasableBCC.unlockedBCC,
          userLevel: currentLevel
        }
      };
    } catch (error: any) {
      console.error('BCC calculation failed:', error?.message);
      
      // 返回安全的默认值
      return {
        transferable: this.INITIAL_MEMBER_BCC, // 默认500 BCC
        restricted: this.TOTAL_LOCKUP_AMOUNT,  // 全部锁仓
        totalAvailable: this.INITIAL_MEMBER_BCC + this.TOTAL_LOCKUP_AMOUNT,
        calculationBreakdown: {
          initialBCC: this.INITIAL_MEMBER_BCC,
          totalLockup: this.TOTAL_LOCKUP_AMOUNT,
          unlockedBCC: 0,
          userLevel: 1
        }
      };
    }
  }
}

// 导出单例服务
export const bccCalculationService = new BCCCalculationService();