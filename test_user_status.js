// Test script to check user activation status
async function testUserStatus(walletAddress) {
  console.log(`🧪 Testing user status for: ${walletAddress}`);
  
  try {
    // Test 1: Check if user exists in users table
    console.log('\n1️⃣ Testing auth Edge Function...');
    const authResponse = await fetch('https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-wallet-address': walletAddress,
      },
      body: JSON.stringify({
        action: 'get-user'
      })
    });
    
    const authResult = await authResponse.json();
    console.log('Auth result:', authResult);
    
    // Test 2: Check member info
    console.log('\n2️⃣ Testing member-info check...');
    const memberResponse = await fetch('https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/activate-membership', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-wallet-address': walletAddress,
      },
      body: JSON.stringify({
        action: 'get-member-info'
      })
    });
    
    const memberResult = await memberResponse.json();
    console.log('Member result:', memberResult);
    
    // Test 3: Check blockchain NFT status (slow)
    console.log('\n3️⃣ Testing blockchain NFT check (may be slow)...');
    const nftResponse = await fetch('https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/activate-membership', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-wallet-address': walletAddress,
      },
      body: JSON.stringify({
        transactionHash: 'check_existing',
        level: 1
      })
    });
    
    const nftResult = await nftResponse.json();
    console.log('NFT blockchain result:', nftResult);
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Example test - replace with actual wallet address
// testUserStatus('0x479abda60f8c62a7c3fba411ab948a8be0e616ab');

console.log('Test script loaded. Call testUserStatus("0x...") with a wallet address to test.');