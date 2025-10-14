/**
 * Test Level Upgrade Edge Function
 * This script manually calls the level-upgrade endpoint to diagnose issues
 */

const API_BASE = 'https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjczOTY1NzksImV4cCI6MjA0Mjk3MjU3OX0.PHOKn9Cj-hYB7YANuVKXiipJr0yNQ3aHlTWr8bvT5_Q';

// Test wallet: 0x17918ABa958f332717e594C53906F77afa551BFB (has 3 referrals, eligible for Level 2)
const TEST_WALLET = '0x17918ABa958f332717e594C53906F77afa551BFB';
const TARGET_LEVEL = 2;
const MOCK_TX_HASH = '0xtest123456789abcdef'; // Mock transaction hash for testing

async function testLevelUpgrade() {
  console.log('🧪 Testing level-upgrade Edge Function...\n');

  const payload = {
    action: 'upgrade_level',
    walletAddress: TEST_WALLET,
    targetLevel: TARGET_LEVEL,
    transactionHash: MOCK_TX_HASH,
    level: TARGET_LEVEL,
    paymentAmount: 150,
    network: 'mainnet',
  };

  console.log('📤 Request URL:', `${API_BASE}/level-upgrade`);
  console.log('📤 Payload:', JSON.stringify(payload, null, 2));
  console.log('\n');

  try {
    const response = await fetch(`${API_BASE}/level-upgrade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'x-wallet-address': TEST_WALLET,
      },
      body: JSON.stringify(payload),
    });

    console.log('📥 Response status:', response.status, response.statusText);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('\n📥 Response body (raw):', responseText);

    try {
      const responseJson = JSON.parse(responseText);
      console.log('\n📥 Response JSON:', JSON.stringify(responseJson, null, 2));

      if (responseJson.success) {
        console.log('\n✅ SUCCESS: Level upgrade worked!');
      } else {
        console.log('\n❌ FAILED:', responseJson.error || responseJson.message);
      }
    } catch (parseError) {
      console.log('\n⚠️ Response is not JSON');
    }

  } catch (error: any) {
    console.error('\n❌ Network Error:', error.message);
    console.error('Full error:', error);
  }
}

// Run test
testLevelUpgrade()
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
