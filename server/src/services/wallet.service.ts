import { 
  userWallet,
  type UserWallet,
  type InsertUserWallet 
} from "@shared/schema";
import { db } from "../../db";
import { eq } from "drizzle-orm";

export class WalletService {
  // User wallet operations - replaces USDT/BCC balance operations
  async getUserWallet(walletAddress: string): Promise<UserWallet | undefined> {
    const [wallet] = await db.select().from(userWallet).where(eq(userWallet.walletAddress, walletAddress));
    return wallet || undefined;
  }

  async createUserWallet(wallet: InsertUserWallet): Promise<UserWallet> {
    const [newWallet] = await db
      .insert(userWallet)
      .values(wallet)
      .returning();
    return newWallet;
  }

  async updateUserWallet(walletAddress: string, updates: Partial<UserWallet>): Promise<UserWallet | undefined> {
    const [updatedWallet] = await db
      .update(userWallet)
      .set({ ...updates, lastUpdated: new Date() })
      .where(eq(userWallet.walletAddress, walletAddress))
      .returning();
    return updatedWallet || undefined;
  }

  // User balances helper method
  async getUserBalances(walletAddress: string): Promise<{
    totalUSDTEarnings: number;
    availableUSDT: number;
    bccBalance: number;
    bccLocked: number;
  }> {
    const wallet = await this.getUserWallet(walletAddress);
    
    if (!wallet) {
      return {
        totalUSDTEarnings: 0,
        availableUSDT: 0,
        bccBalance: 0,
        bccLocked: 0,
      };
    }

    return {
      totalUSDTEarnings: wallet.totalUSDTEarnings,
      availableUSDT: wallet.availableUSDT,
      bccBalance: wallet.bccBalance,
      bccLocked: wallet.bccLocked,
    };
  }
}

export const walletService = new WalletService();