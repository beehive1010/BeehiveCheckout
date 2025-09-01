// Check actual database schema to understand column names
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wykvpctrsqhebqpjmvdb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5a3ZwY3Ryc3FoZWJxcGptdmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1OTA1MzgsImV4cCI6MjA3MjE2NjUzOH0.q_8CQHImQ2si6dUCw0LGCIwUkd9Efah665h_zP_HQIA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
  console.log('🔍 Checking database schema...');
  
  try {
    // Check users table structure
    console.log('1️⃣ Checking users table columns...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (users && users.length > 0) {
      console.log('✅ Users table columns:', Object.keys(users[0]));
    } else if (usersError) {
      console.log('❌ Users table error:', usersError);
    } else {
      console.log('⚠️  Users table is empty');
    }
    
    // Check user_balances table structure
    console.log('2️⃣ Checking user_balances table columns...');
    const { data: balances, error: balancesError } = await supabase
      .from('user_balances')
      .select('*')
      .limit(1);
    
    if (balances && balances.length > 0) {
      console.log('✅ User_balances table columns:', Object.keys(balances[0]));
    } else if (balancesError) {
      console.log('❌ User_balances table error:', balancesError);
    } else {
      console.log('⚠️  User_balances table is empty');
    }
    
    // Test RPC functions to see what columns they expect
    console.log('3️⃣ Testing api_get_user_balances function...');
    const { data: rpcBalances, error: rpcError } = await supabase
      .rpc('api_get_user_balances', { user_wallet: '0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0' });
    
    if (rpcError) {
      console.log('❌ RPC function error:', rpcError);
    } else {
      console.log('✅ RPC function works, result:', rpcBalances);
    }
    
  } catch (error) {
    console.error('💥 Schema check failed:', error);
  }
}

checkSchema();