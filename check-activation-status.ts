/**
 * Check Activation Status via Supabase Client
 *
 * This script checks the database to diagnose PayEmbed activation issues
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cvqibjcbfrwsgkvthccp.supabase.com';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNjU0MDUsImV4cCI6MjA3MjY0MTQwNX0.7CfL8CS1dQ8Gua89maSCDkgnMsNb19qp97mJyoJqJjs';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function diagnoseActivationIssues() {
  console.log('🔍 Checking PayEmbed Activation Status...\n');

  // 1. Check recent users
  console.log('1️⃣ Recent User Registrations:');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('wallet_address, username, email, referrer_wallet, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (usersError) {
    console.error('❌ Users query error:', usersError);
  } else {
    console.table(users);
  }

  // 2. Check recent memberships
  console.log('\n2️⃣ Recent Membership Records:');
  const { data: memberships, error: membershipsError } = await supabase
    .from('membership')
    .select('wallet_address, nft_level, is_member, claimed_at, unlock_membership_level')
    .order('claimed_at', { ascending: false })
    .limit(10);

  if (membershipsError) {
    console.error('❌ Memberships query error:', membershipsError);
  } else {
    console.table(memberships);
  }

  // 3. Check recent members
  console.log('\n3️⃣ Recent Member Activations:');
  const { data: members, error: membersError } = await supabase
    .from('members')
    .select('wallet_address, current_level, activation_sequence, activation_time, referrer_wallet, is_activated')
    .order('activation_time', { ascending: false })
    .limit(10);

  if (membersError) {
    console.error('❌ Members query error:', membersError);
  } else {
    console.table(members);
  }

  // 4. Find users without activation
  console.log('\n4️⃣ Users Registered but NOT Activated:');
  const { data: usersWithoutMembers } = await supabase
    .from('users')
    .select('wallet_address, username, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (usersWithoutMembers) {
    for (const user of usersWithoutMembers) {
      const { data: member } = await supabase
        .from('members')
        .select('is_activated')
        .ilike('wallet_address', user.wallet_address)
        .maybeSingle();

      if (!member || !member.is_activated) {
        console.log(`⚠️ ${user.wallet_address} - Registered: ${user.created_at} - NOT ACTIVATED`);
      }
    }
  }

  // 5. Summary statistics
  console.log('\n5️⃣ Summary Statistics:');

  const { count: totalUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  const { count: totalMemberships } = await supabase
    .from('membership')
    .select('*', { count: 'exact', head: true });

  const { count: totalMembers } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Total Users: ${totalUsers}`);
  console.log(`📊 Total Memberships: ${totalMemberships}`);
  console.log(`📊 Total Activated Members: ${totalMembers}`);
  console.log(`⚠️ Users Without Activation: ${(totalUsers || 0) - (totalMembers || 0)}`);

  console.log('\n✅ Diagnosis Complete!');
}

diagnoseActivationIssues().catch(console.error);
