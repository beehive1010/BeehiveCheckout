// Quick debug script to check user in cloud Supabase
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://cvqibjcbfrwsgkvthccp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNjU0MDUsImV4cCI6MjA3MjY0MTQwNX0.7CfL8CS1dQ8Gua89maSCDkgnMsNb19qp97mJyoJqJjs'
);

async function checkUser(walletAddress) {
  try {
    console.log(`🔍 Checking user: ${walletAddress}`);
    
    // Check users table (remove .single() to avoid error if no record)
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase());

    console.log('Users found:', users?.length || 0);
    if (users?.length > 0) console.log('User record:', users[0]);
    if (userError) console.log('User error:', userError);

    // Also check with original casing
    const { data: usersOriginal, error: userOriginalError } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress);

    console.log('Users with original casing:', usersOriginal?.length || 0);
    if (usersOriginal?.length > 0) console.log('User record (original):', usersOriginal[0]);

    // Check members table  
    const { data: members, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase());

    console.log('Members found:', members?.length || 0);
    if (members?.length > 0) console.log('Member record:', members[0]);
    if (memberError) console.log('Member error:', memberError);

    // Search all users containing this address (case-insensitive)
    const { data: allMatches, error: searchError } = await supabase
      .from('users')
      .select('wallet_address, email, created_at')
      .ilike('wallet_address', `%${walletAddress.toLowerCase()}%`);

    console.log('Similar addresses found:', allMatches?.length || 0);
    if (allMatches?.length > 0) console.log('Similar addresses:', allMatches);

  } catch (error) {
    console.error('Debug error:', error);
  }
}

checkUser('0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab');