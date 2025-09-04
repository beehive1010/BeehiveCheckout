import { 
  userActivities,
  users,
  members,
  referrals,
  cthBalances,
  userNotifications,
  type UserActivity,
  type InsertUserActivity,
  type User,
  type UserNotification,
  type InsertUserNotification,
  type Referral
} from "@shared/schema";
import { db } from "../../db";
import { eq, desc, sql, and, isNull, not, count } from "drizzle-orm";
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomBytes } from 'crypto';
import path from 'path';

// Initialize S3 client with Supabase Storage credentials
const s3Client = new S3Client({
  endpoint: process.env.SUPABASE_STORAGE_URL,
  region: process.env.SUPABASE_STORAGE_REGION || 'ap-southeast-1',
  credentials: {
    accessKeyId: process.env.SUPABASE_STORAGE_ACCESS_KEY!,
    secretAccessKey: process.env.SUPABASE_STORAGE_SECRET_KEY!,
  },
  forcePathStyle: true, // Required for Supabase Storage
});

// Simplified StorageService without service delegation to avoid initialization issues
export class StorageService {
  
  // User Activity operations - implemented directly here
  async getUserActivity(walletAddress: string, limit: number = 50): Promise<Array<{
    id: string;
    type: 'reward' | 'purchase' | 'merchant_nft_claim' | 'token_purchase' | 'membership';
    title?: string;
    description: string;
    amount?: string;
    amountType?: string;
    timestamp: Date;
    status?: string;
  }>> {
    try {
      const activities = await db
        .select()
        .from(userActivities)
        .where(eq(userActivities.walletAddress, walletAddress))
        .orderBy(desc(userActivities.createdAt))
        .limit(limit);
      
      return activities.map(activity => ({
        id: activity.id,
        type: activity.activityType as any,
        title: activity.title,
        description: activity.description || activity.title,
        amount: activity.amount?.toString(),
        amountType: activity.amountType || undefined,
        timestamp: activity.createdAt,
        status: 'completed'
      }));
    } catch (error: any) {
      console.error('userActivities table not found, returning empty array:', error?.message);
      // Return empty activity array if table doesn't exist
      return [];
    }

  }

  async createUserActivity(activity: InsertUserActivity): Promise<UserActivity> {
    try {
      const [newActivity] = await db
        .insert(userActivities)
        .values(activity)
        .returning();
      return newActivity;
    } catch (error: any) {
      console.error('userActivities table not found, skipping activity creation:', error?.message);
      // Return mock activity if table doesn't exist
      return {
        id: 'mock_' + Date.now(),
        walletAddress: activity.walletAddress,
        activityType: activity.activityType,
        title: activity.title || '',
        description: activity.description || '',
        amount: activity.amount,
        amountType: activity.amountType,
        metadata: activity.metadata,
        relatedWallet: null,
        relatedLevel: null,
        createdAt: new Date(),
        updatedAt: new Date()
      } as UserActivity;
    }
  }

  // User operations
  async getUser(walletAddress: string): Promise<any | null> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.walletAddress, walletAddress.toLowerCase()))
        .limit(1);
      
      if (!user) {
        return null;
      }

      // Also get member data if exists
      const [memberData] = await db
        .select()
        .from(members)
        .where(eq(members.walletAddress, walletAddress.toLowerCase()))
        .limit(1);

      // Combine user and member data for backward compatibility
      return {
        ...user,
        memberActivated: memberData?.isActivated || false,
        // Keep currentLevel from users table as primary source
        currentLevel: user.currentLevel || 0
      };
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }
  
  async createUser(userData: any): Promise<User> {
    const [newUser] = await db
      .insert(users)
      .values({
        walletAddress: userData.walletAddress.toLowerCase(),
        username: userData.username,
        email: userData.email,
        referrerWallet: userData.referrerWallet?.toLowerCase(),
        currentLevel: userData.currentLevel || 0,
        isUpgraded: false,
        upgradeTimerEnabled: false
      })
      .returning();
    return newUser;
  }
  
  async updateUser(walletAddress: string, updates: any) {
    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.walletAddress, walletAddress.toLowerCase()))
      .returning();
    return updatedUser;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return user || null;
  }

  async createOrUpdateMember(walletAddress: string, memberData: any) {
    // Try to insert first, if it fails due to unique constraint, update instead
    try {
      await db
        .insert(members)
        .values({
          walletAddress: walletAddress.toLowerCase(),
          isActivated: memberData.isActivated,
          activatedAt: memberData.activatedAt,
          currentLevel: memberData.currentLevel,
          levelsOwned: memberData.levelsOwned,
          hasPendingRewards: false,
          upgradeReminderEnabled: false,
          totalDirectReferrals: 0,
          totalTeamSize: 0
        });
    } catch (error) {
      // If insert fails due to unique constraint, update existing record
      await db
        .update(members)
        .set({
          isActivated: memberData.isActivated,
          activatedAt: memberData.activatedAt,
          currentLevel: memberData.currentLevel,
          levelsOwned: memberData.levelsOwned,
          updatedAt: new Date()
        })
        .where(eq(members.walletAddress, walletAddress.toLowerCase()));
    }
  }

  async getMember(walletAddress: string) {
    try {
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.walletAddress, walletAddress.toLowerCase()))
        .limit(1);
      return member || null;
    } catch (error) {
      console.error('Error getting member:', error);
      return null;
    }
  }

  async getUserWallet(walletAddress: string) {
    try {
      const [wallet] = await db
        .select()
        .from(cthBalances)
        .where(eq(cthBalances.walletAddress, walletAddress.toLowerCase()))
        .limit(1);
      return wallet ? {
        bccBalance: wallet.balance,
        bccLocked: 0, // Not implemented yet
        availableUSDT: 0 // Not implemented yet
      } : null;
    } catch (error) {
      console.error('Error getting user wallet:', error);
      return null;
    }
  }

  // ==================== User Notifications Methods ====================

  async createUserNotification(data: InsertUserNotification): Promise<UserNotification> {
    const insertData: any = {
      recipientWallet: data.recipientWallet.toLowerCase(),
      title: data.title,
      message: data.message,
      type: data.type,
    };
    
    // Add optional fields only if they exist
    if (data.triggerWallet) insertData.triggerWallet = data.triggerWallet.toLowerCase();
    if (data.relatedWallet) insertData.relatedWallet = data.relatedWallet.toLowerCase();
    if (data.amount !== undefined) insertData.amount = data.amount;
    if (data.amountType) insertData.amountType = data.amountType;
    if (data.level !== undefined) insertData.level = data.level;
    if (data.layer !== undefined) insertData.layer = data.layer;
    if (data.position) insertData.positionSlot = data.position;
    if (data.priority) insertData.priority = data.priority;
    if (data.actionRequired !== undefined) insertData.actionRequired = data.actionRequired;
    if (data.actionType) insertData.actionType = data.actionType;
    if (data.actionUrl) insertData.actionUrl = data.actionUrl;
    if (data.expiresAt) insertData.expiresAt = data.expiresAt;
    if (data.metadata) insertData.metadata = data.metadata;
    if (data.isRead !== undefined) insertData.isRead = data.isRead;
    if (data.isArchived !== undefined) insertData.isArchived = data.isArchived;
    if (data.emailSent !== undefined) insertData.emailSent = data.emailSent;

    const [notification] = await db
      .insert(userNotifications)
      .values(insertData)
      .returning();
    return notification;
  }

  async updateUserNotification(id: string, updates: Partial<UserNotification>): Promise<UserNotification | null> {
    const [updated] = await db
      .update(userNotifications)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(userNotifications.id, id))
      .returning();
    return updated || null;
  }

  async getUserNotifications(
    walletAddress: string, 
    filters: {
      isRead?: boolean;
      type?: string;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      isArchived?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<UserNotification[]> {
    const conditions = [eq(userNotifications.recipientWallet, walletAddress.toLowerCase())];
    
    if (filters.isRead !== undefined) {
      conditions.push(eq(userNotifications.isRead, filters.isRead));
    }
    if (filters.type) {
      conditions.push(eq(userNotifications.type, filters.type));
    }
    if (filters.priority) {
      conditions.push(eq(userNotifications.priority, filters.priority));
    }
    if (filters.isArchived !== undefined) {
      conditions.push(eq(userNotifications.isArchived, filters.isArchived));
    }

    let baseQuery = db
      .select()
      .from(userNotifications)
      .where(and(...conditions))
      .orderBy(desc(userNotifications.createdAt));

    if (filters.limit) {
      if (filters.offset) {
        return await baseQuery.limit(filters.limit).offset(filters.offset);
      } else {
        return await baseQuery.limit(filters.limit);
      }
    }

    return await baseQuery;
  }

  async countUserNotifications(
    walletAddress: string,
    filters: {
      isRead?: boolean;
      type?: string;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      isArchived?: boolean;
      actionRequired?: boolean;
    } = {}
  ): Promise<number> {
    const conditions = [eq(userNotifications.recipientWallet, walletAddress.toLowerCase())];
    
    if (filters.isRead !== undefined) {
      conditions.push(eq(userNotifications.isRead, filters.isRead));
    }
    if (filters.type) {
      conditions.push(eq(userNotifications.type, filters.type));
    }
    if (filters.priority) {
      conditions.push(eq(userNotifications.priority, filters.priority));
    }
    if (filters.isArchived !== undefined) {
      conditions.push(eq(userNotifications.isArchived, filters.isArchived));
    }
    if (filters.actionRequired !== undefined) {
      conditions.push(eq(userNotifications.actionRequired, filters.actionRequired));
    }

    const [result] = await db
      .select({ count: count() })
      .from(userNotifications)
      .where(and(...conditions));

    return result.count;
  }

  async getUserNotificationById(id: string): Promise<UserNotification | null> {
    const [notification] = await db
      .select()
      .from(userNotifications)
      .where(eq(userNotifications.id, id))
      .limit(1);
    return notification || null;
  }

  async markAllNotificationsAsRead(walletAddress: string): Promise<number> {
    const result = await db
      .update(userNotifications)
      .set({ 
        isRead: true, 
        updatedAt: new Date() 
      })
      .where(
        and(
          eq(userNotifications.recipientWallet, walletAddress.toLowerCase()),
          eq(userNotifications.isRead, false),
          eq(userNotifications.isArchived, false)
        )
      );

    return result.rowCount || 0;
  }

  async deleteUserNotification(id: string): Promise<boolean> {
    const result = await db
      .delete(userNotifications)
      .where(eq(userNotifications.id, id));
    
    return (result.rowCount || 0) > 0;
  }

  // ==================== Referral Methods ====================
  
  async getReferrals(walletAddress: string): Promise<Array<{
    id: string;
    rootWallet: string;
    memberWallet: string;
    layer: number;
    position: string;
    parentWallet: string | null;
    placerWallet: string;
    placementType: string;
    isActive: boolean;
    placedAt: Date;
  }>> {
    try {
      const referralData = await db
        .select()
        .from(referrals)
        .where(eq(referrals.rootWallet, walletAddress.toLowerCase()));
      
      return referralData.map(r => ({
        id: r.id,
        rootWallet: r.rootWallet,
        memberWallet: r.memberWallet,
        layer: r.layer,
        position: r.position,
        parentWallet: r.parentWallet,
        placerWallet: r.placerWallet,
        placementType: r.placementType,
        isActive: r.isActive,
        placedAt: r.placedAt
      }));
    } catch (error) {
      console.error('Error getting referrals:', error);
      return [];
    }
  }

  async getMember(walletAddress: string) {
    try {
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.walletAddress, walletAddress.toLowerCase()))
        .limit(1);
      
      return member ? {
        walletAddress: member.walletAddress,
        isActivated: member.isActivated,
        currentLevel: member.currentLevel,
        maxLayer: member.maxLayer,
        levelsOwned: member.levelsOwned,
        totalDirectReferrals: member.totalDirectReferrals,
        totalTeamSize: member.totalTeamSize,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt
      } : null;
    } catch (error) {
      console.error('Error getting member:', error);
      return null;
    }
  }

  async createReferral(data: {
    rootWallet: string;
    memberWallet: string;
    layer: number;
    position: string;
    parentWallet?: string;
    placerWallet: string;
    placementType: string;
    isActive: boolean;
  }) {
    try {
      const [newReferral] = await db
        .insert(referrals)
        .values({
          rootWallet: data.rootWallet.toLowerCase(),
          memberWallet: data.memberWallet.toLowerCase(),
          layer: data.layer,
          position: data.position,
          parentWallet: data.parentWallet?.toLowerCase() || null,
          placerWallet: data.placerWallet.toLowerCase(),
          placementType: data.placementType,
          isActive: data.isActive
        })
        .returning();
      
      return newReferral;
    } catch (error) {
      console.error('Error creating referral:', error);
      throw error;
    }
  }

  async findAvailablePosition(rootWallet: string) {
    try {
      const referralData = await this.getReferrals(rootWallet);
      
      // Find first available position in Layer 1
      for (let layer = 1; layer <= 19; layer++) {
        const layerReferrals = referralData.filter(r => r.layer === layer);
        const maxPositions = Math.pow(3, layer);
        
        if (layerReferrals.length < maxPositions) {
          const positions = ['L', 'M', 'R'];
          for (const position of positions) {
            if (!layerReferrals.some(r => r.position === position)) {
              return {
                layer,
                position,
                parentWallet: layer === 1 ? rootWallet : layerReferrals[0]?.memberWallet || rootWallet
              };
            }
          }
        }
      }
      
      return null; // No available positions
    } catch (error) {
      console.error('Error finding available position:', error);
      return null;
    }
  }

  // ==================== File Storage Methods ====================

  private readonly publicBucket = 'behive.public';
  private readonly privateBucket = '_private';

  /**
   * Upload file to public bucket (accessible without authentication)
   */
  async uploadPublicFile(
    file: Buffer | Uint8Array,
    fileName: string,
    contentType: string,
    folder?: string
  ): Promise<{ url: string; key: string }> {
    const key = this.generateFileKey(fileName, folder);
    
    const command = new PutObjectCommand({
      Bucket: this.publicBucket,
      Key: key,
      Body: file,
      ContentType: contentType,
    });

    await s3Client.send(command);
    
    const url = `${process.env.SUPABASE_STORAGE_URL}/${this.publicBucket}/${key}`;
    return { url, key };
  }

  /**
   * Upload file to private bucket (requires authentication)
   */
  async uploadPrivateFile(
    file: Buffer | Uint8Array,
    fileName: string,
    contentType: string,
    folder?: string
  ): Promise<{ url: string; key: string }> {
    const key = this.generateFileKey(fileName, folder);
    
    const command = new PutObjectCommand({
      Bucket: this.privateBucket,
      Key: key,
      Body: file,
      ContentType: contentType,
    });

    await s3Client.send(command);
    
    // Generate presigned URL for private files
    const url = await this.getSignedUrl(key, true);
    return { url, key };
  }

  /**
   * Upload profile image (public access)
   */
  async uploadProfileImage(
    walletAddress: string,
    file: Buffer | Uint8Array,
    fileName: string,
    contentType: string
  ): Promise<{ url: string; key: string }> {
    const folder = `profiles/${walletAddress}`;
    return this.uploadPublicFile(file, fileName, contentType, folder);
  }

  /**
   * Upload NFT metadata or image
   */
  async uploadNFTAsset(
    tokenId: number,
    file: Buffer | Uint8Array,
    fileName: string,
    contentType: string,
    isMetadata: boolean = false
  ): Promise<{ url: string; key: string }> {
    const folder = isMetadata ? `nfts/metadata` : `nfts/images`;
    const prefixedFileName = `${tokenId}-${fileName}`;
    return this.uploadPublicFile(file, prefixedFileName, contentType, folder);
  }

  /**
   * Upload merchant NFT assets
   */
  async uploadMerchantNFT(
    nftId: string,
    file: Buffer | Uint8Array,
    fileName: string,
    contentType: string
  ): Promise<{ url: string; key: string }> {
    const folder = `merchant-nfts/${nftId}`;
    return this.uploadPublicFile(file, fileName, contentType, folder);
  }

  /**
   * Upload course materials (private access)
   */
  async uploadCourseMaterial(
    courseId: string,
    file: Buffer | Uint8Array,
    fileName: string,
    contentType: string
  ): Promise<{ url: string; key: string }> {
    const folder = `courses/${courseId}`;
    return this.uploadPrivateFile(file, fileName, contentType, folder);
  }

  /**
   * Get signed URL for accessing private files
   */
  async getSignedUrl(
    key: string,
    isPrivate: boolean = false,
    expiresIn: number = 3600 // 1 hour default
  ): Promise<string> {
    const bucket = isPrivate ? this.privateBucket : this.publicBucket;
    
    if (!isPrivate) {
      // Public files don't need signed URLs
      return `${process.env.SUPABASE_STORAGE_URL}/${bucket}/${key}`;
    }

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
  }

  /**
   * Delete file from storage
   */
  async deleteFile(key: string, isPrivate: boolean = false): Promise<void> {
    const bucket = isPrivate ? this.privateBucket : this.publicBucket;
    
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await s3Client.send(command);
  }

  /**
   * Generate unique file key with folder structure
   */
  private generateFileKey(fileName: string, folder?: string): string {
    const timestamp = Date.now();
    const randomSuffix = randomBytes(4).toString('hex');
    const ext = path.extname(fileName);
    const baseName = path.basename(fileName, ext);
    
    // Sanitize filename
    const sanitizedBaseName = baseName
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .substring(0, 50);
    
    const uniqueFileName = `${sanitizedBaseName}_${timestamp}_${randomSuffix}${ext}`;
    
    return folder ? `${folder}/${uniqueFileName}` : uniqueFileName;
  }

  /**
   * Validate file type and size
   */
  static validateFile(
    file: { size: number; mimetype: string },
    allowedTypes: string[],
    maxSizeMB: number = 10
  ): { valid: boolean; error?: string } {
    // Check file size (convert MB to bytes)
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `File size exceeds ${maxSizeMB}MB limit`
      };
    }

    // Check file type
    if (!allowedTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: `File type ${file.mimetype} not allowed. Allowed types: ${allowedTypes.join(', ')}`
      };
    }

    return { valid: true };
  }

  /**
   * Get file type constants
   */
  static readonly FileTypes = {
    IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    DOCUMENTS: ['application/pdf', 'text/plain'],
    VIDEOS: ['video/mp4', 'video/webm'],
    ALL_MEDIA: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'application/pdf']
  };
}

export const storage = new StorageService();