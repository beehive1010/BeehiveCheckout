// List available RPC functions in the database
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wykvpctrsqhebqpjmvdb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5a3ZwY3Ryc3FoZWJxcGptdmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1OTA1MzgsImV4cCI6MjA3MjE2NjUzOH0.q_8CQHImQ2si6dUCw0LGCIwUkd9Efah665h_zP_HQIA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listFunctions() {
  console.log('📋 Listing available RPC functions...');
  
  const functions = [
    'api_check_user_exists',
    'api_get_user_balances', 
    'api_get_member_nfts',
    'api_get_user_activities',
    'simple_register_user',
    'api_activate_user_membership',
    'activate_member_nft'  // Suggested by error message
  ];
  
  for (const funcName of functions) {
    try {
      console.log(`🧪 Testing ${funcName}...`);
      
      // Try calling each function with minimal params
      let testParams = {};
      
      if (funcName.includes('user_wallet') || funcName.includes('check_value')) {
        testParams = { check_value: '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab' };
      } else if (funcName.includes('user_wallet')) {
        testParams = { user_wallet: '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab' };
      } else if (funcName === 'activate_member_nft') {
        testParams = { wallet_address: '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab', level: 1 };
      } else if (funcName === 'api_activate_user_membership') {
        testParams = { user_wallet_address: '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab' };
      }
      
      const { data, error } = await supabase.rpc(funcName, testParams);
      
      if (error) {
        if (error.code === 'PGRST202') {
          console.log(`❌ ${funcName} - Function not found`);
        } else {
          console.log(`⚠️  ${funcName} - Exists but error: ${error.message}`);
        }
      } else {
        console.log(`✅ ${funcName} - Works! Sample result:`, typeof data === 'object' ? (Array.isArray(data) ? `Array(${data.length})` : 'Object') : data);
      }
    } catch (error) {
      console.log(`💥 ${funcName} - Exception: ${error.message}`);
    }
  }
}

listFunctions();