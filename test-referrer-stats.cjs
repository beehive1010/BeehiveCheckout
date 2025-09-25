#!/usr/bin/env node

/**
 * Test script to check and fix referrer_stats view direct_referrals calculation
 * Tests the specific referrer: 0x7a80ec1261e8e63C865ab4ab6af68D0386B8b7Df
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

async function checkReferrerStatsView() {
  console.log(`\n🔍 === CHECKING REFERRER_STATS VIEW ===`);
  console.log(`👤 Referrer: ${TEST_REFERRER}`);
  
  try {
    // Get user info which might include referrer_stats
    const { response, result } = await makeAPICall('auth', {
      action: 'get-user'
    }, {
      'x-wallet-address': TEST_REFERRER
    });
    
    console.log(`\n📊 Auth function response for referrer:`);
    console.log(JSON.stringify(result, null, 2));
    
    if (result.referral_stats) {
      console.log(`\n📈 Referral Stats from auth function:`);
      console.log(`- Direct referrals: ${result.referral_stats.direct_referrals || 'N/A'}`);
      console.log(`- Matrix members: ${result.referral_stats.matrix_members || 'N/A'}`);
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Error checking referrer stats:`, error);
    return null;
  }
}

async function checkMembersTableDirectReferrals() {
  console.log(`\n🔍 === CHECKING MEMBERS TABLE DIRECT REFERRALS ===`);
  
  try {
    // Use matrix-view function to check referrals
    const { response, result } = await makeAPICall('matrix-view', {
      walletAddress: TEST_REFERRER,
      includeDetails: true
    });
    
    console.log(`\n📊 Matrix view response:`);
    console.log(JSON.stringify(result, null, 2));
    
    // Count direct referrals if matrix data exists
    if (result && result.matrix_data) {
      let directReferralCount = 0;
      const matrixData = result.matrix_data;
      
      // Count Layer 1 members (direct referrals)
      if (matrixData.layers && matrixData.layers[0]) {
        const layer1 = matrixData.layers[0];
        if (layer1.members) {
          directReferralCount = layer1.members.filter(m => m && m.wallet_address).length;
        }
      }
      
      console.log(`\n📊 Direct referrals found in matrix: ${directReferralCount}`);
      return directReferralCount;
    }
    
    return 0;
  } catch (error) {
    console.error(`❌ Error checking members table:`, error);
    return 0;
  }
}

async function checkRecentTestUsers() {
  console.log(`\n🔍 === CHECKING RECENT TEST USERS ===`);
  
  const testUsers = [
    '0xTestUser00111111111111111111111111111111',
    '0xTestUser00222222222222222222222222222222',
    '0xTestUser00333333333333333333333333333333'
  ];
  
  let verifiedCount = 0;
  
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
        
        if (result.member.referrer_wallet === TEST_REFERRER) {
          verifiedCount++;
          console.log(`  ✅ Confirmed direct referral`);
        } else {
          console.log(`  ❌ Different referrer!`);
        }
      } else {
        console.log(`  ❌ Not found or not a member`);
      }
    } catch (error) {
      console.log(`  ❌ Error checking user: ${error.message}`);
    }
  }
  
  console.log(`\n📊 Verified direct referrals from test users: ${verifiedCount}/3`);
  return verifiedCount;
}

async function main() {
  console.log(`🚀 Starting referrer_stats view diagnostic`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  
  try {
    // Step 1: Check referrer_stats view
    await checkReferrerStatsView();
    
    // Step 2: Check matrix structure for direct referrals
    const matrixDirectReferrals = await checkMembersTableDirectReferrals();
    
    // Step 3: Check our recent test users
    const testUserReferrals = await checkRecentTestUsers();
    
    // Step 4: Summary and diagnosis
    console.log(`\n📊 === DIAGNOSIS SUMMARY ===`);
    console.log(`🎯 Target referrer: ${TEST_REFERRER}`);
    console.log(`📈 Matrix-based direct referrals: ${matrixDirectReferrals}`);
    console.log(`🧪 Test user referrals: ${testUserReferrals}`);
    
    if (matrixDirectReferrals !== testUserReferrals) {
      console.log(`\n⚠️  INCONSISTENCY DETECTED:`);
      console.log(`   Matrix shows: ${matrixDirectReferrals} direct referrals`);
      console.log(`   Test users show: ${testUserReferrals} direct referrals`);
      console.log(`   This suggests the referrer_stats view needs to be updated`);
    } else if (testUserReferrals > 0) {
      console.log(`\n✅ CONSISTENCY CHECK PASSED:`);
      console.log(`   Both methods show ${testUserReferrals} direct referrals`);
      console.log(`   referrer_stats view appears to be working correctly`);
    } else {
      console.log(`\n❌ NO DIRECT REFERRALS FOUND:`);
      console.log(`   This suggests either:`);
      console.log(`   1. The test users were not properly created`);
      console.log(`   2. The referrer_wallet field was not saved correctly`);
      console.log(`   3. The referrer_stats view is not updating`);
    }
    
  } catch (error) {
    console.error(`💥 Script error:`, error);
  }
  
  console.log(`\n🏁 Diagnostic completed at: ${new Date().toISOString()}`);
}

// Execute if called directly
if (require.main === module) {
  main().then(() => {
    console.log(`✨ Referrer stats diagnostic completed`);
  }).catch(error => {
    console.error(`💥 Script failed:`, error);
    process.exit(1);
  });
}

module.exports = { main };