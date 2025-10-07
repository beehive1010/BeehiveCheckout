import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Test environment setup
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

describe('NFT Upgrades API', () => {
  const testWallet = '0x1234567890123456789012345678901234567890';
  const testWallet2 = '0x9876543210987654321098765432109876543210';

  beforeEach(async () => {
    // Clean up and set up test data
    await cleanupTestData();
    await setupTestUser();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('GET /nft-upgrades (get-level-info)', () => {
    it('should return all ActiveMember NFT levels', async () => {
      const response = await fetch(`${supabaseUrl}/functions/v1/nft-upgrades?action=get-level-info`, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should return specific level info when level parameter provided', async () => {
      const response = await fetch(`${supabaseUrl}/functions/v1/nft-upgrades?action=get-level-info&level=1`, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.level).toBe(1);
    });
  });

  describe('POST /nft-upgrades (check-eligibility)', () => {
    it('should allow Level 1 eligibility for new users', async () => {
      const response = await fetch(`${supabaseUrl}/functions/v1/nft-upgrades?action=check-eligibility&level=1`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'x-wallet-address': testWallet
        }
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.eligible).toBe(true);
      expect(data.canClaim).toBe(true);
    });

    it('should reject Level 2+ eligibility for new users', async () => {
      const response = await fetch(`${supabaseUrl}/functions/v1/nft-upgrades?action=check-eligibility&level=2`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'x-wallet-address': testWallet
        }
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.eligible).toBe(false);
      expect(data.restrictions).toContain('Must purchase Level 1 first');
    });

    it('should enforce Level 2 direct referral requirements', async () => {
      // Set up user with Level 1 but insufficient referrals
      await setupMemberWithLevel(1);

      const response = await fetch(`${supabaseUrl}/functions/v1/nft-upgrades?action=check-eligibility&level=2`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'x-wallet-address': testWallet
        }
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.eligible).toBe(false);
      expect(data.restrictions.some((r: string) => r.includes('3 ActiveMember direct referrals'))).toBe(true);
    });
  });

  describe('POST /nft-upgrades (process-upgrade)', () => {
    it('should successfully process Level 1 NFT purchase', async () => {
      const purchaseData = {
        action: 'process-upgrade',
        level: 1,
        transactionHash: '0xtest123abc',
        payment_amount_usdc: 130
      };

      const response = await fetch(`${supabaseUrl}/functions/v1/nft-upgrades`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'x-wallet-address': testWallet
        },
        body: JSON.stringify(purchaseData)
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('processed successfully');

      // Verify member was activated
      const { data: member } = await supabase
        .from('members')
        .select('current_level, is_activated, levels_owned')
        .eq('wallet_address', testWallet)
        .single();

      expect(member?.current_level).toBe(1);
      expect(member?.is_activated).toBe(true);
      expect(member?.levels_owned).toContain(1);
    });

    it('should reject sequential upgrade violations', async () => {
      const purchaseData = {
        action: 'process-upgrade',
        level: 3, // Skip Level 1 and 2
        transactionHash: '0xtest456def',
        payment_amount_usdc: 200
      };

      const response = await fetch(`${supabaseUrl}/functions/v1/nft-upgrades`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'x-wallet-address': testWallet
        },
        body: JSON.stringify(purchaseData)
      });

      const data = await response.json();
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.restriction_type).toBe('sequential_upgrade_violation');
    });

    it('should reject duplicate level purchases', async () => {
      // First purchase Level 1
      await setupMemberWithLevel(1);

      const purchaseData = {
        action: 'process-upgrade',
        level: 1, // Try to purchase again
        transactionHash: '0xtestduplicate',
        payment_amount_usdc: 130
      };

      const response = await fetch(`${supabaseUrl}/functions/v1/nft-upgrades`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'x-wallet-address': testWallet
        },
        body: JSON.stringify(purchaseData)
      });

      const data = await response.json();
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.restriction_type).toBe('duplicate_purchase');
    });

    it('should enforce Level 2 direct referral requirement', async () => {
      // Set up user with Level 1 but no referrals
      await setupMemberWithLevel(1);

      const purchaseData = {
        action: 'process-upgrade',
        level: 2,
        transactionHash: '0xtestlevel2fail',
        payment_amount_usdc: 150
      };

      const response = await fetch(`${supabaseUrl}/functions/v1/nft-upgrades`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'x-wallet-address': testWallet
        },
        body: JSON.stringify(purchaseData)
      });

      const data = await response.json();
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.restriction_type).toBe('level_2_direct_referrals');
      expect(data.required_referrals).toBe(3);
    });

    it('should allow Level 2 upgrade with sufficient referrals', async () => {
      // Set up user with Level 1 and 3 ActiveMember referrals
      await setupMemberWithLevel(1);
      await setupActiveReferrals(3);

      const purchaseData = {
        action: 'process-upgrade',
        level: 2,
        transactionHash: '0xtestlevel2success',
        payment_amount_usdc: 150
      };

      const response = await fetch(`${supabaseUrl}/functions/v1/nft-upgrades`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'x-wallet-address': testWallet
        },
        body: JSON.stringify(purchaseData)
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify member was upgraded
      const { data: member } = await supabase
        .from('members')
        .select('current_level, levels_owned')
        .eq('wallet_address', testWallet)
        .single();

      expect(member?.current_level).toBe(2);
      expect(member?.levels_owned).toContain(2);
    });

    it('should require valid transaction hash', async () => {
      const purchaseData = {
        action: 'process-upgrade',
        level: 1,
        // Missing transactionHash
        payment_amount_usdc: 130
      };

      const response = await fetch(`${supabaseUrl}/functions/v1/nft-upgrades`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'x-wallet-address': testWallet
        },
        body: JSON.stringify(purchaseData)
      });

      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('transactionHash');
    });
  });

  describe('GET /nft-upgrades (get-upgrade-history)', () => {
    it('should return empty history for new users', async () => {
      const response = await fetch(`${supabaseUrl}/functions/v1/nft-upgrades?action=get-upgrade-history`, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'x-wallet-address': testWallet
        }
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data).toHaveLength(0);
    });

    it('should return upgrade history after purchases', async () => {
      // Create test order
      await supabase.from('orders').insert({
        wallet_address: testWallet,
        item_id: 'nft_level_1',
        order_type: 'nft_purchase',
        payment_method: 'blockchain',
        amount_usdt: 130,
        transaction_hash: '0xtesthistory',
        status: 'completed',
        metadata: { level: 1 }
      });

      const response = await fetch(`${supabaseUrl}/functions/v1/nft-upgrades?action=get-upgrade-history`, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'x-wallet-address': testWallet
        }
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].transaction_hash).toBe('0xtesthistory');
    });
  });

  // Helper functions
  async function cleanupTestData() {
    await supabase.from('orders').delete().eq('wallet_address', testWallet);
    await supabase.from('orders').delete().eq('wallet_address', testWallet2);
    await supabase.from('referrals').delete().eq('referrer_wallet', testWallet);
    await supabase.from('referrals').delete().eq('referred_wallet', testWallet);
    await supabase.from('members').delete().eq('wallet_address', testWallet);
    await supabase.from('members').delete().eq('wallet_address', testWallet2);
    await supabase.from('users').delete().eq('wallet_address', testWallet);
    await supabase.from('users').delete().eq('wallet_address', testWallet2);
  }

  async function setupTestUser() {
    await supabase.from('users').insert({
      wallet_address: testWallet,
      username: 'testuser',
      created_at: new Date().toISOString()
    });

    await supabase.from('members').insert({
      wallet_address: testWallet,
      current_level: 0,
      is_activated: false,
      levels_owned: [],
      created_at: new Date().toISOString()
    });
  }

  async function setupMemberWithLevel(level: number) {
    await supabase.from('members').update({
      current_level: level,
      is_activated: true,
      levels_owned: Array.from({ length: level }, (_, i) => i + 1)
    }).eq('wallet_address', testWallet);
  }

  async function setupActiveReferrals(count: number) {
    const referralPromises = [];
    
    for (let i = 0; i < count; i++) {
      const referredWallet = `0x${(i + 1).toString().padStart(40, '0')}`;
      
      // Create referred user
      referralPromises.push(
        supabase.from('users').insert({
          wallet_address: referredWallet,
          username: `referred${i + 1}`,
          created_at: new Date().toISOString()
        })
      );

      // Create member record
      referralPromises.push(
        supabase.from('members').insert({
          wallet_address: referredWallet,
          current_level: 1,
          is_activated: true,
          levels_owned: [1],
          created_at: new Date().toISOString()
        })
      );

      // Create referral relationship
      referralPromises.push(
        supabase.from('referrals').insert({
          referrer_wallet: testWallet,
          referred_wallet: referredWallet,
          created_at: new Date().toISOString()
        })
      );
    }

    await Promise.all(referralPromises);
  }
});