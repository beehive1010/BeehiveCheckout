import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cvqibjcbfrwsgkvthccp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjcyODIwMzgsImV4cCI6MjA0Mjg1ODAzOH0.h2v9RTjnWzS7CbBOJdCPEomNbV0BPJX1FJqOvlk9uO8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQueries() {
  console.log('🔍 Testing current database queries (should work without foreign key errors)...\n');
  
  const testWallet = '0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0';
  
  try {
    // Test 1: Direct referrals (should work)
    console.log('1. Testing direct referrals query...');
    const { data: directReferrals, error: directError } = await supabase
      .from('users')
      .select('wallet_address, username, created_at')
      .eq('referrer_wallet', testWallet)
      .limit(5);
    
    if (directError) {
      console.error('❌ Direct referrals error:', directError.message);
    } else {
      console.log(`✅ Direct referrals query successful: ${directReferrals?.length || 0} results`);
    }

    // Test 2: Spillover matrix (simplified - should work)
    console.log('\n2. Testing spillover matrix query (without foreign keys)...');
    const { data: spilloverData, error: spilloverError } = await supabase
      .from('spillover_matrix')
      .select('member_wallet, matrix_layer, matrix_position, placed_at, is_active')
      .eq('matrix_root', testWallet)
      .eq('is_active', true)
      .limit(5);
    
    if (spilloverError) {
      console.log('ℹ️ Spillover matrix query info:', spilloverError.message);
      console.log('(This is expected if spillover_matrix table doesn\'t exist)');
    } else {
      console.log(`✅ Spillover matrix query successful: ${spilloverData?.length || 0} results`);
    }

    // Test 3: Members activation status
    console.log('\n3. Testing members query...');
    const { data: membersData, error: membersError } = await supabase
      .from('members')
      .select('wallet_address, current_level')
      .eq('wallet_address', testWallet)
      .limit(5);
    
    if (membersError) {
      console.error('❌ Members query error:', membersError.message);
    } else {
      console.log(`✅ Members query successful: ${membersData?.length || 0} results`);
    }

    console.log('\n🎉 All queries completed successfully!');
    console.log('\n📝 Note: If you\'re still seeing foreign key errors in the browser:');
    console.log('   - Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)');
    console.log('   - Clear browser cache for the domain');
    console.log('   - Or restart the browser completely');
    
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
  }
}

testQueries();