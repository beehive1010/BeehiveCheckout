// Test script for new matrix placement algorithm
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cvqibjcbfrwsgkvthccp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjgxMjE3NzksImV4cCI6MjA0MzY5Nzc3OX0.4l7KEPPBCq0LNzGLJ4_o0bpUGfKSdKwQKfJK3QM9DM0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMatrixStructure() {
  console.log('🔍 Testing current matrix structure...');
  
  try {
    // Check current matrix data from referrals table
    const { data: referralsData, error: referralsError } = await supabase
      .from('referrals')
      .select(`
        member_wallet,
        referrer_wallet,
        matrix_root_wallet,
        matrix_layer,
        matrix_position,
        placed_at
      `)
      .order('placed_at')
      .limit(20);

    if (referralsError) {
      console.error('❌ Error fetching referrals:', referralsError);
      return;
    }

    console.log('📊 Current matrix data from referrals table:');
    console.log(`Total records: ${referralsData?.length || 0}`);
    
    if (referralsData && referralsData.length > 0) {
      console.log('Sample records:');
      referralsData.slice(0, 5).forEach((record, index) => {
        console.log(`  ${index + 1}. ${record.member_wallet?.slice(0, 8)}... -> Layer ${record.matrix_layer}, Position ${record.matrix_position}`);
      });

      // Analyze layer distribution
      const layerStats = {};
      referralsData.forEach(record => {
        const layer = record.matrix_layer || 'null';
        layerStats[layer] = (layerStats[layer] || 0) + 1;
      });
      
      console.log('📈 Layer distribution:', layerStats);
      
      // Check for Layer 2+ positions (recursive structure)
      const layer2Plus = referralsData.filter(r => r.matrix_layer && r.matrix_layer > 1);
      console.log(`🔄 Recursive positions (Layer 2+): ${layer2Plus.length}`);
      
      if (layer2Plus.length > 0) {
        console.log('Layer 2+ examples:');
        layer2Plus.slice(0, 3).forEach(record => {
          console.log(`  - ${record.member_wallet?.slice(0, 8)}... Layer ${record.matrix_layer}, Position ${record.matrix_position}`);
        });
      }
    } else {
      console.log('❌ No matrix data found in referrals table');
    }

    // Check matrix_referrals table if it exists
    const { data: matrixReferralsData, error: matrixReferralsError } = await supabase
      .from('matrix_referrals')
      .select('*')
      .limit(10);

    if (!matrixReferralsError && matrixReferralsData) {
      console.log('📊 Matrix_referrals table data:');
      console.log(`Total records: ${matrixReferralsData.length}`);
      if (matrixReferralsData.length > 0) {
        console.log('Sample:', matrixReferralsData[0]);
      }
    } else {
      console.log('⚠️ Matrix_referrals table error or not found:', matrixReferralsError?.message);
    }

    // Check members table for activation sequences
    const { data: membersData, error: membersError } = await supabase
      .from('members')
      .select('wallet_address, activation_sequence, current_level')
      .order('activation_sequence')
      .limit(10);

    if (!membersError && membersData) {
      console.log('👥 Members table sample:');
      console.log(`Total members: ${membersData.length}`);
      membersData.slice(0, 5).forEach(member => {
        console.log(`  - ${member.wallet_address?.slice(0, 8)}... Seq: ${member.activation_sequence}, Level: ${member.current_level}`);
      });
    }

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

async function testMatrixPlacementFunction() {
  console.log('🧪 Testing matrix placement function...');
  
  try {
    // Get two test wallets from members table
    const { data: testMembers, error: membersError } = await supabase
      .from('members')
      .select('wallet_address, activation_sequence')
      .order('activation_sequence')
      .limit(2);

    if (membersError || !testMembers || testMembers.length < 2) {
      console.log('❌ Need at least 2 members for testing');
      return;
    }

    const [member1, member2] = testMembers;
    console.log(`🎯 Test placement: ${member2.wallet_address?.slice(0, 8)}... -> ${member1.wallet_address?.slice(0, 8)}...`);

    // Note: We can't actually call the edge function without proper auth
    // This is just showing the structure
    console.log('📝 Matrix placement call would be:');
    console.log({
      member_wallet: member2.wallet_address,
      referrer_wallet: member1.wallet_address
    });

  } catch (error) {
    console.error('❌ Test function error:', error);
  }
}

// Run tests
async function main() {
  await testMatrixStructure();
  console.log('\n' + '='.repeat(50) + '\n');
  await testMatrixPlacementFunction();
}

main();