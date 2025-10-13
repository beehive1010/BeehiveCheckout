/**
 * Grant Full Membership (Level 1-19) to Wallet
 * Target: 0xfd91667229a122265aF123a75bb624A9C35B5032
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://cvqibjcbfrwsgkvthccp.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const TARGET_WALLET = '0xfd91667229a122265aF123a75bb624A9C35B5032';

// Level pricing configuration
const LEVEL_PRICING: Record<number, number> = {
  1: 130, 2: 150, 3: 200, 4: 250, 5: 300, 6: 350, 7: 400, 8: 450, 9: 500,
  10: 550, 11: 600, 12: 650, 13: 700, 14: 750, 15: 800, 16: 850, 17: 900, 18: 950, 19: 1000
};

async function grantFullMembership() {
  console.log('🎯 Target Wallet:', TARGET_WALLET);
  console.log('📋 Creating membership records for Levels 1-19...\n');

  // Step 1: Create membership records for all 19 levels
  const membershipRecords = [];
  for (let level = 1; level <= 19; level++) {
    membershipRecords.push({
      wallet_address: TARGET_WALLET,
      nft_level: level,
      is_member: true,
      claimed_at: new Date().toISOString(),
      network: 'mainnet',
      claim_price: LEVEL_PRICING[level],
      total_cost: LEVEL_PRICING[level],
      unlock_membership_level: level < 19 ? level + 1 : 19,
      platform_activation_fee: level === 1 ? 30 : 0,
      transaction_hash: `admin_grant_${level}_${Date.now()}`
    });
  }

  console.log(`📝 Inserting ${membershipRecords.length} membership records...`);

  const { data: insertedData, error: insertError } = await supabase
    .from('membership')
    .upsert(membershipRecords, {
      onConflict: 'wallet_address,nft_level'
    })
    .select();

  if (insertError) {
    console.error('❌ Error inserting membership records:', insertError);
    throw insertError;
  }

  console.log(`✅ Successfully created/updated ${membershipRecords.length} membership records\n`);

  // Step 2: Update member's current_level to 19
  console.log('📝 Updating member current_level to 19...');

  const { data: updateData, error: updateError } = await supabase
    .from('members')
    .update({
      current_level: 19,
      updated_at: new Date().toISOString()
    })
    .eq('wallet_address', TARGET_WALLET)
    .select();

  if (updateError) {
    console.error('❌ Error updating member level:', updateError);
    throw updateError;
  }

  if (!updateData || updateData.length === 0) {
    console.warn('⚠️  No member record found to update. Member may not exist yet.');
  } else {
    console.log('✅ Successfully updated member current_level to 19\n');
  }

  // Step 3: Verification
  console.log('🔍 Verification...\n');

  // Check membership records
  const { data: membershipData, error: membershipError } = await supabase
    .from('membership')
    .select('nft_level, claim_price, unlock_membership_level, claimed_at')
    .eq('wallet_address', TARGET_WALLET)
    .order('nft_level', { ascending: true });

  if (membershipError) {
    console.error('❌ Error fetching membership records:', membershipError);
  } else {
    console.log(`📊 Total Membership Records: ${membershipData?.length || 0}`);
    console.log(`💰 Total Investment: ${membershipData?.reduce((sum, r) => sum + (r.claim_price || 0), 0)} USDC`);
    console.log('\n📋 Membership Levels:');
    membershipData?.forEach(record => {
      console.log(`  Level ${record.nft_level}: ${record.claim_price} USDC (unlocks Level ${record.unlock_membership_level})`);
    });
  }

  // Check member current level
  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .select('wallet_address, current_level, activation_time, referrer_wallet')
    .eq('wallet_address', TARGET_WALLET)
    .maybeSingle();

  if (memberError) {
    console.error('❌ Error fetching member data:', memberError);
  } else if (memberData) {
    console.log('\n👤 Member Information:');
    console.log(`  Wallet: ${memberData.wallet_address}`);
    console.log(`  Current Level: ${memberData.current_level}`);
    console.log(`  Referrer: ${memberData.referrer_wallet || 'None'}`);
    console.log(`  Activation Time: ${memberData.activation_time}`);
  } else {
    console.warn('⚠️  Member not found in members table');
  }

  console.log('\n✅ COMPLETE: Full membership (Level 1-19) granted!');
}

// Execute
grantFullMembership()
  .then(() => {
    console.log('\n🎉 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
