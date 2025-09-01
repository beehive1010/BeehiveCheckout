import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wykvpctrsqhebqpjmvdb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5a3ZwY3Ryc3FoZWJxcGptdmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1OTA1MzgsImV4cCI6MjA3MjE2NjUzOH0.q_8CQHImQ2si6dUCw0LGCIwUkd9Efah665h_zP_HQIA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testEdgeFunction() {
  console.log('🧪 Testing demo-claim edge function...');
  
  const testWallet = '0xTEST' + Date.now(); // Unique test wallet
  const referrerWallet = '0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0';
  
  try {
    console.log(`🎯 Testing with wallet: ${testWallet}`);
    console.log(`🔗 Referrer: ${referrerWallet}`);
    
    const { data, error } = await supabase.functions.invoke('demo-claim', {
      body: {
        walletAddress: testWallet,
        referrerWallet: referrerWallet
      }
    });
    
    if (error) {
      console.error('❌ Edge function error:', error);
      console.log('📝 This might mean:');
      console.log('   - Function not deployed yet');
      console.log('   - Service role key not set');
      console.log('   - Network connectivity issue');
      return;
    }
    
    if (data?.success) {
      console.log('✅ Edge function successful!');
      console.log('📊 Response data:', JSON.stringify(data, null, 2));
      
      // Verify records were created
      console.log('\n🔍 Verifying database records...');
      
      // Check user
      const { data: userData } = await supabase
        .from('users')
        .select('wallet_address, member_activated, current_level')
        .eq('wallet_address', testWallet)
        .single();
      
      console.log('👤 User record:', userData);
      
      // Check NFT (might fail due to RLS)
      const { data: nftData } = await supabase
        .from('membership_nfts_v2')
        .select('wallet_address, level, status')
        .eq('wallet_address', testWallet);
      
      console.log('🏆 NFT records:', nftData);
      
    } else {
      console.log('❌ Edge function returned error:', data);
    }
    
  } catch (error) {
    console.error('🚨 Test failed:', error);
  }
}

testEdgeFunction();