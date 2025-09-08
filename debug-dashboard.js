// Debug dashboard data flow
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://cvqibjcbfrwsgkvthccp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNjU0MDUsImV4cCI6MjA3MjY0MTQwNX0.7CfL8CS1dQ8Gua89maSCDkgnMsNb19qp97mJyoJqJjs'
);

async function testMemberQueries(walletAddress) {
  console.log(`🔍 Testing member queries for: ${walletAddress}`);
  
  // Test getMemberInfo equivalent
  console.log('\n1. Testing getMemberInfo...');
  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .select('*')
    .eq('wallet_address', walletAddress.toLowerCase())
    .single();
  
  console.log('Member data:', memberData);
  console.log('Member error:', memberError);
  
  // Test isActivatedMember equivalent
  console.log('\n2. Testing isActivatedMember...');
  const { data: activatedData, error: activatedError } = await supabase
    .from('members')
    .select('is_activated, current_level, wallet_address')
    .eq('wallet_address', walletAddress.toLowerCase())
    .eq('is_activated', true)
    .single();
  
  console.log('Activated data:', activatedData);
  console.log('Activated error:', activatedError);
  
  // Test what the dashboard transformation would produce
  console.log('\n3. Dashboard transformation result:');
  const dashboardMemberData = {
    currentLevel: memberData?.current_level || 1,
    activationRank: memberData?.activation_rank,
    tierLevel: memberData?.tier_level,
    isActivated: memberData?.is_activated || false,
    activatedAt: memberData?.activated_at,
  };
  
  console.log('Dashboard member object:', dashboardMemberData);
  
  return { memberData, activatedData, dashboardMemberData };
}

testMemberQueries('0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab');