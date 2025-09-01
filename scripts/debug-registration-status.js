// Debug registration status for your specific wallet
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wykvpctrsqhebqpjmvdb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5a3ZwY3Ryc3FoZWJxcGptdmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1OTA1MzgsImV4cCI6MjA3MjE2NjUzOH0.q_8CQHImQ2si6dUCw0LGCIwUkd9Efah665h_zP_HQIA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugRegistrationStatus() {
  const walletAddress = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab';
  
  console.log('🔍 Debugging registration status...');
  console.log('Wallet:', walletAddress);
  
  try {
    // Check if user exists (same as the registration page does)
    console.log('\n1️⃣ Checking if user exists...');
    const { data, error } = await supabase
      .rpc('api_check_user_exists', { check_value: walletAddress });
    
    if (error) {
      console.log('❌ Error checking user:', error);
      return;
    }
    
    const userExists = data?.[0]?.user_exists || false;
    console.log('✅ User exists:', userExists);
    
    if (userExists) {
      console.log('🎯 This is why registration might be failing:');
      console.log('   The user already exists in the database!');
      console.log('   The registration page should redirect to home.');
      
      // Get user details
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', walletAddress.toLowerCase())
        .single();
        
      if (userError) {
        console.log('❌ Error getting user data:', userError);
      } else {
        console.log('📋 User data:', userData);
      }
    } else {
      console.log('✅ User does not exist - registration should proceed normally');
      console.log('   The issue is just the old code in Vercel');
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugRegistrationStatus();