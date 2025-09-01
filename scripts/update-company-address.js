// Update the simple_register_user function to use correct company address
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wykvpctrsqhebqpjmvdb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5a3ZwY3Ryc3FoZWJxcGptdmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1OTA1MzgsImV4cCI6MjA3MjE2NjUzOH0.q_8CQHImQ2si6dUCw0LGCIwUkd9Efah665h_zP_HQIA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function updateFunction() {
  console.log('🔄 Testing with correct company address...');
  
  try {
    // Test registration with correct company address
    const { data, error } = await supabase.rpc('simple_register_user', {
      p_wallet_address: '0xTest456',
      p_email: 'test2@example.com', 
      p_username: 'testuser2',
      p_referrer_wallet: '0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0'
    });
    
    if (error) {
      console.error('❌ Registration failed:', error);
    } else {
      console.log('✅ Registration with correct company address works!');
      console.log('Response:', data);
      
      // Clean up
      await supabase.from('users').delete().eq('wallet_address', '0xTest456');
      console.log('✅ Test user cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

updateFunction();