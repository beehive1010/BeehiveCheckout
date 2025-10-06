/**
 * Verify NFT Ownership and Cleanup Invalid Members
 *
 * This script:
 * 1. Fetches all members from database
 * 2. Verifies each member owns the NFT on-chain
 * 3. Deletes members who don't own NFTs
 */

const { createThirdwebClient, getContract, readContract } = require('thirdweb');
const { arbitrum } = require('thirdweb/chains');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const THIRDWEB_CLIENT_ID = process.env.VITE_THIRDWEB_CLIENT_ID || process.env.THIRDWEB_CLIENT_ID;
const THIRDWEB_SECRET_KEY = process.env.VITE_THIRDWEB_SECRET_KEY || process.env.THIRDWEB_SECRET_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const NFT_CONTRACT_ADDRESS = '0x15742D22f64985bC124676e206FCE3fFEb175719';

// Initialize clients
const thirdwebClient = createThirdwebClient({
  clientId: THIRDWEB_CLIENT_ID,
  secretKey: THIRDWEB_SECRET_KEY
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const nftContract = getContract({
  client: thirdwebClient,
  chain: arbitrum,
  address: NFT_CONTRACT_ADDRESS
});

// Stats
const stats = {
  total: 0,
  valid: 0,
  invalid: 0,
  deleted: 0,
  errors: 0
};

const invalidMembers = [];

async function checkNFTOwnership(walletAddress, level) {
  try {
    const balance = await readContract({
      contract: nftContract,
      method: "function balanceOf(address account, uint256 id) view returns (uint256)",
      params: [walletAddress, BigInt(level)]
    });

    return Number(balance) > 0;
  } catch (error) {
    console.error(`❌ Error checking NFT for ${walletAddress}:`, error.message);
    stats.errors++;
    return null; // null means error, don't delete
  }
}

async function deleteMemberRecords(walletAddress) {
  console.log(`🗑️  Deleting records for: ${walletAddress}`);

  try {
    // Delete in correct order due to foreign keys
    const tables = [
      'layer_rewards',
      'matrix_referrals',
      'referrals',
      'user_balances',
      'membership',
      'members',
      'users'
    ];

    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .ilike('wallet_address', walletAddress);

      if (error && error.code !== 'PGRST116') { // Ignore "no rows deleted" error
        console.error(`  ❌ Error deleting from ${table}:`, error.message);
      }
    }

    stats.deleted++;
    return true;
  } catch (error) {
    console.error(`❌ Error deleting member ${walletAddress}:`, error);
    return false;
  }
}

async function verifyAndCleanup() {
  console.log('🔍 Starting NFT ownership verification...\n');

  // Fetch all members
  const { data: members, error } = await supabase
    .from('members')
    .select('wallet_address, current_level')
    .order('activation_time', { ascending: false });

  if (error) {
    console.error('❌ Error fetching members:', error);
    return;
  }

  stats.total = members.length;
  console.log(`📊 Total members to verify: ${stats.total}\n`);

  // Verify each member
  for (let i = 0; i < members.length; i++) {
    const member = members[i];
    const progress = `[${i + 1}/${members.length}]`;

    console.log(`${progress} Checking ${member.wallet_address} (Level ${member.current_level})...`);

    const hasNFT = await checkNFTOwnership(member.wallet_address, member.current_level);

    if (hasNFT === null) {
      // Error occurred, skip this member
      console.log(`  ⚠️  Skipped due to error\n`);
      continue;
    }

    if (hasNFT) {
      console.log(`  ✅ Valid - owns NFT\n`);
      stats.valid++;
    } else {
      console.log(`  ❌ Invalid - does NOT own NFT`);
      stats.invalid++;
      invalidMembers.push(member);

      // Delete this member's records
      await deleteMemberRecords(member.wallet_address);
      console.log(`  🗑️  Deleted\n`);
    }

    // Add delay to avoid rate limiting
    if (i < members.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Members:    ${stats.total}`);
  console.log(`✅ Valid:          ${stats.valid} (own NFT)`);
  console.log(`❌ Invalid:        ${stats.invalid} (do NOT own NFT)`);
  console.log(`🗑️  Deleted:        ${stats.deleted}`);
  console.log(`⚠️  Errors:         ${stats.errors}`);
  console.log('='.repeat(60));

  if (invalidMembers.length > 0) {
    console.log('\n❌ Invalid Members (deleted):');
    invalidMembers.forEach((m, i) => {
      console.log(`${i + 1}. ${m.wallet_address} (Level ${m.current_level})`);
    });
  }

  console.log('\n✅ Cleanup complete!');
}

// Run the script
verifyAndCleanup().catch(console.error);
