import {serve} from "https://deno.land/std@0.168.0/http/server.ts";
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

console.log(`🔧 Fix referrals and rewards system function loaded!`);

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { action } = await req.json().catch(() => ({}));

    let result: any = {};

    switch (action) {
      case 'fix_missing_referrals':
        result = await fixMissingReferrals(supabase);
        break;
      
      case 'check_triggers':
        result = await checkTriggerStatus(supabase);
        break;
        
      case 'trigger_missing_rewards':
        result = await triggerMissingRewards(supabase);
        break;
        
      case 'check_bcc_balances':
        result = await checkBCCBalances(supabase);
        break;
        
      default:
        result = {
          success: false,
          error: 'Invalid action. Available: fix_missing_referrals, check_triggers, trigger_missing_rewards, check_bcc_balances'
        };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Fix referrals rewards error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

// 修复缺失的referrals_new记录
async function fixMissingReferrals(supabase: any) {
  console.log('🔗 Fixing missing referrals_new records...');
  
  try {
    // 1. 查找有referrer但没有referrals_new记录的用户
    const { data: missingReferrals, error: findError } = await supabase
      .from('users')
      .select('wallet_address, referrer_wallet, created_at')
      .not('referrer_wallet', 'is', null)
      .neq('referrer_wallet', '');

    if (findError) {
      throw new Error(`Find missing referrals error: ${findError.message}`);
    }

    console.log(`Found ${missingReferrals?.length || 0} users with referrers`);

    let fixed = 0;
    for (const user of missingReferrals || []) {
      // 检查referrals_new中是否已存在
      const { data: existing } = await supabase
        .from('referrals_new')
        .select('referred_wallet')
        .eq('referred_wallet', user.wallet_address)
        .maybeSingle();

      if (!existing) {
        // 创建缺失的referrals_new记录
        const { error: insertError } = await supabase
          .from('referrals_new')
          .insert({
            referrer_wallet: user.referrer_wallet,
            referred_wallet: user.wallet_address,
            created_at: user.created_at
          });

        if (!insertError) {
          fixed++;
          console.log(`✅ Fixed referrals_new for ${user.wallet_address}`);
        } else if (!insertError.message?.includes('duplicate')) {
          console.warn(`⚠️ Failed to fix ${user.wallet_address}:`, insertError.message);
        }
      }
    }

    return {
      success: true,
      action: 'fix_missing_referrals',
      totalUsersWithReferrers: missingReferrals?.length || 0,
      recordsFixed: fixed,
      message: `Fixed ${fixed} missing referrals_new records`
    };

  } catch (error) {
    console.error('Fix missing referrals error:', error);
    return {
      success: false,
      action: 'fix_missing_referrals',
      error: error.message
    };
  }
}

// 检查触发器状态
async function checkTriggerStatus(supabase: any) {
  console.log('🔍 Checking database trigger status...');
  
  try {
    // 查询数据库触发器信息
    const { data: triggers, error } = await supabase.rpc('get_trigger_status');
    
    if (error) {
      console.warn('Could not get trigger status:', error.message);
    }

    // 检查关键表的最近记录
    const { data: recentMembership } = await supabase
      .from('membership')
      .select('wallet_address, nft_level, claimed_at')
      .order('claimed_at', { ascending: false })
      .limit(5);

    const { data: recentLayerRewards } = await supabase
      .from('layer_rewards')
      .select('recipient_wallet, amount_usdt, reward_type, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: recentBCCBalances } = await supabase
      .from('user_balances')
      .select('wallet_address, bcc_balance, pending_bcc_rewards, updated_at')
      .order('updated_at', { ascending: false })
      .limit(5);

    return {
      success: true,
      action: 'check_triggers',
      data: {
        triggers: triggers || 'Could not retrieve trigger info',
        recentMembership: recentMembership?.length || 0,
        recentLayerRewards: recentLayerRewards?.length || 0,
        recentBCCUpdates: recentBCCBalances?.length || 0,
        recentMembershipRecords: recentMembership,
        recentLayerRewardsRecords: recentLayerRewards,
        recentBCCRecords: recentBCCBalances
      },
      message: 'Trigger and recent data check completed'
    };

  } catch (error) {
    return {
      success: false,
      action: 'check_triggers',
      error: error.message
    };
  }
}

// 手动触发缺失的奖励
async function triggerMissingRewards(supabase: any) {
  console.log('💰 Triggering missing rewards...');
  
  try {
    // 查找最近没有对应layer_rewards的membership记录
    const { data: recentMemberships } = await supabase
      .from('membership')
      .select('wallet_address, nft_level, claimed_at, id')
      .order('claimed_at', { ascending: false })
      .limit(10);

    let triggered = 0;
    for (const membership of recentMemberships || []) {
      // 检查是否有对应的layer_rewards记录
      const { data: existingReward } = await supabase
        .from('layer_rewards')
        .select('id')
        .eq('payer_wallet', membership.wallet_address)
        .eq('level', membership.nft_level)
        .maybeSingle();

      if (!existingReward) {
        // 手动触发layer reward创建
        const { data: result, error } = await supabase.rpc('trigger_layer_rewards_on_upgrade', {
          p_upgrading_member_wallet: membership.wallet_address,
          p_new_level: membership.nft_level,
          p_nft_price: membership.nft_level === 1 ? 100 : membership.nft_level * 50
        });

        if (!error) {
          triggered++;
          console.log(`✅ Triggered reward for ${membership.wallet_address} Level ${membership.nft_level}`);
        } else {
          console.warn(`⚠️ Failed to trigger reward for ${membership.wallet_address}:`, error.message);
        }
      }
    }

    return {
      success: true,
      action: 'trigger_missing_rewards',
      rewardsTriggered: triggered,
      message: `Triggered ${triggered} missing rewards`
    };

  } catch (error) {
    return {
      success: false,
      action: 'trigger_missing_rewards',
      error: error.message
    };
  }
}

// 检查BCC余额状态
async function checkBCCBalances(supabase: any) {
  console.log('💎 Checking BCC balance status...');
  
  try {
    const { data: balanceStats, error } = await supabase.rpc('get_balance_stats');
    
    if (error) {
      console.warn('Could not get balance stats:', error.message);
    }

    // 查找有membership但没有BCC余额记录的用户
    const { data: membersWithoutBalance } = await supabase
      .from('membership')
      .select(`
        wallet_address,
        nft_level,
        claimed_at,
        user_balances!inner(wallet_address)
      `)
      .is('user_balances.wallet_address', null)
      .limit(10);

    // 创建缺失的用户余额记录
    let balancesCreated = 0;
    for (const member of membersWithoutBalance || []) {
      const { error: insertError } = await supabase
        .from('user_balances')
        .insert({
          wallet_address: member.wallet_address,
          bcc_balance: 0,
          bcc_locked: 10450, // 初始锁定金额
          pending_bcc_rewards: 0,
          created_at: new Date().toISOString()
        });

      if (!insertError) {
        balancesCreated++;
        console.log(`✅ Created balance record for ${member.wallet_address}`);
      }
    }

    return {
      success: true,
      action: 'check_bcc_balances',
      balanceStats: balanceStats || 'Could not retrieve stats',
      membersWithoutBalance: membersWithoutBalance?.length || 0,
      balancesCreated,
      message: `Created ${balancesCreated} missing balance records`
    };

  } catch (error) {
    return {
      success: false,
      action: 'check_bcc_balances',
      error: error.message
    };
  }
}