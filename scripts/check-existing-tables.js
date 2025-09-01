import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wykvpctrsqhebqpjmvdb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5a3ZwY3Ryc3FoZWJxcGptdmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1OTA1MzgsImV4cCI6MjA3MjE2NjUzOH0.q_8CQHImQ2si6dUCw0LGCIwUkd9Efah665h_zP_HQIA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTables() {
  console.log('🔍 Checking what membership tables exist...');
  
  // List of possible membership table names to check
  const tablesToCheck = [
    'membership_nfts_v2',
    'member_nfts', 
    'membership_state',
    'member_activations',
    'nft_claim_records',
    'global_matrix_positions_v2',
    'global_matrix_position',
    'referral_nodes',
    'layer_rewards_v2',
    'reward_distributions',
    'users'
  ];
  
  const existingTables = [];
  const nonExistentTables = [];
  
  for (const tableName of tablesToCheck) {
    try {
      console.log(`\n📊 Testing table: ${tableName}`);
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ ${tableName}: ${error.message}`);
        nonExistentTables.push({ table: tableName, error: error.message });
      } else {
        console.log(`✅ ${tableName}: Accessible`);
        existingTables.push(tableName);
        
        // Show column structure if data exists
        if (data && data.length > 0) {
          console.log(`   Sample columns:`, Object.keys(data[0]));
        }
      }
    } catch (e) {
      console.log(`🚨 ${tableName}: Exception - ${e.message}`);
      nonExistentTables.push({ table: tableName, error: e.message });
    }
  }
  
  console.log('\n📋 SUMMARY:');
  console.log('✅ Existing tables:', existingTables);
  console.log('❌ Missing/Blocked tables:', nonExistentTables.map(t => t.table));
  
  // Test specific user query
  console.log('\n👤 Testing user query...');
  try {
    const { data, error } = await supabase
      .from('users')
      .select('wallet_address, member_activated, current_level')
      .eq('wallet_address', '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab')
      .single();
    
    if (error) {
      console.log('❌ User query failed:', error.message);
    } else {
      console.log('✅ User data:', data);
    }
  } catch (e) {
    console.log('🚨 User query exception:', e.message);
  }
}

checkTables();