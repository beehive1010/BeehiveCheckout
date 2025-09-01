// Comprehensive registration debugging
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wykvpctrsqhebqpjmvdb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5a3ZwY3Ryc3FoZWJxcGptdmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1OTA1MzgsImV4cCI6MjA3MjE2NjUzOH0.q_8CQHImQ2si6dUCw0LGCIwUkd9Efah665h_zP_HQIA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugRegistration() {
  console.log('🔍 Comprehensive Registration Debug');
  console.log('=====================================');
  
  const testWallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab';
  const testEmail = 'debug@test.com';
  const testUsername = 'debuguser' + Date.now();
  const companyWallet = '0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0';
  
  try {
    // Step 1: Check if company user exists
    console.log('1️⃣ Checking if company user exists...');
    const { data: companyCheck, error: companyError } = await supabase
      .rpc('api_check_user_exists', { check_value: companyWallet });
    
    if (companyError) {
      console.error('❌ Company check failed:', companyError);
    } else {
      console.log('✅ Company check result:', companyCheck);
      
      if (!companyCheck?.[0]?.user_exists) {
        console.log('⚠️  Company user does not exist - this will cause referrer issues');
        
        // Try to find company user with different case
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('wallet_address, username')
          .ilike('wallet_address', '%0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0%');
        
        console.log('🔍 Looking for company user variations:', users);
      } else {
        console.log('✅ Company user exists');
      }
    }
    
    // Step 2: Check if test user already exists
    console.log('2️⃣ Checking if test user already exists...');
    const { data: userCheck, error: userError } = await supabase
      .rpc('api_check_user_exists', { check_value: testWallet });
    
    if (userError) {
      console.error('❌ User check failed:', userError);
      return;
    }
    
    console.log('✅ User check result:', userCheck);
    
    if (userCheck?.[0]?.user_exists) {
      console.log('⚠️  Test user already exists, cleaning up first...');
      await supabase.from('users').delete().eq('wallet_address', testWallet);
      console.log('✅ Cleaned up existing test user');
    }
    
    // Step 3: Test simple_register_user function
    console.log('3️⃣ Testing simple_register_user function...');
    const { data: registerData, error: registerError } = await supabase
      .rpc('simple_register_user', {
        p_wallet_address: testWallet,
        p_email: testEmail,
        p_username: testUsername,
        p_referrer_wallet: companyWallet
      });
    
    if (registerError) {
      console.error('❌ Registration failed:', registerError);
      console.log('Error details:', {
        code: registerError.code,
        message: registerError.message,
        details: registerError.details,
        hint: registerError.hint
      });
      
      // Try to understand the error better
      if (registerError.message.includes('violates')) {
        console.log('💡 This looks like a constraint violation');
      } else if (registerError.message.includes('permission')) {
        console.log('💡 This looks like a permissions issue');
      } else if (registerError.message.includes('function')) {
        console.log('💡 The function might not exist or have issues');
      }
      
    } else {
      console.log('✅ Registration successful!');
      console.log('Response:', registerData);
      
      // Step 4: Verify registration
      console.log('4️⃣ Verifying registration...');
      const { data: verifyData, error: verifyError } = await supabase
        .rpc('api_check_user_exists', { check_value: testWallet });
      
      if (verifyError) {
        console.error('❌ Verification failed:', verifyError);
      } else {
        console.log('✅ Verification result:', verifyData);
        
        if (verifyData?.[0]?.user_exists) {
          console.log('🎉 Registration was successful!');
          
          // Clean up
          await supabase.from('users').delete().eq('wallet_address', testWallet);
          console.log('✅ Test cleanup completed');
        } else {
          console.log('❌ User was not created despite success response');
        }
      }
    }
    
  } catch (error) {
    console.error('💥 Debug failed with exception:', error);
  }
  
  console.log('=====================================');
  console.log('🏁 Debug completed');
}

debugRegistration();