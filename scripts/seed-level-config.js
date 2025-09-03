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

    // 19 levels of membership configuration
    const levelConfigurations = [
      // Level 1-5: Entry levels
      { level: 1, levelName: 'Warrior', priceUSDT: 13000, rewardUSDT: 10000, activationFeeUSDT: 3000, baseBccUnlockAmount: 500 },
      { level: 2, levelName: 'Bronze', priceUSDT: 28000, rewardUSDT: 22000, activationFeeUSDT: 6000, baseBccUnlockAmount: 1000 },
      { level: 3, levelName: 'Silver', priceUSDT: 58000, rewardUSDT: 46000, activationFeeUSDT: 12000, baseBccUnlockAmount: 1500 },
      { level: 4, levelName: 'Gold', priceUSDT: 118000, rewardUSDT: 94000, activationFeeUSDT: 24000, baseBccUnlockAmount: 2000 },
      { level: 5, levelName: 'Platinum', priceUSDT: 238000, rewardUSDT: 190000, activationFeeUSDT: 48000, baseBccUnlockAmount: 2500 },
      
      // Level 6-10: Advanced levels
      { level: 6, levelName: 'Diamond', priceUSDT: 478000, rewardUSDT: 382000, activationFeeUSDT: 96000, baseBccUnlockAmount: 3000 },
      { level: 7, levelName: 'Master', priceUSDT: 958000, rewardUSDT: 766000, activationFeeUSDT: 192000, baseBccUnlockAmount: 3500 },
      { level: 8, levelName: 'Grandmaster', priceUSDT: 1918000, rewardUSDT: 1534000, activationFeeUSDT: 384000, baseBccUnlockAmount: 4000 },
      { level: 9, levelName: 'Legend', priceUSDT: 3838000, rewardUSDT: 3070000, activationFeeUSDT: 768000, baseBccUnlockAmount: 4500 },
      { level: 10, levelName: 'Mythic', priceUSDT: 7678000, rewardUSDT: 6142000, activationFeeUSDT: 1536000, baseBccUnlockAmount: 5000 },
      
      // Level 11-15: Elite levels
      { level: 11, levelName: 'Ascendant', priceUSDT: 15358000, rewardUSDT: 12286000, activationFeeUSDT: 3072000, baseBccUnlockAmount: 6000 },
      { level: 12, levelName: 'Transcendent', priceUSDT: 30718000, rewardUSDT: 24574000, activationFeeUSDT: 6144000, baseBccUnlockAmount: 7000 },
      { level: 13, levelName: 'Omniscient', priceUSDT: 61438000, rewardUSDT: 49150000, activationFeeUSDT: 12288000, baseBccUnlockAmount: 8000 },
      { level: 14, levelName: 'Supreme', priceUSDT: 122878000, rewardUSDT: 98302000, activationFeeUSDT: 24576000, baseBccUnlockAmount: 9000 },
      { level: 15, levelName: 'Cosmic', priceUSDT: 245758000, rewardUSDT: 196606000, activationFeeUSDT: 49152000, baseBccUnlockAmount: 10000 },
      
      // Level 16-19: Ultimate levels  
      { level: 16, levelName: 'Eternal', priceUSDT: 491518000, rewardUSDT: 393214000, activationFeeUSDT: 98304000, baseBccUnlockAmount: 12000 },
      { level: 17, levelName: 'Infinite', priceUSDT: 983038000, rewardUSDT: 786430000, activationFeeUSDT: 196608000, baseBccUnlockAmount: 14000 },
      { level: 18, levelName: 'Ultimate', priceUSDT: 1966078000, rewardUSDT: 1572862000, activationFeeUSDT: 393216000, baseBccUnlockAmount: 16000 },
      { level: 19, levelName: 'Apex', priceUSDT: 3932158000, rewardUSDT: 3145726000, activationFeeUSDT: 786432000, baseBccUnlockAmount: 20000 },
    ];

    // Insert level configurations
    for (const config of levelConfigurations) {
      await db.insert(levelConfig).values(config);
      console.log(`✅ Added Level ${config.level}: ${config.levelName} - $${(config.priceUSDT / 100).toFixed(2)}`);
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