import { 
  memberNFTVerification,
  merchantNFTs,
  advertisementNFTs,
  advertisementNFTClaims,
  type MemberNFTVerification,
  type InsertMemberNFTVerification,
  type MerchantNFT,
  type InsertMerchantNFT,
  type MerchantNFTClaim,
  type InsertMerchantNFTClaim,
  type AdvertisementNFT,
  type InsertAdvertisementNFT,
  type AdvertisementNFTClaim,
  type InsertAdvertisementNFTClaim
} from "@shared/schema";
import { db } from "../../db";
import { eq } from "drizzle-orm";

export class NFTService {
  // NFT verification operations
  async getMemberNFTVerification(walletAddress: string): Promise<MemberNFTVerification | undefined> {
    const [verification] = await db
      .select()
      .from(memberNFTVerification)
      .where(eq(memberNFTVerification.walletAddress, walletAddress));
    return verification || undefined;
  }

  async createNFTVerification(verification: InsertMemberNFTVerification): Promise<MemberNFTVerification> {
    const [newVerification] = await db
      .insert(memberNFTVerification)
      .values(verification)
      .returning();
    return newVerification;
  }

  async updateNFTVerification(
    walletAddress: string, 
    updates: Partial<MemberNFTVerification>
  ): Promise<MemberNFTVerification | undefined> {
    const [updatedVerification] = await db
      .update(memberNFTVerification)
      .set(updates)
      .where(eq(memberNFTVerification.walletAddress, walletAddress))
      .returning();
    return updatedVerification || undefined;
  }

  // Merchant NFT operations
  async getMerchantNFTs(): Promise<MerchantNFT[]> {
    return await db
      .select()
      .from(merchantNFTs)
      .where(eq(merchantNFTs.active, true))
      .orderBy(merchantNFTs.createdAt);
  }

  async getMerchantNFT(id: string): Promise<MerchantNFT | undefined> {
    const [nft] = await db
      .select()
      .from(merchantNFTs)
      .where(eq(merchantNFTs.id, id));
    return nft || undefined;
  }

  async createMerchantNFT(nft: InsertMerchantNFT): Promise<MerchantNFT> {
    const [newNFT] = await db
      .insert(merchantNFTs)
      .values(nft)
      .returning();
    return newNFT;
  }

  // Merchant NFT Claim operations - replaces NFT Purchase
  async createMerchantNFTClaim(claim: InsertMerchantNFTClaim): Promise<MerchantNFTClaim> {
    // TODO: Implement when MerchantNFTClaim table is created in schema
    throw new Error('MerchantNFTClaim table not yet implemented in schema');
  }

  async getMerchantNFTClaimsByWallet(walletAddress: string): Promise<(MerchantNFTClaim & { nft: MerchantNFT })[]> {
    // TODO: Implement when MerchantNFTClaim table is created in schema
    throw new Error('MerchantNFTClaim table not yet implemented in schema');
  }

  // Advertisement NFT operations
  async getAdvertisementNFTs(): Promise<AdvertisementNFT[]> {
    return await db
      .select()
      .from(advertisementNFTs)
      .where(eq(advertisementNFTs.active, true))
      .orderBy(advertisementNFTs.createdAt);
  }

  async createAdvertisementNFT(nft: InsertAdvertisementNFT): Promise<AdvertisementNFT> {
    const [newNFT] = await db
      .insert(advertisementNFTs)
      .values(nft)
      .returning();
    return newNFT;
  }

  async createAdvertisementNFTClaim(claim: InsertAdvertisementNFTClaim): Promise<AdvertisementNFTClaim> {
    const [newClaim] = await db
      .insert(advertisementNFTClaims)
      .values(claim)
      .returning();
    return newClaim;
  }

  async getAdvertisementNFTClaimsByWallet(walletAddress: string): Promise<AdvertisementNFTClaim[]> {
    return await db
      .select()
      .from(advertisementNFTClaims)
      .where(eq(advertisementNFTClaims.walletAddress, walletAddress))
      .orderBy(advertisementNFTClaims.createdAt);
  }

  // NFT claim reward distribution
  async processNFTClaimRewards(
    sourceWallet: string, 
    triggerLevel: number, 
    nftId?: string, 
    claimTx?: string
  ): Promise<void> {
    // TODO: Implement NFT claim reward distribution logic
    console.log(`Processing NFT claim rewards for ${sourceWallet} at level ${triggerLevel}`);
  }
}

export const nftService = new NFTService();