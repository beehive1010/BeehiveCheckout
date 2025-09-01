import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wykvpctrsqhebqpjmvdb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5a3ZwY3Ryc3FoZWJxcGptdmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1OTA1MzgsImV4cCI6MjA3MjE2NjUzOH0.q_8CQHImQ2si6dUCw0LGCIwUkd9Efah665h_zP_HQIA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDirectInsert() {
  console.log('🧪 Testing direct database inserts...');
  
  const testWallet = '0xTEST' + Date.now(); // Use unique wallet for testing
  const referrerWallet = '0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0';
  
  try {
    // Test 1: Try to insert into membership_nfts_v2
    console.log('\n🏆 Testing membership_nfts_v2 insert...');
    const { data: nftData, error: nftError } = await supabase
      .from('membership_nfts_v2')
      .insert({
        wallet_address: testWallet,
        level: 1,
        level_name: 'Warrior',
        price_paid_usdt: 13000, // 130 USDT in cents
        purchased_at: new Date().toISOString(),
        activated_at: new Date().toISOString(),
        status: 'active'
      })
      .select()
      .single();
    
    if (nftError) {
      console.log('❌ NFT insert failed:', nftError.message);
      console.log('   Details:', nftError);
    } else {
      console.log('✅ NFT insert successful:', nftData);
    }
    
    // Test 2: Try to insert into global_matrix_positions_v2
    console.log('\n📍 Testing global_matrix_positions_v2 insert...');
    const { data: matrixData, error: matrixError } = await supabase
      .from('global_matrix_positions_v2')
      .insert({
        wallet_address: testWallet,
        global_position: 999999, // High number to avoid conflicts
        layer: 1,
        position_in_layer: 0,
        parent_wallet: referrerWallet,
        root_wallet: referrerWallet,
        direct_sponsor_wallet: referrerWallet,
        placement_sponsor_wallet: referrerWallet,
        activated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (matrixError) {
      console.log('❌ Matrix insert failed:', matrixError.message);
      console.log('   Details:', matrixError);
    } else {
      console.log('✅ Matrix insert successful:', matrixData);
    }
    
    // Test 3: Try to activate user
    console.log('\n👤 Testing user activation...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .update({
        member_activated: true,
        current_level: 1,
        activation_at: new Date().toISOString()
      })
      .eq('wallet_address', '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab')
      .select()
      .single();
    
    if (userError) {
      console.log('❌ User activation failed:', userError.message);
      console.log('   Details:', userError);
    } else {
      console.log('✅ User activation successful:', userData);
    }
    
    // Test 4: Try our RPC function
    console.log('\n🔧 Testing RPC function...');
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('api_process_demo_payment', { 
        user_wallet_address: testWallet + '2', // Different wallet
        referrer_wallet_address: referrerWallet 
      });
    
    if (rpcError) {
      console.log('❌ RPC function failed:', rpcError.message);
      console.log('   Details:', rpcError);
    } else {
      console.log('✅ RPC function successful:', rpcData);
    }
    
  } catch (error) {
    console.error('🚨 Test exception:', error);
  }
}

testDirectInsert();