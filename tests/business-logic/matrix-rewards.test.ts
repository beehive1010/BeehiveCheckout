import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.types';

// Test configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Test data setup
const testUsers = [
  { wallet_address: '0x1111111111111111111111111111111111111111', username: 'testuser1' },
  { wallet_address: '0x2222222222222222222222222222222222222222', username: 'testuser2' },
  { wallet_address: '0x3333333333333333333333333333333333333333', username: 'testuser3' },
  { wallet_address: '0x4444444444444444444444444444444444444444', username: 'testuser4' },
  { wallet_address: '0x5555555555555555555555555555555555555555', username: 'testuser5' },
];

describe('Matrix and Rewards Business Logic', () => {
  beforeEach(async () => {
    // Clean up test data
    await cleanupTestData();
    
    // Create test users
    await supabase.from('users').insert(testUsers);
    
    // Create test members
    await supabase.from('members').insert(
      testUsers.map(user => ({
        wallet_address: user.wallet_address,
        current_level: 0,
        is_activated: false,
        levels_owned: [],
        created_at: new Date().toISOString()
      }))
    );
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('3x3 Matrix Structure', () => {
    it('should create proper referral matrix structure', async () => {
      // User 1 refers Users 2, 3, 4
      await supabase.from('referrals').insert([
        { referrer_wallet: testUsers[0].wallet_address, referred_wallet: testUsers[1].wallet_address },
        { referrer_wallet: testUsers[0].wallet_address, referred_wallet: testUsers[2].wallet_address },
        { referrer_wallet: testUsers[0].wallet_address, referred_wallet: testUsers[3].wallet_address }
      ]);

      // Verify referral count
      const { data: referrals, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_wallet', testUsers[0].wallet_address);

      expect(error).toBeNull();
      expect(referrals).toHaveLength(3);
    });

    it('should enforce Level 2 requirement of 3 active direct referrals', async () => {
      // Create referrals but don't activate them
      await supabase.from('referrals').insert([
        { referrer_wallet: testUsers[0].wallet_address, referred_wallet: testUsers[1].wallet_address },
        { referrer_wallet: testUsers[0].wallet_address, referred_wallet: testUsers[2].wallet_address }
      ]);

      // Try to check Level 2 eligibility - should fail
      const { data: eligible } = await supabase.rpc('check_level_2_eligibility', {
        p_wallet_address: testUsers[0].wallet_address
      });

      expect(eligible).toBe(false);

      // Activate the referred users
      await supabase
        .from('members')
        .update({ is_activated: true, current_level: 1 })
        .in('wallet_address', [testUsers[1].wallet_address, testUsers[2].wallet_address]);

      // Still should fail with only 2 active referrals
      const { data: stillNotEligible } = await supabase.rpc('check_level_2_eligibility', {
        p_wallet_address: testUsers[0].wallet_address
      });

      expect(stillNotEligible).toBe(false);

      // Add third referral and activate
      await supabase.from('referrals').insert({
        referrer_wallet: testUsers[0].wallet_address, 
        referred_wallet: testUsers[3].wallet_address
      });

      await supabase
        .from('members')
        .update({ is_activated: true, current_level: 1 })
        .eq('wallet_address', testUsers[3].wallet_address);

      // Now should be eligible
      const { data: nowEligible } = await supabase.rpc('check_level_2_eligibility', {
        p_wallet_address: testUsers[0].wallet_address
      });

      expect(nowEligible).toBe(true);
    });

    it('should calculate matrix depth correctly', async () => {
      // Create a 3-layer matrix
      // Layer 1: User1 -> User2, User3
      await supabase.from('referrals').insert([
        { referrer_wallet: testUsers[0].wallet_address, referred_wallet: testUsers[1].wallet_address },
        { referrer_wallet: testUsers[0].wallet_address, referred_wallet: testUsers[2].wallet_address }
      ]);

      // Layer 2: User2 -> User4, User5
      await supabase.from('referrals').insert([
        { referrer_wallet: testUsers[1].wallet_address, referred_wallet: testUsers[3].wallet_address },
        { referrer_wallet: testUsers[1].wallet_address, referred_wallet: testUsers[4].wallet_address }
      ]);

      // Get matrix depth
      const { data: matrixDepth } = await supabase.rpc('get_user_matrix_depth', {
        p_wallet_address: testUsers[0].wallet_address
      });

      expect(matrixDepth).toHaveLength(2); // Should have 2 layers
      expect(matrixDepth?.[0]).toMatchObject({ layer: 1, left_count: 1, right_count: 1 });
      expect(matrixDepth?.[1]).toMatchObject({ layer: 2, left_count: 1, right_count: 1 });
    });
  });

  describe('Sequential NFT Purchase Validation', () => {
    it('should enforce sequential NFT level purchases', async () => {
      // Try to purchase Level 2 without Level 1 - should fail
      const { data: failedPurchase } = await supabase.rpc('process_nft_purchase_with_requirements', {
        p_wallet_address: testUsers[0].wallet_address,
        p_nft_level: 2,
        p_payment_amount_usdc: 150,
        p_transaction_hash: '0xtest123'
      });

      expect(failedPurchase?.success).toBe(false);
      expect(failedPurchase?.error).toContain('sequential');
    });

    it('should allow Level 1 purchase for new users', async () => {
      const { data: level1Purchase } = await supabase.rpc('process_nft_purchase_with_requirements', {
        p_wallet_address: testUsers[0].wallet_address,
        p_nft_level: 1,
        p_payment_amount_usdc: 130,
        p_transaction_hash: '0xtest123'
      });

      expect(level1Purchase?.success).toBe(true);

      // Verify member was updated
      const { data: member } = await supabase
        .from('members')
        .select('current_level, levels_owned, is_activated')
        .eq('wallet_address', testUsers[0].wallet_address)
        .single();

      expect(member?.current_level).toBe(1);
      expect(member?.levels_owned).toContain(1);
      expect(member?.is_activated).toBe(true);
    });

    it('should prevent duplicate level purchases', async () => {
      // Purchase Level 1
      await supabase.rpc('process_nft_purchase_with_requirements', {
        p_wallet_address: testUsers[0].wallet_address,
        p_nft_level: 1,
        p_payment_amount_usdc: 130,
        p_transaction_hash: '0xtest123'
      });

      // Try to purchase Level 1 again - should fail
      const { data: duplicatePurchase } = await supabase.rpc('process_nft_purchase_with_requirements', {
        p_wallet_address: testUsers[0].wallet_address,
        p_nft_level: 1,
        p_payment_amount_usdc: 130,
        p_transaction_hash: '0xtest456'
      });

      expect(duplicatePurchase?.success).toBe(false);
      expect(duplicatePurchase?.error).toContain('already own');
    });
  });

  describe('Layer Rewards System', () => {
    beforeEach(async () => {
      // Set up a basic matrix for reward testing
      await setupBasicMatrix();
    });

    it('should distribute layer rewards correctly', async () => {
      // User 4 purchases Level 1 NFT, should trigger rewards to upline
      const { data: result } = await supabase.rpc('distribute_layer_rewards', {
        p_nft_level: 1,
        p_payer_wallet: testUsers[3].wallet_address,
        p_transaction_hash: '0xrewardtest'
      });

      expect(result?.success).toBe(true);

      // Check that Layer 1 reward was created for User 1 (upline)
      const { data: rewards } = await supabase
        .from('layer_rewards')
        .select('*')
        .eq('payer_wallet', testUsers[3].wallet_address);

      expect(rewards).toBeDefined();
      expect(rewards?.length).toBeGreaterThan(0);
    });

    it('should enforce 72-hour countdown for reward claims', async () => {
      // Create a test reward claim
      const { data: rewardClaim } = await supabase
        .from('reward_claims')
        .insert({
          recipient_wallet: testUsers[0].wallet_address,
          layer: 1,
          matrix_position: 'left',
          reward_amount_usdc: 50,
          status: 'pending',
          expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          payer_wallet: testUsers[1].wallet_address,
          transaction_hash: '0xtest'
        })
        .select()
        .single();

      expect(rewardClaim).toBeDefined();

      // Verify countdown timer was created
      const { data: timer } = await supabase
        .from('countdown_timers')
        .select('*')
        .eq('wallet_address', testUsers[0].wallet_address)
        .eq('timer_type', 'reward_claim')
        .single();

      expect(timer).toBeDefined();
      expect(timer?.status).toBe('active');
    });

    it('should handle reward rollup when timer expires', async () => {
      // Create expired reward claim
      const expiredTime = new Date(Date.now() - 1000).toISOString(); // 1 second ago
      
      await supabase.from('reward_claims').insert({
        recipient_wallet: testUsers[0].wallet_address,
        layer: 1,
        matrix_position: 'left',
        reward_amount_usdc: 50,
        status: 'pending',
        expires_at: expiredTime,
        payer_wallet: testUsers[1].wallet_address,
        transaction_hash: '0xexpired'
      });

      // Run expired reward rollup
      const { data: rollupResult } = await supabase.rpc('process_expired_rewards');

      expect(rollupResult?.processed_count).toBeGreaterThan(0);

      // Verify the reward status was updated
      const { data: expiredReward } = await supabase
        .from('reward_claims')
        .select('status')
        .eq('payer_wallet', testUsers[1].wallet_address)
        .eq('transaction_hash', '0xexpired')
        .single();

      expect(expiredReward?.status).toBe('expired');
    });
  });

  describe('BCC Balance Segregation', () => {
    it('should maintain separate transferable and locked balances', async () => {
      // Initialize user balance
      await supabase.from('user_balances').insert({
        wallet_address: testUsers[0].wallet_address,
        bcc_transferable: 100,
        bcc_locked: 50,
        bcc_earned_rewards: 25,
        bcc_pending_activation: 0
      });

      // Test transferable BCC transfer
      const { data: transferResult } = await supabase.rpc('transfer_bcc_segregated', {
        p_from_wallet: testUsers[0].wallet_address,
        p_to_wallet: testUsers[1].wallet_address,
        p_amount: 30,
        p_purpose: 'Test transfer',
        p_balance_type: 'transferable'
      });

      expect(transferResult?.success).toBe(true);

      // Verify balances were updated correctly
      const { data: senderBalance } = await supabase
        .from('user_balances')
        .select('bcc_transferable')
        .eq('wallet_address', testUsers[0].wallet_address)
        .single();

      expect(senderBalance?.bcc_transferable).toBe(70); // 100 - 30
    });

    it('should prevent transfers of locked BCC', async () => {
      await supabase.from('user_balances').insert({
        wallet_address: testUsers[0].wallet_address,
        bcc_transferable: 10,
        bcc_locked: 100
      });

      // Try to transfer more than transferable balance
      const { data: failedTransfer } = await supabase.rpc('transfer_bcc_segregated', {
        p_from_wallet: testUsers[0].wallet_address,
        p_to_wallet: testUsers[1].wallet_address,
        p_amount: 50,
        p_purpose: 'Should fail',
        p_balance_type: 'transferable'
      });

      expect(failedTransfer?.success).toBe(false);
      expect(failedTransfer?.error).toContain('Insufficient');
    });

    it('should unlock BCC rewards based on tier multipliers', async () => {
      // Test BCC unlock for Level 1 in Phase 1 (1.0x multiplier)
      const { data: unlockResult } = await supabase.rpc('unlock_level_bcc_rewards', {
        p_wallet_address: testUsers[0].wallet_address,
        p_level: 1
      });

      expect(unlockResult?.success).toBe(true);
      expect(unlockResult?.amount_unlocked).toBe(100); // Base amount for Level 1 in Phase 1
    });
  });

  describe('Admin Statistics and Monitoring', () => {
    it('should calculate accurate system statistics', async () => {
      // Set up test data for statistics
      await supabase.from('members').update({ 
        is_activated: true, 
        current_level: 1 
      }).eq('wallet_address', testUsers[0].wallet_address);

      // Refresh materialized view
      await supabase.rpc('refresh_member_statistics');

      // Check statistics
      const { data: stats } = await supabase
        .from('member_statistics_mv')
        .select('*')
        .single();

      expect(stats).toBeDefined();
      expect(stats?.total_members).toBeGreaterThan(0);
      expect(stats?.activated_members).toBeGreaterThan(0);
    });

    it('should track performance metrics', async () => {
      // Test that performance logging works
      const { data: performanceData } = await supabase
        .from('performance_logs')
        .select('*')
        .limit(1);

      expect(performanceData).toBeDefined();
    });
  });
});

// Helper functions
async function cleanupTestData() {
  // Clean up in reverse order due to foreign key constraints
  await supabase.from('layer_rewards').delete().in('recipient_wallet', testUsers.map(u => u.wallet_address));
  await supabase.from('reward_claims').delete().in('recipient_wallet', testUsers.map(u => u.wallet_address));
  await supabase.from('countdown_timers').delete().in('wallet_address', testUsers.map(u => u.wallet_address));
  await supabase.from('bcc_transactions').delete().in('wallet_address', testUsers.map(u => u.wallet_address));
  await supabase.from('user_balances').delete().in('wallet_address', testUsers.map(u => u.wallet_address));
  await supabase.from('nft_purchases').delete().in('wallet_address', testUsers.map(u => u.wallet_address));
  await supabase.from('orders').delete().in('wallet_address', testUsers.map(u => u.wallet_address));
  await supabase.from('referrals').delete().in('referrer_wallet', testUsers.map(u => u.wallet_address));
  await supabase.from('referrals').delete().in('referred_wallet', testUsers.map(u => u.wallet_address));
  await supabase.from('members').delete().in('wallet_address', testUsers.map(u => u.wallet_address));
  await supabase.from('users').delete().in('wallet_address', testUsers.map(u => u.wallet_address));
}

async function setupBasicMatrix() {
  // Activate all test users
  await supabase.from('members').update({ 
    is_activated: true, 
    current_level: 1,
    levels_owned: [1]
  }).in('wallet_address', testUsers.map(u => u.wallet_address));

  // Create referral structure: User1 -> User2, User3; User2 -> User4, User5
  await supabase.from('referrals').insert([
    { referrer_wallet: testUsers[0].wallet_address, referred_wallet: testUsers[1].wallet_address },
    { referrer_wallet: testUsers[0].wallet_address, referred_wallet: testUsers[2].wallet_address },
    { referrer_wallet: testUsers[1].wallet_address, referred_wallet: testUsers[3].wallet_address },
    { referrer_wallet: testUsers[1].wallet_address, referred_wallet: testUsers[4].wallet_address }
  ]);
}