#!/usr/bin/env node

/**
 * Seed script to initialize level configuration in database
 */

import { db } from '../server/db.ts';
import { levelConfig } from '../shared/schema.ts';

const seedLevelConfig = async () => {
  try {
    console.log('🌱 Seeding level configuration...');

    // Check if level configurations already exist
    const existingConfigs = await db.select().from(levelConfig).limit(1);
    
    if (existingConfigs.length > 0) {
      console.log('✅ Level configurations already exist, skipping seed');
      return;
    }

    // 19 levels of membership configuration - using snake_case for database
    const levelConfigurations = [
      // Level 1-5: Entry levels
      { level: 1, level_name: 'Warrior', price_usdt: 13000, reward_usdt: 10000, activation_fee_usdt: 3000, base_bcc_unlock_amount: 500 },
      { level: 2, level_name: 'Bronze', price_usdt: 28000, reward_usdt: 22000, activation_fee_usdt: 6000, base_bcc_unlock_amount: 1000 },
      { level: 3, level_name: 'Silver', price_usdt: 58000, reward_usdt: 46000, activation_fee_usdt: 12000, base_bcc_unlock_amount: 1500 },
      { level: 4, level_name: 'Gold', price_usdt: 118000, reward_usdt: 94000, activation_fee_usdt: 24000, base_bcc_unlock_amount: 2000 },
      { level: 5, level_name: 'Platinum', price_usdt: 238000, reward_usdt: 190000, activation_fee_usdt: 48000, base_bcc_unlock_amount: 2500 },
      
      // Level 6-10: Advanced levels
      { level: 6, level_name: 'Diamond', price_usdt: 478000, reward_usdt: 382000, activation_fee_usdt: 96000, base_bcc_unlock_amount: 3000 },
      { level: 7, level_name: 'Master', price_usdt: 958000, reward_usdt: 766000, activation_fee_usdt: 192000, base_bcc_unlock_amount: 3500 },
      { level: 8, level_name: 'Grandmaster', price_usdt: 1918000, reward_usdt: 1534000, activation_fee_usdt: 384000, base_bcc_unlock_amount: 4000 },
      { level: 9, level_name: 'Legend', price_usdt: 3838000, reward_usdt: 3070000, activation_fee_usdt: 768000, base_bcc_unlock_amount: 4500 },
      { level: 10, level_name: 'Mythic', price_usdt: 7678000, reward_usdt: 6142000, activation_fee_usdt: 1536000, base_bcc_unlock_amount: 5000 },
      
      // Level 11-15: Elite levels
      { level: 11, level_name: 'Ascendant', price_usdt: 15358000, reward_usdt: 12286000, activation_fee_usdt: 3072000, base_bcc_unlock_amount: 6000 },
      { level: 12, level_name: 'Transcendent', price_usdt: 30718000, reward_usdt: 24574000, activation_fee_usdt: 6144000, base_bcc_unlock_amount: 7000 },
      { level: 13, level_name: 'Omniscient', price_usdt: 61438000, reward_usdt: 49150000, activation_fee_usdt: 12288000, base_bcc_unlock_amount: 8000 },
      { level: 14, level_name: 'Supreme', price_usdt: 122878000, reward_usdt: 98302000, activation_fee_usdt: 24576000, base_bcc_unlock_amount: 9000 },
      { level: 15, level_name: 'Cosmic', price_usdt: 245758000, reward_usdt: 196606000, activation_fee_usdt: 49152000, base_bcc_unlock_amount: 10000 },
      
      // Level 16-19: Ultimate levels  
      { level: 16, level_name: 'Eternal', price_usdt: 491518000, reward_usdt: 393214000, activation_fee_usdt: 98304000, base_bcc_unlock_amount: 12000 },
      { level: 17, level_name: 'Infinite', price_usdt: 983038000, reward_usdt: 786430000, activation_fee_usdt: 196608000, base_bcc_unlock_amount: 14000 },
      { level: 18, level_name: 'Ultimate', price_usdt: 1966078000, reward_usdt: 1572862000, activation_fee_usdt: 393216000, base_bcc_unlock_amount: 16000 },
      { level: 19, level_name: 'Apex', price_usdt: 3932158000, reward_usdt: 3145726000, activation_fee_usdt: 786432000, base_bcc_unlock_amount: 20000 },
    ];

    // Insert level configurations
    for (const config of levelConfigurations) {
      await db.insert(levelConfig).values(config);
      console.log(`✅ Added Level ${config.level}: ${config.level_name} - $${(config.price_usdt / 100).toFixed(2)}`);
    }

    console.log('🎉 Successfully seeded level configuration!');
    console.log(`📊 Added ${levelConfigurations.length} level configurations`);

  } catch (error) {
    console.error('❌ Error seeding level configuration:', error);
  } finally {
    process.exit(0);
  }
};

seedLevelConfig();