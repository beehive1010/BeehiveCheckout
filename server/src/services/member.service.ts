import { 
  members, 
  type Member, 
  type InsertMember 
} from "@shared/schema";
import { db } from "../../db";
import { eq, sql } from "drizzle-orm";

export class MemberService {
  // Member operations
  async getMember(walletAddress: string): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.walletAddress, walletAddress));
    return member || undefined;
  }

  async createMember(member: InsertMember): Promise<Member> {
    const [newMember] = await db
      .insert(members)
      .values(member)
      .returning();
    return newMember;
  }

  async updateMember(walletAddress: string, updates: Partial<Member>): Promise<Member | undefined> {
    const [updatedMember] = await db
      .update(members)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(members.walletAddress, walletAddress))
      .returning();
    return updatedMember || undefined;
  }

  // Dashboard statistics
  async getTotalMemberCount(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(members);
    return result.count || 0;
  }

  async getMemberCountByLevel(): Promise<{ level: number; count: number }[]> {
    const results = await db
      .select({
        level: members.currentLevel,
        count: sql<number>`count(*)`
      })
      .from(members)
      .groupBy(members.currentLevel)
      .orderBy(members.currentLevel);
    
    return results.map(r => ({ level: r.level, count: r.count }));
  }

  async getDirectReferralCount(walletAddress: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(members)
      .where(eq(members.walletAddress, walletAddress));
    
    const member = await this.getMember(walletAddress);
    return member?.totalDirectReferrals || 0;
  }
}

export const memberService = new MemberService();