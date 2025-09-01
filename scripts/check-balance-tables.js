// Check balance table structures
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wykvpctrsqhebqpjmvdb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5a3ZwY3Ryc3FoZWJxcGptdmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1OTA1MzgsImV4cCI6MjA3MjE2NjUzOH0.q_8CQHImQ2si6dUCw0LGCIwUkd9Efah665h_zP_HQIA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkBalanceTables() {
  console.log('🔍 Checking balance table structures...');
  
  const tables = ['bcc_balances', 'cth_balances', 'earnings_balances', 'user_balances'];
  
  for (const tableName of tables) {
    try {
      console.log(`📋 Checking ${tableName} table...`);
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (data && data.length > 0) {
        console.log(`✅ ${tableName} columns:`, Object.keys(data[0]));
      } else if (error) {
        console.log(`❌ ${tableName} error:`, error.message);
      } else {
        console.log(`⚠️  ${tableName} table exists but is empty`);
      }
    } catch (error) {
      console.log(`💥 ${tableName} check failed:`, error.message);
    }
  }
  
  // Check what RPC functions exist
  console.log('🔍 Testing existing RPC functions...');
  const rpcFunctions = [
    'api_get_user_balances',
    'api_check_user_exists', 
    'api_get_member_nfts',
    'simple_register_user'
  ];
  
  for (const funcName of rpcFunctions) {
    try {
      console.log(`🧪 Testing ${funcName}...`);
      // Use a test call that should work
      const { data, error } = await supabase.rpc(funcName, funcName === 'api_check_user_exists' ? 
        { check_value: '0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0' } :
        funcName === 'api_get_user_balances' || funcName === 'api_get_member_nfts' ?
        { user_wallet: '0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0' } : {}
      );
      
      if (error) {
        console.log(`❌ ${funcName} error:`, error.message);
      } else {
        console.log(`✅ ${funcName} works, sample result:`, Array.isArray(data) ? `Array(${data.length})` : typeof data);
      }
    } catch (error) {
      console.log(`💥 ${funcName} test failed:`, error.message);
    }
  }
}

checkBalanceTables();