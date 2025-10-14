/**
 * Check On-Chain NFT Claims vs Database Records
 *
 * This script checks if members who are eligible for Level 2+ actually own the NFTs on-chain
 * and compares with database records to identify missing entries.
 */

import { createThirdwebClient, getContract } from "thirdweb";
import { arbitrum } from "thirdweb/chains";
import { balanceOf } from "thirdweb/extensions/erc1155";
import { createClient } from '@supabase/supabase-js';

// Configuration
const THIRDWEB_CLIENT_ID = process.env.VITE_THIRDWEB_CLIENT_ID || 'faf3d69af8af8e613b8755df8a9c2f27';
const CONTRACT_ADDRESS = '0x018F516B0d1E77Cc5947226Abc2E864B167C7E29'; // NFT Contract Address
const SUPABASE_URL = 'https://cvqibjcbfrwsgkvthccp.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjczOTY1NzksImV4cCI6MjA0Mjk3MjU3OX0.PHOKn9Cj-hYB7YANuVKXiipJr0yNQ3aHlTWr8bvT5_Q';

// Initialize clients
const thirdwebClient = createThirdwebClient({ clientId: THIRDWEB_CLIENT_ID });
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const contract = getContract({
  client: thirdwebClient,
  chain: arbitrum,
  address: CONTRACT_ADDRESS,
});

interface MemberRecord {
  wallet: string;
  currentLevel: number;
  directReferrals: number;
  hasMembershipLevel2: boolean;
  hasMembershipLevel3: boolean;
  hasMembershipLevel4: boolean;
}

interface MissingRecord {
  wallet: string;
  currentLevelDB: number;
  directReferrals: number;
  ownedNFTLevels: number[];
  missingLevelsInDB: number[];
  isEligible: boolean;
}

async function checkNFTOwnership(wallet: string, tokenId: number): Promise<boolean> {
  try {
    const balance = await balanceOf({
      contract,
      owner: wallet,
      tokenId: BigInt(tokenId),
    });
    return balance > 0n;
  } catch (error: any) {
    console.error(`   ⚠️ Error checking NFT balance for ${wallet} token ${tokenId}:`, error.message);
    return false;
  }
}

async function getEligibleMembers(): Promise<MemberRecord[]> {
  console.log('🔍 Querying database for eligible members...\n');

  try {
    // Get members with their current level
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('wallet_address, current_level')
      .order('activation_sequence', { ascending: false });

    if (membersError) throw membersError;

    // Get direct referral counts
    const { data: referrals, error: referralsError } = await supabase
      .from('referrals')
      .select('referrer_wallet, referred_wallet')
      .eq('referral_depth', 1);

    if (referralsError) throw referralsError;

    // Count referrals per member
    const referralMap = new Map<string, number>();
    for (const ref of referrals || []) {
      const wallet = ref.referrer_wallet.toLowerCase();
      referralMap.set(wallet, (referralMap.get(wallet) || 0) + 1);
    }

    // Get membership records
    const { data: memberships, error: membershipsError } = await supabase
      .from('membership')
      .select('wallet_address, nft_level');

    if (membershipsError) throw membershipsError;

    // Build membership map
    const membershipMap = new Map<string, Set<number>>();
    for (const mem of memberships || []) {
      const wallet = mem.wallet_address.toLowerCase();
      if (!membershipMap.has(wallet)) {
        membershipMap.set(wallet, new Set());
      }
      membershipMap.get(wallet)!.add(mem.nft_level);
    }

    // Build member records
    const memberRecords: MemberRecord[] = [];
    for (const member of members || []) {
      const wallet = member.wallet_address.toLowerCase();
      const currentLevel = member.current_level;
      const directReferrals = referralMap.get(wallet) || 0;
      const levels = membershipMap.get(wallet) || new Set();

      // Only include members with 3+ referrals (eligible for Level 2)
      if (directReferrals >= 3) {
        memberRecords.push({
          wallet: member.wallet_address,
          currentLevel,
          directReferrals,
          hasMembershipLevel2: levels.has(2),
          hasMembershipLevel3: levels.has(3),
          hasMembershipLevel4: levels.has(4),
        });
      }
    }

    console.log(`✅ Found ${memberRecords.length} eligible members (with 3+ referrals)\n`);
    return memberRecords;

  } catch (error: any) {
    console.error('❌ Error querying database:', error.message);
    return [];
  }
}

async function compareRecords() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ON-CHAIN NFT OWNERSHIP VS DATABASE RECORDS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Step 1: Get eligible members from database
  const eligibleMembers = await getEligibleMembers();

  if (eligibleMembers.length === 0) {
    console.log('⚠️ No eligible members found (members with 3+ referrals)');
    return;
  }

  // Step 2: Check on-chain ownership for each member
  const missingRecords: MissingRecord[] = [];
  const correctRecords: string[] = [];

  console.log('🔍 Checking on-chain NFT ownership for each member...\n');
  console.log('This may take a few minutes...\n');

  for (let i = 0; i < eligibleMembers.length; i++) {
    const member = eligibleMembers[i];
    const wallet = member.wallet;

    console.log(`[${i + 1}/${eligibleMembers.length}] Checking ${wallet}...`);

    // Check NFT ownership for Level 2, 3, 4
    const ownedNFTLevels: number[] = [];
    const missingLevelsInDB: number[] = [];

    // Check Level 2
    const ownsLevel2 = await checkNFTOwnership(wallet, 2);
    if (ownsLevel2) {
      ownedNFTLevels.push(2);
      if (!member.hasMembershipLevel2) {
        missingLevelsInDB.push(2);
      }
    }

    // Check Level 3
    const ownsLevel3 = await checkNFTOwnership(wallet, 3);
    if (ownsLevel3) {
      ownedNFTLevels.push(3);
      if (!member.hasMembershipLevel3) {
        missingLevelsInDB.push(3);
      }
    }

    // Check Level 4
    const ownsLevel4 = await checkNFTOwnership(wallet, 4);
    if (ownsLevel4) {
      ownedNFTLevels.push(4);
      if (!member.hasMembershipLevel4) {
        missingLevelsInDB.push(4);
      }
    }

    // If discrepancy found
    if (missingLevelsInDB.length > 0) {
      missingRecords.push({
        wallet,
        currentLevelDB: member.currentLevel,
        directReferrals: member.directReferrals,
        ownedNFTLevels,
        missingLevelsInDB,
        isEligible: member.directReferrals >= 3,
      });
      console.log(`   ❌ Discrepancy found! Owns NFT Levels ${ownedNFTLevels.join(', ')} but missing in DB: ${missingLevelsInDB.join(', ')}`);
    } else if (ownedNFTLevels.length > 0) {
      correctRecords.push(wallet);
      console.log(`   ✅ All owned NFTs recorded in database`);
    } else {
      console.log(`   ℹ️ No Level 2+ NFTs owned yet`);
    }
  }

  console.log('\n');

  // Step 3: Report
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ANALYSIS RESULTS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('📊 SUMMARY:\n');
  console.log(`   Total eligible members checked: ${eligibleMembers.length}`);
  console.log(`   ✅ Correct records: ${correctRecords.length}`);
  console.log(`   ❌ Missing/incorrect records: ${missingRecords.length}\n`);

  if (missingRecords.length > 0) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  MISSING/INCORRECT RECORDS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    for (const record of missingRecords) {
      console.log(`🔴 Wallet: ${record.wallet}`);
      console.log(`   Current Level in DB: ${record.currentLevelDB}`);
      console.log(`   Owned NFT Levels (on-chain): [${record.ownedNFTLevels.join(', ')}]`);
      console.log(`   Missing in Database: [${record.missingLevelsInDB.join(', ')}]`);
      console.log(`   Direct Referrals: ${record.directReferrals}`);
      console.log(`   Eligible: ${record.isEligible ? '✅' : '❌'}`);
      console.log('');
    }

    // Generate fix commands
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  RECOMMENDED ACTIONS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('Option 1: Run individual fix commands:\n');

    for (const record of missingRecords) {
      const highestMissingLevel = Math.max(...record.missingLevelsInDB);
      console.log(`# Fix ${record.wallet} - Missing Levels: ${record.missingLevelsInDB.join(', ')}`);
      console.log(`# Recommended: Update to Level ${highestMissingLevel}`);
      console.log(`psql "$DATABASE_URL" << EOF`);
      console.log(`\\\\set target_wallet '''${record.wallet}'''`);
      console.log(`\\\\set target_level ${highestMissingLevel}`);
      console.log(`\\\\set level_price ${getLevelPrice(highestMissingLevel)}`);
      console.log(`\\\\i manual_fix_level2_upgrade.sql`);
      console.log(`EOF\n`);
    }

    // Generate SQL batch script
    console.log('\nOption 2: Create a batch SQL script:\n');
    console.log('```sql');
    console.log('-- Batch fix for missing Level 2+ upgrades');
    console.log('-- Generated: ' + new Date().toISOString());
    console.log('BEGIN;\n');

    for (const record of missingRecords) {
      const highestMissingLevel = Math.max(...record.missingLevelsInDB);
      console.log(`-- ============================================================================`);
      console.log(`-- Fix ${record.wallet} - Level ${highestMissingLevel}`);
      console.log(`-- Missing levels: ${record.missingLevelsInDB.join(', ')}`);
      console.log(`-- ============================================================================\n`);

      // Create all missing membership records
      for (const level of record.missingLevelsInDB) {
        console.log(`-- Create membership Level ${level}`);
        console.log(`INSERT INTO membership (`);
        console.log(`    wallet_address,`);
        console.log(`    nft_level,`);
        console.log(`    is_member,`);
        console.log(`    claimed_at,`);
        console.log(`    claim_price,`);
        console.log(`    total_cost,`);
        console.log(`    unlock_membership_level,`);
        console.log(`    platform_activation_fee`);
        console.log(`)`);
        console.log(`VALUES (`);
        console.log(`    '${record.wallet}',`);
        console.log(`    ${level},`);
        console.log(`    true,`);
        console.log(`    NOW(),`);
        console.log(`    ${getLevelPrice(level)},`);
        console.log(`    ${getLevelPrice(level)},`);
        console.log(`    ${level + 1},`);
        console.log(`    0`);
        console.log(`)`);
        console.log(`ON CONFLICT (wallet_address, nft_level) DO UPDATE`);
        console.log(`SET is_member = true, claimed_at = NOW();\n`);
      }

      // Update member level to highest missing level
      console.log(`-- Update member level to ${highestMissingLevel}`);
      console.log(`UPDATE members`);
      console.log(`SET current_level = ${highestMissingLevel}, updated_at = NOW()`);
      console.log(`WHERE wallet_address ILIKE '${record.wallet}'`);
      console.log(`  AND current_level < ${highestMissingLevel};\n`);

      // Trigger layer rewards for the highest level
      if (highestMissingLevel >= 2 && highestMissingLevel <= 19) {
        console.log(`-- Trigger matrix layer rewards for Level ${highestMissingLevel}`);
        console.log(`SELECT trigger_matrix_layer_rewards(`);
        console.log(`    '${record.wallet}',`);
        console.log(`    ${highestMissingLevel},`);
        console.log(`    ${getLevelPrice(highestMissingLevel)}`);
        console.log(`);\n`);

        console.log(`-- Promote pending rewards`);
        console.log(`SELECT check_pending_rewards_after_upgrade(`);
        console.log(`    '${record.wallet}',`);
        console.log(`    ${highestMissingLevel}`);
        console.log(`);\n`);
      }

      console.log('');
    }

    console.log('COMMIT;');
    console.log('```\n');

    // Save to file
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  SAVING FIX SCRIPT');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const fs = await import('fs');
    const fixScript = generateFixScript(missingRecords);
    const filename = `fix_missing_nft_records_${new Date().toISOString().split('T')[0]}.sql`;

    fs.writeFileSync(filename, fixScript);
    console.log(`✅ Fix script saved to: ${filename}\n`);
    console.log(`To apply fixes, run:\n`);
    console.log(`   psql "$DATABASE_URL" -f ${filename}\n`);
  } else {
    console.log('✅ No discrepancies found! All on-chain NFT ownership is correctly recorded in database.\n');
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

function generateFixScript(missingRecords: MissingRecord[]): string {
  let script = `-- Batch Fix for Missing NFT Records
-- Generated: ${new Date().toISOString()}
-- Description: Fix members who own Level 2+ NFTs on-chain but database records are missing
-- Total affected members: ${missingRecords.length}

BEGIN;

`;

  for (const record of missingRecords) {
    const highestMissingLevel = Math.max(...record.missingLevelsInDB);

    script += `-- ============================================================================
-- Fix ${record.wallet} - Level ${highestMissingLevel}
-- Missing levels: ${record.missingLevelsInDB.join(', ')}
-- Current DB level: ${record.currentLevelDB}
-- Direct referrals: ${record.directReferrals}
-- ============================================================================

`;

    // Create all missing membership records
    for (const level of record.missingLevelsInDB) {
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
    '${record.wallet}',
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

    // Update member level
    script += `-- Update member level to ${highestMissingLevel}
UPDATE members
SET current_level = ${highestMissingLevel}, updated_at = NOW()
WHERE wallet_address ILIKE '${record.wallet}'
  AND current_level < ${highestMissingLevel};

`;

    // Trigger layer rewards
    if (highestMissingLevel >= 2 && highestMissingLevel <= 19) {
      script += `-- Trigger matrix layer rewards for Level ${highestMissingLevel}
SELECT trigger_matrix_layer_rewards(
    '${record.wallet}',
    ${highestMissingLevel},
    ${getLevelPrice(highestMissingLevel)}
);

-- Promote pending rewards
SELECT check_pending_rewards_after_upgrade(
    '${record.wallet}',
    ${highestMissingLevel}
);

`;
    }
  }

  script += `COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify all fixes were applied
SELECT
    'Verification' as step,
    wallet_address,
    current_level,
    (SELECT COUNT(*) FROM membership WHERE wallet_address ILIKE m.wallet_address AND nft_level >= 2) as membership_count
FROM members m
WHERE wallet_address IN (${missingRecords.map(r => `'${r.wallet}'`).join(', ')})
ORDER BY wallet_address;

SELECT '✅ Fix script completed!' as result;
`;

  return script;
}

// Run comparison
compareRecords()
  .then(() => {
    console.log('✅ Comparison completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Comparison failed:', error);
    process.exit(1);
  });
