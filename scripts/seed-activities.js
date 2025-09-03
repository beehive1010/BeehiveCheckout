#!/usr/bin/env node

/**
 * Seed script to add sample user activities for testing dashboard
 */

import { db } from '../server/db.js';
import { userActivities, users } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

const seedActivities = async () => {
  try {
    console.log('🌱 Seeding user activities...');

    // Get first user from database to test with
    const [testUser] = await db.select().from(users).limit(1);
    
    if (!testUser) {
      console.log('❌ No users found in database. Please register a user first.');
      return;
    }

    console.log(`📍 Using test user: ${testUser.walletAddress}`);

    // Sample activities
    const sampleActivities = [
      {
        walletAddress: testUser.walletAddress,
        activityType: 'reward_received',
        title: 'Reward Received',
        description: 'Referral bonus from new member activation',
        amount: '150.00',
        amountType: 'USDT',
        relatedLevel: 1,
        metadata: { source: 'referral_system', triggeredBy: 'new_member' }
      },
      {
        walletAddress: testUser.walletAddress,
        activityType: 'nft_claimed',
        title: 'NFT Claimed',
        description: 'Level 1 Membership NFT activated',
        amount: '130.00',
        amountType: 'USDT',
        relatedLevel: 1,
        metadata: { nftType: 'membership', level: 1 }
      },
      {
        walletAddress: testUser.walletAddress,
        activityType: 'new_referral',
        title: 'New Referral',
        description: 'New user joined your team',
        relatedLevel: 1,
        metadata: { referralType: 'direct' }
      },
      {
        walletAddress: testUser.walletAddress,
        activityType: 'merchant_nft_claim',
        title: 'NFT Purchase',
        description: 'Merchant NFT purchased with BCC tokens',
        amount: '50',
        amountType: 'BCC',
        metadata: { nftId: 'merchant_001', paymentMethod: 'BCC_restricted' }
      },
      {
        walletAddress: testUser.walletAddress,
        activityType: 'level_upgrade',
        title: 'Level Upgrade',
        description: 'Upgraded to Level 2 membership',
        amount: '280.00',
        amountType: 'USDT',
        relatedLevel: 2,
        metadata: { previousLevel: 1, newLevel: 2 }
      }
    ];

    // Insert sample activities
    for (const activity of sampleActivities) {
      await db.insert(userActivities).values(activity);
      console.log(`✅ Added activity: ${activity.title}`);
    }

    console.log('🎉 Successfully seeded user activities!');
    console.log(`📊 Dashboard should now show real activity data for ${testUser.walletAddress}`);

  } catch (error) {
    console.error('❌ Error seeding activities:', error);
  } finally {
    process.exit(0);
  }
};

seedActivities();