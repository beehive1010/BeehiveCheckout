import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cvqibjcbfrwsgkvthccp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY2NzQwMjUsImV4cCI6MjA1MjI1MDAyNX0.u7wV3IZKvOkCsqz7RKV68O_S49cMz1tVkK3Giu8A3j0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkReferrals() {
  console.log('🔍 Checking referrals table...\n');

  // 1. Check total referrals
  const { count: totalCount, error: countError } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true });

  console.log('📊 Total referrals in table:', totalCount);

  // 2. Get all referrals data
  const { data: allReferrals, error: allError } = await supabase
    .from('referrals')
    .select('*')
    .order('placed_at', { ascending: false })
    .limit(20);

  if (allError) {
    console.error('❌ Error fetching referrals:', allError);
  } else {
    console.log('\n📋 Recent referrals:');
    console.table(allReferrals?.map(r => ({
      member: r.member_wallet.substring(0, 10),
      referrer: r.referrer_wallet.substring(0, 10),
      placed_at: r.placed_at
    })));
  }

  // 3. Count by referrer
  const { data: referrerStats, error: statsError } = await supabase
    .from('referrals')
    .select('referrer_wallet');

  if (!statsError && referrerStats) {
    const counts = {};
    referrerStats.forEach(r => {
      counts[r.referrer_wallet] = (counts[r.referrer_wallet] || 0) + 1;
    });

    console.log('\n👥 Referrals count by referrer:');
    Object.entries(counts).forEach(([wallet, count]) => {
      console.log(`  ${wallet.substring(0, 10)}...: ${count} referrals`);
    });
  }

  // 4. Test specific wallet (example)
  const testWallet = '0x781665b7e2bf6d4dc1db29c6e49fa1c500bf2de8';
  const { count: specificCount, error: specificError } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_wallet', testWallet.toLowerCase());

  console.log(`\n🎯 Referrals for ${testWallet}:`, specificCount);

  // 5. Check members table for comparison
  const { data: members, error: membersError } = await supabase
    .from('members')
    .select('wallet_address, referrer_wallet, current_level')
    .order('created_at', { ascending: false })
    .limit(10);

  if (!membersError) {
    console.log('\n🔑 Recent members:');
    console.table(members?.map(m => ({
      wallet: m.wallet_address.substring(0, 10),
      referrer: m.referrer_wallet?.substring(0, 10) || 'N/A',
      level: m.current_level
    })));
  }
}

checkReferrals().catch(console.error);
