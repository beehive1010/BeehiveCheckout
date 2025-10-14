/**
 * Check ALL eligible members for NFT ownership discrepancies
 */

import { createThirdwebClient, getContract } from "thirdweb";
import { arbitrum } from "thirdweb/chains";
import { balanceOf } from "thirdweb/extensions/erc1155";
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Configuration
const THIRDWEB_CLIENT_ID = '3123b1ac2ebdb966dd415c6e964dc335';
const CONTRACT_ADDRESS = '0x018F516B0d1E77Cc5947226Abc2E864B167C7E29';
const SUPABASE_URL = 'https://cvqibjcbfrwsgkvthccp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNjU0MDUsImV4cCI6MjA3MjY0MTQwNX0.7CfL8CS1dQ8Gua89maSCDkgnMsNb19qp97mJyoJqJjs';

// Initialize clients
const thirdwebClient = createThirdwebClient({ clientId: THIRDWEB_CLIENT_ID });
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const contract = getContract({
  client: thirdwebClient,
  chain: arbitrum,
  address: CONTRACT_ADDRESS,
});

interface MemberInfo {
  wallet: string;
  currentLevel: number;
  directReferrals: number;
  membershipLevels: number[];
}

interface Discrepancy {
  wallet: string;
  currentLevelDB: number;
  directReferrals: number;
  ownedOnChain: number[];
  recordedInDB: number[];
  missing: number[];
}

async function checkNFT(wallet: string, level: number): Promise<boolean> {
  try {
    const balance = await balanceOf({
      contract,
      owner: wallet,
      tokenId: BigInt(level),
    });
    return balance > 0n;
  } catch (error) {
    return false;
  }
}

async function getEligibleMembers(): Promise<MemberInfo[]> {
  console.log('🔍 Querying database for eligible members (3+ referrals)...\n');

  // Get members with referral counts
  const { data, error } = await supabase.rpc('get_members_with_referrals', {});

  if (error) {
    console.log('⚠️ RPC not available, using manual query...\n');

    // Fallback to manual queries
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('wallet_address, current_level');

    if (membersError) throw membersError;

    const { data: referrals, error: refError } = await supabase
      .from('referrals')
      .select('referrer_wallet')
      .eq('referral_depth', 1);

    if (refError) throw refError;

    const { data: memberships, error: memError } = await supabase
      .from('membership')
      .select('wallet_address, nft_level');

    if (memError) throw memError;

    // Count referrals
    const refMap = new Map<string, number>();
    for (const ref of referrals || []) {
      const wallet = ref.referrer_wallet;
      refMap.set(wallet, (refMap.get(wallet) || 0) + 1);
    }

    // Map membership levels
    const memMap = new Map<string, Set<number>>();
    for (const mem of memberships || []) {
      const wallet = mem.wallet_address;
      if (!memMap.has(wallet)) {
        memMap.set(wallet, new Set());
      }
      memMap.get(wallet)!.add(mem.nft_level);
    }

    // Build member info
    const memberInfos: MemberInfo[] = [];
    for (const member of members || []) {
      const wallet = member.wallet_address;
      const refCount = refMap.get(wallet) || 0;

      if (refCount >= 3) {
        const levels = Array.from(memMap.get(wallet) || new Set()).sort((a, b) => a - b);

        // Remove duplicates
        const uniqueLevels = [...new Set(levels)];

        memberInfos.push({
          wallet,
          currentLevel: member.current_level,
          directReferrals: refCount,
          membershipLevels: uniqueLevels,
        });
      }
    }

    console.log(`✅ Found ${memberInfos.length} eligible members\n`);
    return memberInfos;
  }

  return [];
}

async function checkAllMembers() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  COMPREHENSIVE NFT OWNERSHIP CHECK');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const members = await getEligibleMembers();

  if (members.length === 0) {
    console.log('⚠️ No eligible members found\n');
    return;
  }

  const discrepancies: Discrepancy[] = [];

  console.log('🔍 Checking on-chain NFT ownership...\n');
  console.log(`Total members to check: ${members.length}\n`);

  for (let i = 0; i < members.length; i++) {
    const member = members[i];
    console.log(`[${i + 1}/${members.length}] Checking ${member.wallet}...`);

    const ownedOnChain: number[] = [];
    const missing: number[] = [];

    // Check Levels 1-5
    for (let level = 1; level <= 5; level++) {
      const ownsNFT = await checkNFT(member.wallet, level);

      if (ownsNFT) {
        ownedOnChain.push(level);

        // Check if in database
        if (!member.membershipLevels.includes(level)) {
          missing.push(level);
        }
      }
    }

    if (missing.length > 0) {
      discrepancies.push({
        wallet: member.wallet,
        currentLevelDB: member.currentLevel,
        directReferrals: member.directReferrals,
        ownedOnChain,
        recordedInDB: member.membershipLevels,
        missing,
      });

      console.log(`   ❌ DISCREPANCY! Owns [${ownedOnChain.join(', ')}] but DB has [${member.membershipLevels.join(', ')}] - Missing: [${missing.join(', ')}]`);
    } else {
      console.log(`   ✅ Correct`);
    }
  }

  console.log('\n');

  // Report results
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  RESULTS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`📊 Total checked: ${members.length}`);
  console.log(`✅ Correct: ${members.length - discrepancies.length}`);
  console.log(`❌ Discrepancies found: ${discrepancies.length}\n`);

  if (discrepancies.length > 0) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  DISCREPANCIES DETAILS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    for (const disc of discrepancies) {
      console.log(`🔴 Wallet: ${disc.wallet}`);
      console.log(`   Current Level (DB): ${disc.currentLevelDB}`);
      console.log(`   Direct Referrals: ${disc.directReferrals}`);
      console.log(`   Owned on-chain: [${disc.ownedOnChain.join(', ')}]`);
      console.log(`   Recorded in DB: [${disc.recordedInDB.join(', ')}]`);
      console.log(`   Missing in DB: [${disc.missing.join(', ')}]`);
      console.log('');
    }

    // Generate fix script
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  GENERATING FIX SCRIPT');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const fixScript = generateFixScript(discrepancies);
    const filename = `fix_missing_nft_records_${new Date().toISOString().split('T')[0]}.sql`;

    fs.writeFileSync(filename, fixScript);
    console.log(`✅ Fix script saved to: ${filename}\n`);
    console.log(`To apply fixes, run:\n`);
    console.log(`   psql "$DATABASE_URL" -f ${filename}\n`);
  } else {
    console.log('✅ No discrepancies found! All records are correct.\n');
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  REPORT COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

function getLevelPrice(level: number): number {
  const prices: { [key: number]: number } = {
    1: 100, 2: 150, 3: 200, 4: 250, 5: 300,
    6: 350, 7: 400, 8: 450, 9: 500, 10: 550,
    11: 600, 12: 650, 13: 700, 14: 750, 15: 800,
    16: 850, 17: 900, 18: 950, 19: 1000,
  };
  return prices[level] || 0;
}

function generateFixScript(discrepancies: Discrepancy[]): string {
  let script = `-- Batch Fix for Missing NFT Records
-- Generated: ${new Date().toISOString()}
-- Total affected members: ${discrepancies.length}

BEGIN;

`;

  for (const disc of discrepancies) {
    const highestMissing = Math.max(...disc.missing);

    script += `-- ============================================================================
-- Fix ${disc.wallet}
-- Missing levels: ${disc.missing.join(', ')}
-- Current DB level: ${disc.currentLevelDB}
-- ============================================================================

`;

    // Create all missing membership records
    for (const level of disc.missing) {
      script += `-- Create membership Level ${level}
INSERT INTO membership (
    wallet_address,
    nft_level,
    is_member,
    claimed_at,
    claim_price,
    total_cost,
    unlock_membership_level,
    platform_activation_fee
)
VALUES (
    '${disc.wallet}',
    ${level},
    true,
    NOW(),
    ${getLevelPrice(level)},
    ${getLevelPrice(level)},
    ${level + 1},
    0
)
ON CONFLICT (wallet_address, nft_level) DO UPDATE
SET is_member = true, claimed_at = NOW();

`;
    }

    // Update member level to highest missing
    script += `-- Update member level to ${highestMissing}
UPDATE members
SET current_level = ${highestMissing}, updated_at = NOW()
WHERE wallet_address ILIKE '${disc.wallet}'
  AND current_level < ${highestMissing};

`;

    // Trigger rewards
    if (highestMissing >= 2 && highestMissing <= 19) {
      script += `-- Trigger matrix layer rewards for Level ${highestMissing}
SELECT trigger_matrix_layer_rewards(
    '${disc.wallet}',
    ${highestMissing},
    ${getLevelPrice(highestMissing)}
);

-- Promote pending rewards
SELECT check_pending_rewards_after_upgrade(
    '${disc.wallet}',
    ${highestMissing}
);

`;
    }

    script += '\n';
  }

  script += `COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify all fixes
SELECT
    'Verification' as step,
    wallet_address,
    current_level,
    (SELECT COUNT(DISTINCT nft_level) FROM membership WHERE wallet_address = m.wallet_address) as membership_count
FROM members m
WHERE wallet_address IN (${discrepancies.map(d => `'${d.wallet}'`).join(', ')})
ORDER BY wallet_address;

SELECT '✅ Fix script completed!' as result;
`;

  return script;
}

// Run check
checkAllMembers()
  .then(() => {
    console.log('✅ Check completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Check failed:', error);
    process.exit(1);
  });
