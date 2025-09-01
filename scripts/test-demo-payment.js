import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wykvpctrsqhebqpjmvdb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5a3ZwY3Ryc3FoZWJxcGptdmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjUwNDMxNDIsImV4cCI6MjA0MDYxOTE0Mn0.OOzPCY4lkmVZLr_T3g8nIBH5m6GXXfQIbIGMrV2FQQo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDemoPayment() {
  console.log('🧪 Testing demo payment database integration...');
  
  const testWallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab';
  const referrerWallet = '0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0';
  
  try {
    // Test 1: Check if V2 tables exist by trying to select from them
    console.log('\n📊 Testing V2 table access...');
    
    const { data: nftCheck, error: nftError } = await supabase
      .from('membership_nfts_v2')
      .select('*')
      .limit(1);
    
    if (nftError) {
      console.log('❌ membership_nfts_v2 table access failed:', nftError.message);
    } else {
      console.log('✅ membership_nfts_v2 table accessible');
    }
    
    const { data: matrixCheck, error: matrixError } = await supabase
      .from('global_matrix_positions_v2')
      .select('*')
      .limit(1);
      
    if (matrixError) {
      console.log('❌ global_matrix_positions_v2 table access failed:', matrixError.message);
    } else {
      console.log('✅ global_matrix_positions_v2 table accessible');
    }
    
    const { data: treeCheck, error: treeError } = await supabase
      .from('matrix_tree_v2')
      .select('*')
      .limit(1);
      
    if (treeError) {
      console.log('❌ matrix_tree_v2 table access failed:', treeError.message);
    } else {
      console.log('✅ matrix_tree_v2 table accessible');
    }
    
    const { data: rewardsCheck, error: rewardsError } = await supabase
      .from('layer_rewards_v2')
      .select('*')
      .limit(1);
      
    if (rewardsError) {
      console.log('❌ layer_rewards_v2 table access failed:', rewardsError.message);
    } else {
      console.log('✅ layer_rewards_v2 table accessible');
    }
    
    // Test 2: Check if our RPC function exists
    console.log('\n🔧 Testing RPC function...');
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('api_process_demo_payment', { 
        user_wallet_address: testWallet,
        referrer_wallet_address: referrerWallet 
      });
      
    if (rpcError) {
      console.log('❌ RPC function failed:', rpcError.message);
      console.log('📝 This means we need to create the function manually');
    } else {
      console.log('✅ RPC function works:', rpcResult);
    }
    
  } catch (error) {
    console.error('🚨 Test failed:', error);
  }
}

testDemoPayment();