#!/usr/bin/env node
/**
 * Create the complete Beehive platform schema in production database
 */

import { Pool } from 'pg';

async function createFullSchema() {
  console.log('🏗️ Creating COMPLETE Beehive platform schema...\n');

  const pool = new Pool({
    connectionString: process.env.PRODUCTION_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();

    // 1. Users table (enhanced)
    console.log('👥 Creating users table...');
    await client.query(`
      DROP TABLE IF EXISTS users CASCADE;
      CREATE TABLE users (
        wallet_address VARCHAR(42) PRIMARY KEY,
        referrer_wallet VARCHAR(42),
        username TEXT UNIQUE,
        email TEXT,
        is_upgraded BOOLEAN DEFAULT false NOT NULL,
        upgrade_timer_enabled BOOLEAN DEFAULT false NOT NULL,
        current_level INTEGER DEFAULT 0 NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // 2. Members table (activation & level management)
    console.log('🔥 Creating members table...');
    await client.query(`
      CREATE TABLE members (
        wallet_address VARCHAR(42) PRIMARY KEY REFERENCES users(wallet_address),
        is_activated BOOLEAN DEFAULT false NOT NULL,
        activated_at TIMESTAMP,
        current_level INTEGER DEFAULT 0 NOT NULL,
        max_layer INTEGER DEFAULT 0 NOT NULL,
        levels_owned JSONB DEFAULT '[]' NOT NULL,
        has_pending_rewards BOOLEAN DEFAULT false NOT NULL,
        upgrade_reminder_enabled BOOLEAN DEFAULT false NOT NULL,
        last_upgrade_at TIMESTAMP,
        last_reward_claim_at TIMESTAMP,
        total_direct_referrals INTEGER DEFAULT 0 NOT NULL,
        total_team_size INTEGER DEFAULT 0 NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // 3. Referrals table (19-layer matrix system)
    console.log('🌐 Creating referrals table...');
    await client.query(`
      CREATE TABLE referrals (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        root_wallet VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
        member_wallet VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
        layer INTEGER NOT NULL,
        position TEXT NOT NULL,
        parent_wallet VARCHAR(42),
        placer_wallet VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
        placement_type TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        placed_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      
      CREATE INDEX referrals_root_layer_idx ON referrals(root_wallet, layer);
      CREATE INDEX referrals_member_idx ON referrals(member_wallet);
      CREATE INDEX referrals_root_active_idx ON referrals(root_wallet, is_active);
    `);

    // 4. User Wallet (comprehensive balance management)
    console.log('💰 Creating user_wallet table...');
    await client.query(`
      CREATE TABLE user_wallet (
        wallet_address VARCHAR(42) PRIMARY KEY REFERENCES users(wallet_address),
        total_usdt_earnings INTEGER DEFAULT 0 NOT NULL,
        withdrawn_usdt INTEGER DEFAULT 0 NOT NULL,
        available_usdt INTEGER DEFAULT 0 NOT NULL,
        bcc_balance INTEGER DEFAULT 0 NOT NULL,
        bcc_locked INTEGER DEFAULT 0 NOT NULL,
        pending_upgrade_rewards INTEGER DEFAULT 0 NOT NULL,
        has_pending_upgrades BOOLEAN DEFAULT false NOT NULL,
        last_updated TIMESTAMP DEFAULT NOW() NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // 5. Reward system tables
    console.log('🎁 Creating reward system tables...');
    await client.query(`
      CREATE TABLE reward_rollups (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        original_recipient VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
        rolled_up_to VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
        reward_amount INTEGER NOT NULL,
        trigger_wallet VARCHAR(42) NOT NULL,
        trigger_level INTEGER NOT NULL,
        original_notification_id VARCHAR NOT NULL,
        rollup_reason TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE reward_notifications (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        recipient_wallet VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
        trigger_wallet VARCHAR(42) NOT NULL,
        trigger_level INTEGER NOT NULL,
        layer_number INTEGER NOT NULL,
        reward_amount INTEGER NOT NULL,
        status TEXT DEFAULT 'pending' NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        claimed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE reward_claims (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        recipient_wallet VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
        reward_amount INTEGER NOT NULL,
        trigger_wallet VARCHAR(42) NOT NULL,
        trigger_level INTEGER NOT NULL,
        status TEXT DEFAULT 'pending' NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        claimed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // 6. NFT and membership verification
    console.log('🖼️ Creating NFT tables...');
    await client.query(`
      CREATE TABLE member_nft_verification (
        wallet_address VARCHAR(42) PRIMARY KEY REFERENCES users(wallet_address),
        member_level INTEGER NOT NULL,
        token_id INTEGER NOT NULL,
        nft_contract_address VARCHAR(42) NOT NULL,
        chain TEXT NOT NULL,
        network_type TEXT NOT NULL,
        verification_status TEXT DEFAULT 'pending' NOT NULL,
        last_verified TIMESTAMP,
        verified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE bcc_unlock_history (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
        unlock_level INTEGER NOT NULL,
        unlock_amount INTEGER NOT NULL,
        unlock_tier TEXT NOT NULL,
        unlocked_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // 7. Update merchant NFTs structure
    console.log('🛒 Updating merchant NFTs...');
    await client.query(`
      DROP TABLE IF EXISTS merchant_nfts CASCADE;
      CREATE TABLE merchant_nfts (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        image_url TEXT NOT NULL,
        price_bcc INTEGER NOT NULL,
        active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE nft_purchases (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
        nft_id VARCHAR NOT NULL REFERENCES merchant_nfts(id),
        amount_bcc INTEGER NOT NULL,
        bucket_used TEXT NOT NULL,
        tx_hash TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // 8. Orders and transactions
    console.log('📦 Creating orders table...');
    await client.query(`
      CREATE TABLE orders (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
        level INTEGER NOT NULL,
        token_id INTEGER NOT NULL,
        amount_usdt INTEGER NOT NULL,
        chain TEXT NOT NULL,
        tx_hash TEXT,
        payembed_intent_id TEXT,
        status TEXT DEFAULT 'pending' NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        completed_at TIMESTAMP
      );
    `);

    // 9. Education system
    console.log('📚 Creating education tables...');
    await client.query(`
      CREATE TABLE courses (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        required_level INTEGER DEFAULT 1 NOT NULL,
        price_bcc INTEGER DEFAULT 0 NOT NULL,
        is_free BOOLEAN DEFAULT true NOT NULL,
        duration TEXT NOT NULL,
        course_type TEXT DEFAULT 'video' NOT NULL,
        zoom_meeting_id TEXT,
        zoom_password TEXT,
        zoom_link TEXT,
        video_url TEXT,
        download_link TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE course_lessons (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id VARCHAR NOT NULL REFERENCES courses(id),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        video_url TEXT NOT NULL,
        duration TEXT NOT NULL,
        lesson_order INTEGER NOT NULL,
        price_bcc INTEGER DEFAULT 0 NOT NULL,
        is_free BOOLEAN DEFAULT false NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE course_activations (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
        course_id VARCHAR NOT NULL REFERENCES courses(id),
        total_lessons INTEGER DEFAULT 0 NOT NULL,
        course_category TEXT NOT NULL,
        unlocked_lessons JSONB DEFAULT '[]' NOT NULL,
        completed_lessons JSONB DEFAULT '[]' NOT NULL,
        overall_progress INTEGER DEFAULT 0 NOT NULL,
        bcc_original_price INTEGER NOT NULL,
        bcc_discount_price INTEGER DEFAULT 0 NOT NULL,
        actual_paid_bcc INTEGER NOT NULL,
        course_activated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        last_lesson_unlocked_at TIMESTAMP,
        last_progress_update TIMESTAMP DEFAULT NOW() NOT NULL,
        zoom_nickname TEXT,
        completed BOOLEAN DEFAULT false NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // 10. Advertisement NFTs system
    console.log('📺 Creating advertisement system...');
    await client.query(`
      DROP TABLE IF EXISTS advertisement_nfts CASCADE;
      CREATE TABLE advertisement_nfts (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        image_url TEXT NOT NULL,
        service_name TEXT NOT NULL,
        service_type TEXT NOT NULL,
        website_url TEXT,
        price_bcc INTEGER NOT NULL,
        code_template TEXT NOT NULL,
        active BOOLEAN DEFAULT true NOT NULL,
        total_supply INTEGER DEFAULT 1000 NOT NULL,
        claimed_count INTEGER DEFAULT 0 NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE service_requests (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
        nft_id VARCHAR NOT NULL REFERENCES advertisement_nfts(id),
        service_name TEXT NOT NULL,
        service_type TEXT NOT NULL,
        application_data JSONB NOT NULL,
        request_title TEXT NOT NULL,
        request_description TEXT NOT NULL,
        status TEXT DEFAULT 'new_application' NOT NULL,
        assigned_admin VARCHAR(42),
        admin_notes TEXT,
        response_data JSONB,
        feedback_request TEXT,
        feedback_response TEXT,
        feedback_rating INTEGER,
        completion_notes TEXT,
        admin_response_at TIMESTAMP,
        feedback_requested_at TIMESTAMP,
        user_feedback_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // 11. Level configuration
    console.log('⬆️ Creating level configuration...');
    await client.query(`
      CREATE TABLE level_config (
        level INTEGER PRIMARY KEY,
        level_name TEXT NOT NULL,
        price_usdt INTEGER NOT NULL,
        reward_usdt INTEGER NOT NULL,
        activation_fee_usdt INTEGER NOT NULL,
        base_bcc_unlock_amount INTEGER NOT NULL
      );
    `);

    // 12. Matrix view table
    console.log('🕸️ Creating member matrix view...');
    await client.query(`
      CREATE TABLE member_matrix_view (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        root_wallet VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
        layer_data JSONB NOT NULL,
        total_members INTEGER DEFAULT 0 NOT NULL,
        deepest_layer INTEGER DEFAULT 0 NOT NULL,
        next_available_layer INTEGER DEFAULT 1 NOT NULL,
        next_available_position TEXT DEFAULT 'L' NOT NULL,
        last_updated TIMESTAMP DEFAULT NOW() NOT NULL
      );
      
      CREATE INDEX member_matrix_view_root_idx ON member_matrix_view(root_wallet);
    `);

    // 13. User activities
    console.log('📊 Creating user activities...');
    await client.query(`
      CREATE TABLE user_activities (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
        activity_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        amount NUMERIC(10, 2),
        amount_type TEXT,
        related_wallet VARCHAR(42),
        related_level INTEGER,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // 14. Blog posts for Hiveworld
    console.log('📝 Creating blog posts...');
    await client.query(`
      CREATE TABLE blog_posts (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        excerpt TEXT NOT NULL,
        content TEXT NOT NULL,
        author TEXT NOT NULL,
        image_url TEXT,
        published BOOLEAN DEFAULT true NOT NULL,
        published_at TIMESTAMP DEFAULT NOW() NOT NULL,
        tags JSONB DEFAULT '[]' NOT NULL,
        views INTEGER DEFAULT 0 NOT NULL,
        language TEXT DEFAULT 'en' NOT NULL
      );
    `);

    // 15. Update CTH balances to match new structure
    console.log('🪙 Updating CTH balances structure...');
    await client.query(`
      DROP TABLE IF EXISTS cth_balances CASCADE;
      CREATE TABLE cth_balances (
        wallet_address VARCHAR(42) PRIMARY KEY REFERENCES users(wallet_address),
        transferable INTEGER DEFAULT 0 NOT NULL,
        restricted INTEGER DEFAULT 0 NOT NULL,
        last_updated TIMESTAMP DEFAULT NOW() NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // 16. Insert level configuration data
    console.log('📈 Inserting level configuration data...');
    const levelData = [
      { level: 1, name: 'Warrior', price: 3000, reward: 3000, fee: 0, bcc: 300 },
      { level: 2, name: 'Guardian', price: 5000, reward: 5000, fee: 0, bcc: 500 },
      { level: 3, name: 'Knight', price: 8000, reward: 8000, fee: 0, bcc: 800 },
      { level: 4, name: 'Paladin', price: 15000, reward: 15000, fee: 0, bcc: 1500 },
      { level: 5, name: 'Champion', price: 25000, reward: 25000, fee: 0, bcc: 2500 },
      { level: 6, name: 'Crusader', price: 40000, reward: 40000, fee: 0, bcc: 4000 },
      { level: 7, name: 'Warlord', price: 60000, reward: 60000, fee: 0, bcc: 6000 },
      { level: 8, name: 'Overlord', price: 90000, reward: 90000, fee: 0, bcc: 9000 },
      { level: 9, name: 'Conqueror', price: 135000, reward: 135000, fee: 0, bcc: 13500 },
      { level: 10, name: 'Emperor', price: 200000, reward: 200000, fee: 0, bcc: 20000 },
      { level: 11, name: 'Divine', price: 300000, reward: 300000, fee: 0, bcc: 30000 },
      { level: 12, name: 'Celestial', price: 450000, reward: 450000, fee: 0, bcc: 45000 },
      { level: 13, name: 'Immortal', price: 675000, reward: 675000, fee: 0, bcc: 67500 },
      { level: 14, name: 'Transcendent', price: 1000000, reward: 1000000, fee: 0, bcc: 100000 },
      { level: 15, name: 'Omnipotent', price: 1500000, reward: 1500000, fee: 0, bcc: 150000 },
      { level: 16, name: 'Universal', price: 2250000, reward: 2250000, fee: 0, bcc: 225000 },
      { level: 17, name: 'Cosmic', price: 3375000, reward: 3375000, fee: 0, bcc: 337500 },
      { level: 18, name: 'Galactic', price: 5062500, reward: 5062500, fee: 0, bcc: 506250 },
      { level: 19, name: 'Mythic Peak', price: 7593750, reward: 7593750, fee: 0, bcc: 759375 }
    ];

    for (const level of levelData) {
      await client.query(`
        INSERT INTO level_config (level, level_name, price_usdt, reward_usdt, activation_fee_usdt, base_bcc_unlock_amount)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (level) DO UPDATE SET
          level_name = $2,
          price_usdt = $3,
          reward_usdt = $4,
          activation_fee_usdt = $5,
          base_bcc_unlock_amount = $6
      `, [level.level, level.name, level.price, level.reward, level.fee, level.bcc]);
    }

    client.release();
    console.log('\n🎉 COMPLETE Beehive platform schema created successfully!');
    
    // Summary
    console.log('\n📊 Schema Summary:');
    console.log('✅ Core Tables: users, members, user_wallet, cth_balances');
    console.log('✅ Referral System: referrals, member_matrix_view');  
    console.log('✅ Rewards System: reward_notifications, reward_claims, reward_rollups');
    console.log('✅ NFT System: member_nft_verification, merchant_nfts, nft_purchases');
    console.log('✅ Advertisement: advertisement_nfts, service_requests');
    console.log('✅ Education: courses, course_lessons, course_activations');
    console.log('✅ Operations: orders, user_activities, blog_posts');
    console.log('✅ Configuration: level_config, bcc_unlock_history');
    console.log('✅ Notifications: user_notifications');
    console.log('✅ Revenue: platform_revenue');
    console.log('\n🚀 Ready for full platform functionality!');
    
  } catch (error) {
    console.error('❌ Schema creation failed:', error.message);
  } finally {
    await pool.end();
  }
}

createFullSchema().catch(console.error);