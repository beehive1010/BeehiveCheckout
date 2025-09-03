import { 
  referrals,
  type Referral,
  type InsertReferral 
} from "@shared/schema";
import { db } from "../../db";
import { eq, and, sql } from "drizzle-orm";

export class ReferralService {
  // Referral operations - individual trees per referrer
  async getReferrals(rootWallet: string): Promise<Referral[]> {
    return await db
      .select()
      .from(referrals)
      .where(eq(referrals.rootWallet, rootWallet))
      .orderBy(referrals.layer, referrals.position);
  }

  async getReferralsByMember(memberWallet: string): Promise<Referral[]> {
    return await db
      .select()
      .from(referrals)
      .where(eq(referrals.memberWallet, memberWallet));
  }

  async createReferral(referral: InsertReferral): Promise<Referral> {
    const [newReferral] = await db
      .insert(referrals)
      .values(referral)
      .returning();
    return newReferral;
  }

  async updateReferral(id: string, updates: Partial<Referral>): Promise<Referral | undefined> {
    const [updatedReferral] = await db
      .update(referrals)
      .set(updates)
      .where(eq(referrals.id, id))
      .returning();
    return updatedReferral || undefined;
  }

  // Find available position in matrix tree
  async findAvailablePosition(rootWallet: string, targetLayer: number): Promise<{ 
    layer: number; 
    position: 'L' | 'M' | 'R'; 
    parentWallet: string | null 
  }> {
    // Check for available positions in the target layer
    const existingPositions = await db
      .select()
      .from(referrals)
      .where(and(
        eq(referrals.rootWallet, rootWallet),
        eq(referrals.layer, targetLayer),
        eq(referrals.isActive, true)
      ));

    // Calculate max positions for this layer (3^layer)
    const maxPositions = Math.pow(3, targetLayer);
    
    if (existingPositions.length < maxPositions) {
      // Find first available position
      const positions = ['L', 'M', 'R'] as const;
      const usedPositions = new Set(existingPositions.map(p => p.position));
      
      for (const position of positions) {
        if (!usedPositions.has(position)) {
          // For layer 1, parent is the root
          const parentWallet = targetLayer === 1 ? rootWallet : null;
          
          return {
            layer: targetLayer,
            position,
            parentWallet
          };
        }
      }
    }

    // If no positions available in target layer, try next layer
    return this.findAvailablePosition(rootWallet, targetLayer + 1);
  }

  // Get direct referral count for a specific wallet
  async getDirectReferralCount(walletAddress: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(referrals)
      .where(and(
        eq(referrals.rootWallet, walletAddress),
        eq(referrals.layer, 1), // Direct referrals are in layer 1
        eq(referrals.isActive, true)
      ));
    
    return result.count || 0;
  }
}

export const referralService = new ReferralService();