#!/usr/bin/env node

/**
 * Test frontend data display issues
 * Check various API endpoints that frontend components might be using
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

  let result;
  try {
    result = await response.json();
  } catch (e) {
    result = { error: 'Failed to parse JSON response', text: await response.text() };
  }
  
  return { response, result };
}

async function checkDashboardData() {
  console.log(`\n📊 === CHECKING DASHBOARD DATA ===`);
  
  try {
    const { response, result } = await makeAPICall('dashboard', {
      walletAddress: TEST_REFERRER
    }, {
      'x-wallet-address': TEST_REFERRER
    });
    
    console.log(`📊 Dashboard API response:`);
    console.log(`Status: ${response.status}`);
    console.log(`Result:`, JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error(`❌ Error checking dashboard:`, error);
    return null;
  }
}

async function checkRewardsData() {
  console.log(`\n🎁 === CHECKING REWARDS DATA ===`);
  
  try {
    const { response, result } = await makeAPICall('rewards', {
      action: 'get-claimable-rewards',
      walletAddress: TEST_REFERRER
    });
    
    console.log(`🎁 Rewards API response:`);
    console.log(`Status: ${response.status}`);
    console.log(`Result:`, JSON.stringify(result, null, 2));
    
    // Also check layer rewards
    const { response: layerResponse, result: layerResult } = await makeAPICall('rewards', {
      action: 'get-layer-rewards',
      walletAddress: TEST_REFERRER
    });
    
    console.log(`\n🎁 Layer Rewards API response:`);
    console.log(`Status: ${layerResponse.status}`);
    console.log(`Result:`, JSON.stringify(layerResult, null, 2));
    
    return { claimable: result, layer: layerResult };
  } catch (error) {
    console.error(`❌ Error checking rewards:`, error);
    return null;
  }
}

async function checkMemberInfo() {
  console.log(`\n👤 === CHECKING MEMBER INFO ===`);
  
  try {
    const { response, result } = await makeAPICall('member-info', {
      walletAddress: TEST_REFERRER
    });
    
    console.log(`👤 Member Info API response:`);
    console.log(`Status: ${response.status}`);
    console.log(`Result:`, JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error(`❌ Error checking member info:`, error);
    return null;
  }
}

async function checkBalanceData() {
  console.log(`\n💰 === CHECKING BALANCE DATA ===`);
  
  try {
    const { response, result } = await makeAPICall('balance', {
      walletAddress: TEST_REFERRER
    });
    
    console.log(`💰 Balance API response:`);
    console.log(`Status: ${response.status}`);
    console.log(`Result:`, JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error(`❌ Error checking balance:`, error);
    return null;
  }
}

async function checkBCCBalance() {
  console.log(`\n🪙 === CHECKING BCC BALANCE ===`);
  
  try {
    const { response, result } = await makeAPICall('bcc-balance', {
      action: 'get-balance',
      walletAddress: TEST_REFERRER
    });
    
    console.log(`🪙 BCC Balance API response:`);
    console.log(`Status: ${response.status}`);
    console.log(`Result:`, JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error(`❌ Error checking BCC balance:`, error);
    return null;
  }
}

async function checkMatrixData() {
  console.log(`\n🕸️ === CHECKING MATRIX DATA ===`);
  
  try {
    // Try without authentication first
    const { response, result } = await makeAPICall('matrix', {
      walletAddress: TEST_REFERRER
    });
    
    console.log(`🕸️ Matrix API response (no auth):`);
    console.log(`Status: ${response.status}`);
    console.log(`Result:`, JSON.stringify(result, null, 2));
    
    // Try with authentication
    const { response: authResponse, result: authResult } = await makeAPICall('matrix', {
      walletAddress: TEST_REFERRER
    }, {
      'x-wallet-address': TEST_REFERRER
    });
    
    console.log(`\n🕸️ Matrix API response (with auth):`);
    console.log(`Status: ${authResponse.status}`);
    console.log(`Result:`, JSON.stringify(authResult, null, 2));
    
    return { noAuth: result, withAuth: authResult };
  } catch (error) {
    console.error(`❌ Error checking matrix:`, error);
    return null;
  }
}

async function checkReferralLinks() {
  console.log(`\n🔗 === CHECKING REFERRAL LINKS ===`);
  
  try {
    const { response, result } = await makeAPICall('referral-links', {
      action: 'get-link',
      walletAddress: TEST_REFERRER
    });
    
    console.log(`🔗 Referral Links API response:`);
    console.log(`Status: ${response.status}`);
    console.log(`Result:`, JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error(`❌ Error checking referral links:`, error);
    return null;
  }
}

async function checkPendingRewards() {
  console.log(`\n⏳ === CHECKING PENDING REWARDS ===`);
  
  try {
    const { response, result } = await makeAPICall('process-pending-rewards', {
      action: 'get-pending-rewards',
      walletAddress: TEST_REFERRER
    });
    
    console.log(`⏳ Pending Rewards API response:`);
    console.log(`Status: ${response.status}`);
    console.log(`Result:`, JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error(`❌ Error checking pending rewards:`, error);
    return null;
  }
}

async function checkNotifications() {
  console.log(`\n🔔 === CHECKING NOTIFICATIONS ===`);
  
  try {
    const { response, result } = await makeAPICall('notification', {
      action: 'get-notifications',
      walletAddress: TEST_REFERRER
    });
    
    console.log(`🔔 Notifications API response:`);
    console.log(`Status: ${response.status}`);
    console.log(`Result:`, JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error(`❌ Error checking notifications:`, error);
    return null;
  }
}

async function testReferralsForReferrer() {
  console.log(`\n🔍 === TESTING REFERRALS FOR SPECIFIC REFERRER ===`);
  
  const testUsers = [
    '0xTestUser00111111111111111111111111111111',
    '0xTestUser00222222222222222222222222222222', 
    '0xTestUser00333333333333333333333333333333'
  ];
  
  for (const wallet of testUsers) {
    console.log(`\n👤 Checking user: ${wallet}`);
    
    try {
      // Check user data
      const { response: userResponse, result: userResult } = await makeAPICall('auth', {
        action: 'get-user'
      }, {
        'x-wallet-address': wallet
      });
      
      console.log(`  📊 User data:`, {
        success: userResult.success,
        isMember: userResult.isMember,
        membershipLevel: userResult.membershipLevel,
        referrer: userResult.member?.referrer_wallet,
        activation_sequence: userResult.member?.activation_sequence
      });
      
      // Check if they show up in dashboard/rewards for referrer
      if (userResult.success && userResult.member?.referrer_wallet === TEST_REFERRER) {
        console.log(`  ✅ Confirmed referral relationship`);
      } else {
        console.log(`  ❌ Referral relationship issue`);
      }
      
    } catch (error) {
      console.log(`  ❌ Error checking user:`, error.message);
    }
  }
}

async function main() {
  console.log(`🚀 Starting frontend data display diagnostic`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  console.log(`🎯 Target wallet: ${TEST_REFERRER}`);
  
  const results = {};
  
  try {
    // Test all major API endpoints that frontend might use
    results.dashboard = await checkDashboardData();
    results.rewards = await checkRewardsData();
    results.memberInfo = await checkMemberInfo();
    results.balance = await checkBalanceData();
    results.bccBalance = await checkBCCBalance();
    results.matrix = await checkMatrixData();
    results.referralLinks = await checkReferralLinks();
    results.pendingRewards = await checkPendingRewards();
    results.notifications = await checkNotifications();
    
    // Test referral relationships
    await testReferralsForReferrer();
    
    // Summary Analysis
    console.log(`\n📊 === SUMMARY ANALYSIS ===`);
    console.log(`🎯 Target: ${TEST_REFERRER}`);
    
    const apiStatus = Object.entries(results).map(([key, value]) => {
      let status = '❓ Unknown';
      
      if (!value) {
        status = '❌ Error/No Response';
      } else if (value.success === true || (value.response && value.response.status === 200)) {
        status = '✅ Working';
      } else if (value.response && value.response.status === 404) {
        status = '🚫 Not Found';
      } else if (value.response && value.response.status === 401) {
        status = '🔒 Auth Required';
      } else if (value.response && value.response.status >= 500) {
        status = '💥 Server Error';
      }
      
      return { api: key, status };
    });
    
    console.log(`\n🔍 API Status Summary:`);
    apiStatus.forEach(({ api, status }) => {
      console.log(`  ${status} ${api}`);
    });
    
    // Identify potential issues
    console.log(`\n🚨 POTENTIAL FRONTEND DISPLAY ISSUES:`);
    
    const workingAPIs = apiStatus.filter(a => a.status.includes('✅')).length;
    const totalAPIs = apiStatus.length;
    
    if (workingAPIs < totalAPIs / 2) {
      console.log(`⚠️  Many APIs not working (${workingAPIs}/${totalAPIs}) - this could cause frontend display issues`);
    } else {
      console.log(`✅ Most APIs working (${workingAPIs}/${totalAPIs}) - frontend should have data`);
    }
    
    // Check specific data that frontend needs
    console.log(`\n🔍 SPECIFIC FRONTEND DATA CHECKS:`);
    
    // Check if user has referral stats
    if (results.dashboard && results.dashboard.referral_stats) {
      console.log(`✅ Referral stats available: ${JSON.stringify(results.dashboard.referral_stats)}`);
    } else {
      console.log(`❌ Referral stats missing from dashboard`);
    }
    
    // Check if rewards data exists
    if (results.rewards && (results.rewards.claimable || results.rewards.layer)) {
      console.log(`✅ Rewards data available`);
    } else {
      console.log(`❌ Rewards data missing`);
    }
    
    // Check if balance data exists
    if (results.balance || results.bccBalance) {
      console.log(`✅ Balance data available`);
    } else {
      console.log(`❌ Balance data missing`);
    }
    
  } catch (error) {
    console.error(`💥 Script error:`, error);
  }
  
  console.log(`\n🏁 Diagnostic completed at: ${new Date().toISOString()}`);
}

// Execute if called directly
if (require.main === module) {
  main().then(() => {
    console.log(`✨ Frontend data diagnostic completed`);
  }).catch(error => {
    console.error(`💥 Script failed:`, error);
    process.exit(1);
  });
}

module.exports = { main };