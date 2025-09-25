#!/usr/bin/env node

/**
 * Test Flow for activate-membership function
 * Tests complete user registration + Level 1 NFT claim flow with 3 new referrals
 * Referrer: 0x7a80ec1261e8e63C865ab4ab6af68D0386B8b7Df
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://cvqibjcbfrwsgkvthccp.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2OTc1NDYsImV4cCI6MjA1MDI3MzU0Nn0.nWzjBLsHfGHiweT3bSQgZqGZLczXOUhOFplKOTxH3Ao';

// Test wallet addresses (simulate new users)
const TEST_REFERRER = '0x7a80ec1261e8e63C865ab4ab6af68D0386B8b7Df';
const TEST_USERS = [
  {
    wallet: '0xTestUser001111111111111111111111111111111',
    username: 'TestUser001'
  },
  {
    wallet: '0xTestUser002222222222222222222222222222222',
    username: 'TestUser002'
  },
  {
    wallet: '0xTestUser003333333333333333333333333333333',
    username: 'TestUser003'
  }
];

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function makeRequest(endpoint, data, headers = {}) {
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
  
  console.log(`\n📡 ${endpoint.toUpperCase()} Request:`);
  console.log(`Status: ${response.status}`);
  console.log(`Data:`, JSON.stringify(data, null, 2));
  console.log(`Response:`, JSON.stringify(result, null, 2));
  
  return { response, result };
}

async function registerUser(userData) {
  console.log(`\n🔥 === REGISTERING USER: ${userData.username} (${userData.wallet}) ===`);
  
  const registrationData = {
    walletAddress: userData.wallet,
    username: userData.username,
    referrerWallet: TEST_REFERRER,
    email: `${userData.username.toLowerCase()}@test.com`,
    telegramHandle: `@${userData.username.toLowerCase()}`
  };

  const { response, result } = await makeRequest('user-registration', registrationData);
  
  if (!response.ok || !result.success) {
    console.error(`❌ Registration failed for ${userData.username}:`, result);
    return false;
  }
  
  console.log(`✅ User ${userData.username} registered successfully`);
  return true;
}

async function activateMembership(userData) {
  console.log(`\n💎 === ACTIVATING LEVEL 1 MEMBERSHIP: ${userData.username} ===`);
  
  const activationData = {
    walletAddress: userData.wallet,
    level: 1,
    referrerWallet: TEST_REFERRER,
    paymentAmount: 130,
    transactionHash: `0xtest${Date.now()}${Math.random().toString(36).substr(2, 8)}`
  };

  const headers = {
    'x-wallet-address': userData.wallet
  };

  const { response, result } = await makeRequest('activate-membership', activationData, headers);
  
  if (!response.ok || !result.success) {
    console.error(`❌ Membership activation failed for ${userData.username}:`, result);
    return false;
  }
  
  console.log(`✅ Level 1 membership activated successfully for ${userData.username}`);
  console.log(`📊 Activation Details:`, {
    membership: result.result?.membership?.id,
    member: result.result?.member?.wallet_address,
    referral: result.result?.referral?.success,
    matrixPlacement: result.result?.matrixPlacement?.success,
    layerReward: result.result?.layerReward?.success
  });
  
  return true;
}

async function verifyDatabaseRecords(userData) {
  console.log(`\n🔍 === VERIFYING DATABASE RECORDS: ${userData.username} ===`);
  
  // Check users table
  console.log(`\n📋 Checking users table...`);
  const usersCheck = await makeRequest('activate-membership', { 
    action: 'check-user-exists',
    walletAddress: userData.wallet 
  });
  
  // Check membership table
  console.log(`\n📋 Checking membership table...`);
  const membershipCheck = await makeRequest('activate-membership', { 
    action: 'check-membership',
    walletAddress: userData.wallet,
    level: 1
  });
  
  // Check members table
  console.log(`\n📋 Checking members table...`);
  const membersCheck = await makeRequest('activate-membership', { 
    action: 'check-members',
    walletAddress: userData.wallet
  });
  
  return {
    users: usersCheck.result,
    membership: membershipCheck.result,
    members: membersCheck.result
  };
}

async function checkReferralMatrix() {
  console.log(`\n🕸️ === CHECKING REFERRAL MATRIX FOR: ${TEST_REFERRER} ===`);
  
  const matrixCheck = await makeRequest('matrix-view', { 
    walletAddress: TEST_REFERRER,
    includeDetails: true
  });
  
  console.log(`📊 Matrix structure for referrer:`, matrixCheck.result);
  return matrixCheck.result;
}

async function checkLayerRewards() {
  console.log(`\n💰 === CHECKING LAYER REWARDS FOR REFERRER: ${TEST_REFERRER} ===`);
  
  const rewardsCheck = await makeRequest('rewards', { 
    action: 'get-layer-rewards',
    walletAddress: TEST_REFERRER
  });
  
  console.log(`🎁 Layer rewards generated:`, rewardsCheck.result);
  return rewardsCheck.result;
}

async function cleanupTestData() {
  console.log(`\n🧹 === CLEANING UP TEST DATA ===`);
  
  for (const user of TEST_USERS) {
    console.log(`🗑️ Cleaning up data for ${user.username}...`);
    
    // Note: In a real scenario, you might want to add cleanup endpoints
    // For now, we'll just log what should be cleaned
    console.log(`- Should remove user: ${user.wallet}`);
    console.log(`- Should remove membership records`);
    console.log(`- Should remove members records`);
    console.log(`- Should remove referrals_new records`);
  }
}

async function runCompleteTest() {
  console.log(`\n🚀 ===== STARTING COMPLETE ACTIVATE-MEMBERSHIP TEST FLOW =====`);
  console.log(`👥 Testing with 3 new users under referrer: ${TEST_REFERRER}`);
  console.log(`📅 Test started at: ${new Date().toISOString()}`);
  
  const results = {
    registrations: [],
    activations: [],
    verifications: [],
    errors: []
  };

  try {
    // Step 1: Register all test users
    console.log(`\n📋 === STEP 1: USER REGISTRATIONS ===`);
    for (const user of TEST_USERS) {
      try {
        const registered = await registerUser(user);
        results.registrations.push({ user: user.username, success: registered });
        await delay(1000); // 1 second delay between registrations
      } catch (error) {
        console.error(`❌ Registration error for ${user.username}:`, error.message);
        results.errors.push(`Registration failed for ${user.username}: ${error.message}`);
      }
    }

    // Step 2: Activate memberships
    console.log(`\n🎯 === STEP 2: MEMBERSHIP ACTIVATIONS ===`);
    for (const user of TEST_USERS) {
      try {
        const activated = await activateMembership(user);
        results.activations.push({ user: user.username, success: activated });
        await delay(2000); // 2 second delay between activations
      } catch (error) {
        console.error(`❌ Activation error for ${user.username}:`, error.message);
        results.errors.push(`Activation failed for ${user.username}: ${error.message}`);
      }
    }

    // Step 3: Verify database records
    console.log(`\n✅ === STEP 3: DATABASE VERIFICATION ===`);
    for (const user of TEST_USERS) {
      try {
        const verification = await verifyDatabaseRecords(user);
        results.verifications.push({ user: user.username, records: verification });
        await delay(500);
      } catch (error) {
        console.error(`❌ Verification error for ${user.username}:`, error.message);
        results.errors.push(`Verification failed for ${user.username}: ${error.message}`);
      }
    }

    // Step 4: Check referral matrix
    console.log(`\n🕸️ === STEP 4: MATRIX STRUCTURE CHECK ===`);
    await checkReferralMatrix();

    // Step 5: Check layer rewards
    console.log(`\n💰 === STEP 5: LAYER REWARDS CHECK ===`);
    await checkLayerRewards();

  } catch (error) {
    console.error(`💥 Critical test error:`, error);
    results.errors.push(`Critical error: ${error.message}`);
  }

  // Final results summary
  console.log(`\n📊 ===== TEST RESULTS SUMMARY =====`);
  console.log(`✅ Successful registrations: ${results.registrations.filter(r => r.success).length}/${TEST_USERS.length}`);
  console.log(`✅ Successful activations: ${results.activations.filter(a => a.success).length}/${TEST_USERS.length}`);
  console.log(`🔍 Verifications completed: ${results.verifications.length}/${TEST_USERS.length}`);
  console.log(`❌ Total errors: ${results.errors.length}`);

  if (results.errors.length > 0) {
    console.log(`\n🚨 ERRORS ENCOUNTERED:`);
    results.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }

  // Optional cleanup
  // await cleanupTestData();

  console.log(`\n🏁 Test completed at: ${new Date().toISOString()}`);
  return results;
}

// Execute the test if called directly
if (require.main === module) {
  runCompleteTest()
    .then(results => {
      console.log(`\n✨ Test execution completed. Check the logs above for detailed results.`);
      process.exit(results.errors.length > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error(`💥 Test execution failed:`, error);
      process.exit(1);
    });
}

module.exports = {
  runCompleteTest,
  TEST_USERS,
  TEST_REFERRER
};