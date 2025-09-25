#!/usr/bin/env node

/**
 * Test referrals frontend after fixes
 * Validate that the fixes work correctly
 */

const SUPABASE_URL = 'https://cvqibjcbfrwsgkvthccp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2OTc1NDYsImV4cCI6MjA1MDI3MzU0Nn0.nWzjBLsHfGHiweT3bSQgZqGZLczXOUhOFplKOTxH3Ao';

const TEST_REFERRER = '0x7a80ec1261e8e63C865ab4ab6af68D0386B8b7Df';

async function testDirectSupabaseQuery() {
  console.log(`\n🔍 === TESTING DIRECT SUPABASE QUERIES ===`);
  
  try {
    // Test referrals_new table query (what frontend should use)
    const response1 = await fetch(`${SUPABASE_URL}/rest/v1/referrals_new?referrer_wallet=eq.${TEST_REFERRER}&select=*`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    const referralsNewData = await response1.json();
    console.log(`✅ referrals_new query result:`);
    console.log(`   Status: ${response1.status}`);
    console.log(`   Count: ${referralsNewData.length}`);
    console.log(`   Data:`, referralsNewData);
    
    // Test old referrals table query (what frontend was using)
    const response2 = await fetch(`${SUPABASE_URL}/rest/v1/referrals?referrer_wallet=ilike.${TEST_REFERRER}&is_direct_referral=eq.true&select=*`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    const referralsOldData = await response2.json();
    console.log(`\n❌ old referrals query result:`);
    console.log(`   Status: ${response2.status}`);
    console.log(`   Count: ${Array.isArray(referralsOldData) ? referralsOldData.length : 'N/A'}`);
    console.log(`   Data:`, referralsOldData);
    
    // Test count query for referrals_new
    const response3 = await fetch(`${SUPABASE_URL}/rest/v1/referrals_new?referrer_wallet=eq.${TEST_REFERRER}&select=*`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'
      }
    });
    
    const countHeader = response3.headers.get('content-range');
    console.log(`\n📊 referrals_new count query:`);
    console.log(`   Status: ${response3.status}`);
    console.log(`   Content-Range: ${countHeader}`);
    
    return {
      referrals_new_count: referralsNewData.length,
      referrals_old_count: Array.isArray(referralsOldData) ? referralsOldData.length : 0,
      working_table: referralsNewData.length > 0 ? 'referrals_new' : 'none'
    };
    
  } catch (error) {
    console.error(`❌ Error testing supabase queries:`, error);
    return null;
  }
}

async function testReferrerStatsView() {
  console.log(`\n📊 === TESTING REFERRER_STATS VIEW ===`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/referrer_stats?wallet_address=eq.${TEST_REFERRER}&select=*`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    const referrerStatsData = await response.json();
    console.log(`📊 referrer_stats view result:`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Count: ${Array.isArray(referrerStatsData) ? referrerStatsData.length : 'N/A'}`);
    console.log(`   Data:`, referrerStatsData);
    
    if (Array.isArray(referrerStatsData) && referrerStatsData.length > 0) {
      const stats = referrerStatsData[0];
      console.log(`\n📈 Key statistics:`);
      console.log(`   - direct_referrals: ${stats.direct_referrals}`);
      console.log(`   - total_team_size: ${stats.total_team_size}`);
      console.log(`   - current_level: ${stats.current_level}`);
      console.log(`   - max_layer: ${stats.max_layer}`);
    }
    
    return referrerStatsData;
  } catch (error) {
    console.error(`❌ Error testing referrer_stats view:`, error);
    return null;
  }
}

async function testMatrixReferrals() {
  console.log(`\n🕸️ === TESTING MATRIX_REFERRALS TABLE ===`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/matrix_referrals?matrix_root_wallet=eq.${TEST_REFERRER}&select=*`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    const matrixData = await response.json();
    console.log(`🕸️ matrix_referrals table result:`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Count: ${Array.isArray(matrixData) ? matrixData.length : 'N/A'}`);
    console.log(`   Data:`, matrixData);
    
    return matrixData;
  } catch (error) {
    console.error(`❌ Error testing matrix_referrals:`, error);
    return null;
  }
}

async function main() {
  console.log(`🚀 Testing referrals frontend fixes`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  console.log(`🎯 Target referrer: ${TEST_REFERRER}`);
  
  try {
    // Test direct Supabase queries
    const directQueryResults = await testDirectSupabaseQuery();
    
    // Test referrer_stats view
    const referrerStatsResults = await testReferrerStatsView();
    
    // Test matrix_referrals table
    const matrixResults = await testMatrixReferrals();
    
    // Analysis
    console.log(`\n📊 === ANALYSIS ===`);
    console.log(`🎯 Target: ${TEST_REFERRER}`);
    
    if (directQueryResults) {
      console.log(`\n🔍 Direct Query Results:`);
      console.log(`   - referrals_new (correct): ${directQueryResults.referrals_new_count} records`);
      console.log(`   - referrals (old): ${directQueryResults.referrals_old_count} records`);
      console.log(`   - Working table: ${directQueryResults.working_table}`);
      
      if (directQueryResults.referrals_new_count > 0) {
        console.log(`✅ FIXED: Frontend should now show referral data from referrals_new table`);
      } else {
        console.log(`❌ ISSUE: No data in referrals_new table`);
      }
    }
    
    if (Array.isArray(referrerStatsResults) && referrerStatsResults.length > 0) {
      const stats = referrerStatsResults[0];
      console.log(`\n📈 Referrer Stats Available:`);
      console.log(`   - direct_referrals: ${stats.direct_referrals || 'N/A'}`);
      console.log(`   - This should display in frontend components`);
    }
    
    if (Array.isArray(matrixResults) && matrixResults.length > 0) {
      console.log(`\n🕸️ Matrix Data Available:`);
      console.log(`   - ${matrixResults.length} matrix members`);
      console.log(`   - Matrix visualization should work`);
    }
    
    console.log(`\n🎯 FRONTEND COMPONENT STATUS:`);
    
    if (directQueryResults?.referrals_new_count > 0) {
      console.log(`✅ ReferralsStats component: SHOULD WORK (fixed to use referrals_new)`);
    } else {
      console.log(`❌ ReferralsStats component: NO DATA`);
    }
    
    if (referrerStatsResults && Array.isArray(referrerStatsResults) && referrerStatsResults.length > 0) {
      console.log(`✅ Referrer stats displays: SHOULD WORK (referrer_stats view has data)`);
    } else {
      console.log(`❌ Referrer stats displays: NO DATA`);
    }
    
    if (matrixResults && Array.isArray(matrixResults) && matrixResults.length > 0) {
      console.log(`✅ Matrix components: SHOULD WORK (matrix_referrals has data)`);
    } else {
      console.log(`❌ Matrix components: NO DATA`);
    }
    
  } catch (error) {
    console.error(`💥 Script error:`, error);
  }
  
  console.log(`\n🏁 Test completed at: ${new Date().toISOString()}`);
}

// Execute if called directly
if (require.main === module) {
  main().then(() => {
    console.log(`✨ Referrals frontend test completed`);
  }).catch(error => {
    console.error(`💥 Script failed:`, error);
    process.exit(1);
  });
}

module.exports = { main };