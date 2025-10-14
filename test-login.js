// Test admin login directly with Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cvqibjcbfrwsgkvthccp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNjU0MDUsImV4cCI6MjA3MjY0MTQwNX0.7CfL8CS1dQ8Gua89maSCDkgnMsNb19qp97mJyoJqJjs';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  }
});

async function testLogin() {
  console.log('🔐 Testing login...');

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'beehive.tech1010@gmail.com',
      password: 'Admin@123456',
    });

    if (error) {
      console.error('❌ Login error:', error.message);
      return;
    }

    console.log('✅ Login successful!');
    console.log('User ID:', data.user.id);
    console.log('Email:', data.user.email);

    // Check admin record
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (adminError) {
      console.error('❌ Admin check error:', adminError.message);
      return;
    }

    console.log('✅ Admin verified!');
    console.log('Admin Level:', adminData.admin_level);
    console.log('Permissions:', adminData.permissions);

    // Test reading users table
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('wallet_address, username')
      .limit(5);

    if (usersError) {
      console.error('❌ Users query error:', usersError.message);
    } else {
      console.log('✅ Users query successful!');
      console.log('Found', usersData.length, 'users');
    }

  } catch (err) {
    console.error('❌ Error:', err);
  }
}

testLogin();
