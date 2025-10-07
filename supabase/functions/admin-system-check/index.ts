import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
}

interface SystemCheckResult {
  success: boolean;
  data?: {
    issues: number;
    details: string;
    recommendations?: string[];
    breakdown?: any;
  };
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { checkType } = await req.json()

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let result: SystemCheckResult;

    switch (checkType) {
      case 'users_sync':
        result = await checkUsersSync(supabaseClient);
        break;
      case 'membership_sync':
        result = await checkMembershipSync(supabaseClient);
        break;
      case 'referrals_sync':
        result = await checkReferralsSync(supabaseClient);
        break;
      case 'matrix_gaps':
        result = await checkMatrixGaps(supabaseClient);
        break;
      case 'reward_system_check':
        result = await checkRewardSystem(supabaseClient);
        break;
      case 'reward_timer_check':
        result = await checkRewardTimers(supabaseClient);
        break;
      case 'level_validation_check':
        result = await checkLevelValidation(supabaseClient);
        break;
      case 'member_balance_check':
        result = await checkMemberBalance(supabaseClient);
        break;
      case 'rollup_integrity_check':
        result = await checkRollupIntegrity(supabaseClient);
        break;
      case 'matrix_position_conflicts':
        result = await checkMatrixPositionConflicts(supabaseClient);
        break;
      case 'views_refresh':
        result = await checkViewsStatus(supabaseClient);
        break;
      case 'data_consistency':
        result = await checkDataConsistency(supabaseClient);
        break;
      default:
        result = {
          success: false,
          error: `Unknown check type: ${checkType}`
        };
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 400
      }
    )

  } catch (error) {
    console.error('System check error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error occurred' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

async function checkUsersSync(supabase: any): Promise<SystemCheckResult> {
  try {
    // Check for users without corresponding members records
    const { data: orphanUsers, error: orphanError } = await supabase
      .from('users')
      .select('wallet_address, username')
      .not('wallet_address', 'in', 
        supabase.from('members').select('wallet_address')
      );

    if (orphanError) throw orphanError;

    // Check for members without corresponding users records
    const { data: orphanMembers, error: orphanMembersError } = await supabase
      .from('members')
      .select('wallet_address, current_level')
      .not('wallet_address', 'in',
        supabase.from('users').select('wallet_address')
      );

    if (orphanMembersError) throw orphanMembersError;

    const totalIssues = (orphanUsers?.length || 0) + (orphanMembers?.length || 0);

    return {
      success: true,
      data: {
        issues: totalIssues,
        details: `Found ${orphanUsers?.length || 0} users without member records and ${orphanMembers?.length || 0} members without user records`,
        breakdown: {
          orphan_users: orphanUsers?.length || 0,
          orphan_members: orphanMembers?.length || 0,
          users_without_members: orphanUsers?.map(u => ({ wallet: u.wallet_address, username: u.username })) || [],
          members_without_users: orphanMembers?.map(m => ({ wallet: m.wallet_address, level: m.current_level })) || []
        },
        recommendations: totalIssues > 0 ? [
          'Create missing member records for orphaned users',
          'Create missing user records for orphaned members', 
          'Verify wallet address consistency',
          'Check for case sensitivity issues in addresses'
        ] : []
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Users sync check failed: ${error.message}`
    };
  }
}

async function checkMembershipSync(supabase: any): Promise<SystemCheckResult> {
  try {
    // Check for inconsistencies between users.membership_level and members.current_level
    const { data: inconsistentLevels, error } = await supabase
      .from('users')
      .select(`
        wallet_address,
        username,
        membership_level,
        members!inner(current_level)
      `)
      .neq('membership_level', 'members.current_level');

    if (error) throw error;

    const issues = Array.isArray(inconsistentLevels) ? inconsistentLevels.length : 0;

    return {
      success: true,
      data: {
        issues,
        details: `Found ${issues} users with inconsistent membership levels between users and members tables`,
        breakdown: {
          inconsistent_levels: inconsistentLevels || [],
          affected_wallets: inconsistentLevels?.map(u => u.wallet_address) || []
        },
        recommendations: issues > 0 ? [
          'Sync membership levels between tables',
          'Update activation timestamps',
          'Verify NFT ownership matches membership level',
          'Check for recent level upgrades not reflected'
        ] : []
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Membership sync check failed: ${error.message}`
    };
  }
}

async function checkReferralsSync(supabase: any): Promise<SystemCheckResult> {
  try {
    // Check for invalid referral relationships in referrals table
    const { data: invalidReferrals, error } = await supabase
      .from('referrals')
      .select('referrer_wallet, member_wallet, matrix_layer, matrix_position')
      .or('referrer_wallet.is.null,member_wallet.is.null,matrix_position.is.null');

    if (error) throw error;

    // Check for self-referrals
    const { data: selfReferrals, error: selfError } = await supabase
      .from('referrals')
      .select('referrer_wallet, member_wallet')
      .filter('referrer_wallet', 'eq', 'member_wallet');

    if (selfError) throw selfError;

    // Check for duplicate referral records
    const { data: duplicates, error: dupError } = await supabase
      .rpc('find_duplicate_referrals');

    if (dupError && !dupError.message.includes('function does not exist')) throw dupError;

    const totalIssues = (invalidReferrals?.length || 0) + (selfReferrals?.length || 0) + (duplicates?.length || 0);

    return {
      success: true,
      data: {
        issues: totalIssues,
        details: `Found ${invalidReferrals?.length || 0} invalid referrals, ${selfReferrals?.length || 0} self-referrals, and ${duplicates?.length || 0} duplicates`,
        breakdown: {
          invalid_referrals: invalidReferrals?.length || 0,
          self_referrals: selfReferrals?.length || 0,
          duplicate_referrals: duplicates?.length || 0,
          invalid_details: invalidReferrals || [],
          self_referral_details: selfReferrals || []
        },
        recommendations: totalIssues > 0 ? [
          'Remove invalid referral records',
          'Fix self-referral entries',
          'Remove duplicate referral records',
          'Validate all referrer wallet addresses exist',
          'Check matrix position integrity'
        ] : []
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Referrals sync check failed: ${error.message}`
    };
  }
}

async function checkMatrixGaps(supabase: any): Promise<SystemCheckResult> {
  try {
    // Check for matrix position conflicts (multiple members in same position)
    const { data: positionConflicts, error } = await supabase
      .rpc('find_matrix_position_conflicts');

    if (error && !error.message.includes('function does not exist')) throw error;

    const conflicts = positionConflicts?.length || 0;

    return {
      success: true,
      data: {
        issues: conflicts,
        details: `Found ${conflicts} matrix position conflicts that need resolution`,
        breakdown: {
          position_conflicts: positionConflicts || [],
          affected_roots: positionConflicts?.map(c => c.matrix_root_wallet) || []
        },
        recommendations: conflicts > 0 ? [
          'Resolve position conflicts using priority rules (direct > spillover, earlier timestamp)',
          'Update matrix tree structure integrity',
          'Recalculate matrix placements',
          'Verify spillover placement logic'
        ] : []
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Matrix gaps check failed: ${error.message}`
    };
  }
}

async function checkRewardSystem(supabase: any): Promise<SystemCheckResult> {
  try {
    // Check direct referral rewards integrity
    const { data: directRewardStats, error: directError } = await supabase
      .from('direct_referral_rewards')
      .select('status')
      .then(({ data, error }) => ({
        data: data ? {
          total: data.length,
          claimable: data.filter(r => r.status === 'claimable').length,
          expired: data.filter(r => r.status === 'expired').length,
          claimed: data.filter(r => r.status === 'claimed').length
        } : null,
        error
      }));

    if (directError) throw directError;

    // Check layer rewards integrity
    const { data: layerRewardStats, error: layerError } = await supabase
      .from('layer_rewards')
      .select('status, matrix_layer')
      .gte('matrix_layer', 2)
      .then(({ data, error }) => ({
        data: data ? {
          total: data.length,
          claimable: data.filter(r => r.status === 'claimable').length,
          rolled_up: data.filter(r => r.status === 'rolled_up').length,
          pending: data.filter(r => r.status === 'pending').length,
          by_layer: data.reduce((acc, r) => {
            acc[r.matrix_layer] = (acc[r.matrix_layer] || 0) + 1;
            return acc;
          }, {} as Record<number, number>)
        } : null,
        error
      }));

    if (layerError) throw layerError;

    // Check for rewards without corresponding referrals
    const { data: orphanRewards, error: orphanError } = await supabase
      .rpc('find_orphan_rewards');

    if (orphanError && !orphanError.message.includes('function does not exist')) throw orphanError;

    const orphanCount = orphanRewards?.length || 0;
    const totalIssues = orphanCount;

    return {
      success: true,
      data: {
        issues: totalIssues,
        details: `Reward system analysis: ${directRewardStats?.data?.total || 0} direct rewards, ${layerRewardStats?.data?.total || 0} layer rewards, ${orphanCount} orphan rewards`,
        breakdown: {
          direct_rewards: directRewardStats?.data || {},
          layer_rewards: layerRewardStats?.data || {},
          orphan_rewards: orphanCount,
          orphan_details: orphanRewards || []
        },
        recommendations: totalIssues > 0 ? [
          'Remove orphan reward records',
          'Verify reward-referral relationships',
          'Check reward calculation logic',
          'Validate reward status transitions'
        ] : [
          'Reward system integrity is good',
          'Monitor reward distribution regularly'
        ]
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Reward system check failed: ${error.message}`
    };
  }
}

async function checkRewardTimers(supabase: any): Promise<SystemCheckResult> {
  try {
    // Check for ActiveMember reward timers
    const { data: activeTimers, error: timerError } = await supabase
      .from('reward_timers')
      .select('*')
      .eq('is_active', true);

    if (timerError && !timerError.message.includes('relation does not exist')) throw timerError;

    // Check for expired timers that haven't been processed
    const { data: expiredTimers, error: expiredError } = await supabase
      .from('reward_timers')
      .select('*')
      .eq('is_active', true)
      .lt('expires_at', new Date().toISOString());

    if (expiredError && !expiredError.message.includes('relation does not exist')) throw expiredError;

    const expiredCount = expiredTimers?.length || 0;

    return {
      success: true,
      data: {
        issues: expiredCount,
        details: `Found ${activeTimers?.length || 0} active timers, ${expiredCount} expired timers needing processing`,
        breakdown: {
          active_timers: activeTimers?.length || 0,
          expired_timers: expiredCount,
          expired_details: expiredTimers || []
        },
        recommendations: expiredCount > 0 ? [
          'Process expired reward timers',
          'Execute rollup for timed-out rewards',
          'Update timer statuses',
          'Check timer processing function'
        ] : []
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Reward timers check failed: ${error.message}`
    };
  }
}

async function checkLevelValidation(supabase: any): Promise<SystemCheckResult> {
  try {
    // Check for rewards assigned to insufficient level recipients
    const { data: invalidLevelRewards, error } = await supabase
      .rpc('find_invalid_level_rewards');

    if (error && !error.message.includes('function does not exist')) throw error;

    const invalidCount = invalidLevelRewards?.length || 0;

    return {
      success: true,
      data: {
        issues: invalidCount,
        details: `Found ${invalidCount} rewards assigned to recipients with insufficient levels`,
        breakdown: {
          invalid_level_rewards: invalidCount,
          details: invalidLevelRewards || []
        },
        recommendations: invalidCount > 0 ? [
          'Rollup rewards to qualified recipients',
          'Implement level validation on reward assignment',
          'Check upgrade notification system',
          'Verify level requirement calculations'
        ] : []
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Level validation check failed: ${error.message}`
    };
  }
}

async function checkMemberBalance(supabase: any): Promise<SystemCheckResult> {
  try {
    // Check if member_balance exists and has data
    const { data: balanceCount, error: countError } = await supabase
      .from('member_balance')
      .select('wallet_address', { count: 'exact' });

    if (countError && !countError.message.includes('relation does not exist')) throw countError;

    // Check for balance inconsistencies
    const { data: inconsistentBalances, error: inconsistentError } = await supabase
      .rpc('find_balance_inconsistencies');

    if (inconsistentError && !inconsistentError.message.includes('function does not exist')) throw inconsistentError;

    const inconsistentCount = inconsistentBalances?.length || 0;

    return {
      success: true,
      data: {
        issues: inconsistentCount,
        details: `Member balance table has ${balanceCount?.length || 0} records, ${inconsistentCount} inconsistencies found`,
        breakdown: {
          total_balance_records: balanceCount?.length || 0,
          inconsistent_balances: inconsistentCount,
          inconsistent_details: inconsistentBalances || []
        },
        recommendations: inconsistentCount > 0 ? [
          'Recalculate member balances',
          'Sync reward totals with balance records',
          'Update balance timestamps',
          'Check balance calculation logic'
        ] : []
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Member balance check failed: ${error.message}`
    };
  }
}

async function checkRollupIntegrity(supabase: any): Promise<SystemCheckResult> {
  try {
    // Check for rolled up rewards without corresponding new rewards
    const { data: incompleteRollups, error } = await supabase
      .rpc('find_incomplete_rollups');

    if (error && !error.message.includes('function does not exist')) throw error;

    const incompleteCount = incompleteRollups?.length || 0;

    return {
      success: true,
      data: {
        issues: incompleteCount,
        details: `Found ${incompleteCount} incomplete rollup operations`,
        breakdown: {
          incomplete_rollups: incompleteCount,
          details: incompleteRollups || []
        },
        recommendations: incompleteCount > 0 ? [
          'Complete pending rollup operations',
          'Create missing rollup rewards',
          'Verify rollup target calculation',
          'Check rollup recipient eligibility'
        ] : []
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Rollup integrity check failed: ${error.message}`
    };
  }
}

async function checkMatrixPositionConflicts(supabase: any): Promise<SystemCheckResult> {
  try {
    // Check for matrix position conflicts (like the L position conflict we found)
    const { data: conflicts, error } = await supabase
      .from('referrals')
      .select(`
        matrix_root_wallet,
        matrix_layer,
        matrix_position,
        member_wallet,
        is_direct_referral,
        placed_at,
        COUNT(*) OVER (PARTITION BY matrix_root_wallet, matrix_layer, matrix_position)
      `)
      .gt('COUNT', 1);

    if (error) throw error;

    const conflictCount = conflicts?.length || 0;

    return {
      success: true,
      data: {
        issues: conflictCount,
        details: `Found ${conflictCount} matrix position conflicts requiring resolution`,
        breakdown: {
          position_conflicts: conflictCount,
          conflict_details: conflicts || []
        },
        recommendations: conflictCount > 0 ? [
          'Apply deduplication logic to matrix positions',
          'Prioritize direct referrals over spillovers',
          'Use timestamp priority for conflict resolution',
          'Update matrix-view API deduplication'
        ] : []
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Matrix position conflicts check failed: ${error.message}`
    };
  }
}

async function checkViewsStatus(supabase: any): Promise<SystemCheckResult> {
  try {
    // Check if key views exist and have data
    const viewChecks = [
      'matrix_referrals_tree_view',
      'member_all_rewards_view',
      'corrected_matrix_members_view'
    ];

    const viewStatus = await Promise.all(
      viewChecks.map(async (viewName) => {
        try {
          const { data, error } = await supabase
            .from(viewName)
            .select('*', { count: 'exact', head: true });
          
          return {
            view_name: viewName,
            exists: !error,
            record_count: data?.length || 0,
            error: error?.message
          };
        } catch (e) {
          return {
            view_name: viewName,
            exists: false,
            record_count: 0,
            error: e.message
          };
        }
      })
    );

    const missingViews = viewStatus.filter(v => !v.exists);

    return {
      success: true,
      data: {
        issues: missingViews.length,
        details: `Checked ${viewChecks.length} key views, ${missingViews.length} missing or inaccessible`,
        breakdown: {
          view_status: viewStatus,
          missing_views: missingViews.map(v => v.view_name)
        },
        recommendations: missingViews.length > 0 ? [
          'Create missing database views',
          'Check view permissions',
          'Refresh materialized views if applicable',
          'Verify view dependencies'
        ] : []
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Views status check failed: ${error.message}`
    };
  }
}

async function checkDataConsistency(supabase: any): Promise<SystemCheckResult> {
  try {
    // Comprehensive data consistency check
    const checks = await Promise.all([
      // Check referrals vs direct_referral_rewards consistency
      supabase
        .from('referrals')
        .select('referrer_wallet, member_wallet')
        .eq('is_direct_referral', true)
        .eq('matrix_layer', 1)
        .then(({ data: referrals, error }) => ({
          name: 'direct_referrals_count',
          count: referrals?.length || 0,
          error
        })),
      
      supabase
        .from('direct_referral_rewards')
        .select('referrer_wallet, referred_member_wallet')
        .then(({ data: rewards, error }) => ({
          name: 'direct_rewards_count',
          count: rewards?.length || 0,
          error
        })),

      // Check members vs users count
      supabase
        .from('members')
        .select('wallet_address', { count: 'exact', head: true })
        .then(({ count, error }) => ({
          name: 'members_count',
          count: count || 0,
          error
        })),
      
      supabase
        .from('users')
        .select('wallet_address', { count: 'exact', head: true })
        .then(({ count, error }) => ({
          name: 'users_count',
          count: count || 0,
          error
        }))
    ]);

    const errors = checks.filter(c => c.error);
    const stats = checks.reduce((acc, c) => {
      acc[c.name] = c.count;
      return acc;
    }, {} as Record<string, number>);

    const inconsistencies = [];
    
    // Check for inconsistencies
    if (Math.abs(stats.members_count - stats.users_count) > 0) {
      inconsistencies.push(`Members (${stats.members_count}) and Users (${stats.users_count}) counts don't match`);
    }

    return {
      success: true,
      data: {
        issues: inconsistencies.length + errors.length,
        details: `Data consistency check found ${inconsistencies.length} inconsistencies and ${errors.length} errors`,
        breakdown: {
          statistics: stats,
          inconsistencies,
          errors: errors.map(e => e.error?.message).filter(Boolean)
        },
        recommendations: (inconsistencies.length + errors.length) > 0 ? [
          'Investigate data inconsistencies',
          'Run targeted fixes for identified issues',
          'Check data import/sync processes',
          'Verify table relationships'
        ] : []
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Data consistency check failed: ${error.message}`
    };
  }
}