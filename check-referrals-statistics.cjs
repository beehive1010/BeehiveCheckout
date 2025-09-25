#!/usr/bin/env node

/**
 * Check referrals table statistics data
 * Investigate why statistics field is empty and fix it
 */

const SUPABASE_URL = 'https://cvqibjcbfrwsgkvthccp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2OTc1NDYsImV4cCI6MjA1MDI3MzU0Nn0.nWzjBLsHfGHiweT3bSQgZqGZLczXOUhOFplKOTxH3Ao';

const TEST_REFERRER = '0x7a80ec1261e8e63C865ab4ab6af68D0386B8b7Df';

async function makeAPICall(endpoint, data, headers = {}) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify(data)
  });

  const result = await response.json();
  return { response, result };
}

async function checkReferralsTable() {
  console.log(`\n🔍 === CHECKING REFERRALS TABLE ===`);
  console.log(`👤 Checking referrer: ${TEST_REFERRER}`);
  
  try {
    // Check if there's a referrals endpoint or function
    const { response, result } = await makeAPICall('referral-links', {
      action: 'get-referrals',
      walletAddress: TEST_REFERRER
    });
    
    console.log(`\n📊 Referrals API response:`);
    console.log(`Status: ${response.status}`);
    console.log(`Result:`, JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error(`❌ Error checking referrals:`, error);
    return null;
  }
}

async function checkUserReferralStats() {
  console.log(`\n📈 === CHECKING USER REFERRAL STATS ===`);
  
  try {
    // Get user info which includes referral stats
    const { response, result } = await makeAPICall('auth', {
      action: 'get-user'
    }, {
      'x-wallet-address': TEST_REFERRER
    });
    
    console.log(`\n📊 User info with referral stats:`);
    console.log(JSON.stringify(result, null, 2));
    
    if (result.referral_stats) {
      console.log(`\n📈 Current referral statistics:`);
      console.log(`- Direct referrals: ${result.referral_stats.direct_referrals || 'N/A'}`);
      console.log(`- Matrix members: ${result.referral_stats.matrix_members || 'N/A'}`);
    } else {
      console.log(`❌ No referral_stats found in response`);
    }
    
    return result.referral_stats || null;
  } catch (error) {
    console.error(`❌ Error checking user referral stats:`, error);
    return null;
  }
}

async function checkMemberReferrals() {
  console.log(`\n👥 === CHECKING MEMBER REFERRALS ===`);
  
  // Check our test users
  const testUsers = [
    '0xTestUser00111111111111111111111111111111',
    '0xTestUser00222222222222222222222222222222',
    '0xTestUser00333333333333333333333333333333'
  ];
  
  let foundReferrals = [];
  
  for (const wallet of testUsers) {
    try {
      const { response, result } = await makeAPICall('auth', {
        action: 'get-user'
      }, {
        'x-wallet-address': wallet
      });
      
      console.log(`\n📋 User ${wallet}:`);
      if (result.success && result.member) {
        console.log(`  ✅ Is member: Level ${result.member.current_level}`);
        console.log(`  👥 Referrer: ${result.member.referrer_wallet}`);
        console.log(`  📅 Activation: ${result.member.activation_time}`);
        
        if (result.member.referrer_wallet === TEST_REFERRER) {
          foundReferrals.push({
            wallet: wallet,
            level: result.member.current_level,
            activation_time: result.member.activation_time,
            activation_sequence: result.member.activation_sequence
          });
          console.log(`  ✅ Confirmed referral`);
        } else {
          console.log(`  ❌ Different referrer`);
        }
      } else {
        console.log(`  ❌ Not found or not a member`);
      }
    } catch (error) {
      console.log(`  ❌ Error checking user: ${error.message}`);
    }
  }
  
  console.log(`\n📊 Summary of found referrals: ${foundReferrals.length}`);
  foundReferrals.forEach((referral, index) => {
    console.log(`  ${index + 1}. ${referral.wallet} - Level ${referral.level} (Seq: ${referral.activation_sequence})`);
  });
  
  return foundReferrals;
}

async function calculateExpectedStatistics(referrals) {
  console.log(`\n🧮 === CALCULATING EXPECTED STATISTICS ===`);
  
  const stats = {
    total_referrals: referrals.length,
    direct_referrals: referrals.length, // All test users are direct
    total_levels: referrals.map(r => r.level).reduce((sum, level) => sum + level, 0),
    average_level: referrals.length > 0 ? (referrals.map(r => r.level).reduce((sum, level) => sum + level, 0) / referrals.length).toFixed(2) : 0,
    by_level: {},
    latest_activation: null,
    earliest_activation: null
  };
  
  // Count by level
  referrals.forEach(referral => {
    const level = `level_${referral.level}`;
    stats.by_level[level] = (stats.by_level[level] || 0) + 1;
    
    // Track activation times
    if (!stats.latest_activation || referral.activation_time > stats.latest_activation) {
      stats.latest_activation = referral.activation_time;
    }
    if (!stats.earliest_activation || referral.activation_time < stats.earliest_activation) {
      stats.earliest_activation = referral.activation_time;
    }
  });
  
  console.log(`📈 Expected statistics for ${TEST_REFERRER}:`);
  console.log(JSON.stringify(stats, null, 2));
  
  return stats;
}

async function checkForReferralsTableIssue() {
  console.log(`\n🔍 === CHECKING FOR REFERRALS TABLE ISSUES ===`);
  
  try {
    // Try to access member-management or another function that might show referrals table data
    const { response, result } = await makeAPICall('member-management', {
      action: 'get-team-stats',
      walletAddress: TEST_REFERRER
    });
    
    console.log(`📊 Team stats response:`);
    console.log(`Status: ${response.status}`);
    console.log(`Result:`, JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error(`❌ Error checking team stats:`, error);
    return null;
  }
}

async function main() {
  console.log(`🚀 Starting referrals table statistics diagnostic`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  console.log(`🎯 Target referrer: ${TEST_REFERRER}`);
  
  try {
    // Step 1: Check referrals table/API
    const referralsData = await checkReferralsTable();
    
    // Step 2: Check user referral stats
    const userStats = await checkUserReferralStats();
    
    // Step 3: Check actual member referrals
    const memberReferrals = await checkMemberReferrals();
    
    // Step 4: Calculate expected statistics
    const expectedStats = await calculateExpectedStatistics(memberReferrals);
    
    // Step 5: Check for referrals table issues
    const teamStats = await checkForReferralsTableIssue();
    
    // Step 6: Analysis and diagnosis
    console.log(`\n📊 === FINAL ANALYSIS ===`);
    console.log(`🎯 Target referrer: ${TEST_REFERRER}`);
    
    if (userStats && userStats.direct_referrals > 0) {
      console.log(`✅ referrer_stats view shows: ${userStats.direct_referrals} direct referrals`);
    } else {
      console.log(`❌ referrer_stats view shows: no referral data`);
    }
    
    if (memberReferrals.length > 0) {
      console.log(`✅ members table shows: ${memberReferrals.length} actual referrals`);
    } else {
      console.log(`❌ members table shows: no referrals found`);
    }
    
    console.log(`\n🔍 DIAGNOSIS:`);
    if (memberReferrals.length > 0 && (!userStats || !userStats.direct_referrals)) {
      console.log(`⚠️  INCONSISTENCY: Members exist but statistics are missing`);
      console.log(`💡 Possible causes:`);
      console.log(`   1. referrals table is not being populated`);
      console.log(`   2. referrals table statistics field is empty/null`);
      console.log(`   3. referrals table data got lost/corrupted`);
      console.log(`   4. referrals table update trigger is broken`);
    } else if (memberReferrals.length === 0) {
      console.log(`❌ NO REFERRALS FOUND: Test users were not properly linked to referrer`);
    } else {
      console.log(`✅ STATISTICS CONSISTENT: referrals table appears to be working`);
    }
    
  } catch (error) {
    console.error(`💥 Script error:`, error);
  }
  
  console.log(`\n🏁 Diagnostic completed at: ${new Date().toISOString()}`);
}

// Execute if called directly
if (require.main === module) {
  main().then(() => {
    console.log(`✨ Referrals statistics diagnostic completed`);
  }).catch(error => {
    console.error(`💥 Script failed:`, error);
    process.exit(1);
  });
}

module.exports = { main };