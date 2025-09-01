// Create a minimal registration that bypasses all broken RPC functions
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wykvpctrsqhebqpjmvdb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5a3ZwY3Ryc3FoZWJxcGptdmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1OTA1MzgsImV4cCI6MjA3MjE2NjUzOH0.q_8CQHImQ2si6dUCw0LGCIwUkd9Efah665h_zP_HQIA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testMinimalRegistration() {
  console.log('🧪 Testing minimal registration approach...');
  
  const testWallet = '0xTEST987';
  const testEmail = 'minimal@test.com';
  const testUsername = 'minimal' + Date.now();
  
  try {
    // Try direct insertion to users table (bypassing RLS if possible)
    console.log('1️⃣ Testing direct user insertion...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        wallet_address: testWallet,
        email: testEmail,
        username: testUsername,
        created_at: new Date().toISOString(),
        last_updated_at: new Date().toISOString(),
        referrer_wallet: '0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0'
      })
      .select()
      .single();
    
    if (userError) {
      console.log('❌ Direct user insertion failed:', userError);
      
      // Check what columns actually exist
      console.log('🔍 Let me check user table structure with a test query...');
      const { data: existingUsers, error: queryError } = await supabase
        .from('users')
        .select('*')
        .limit(1);
      
      if (existingUsers && existingUsers.length > 0) {
        console.log('✅ Users table columns that actually exist:', Object.keys(existingUsers[0]));
      } else {
        console.log('❌ Could not query users table:', queryError);
      }
      
    } else {
      console.log('✅ Direct user insertion successful!');
      console.log('User created:', userData);
      
      // Clean up
      await supabase.from('users').delete().eq('wallet_address', testWallet);
      console.log('✅ Test user cleaned up');
    }
    
    // Test the working functions
    console.log('2️⃣ Testing api_check_user_exists (this one works)...');
    const { data: checkData, error: checkError } = await supabase
      .rpc('api_check_user_exists', { check_value: '0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0' });
    
    if (checkError) {
      console.log('❌ User check failed:', checkError);
    } else {
      console.log('✅ User check works:', checkData);
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

testMinimalRegistration();