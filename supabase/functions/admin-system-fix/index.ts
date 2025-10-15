import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
}

interface SystemFixResult {
  success: boolean;
  data?: {
    fixed: number;
    details: string;
    summary?: string[];
    breakdown?: any;
  };
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { checkType, options = {} } = await req.json()

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let result: SystemFixResult;

    switch (checkType) {
      case 'users_sync':
        result = await fixUsersSync(supabaseClient);
        break;
      case 'membership_sync':
        result = await fixMembershipSync(supabaseClient);
        break;
      case 'referrals_sync':
        result = await fixReferralsSync(supabaseClient);
        break;
      case 'matrix_gaps':
        result = await fixMatrixGaps(supabaseClient);
        break;
      case 'reward_system_fix':
        result = await fixRewardSystem(supabaseClient, options);
        break;
      case 'reward_timer_fix':
        result = await fixRewardTimers(supabaseClient);
        break;
      case 'level_validation_fix':
        result = await fixLevelValidation(supabaseClient);
        break;
      case 'member_balance_fix':
        result = await fixMemberBalance(supabaseClient);
        break;
      case 'rollup_integrity_fix':
        result = await fixRollupIntegrity(supabaseClient);
        break;
      case 'matrix_position_conflicts_fix':
        result = await fixMatrixPositionConflicts(supabaseClient);
        break;
      case 'views_refresh':
        result = await refreshViews(supabaseClient);
        break;
      case 'data_consistency_fix':
        result = await fixDataConsistency(supabaseClient);
        break;
      case 'fix_member_data':
        result = await fixMemberData(supabaseClient, options);
        break;
      case 'fix_claimed_nft_sync':
        result = await fixClaimedNFTSync(supabaseClient);
        break;
      case 'fix_missing_referrers':
        result = await fixMissingReferrers(supabaseClient);
        break;
      case 'fix_membership_to_members':
        result = await fixMembershipToMembers(supabaseClient);
        break;
      case 'fix_missing_referral_records':
        result = await fixMissingReferralRecords(supabaseClient);
        break;
      case 'fix_missing_matrix_placements':
        result = await fixMissingMatrixPlacements(supabaseClient);
        break;
      case 'fix_missing_direct_rewards':
        result = await fixMissingDirectRewards(supabaseClient);
        break;
      case 'fix_missing_layer_rewards':
        result = await fixMissingLayerRewards(supabaseClient);
        break;
      default:
        result = {
          success: false,
          error: `Unknown fix type: ${checkType}`
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
    console.error('System fix error:', error)
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

async function fixUsersSync(supabase: any): Promise<SystemFixResult> {
  try {
    let totalFixed = 0;
    const summary: string[] = [];

    // Fix orphaned users by creating member records
    const { data: orphanUsers, error: orphanError } = await supabase
      .from('users')
      .select('wallet_address, created_at, username')
      .not('wallet_address', 'in', 
        supabase.from('members').select('wallet_address')
      );

    if (orphanError) throw orphanError;

    if (orphanUsers && orphanUsers.length > 0) {
      const memberRecords = orphanUsers.map(user => ({
        wallet_address: user.wallet_address,
        current_level: 0,
        created_at: user.created_at,
        updated_at: new Date().toISOString()
      }));

      const { error: insertError } = await supabase
        .from('members')
        .insert(memberRecords);

      if (insertError) throw insertError;
      
      totalFixed += orphanUsers.length;
      summary.push(`Created ${orphanUsers.length} missing member records`);
    }

    // Fix orphaned members by creating user records
    const { data: orphanMembers, error: orphanMembersError } = await supabase
      .from('members')
      .select('wallet_address, created_at, current_level')
      .not('wallet_address', 'in',
        supabase.from('users').select('wallet_address')
      );

    if (orphanMembersError) throw orphanMembersError;

    if (orphanMembers && orphanMembers.length > 0) {
      const userRecords = orphanMembers.map((member, index) => ({
        wallet_address: member.wallet_address,
        username: `User${member.wallet_address?.slice(-4) || index}`,
        membership_level: member.current_level || 0,
        registration_status: 'active',
        created_at: member.created_at,
        updated_at: new Date().toISOString()
      }));

      const { error: insertUserError } = await supabase
        .from('users')
        .insert(userRecords);

      if (insertUserError) throw insertUserError;
      
      totalFixed += orphanMembers.length;
      summary.push(`Created ${orphanMembers.length} missing user records`);
    }

    return {
      success: true,
      data: {
        fixed: totalFixed,
        details: `Successfully synchronized ${totalFixed} user/member records`,
        summary,
        breakdown: {
          created_members: orphanUsers?.length || 0,
          created_users: orphanMembers?.length || 0
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Users sync fix failed: ${error.message}`
    };
  }
}

async function fixMembershipSync(supabase: any): Promise<SystemFixResult> {
  try {
    let totalFixed = 0;
    const summary: string[] = [];

    // Find and fix inconsistent membership levels
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

    if (inconsistentLevels && inconsistentLevels.length > 0) {
      // Update users table to match members table (members table is more authoritative)
      for (const user of inconsistentLevels) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            membership_level: user.members.current_level,
            updated_at: new Date().toISOString()
          })
          .eq('wallet_address', user.wallet_address);

        if (updateError) throw updateError;
        totalFixed++;
      }

      summary.push(`Synchronized ${inconsistentLevels.length} membership levels`);
    }

    return {
      success: true,
      data: {
        fixed: totalFixed,
        details: `Successfully synchronized ${totalFixed} membership level inconsistencies`,
        summary,
        breakdown: {
          synchronized_levels: totalFixed,
          affected_wallets: inconsistentLevels?.map(u => u.wallet_address) || []
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Membership sync fix failed: ${error.message}`
    };
  }
}

async function fixReferralsSync(supabase: any): Promise<SystemFixResult> {
  try {
    let totalFixed = 0;
    const summary: string[] = [];

    // Remove invalid referrals (null wallet addresses)
    const { data: deletedInvalid, error: deleteError } = await supabase
      .from('referrals')
      .delete()
      .or('referrer_wallet.is.null,member_wallet.is.null,matrix_position.is.null')
      .select();

    if (deleteError) throw deleteError;

    if (deletedInvalid && deletedInvalid.length > 0) {
      totalFixed += deletedInvalid.length;
      summary.push(`Removed ${deletedInvalid.length} invalid referral records`);
    }

    // Remove self-referrals
    const { data: deletedSelf, error: deleteSelfError } = await supabase
      .from('referrals')
      .delete()
      .filter('referrer_wallet', 'eq', 'member_wallet')
      .select();

    if (deleteSelfError) throw deleteSelfError;

    if (deletedSelf && deletedSelf.length > 0) {
      totalFixed += deletedSelf.length;
      summary.push(`Removed ${deletedSelf.length} self-referral records`);
    }

    return {
      success: true,
      data: {
        fixed: totalFixed,
        details: `Successfully cleaned up ${totalFixed} referral inconsistencies`,
        summary,
        breakdown: {
          removed_invalid: deletedInvalid?.length || 0,
          removed_self_referrals: deletedSelf?.length || 0
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Referrals sync fix failed: ${error.message}`
    };
  }
}

async function fixMatrixGaps(supabase: any): Promise<SystemFixResult> {
  try {
    const { data: fixResult, error } = await supabase
      .rpc('fill_matrix_position_gaps');

    if (error && !error.message.includes('function does not exist')) throw error;

    const fixed = fixResult?.positions_filled || 0;

    return {
      success: true,
      data: {
        fixed,
        details: `Successfully filled ${fixed} matrix position gaps`,
        summary: fixed > 0 ? [
          `Filled ${fixed} empty matrix positions`,
          'Updated matrix tree structure',
          'Recalculated matrix placements'
        ] : ['No matrix position gaps found'],
        breakdown: {
          positions_filled: fixed
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Matrix gaps fix failed: ${error.message}`
    };
  }
}

async function fixRewardSystem(supabase: any, options: any = {}): Promise<SystemFixResult> {
  try {
    let totalFixed = 0;
    const summary: string[] = [];

    // Fix orphan rewards (rewards without corresponding referrals)
    const { data: orphanRewards, error: orphanError } = await supabase
      .rpc('fix_orphan_rewards');

    if (orphanError && !orphanError.message.includes('function does not exist')) throw orphanError;

    const orphanFixed = orphanRewards?.fixed_count || 0;
    if (orphanFixed > 0) {
      totalFixed += orphanFixed;
      summary.push(`Removed ${orphanFixed} orphan reward records`);
    }

    // Recalculate member balances from rewards
    const { data: balanceResult, error: balanceError } = await supabase
      .rpc('sync_member_balance');

    if (balanceError && !balanceError.message.includes('function does not exist')) throw balanceError;

    const balanceFixed = balanceResult?.updated_wallets || 0;
    if (balanceFixed > 0) {
      summary.push(`Updated ${balanceFixed} member balance records`);
    }

    // Process any expired reward timers if specified
    if (options.processTimers) {
      const { data: timerResult, error: timerError } = await supabase
        .rpc('process_expired_reward_timers');

      if (timerError && !timerError.message.includes('function does not exist')) throw timerError;

      const timerFixed = timerResult?.processed_count || 0;
      if (timerFixed > 0) {
        totalFixed += timerFixed;
        summary.push(`Processed ${timerFixed} expired reward timers`);
      }
    }

    return {
      success: true,
      data: {
        fixed: totalFixed,
        details: `Successfully fixed ${totalFixed} reward system issues`,
        summary,
        breakdown: {
          orphan_rewards_removed: orphanFixed,
          balances_updated: balanceFixed,
          timers_processed: options.processTimers ? (timerResult?.processed_count || 0) : 0
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Reward system fix failed: ${error.message}`
    };
  }
}

async function fixRewardTimers(supabase: any): Promise<SystemFixResult> {
  try {
    let totalFixed = 0;
    const summary: string[] = [];

    // Process expired timers
    const { data: expiredTimers, error: expiredError } = await supabase
      .from('reward_timers')
      .select('*')
      .eq('is_active', true)
      .lt('expires_at', new Date().toISOString());

    if (expiredError && !expiredError.message.includes('relation does not exist')) throw expiredError;

    if (expiredTimers && expiredTimers.length > 0) {
      // Mark expired timers as inactive
      const { error: updateError } = await supabase
        .from('reward_timers')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .lt('expires_at', new Date().toISOString())
        .eq('is_active', true);

      if (updateError) throw updateError;

      totalFixed += expiredTimers.length;
      summary.push(`Processed ${expiredTimers.length} expired reward timers`);

      // Execute rollup for expired rewards
      const { data: rollupResult, error: rollupError } = await supabase
        .rpc('process_all_expired_rewards');

      if (rollupError && !rollupError.message.includes('function does not exist')) throw rollupError;

      const rolledUp = rollupResult?.processed_count || 0;
      if (rolledUp > 0) {
        summary.push(`Executed rollup for ${rolledUp} expired rewards`);
      }
    }

    return {
      success: true,
      data: {
        fixed: totalFixed,
        details: `Successfully processed ${totalFixed} expired reward timers`,
        summary,
        breakdown: {
          expired_timers_processed: totalFixed,
          rollups_executed: rollupResult?.processed_count || 0
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Reward timers fix failed: ${error.message}`
    };
  }
}

async function fixLevelValidation(supabase: any): Promise<SystemFixResult> {
  try {
    let totalFixed = 0;
    const summary: string[] = [];

    // Execute level validation and rollup for insufficient levels
    const { data: validationResult, error } = await supabase
      .rpc('validate_and_rollup_rewards');

    if (error && !error.message.includes('function does not exist')) throw error;

    const rolledUp = validationResult?.rollup_count || 0;
    if (rolledUp > 0) {
      totalFixed += rolledUp;
      summary.push(`Rolled up ${rolledUp} rewards due to insufficient levels`);
    }

    // Check for successful level upgrades and activate eligible rewards
    const { data: upgradeResult, error: upgradeError } = await supabase
      .rpc('activate_eligible_rewards_all');

    if (upgradeError && !upgradeError.message.includes('function does not exist')) throw upgradeError;

    const activated = upgradeResult?.activated_count || 0;
    if (activated > 0) {
      totalFixed += activated;
      summary.push(`Activated ${activated} rewards after level upgrades`);
    }

    return {
      success: true,
      data: {
        fixed: totalFixed,
        details: `Successfully processed ${totalFixed} level validation issues`,
        summary,
        breakdown: {
          rewards_rolled_up: rolledUp,
          rewards_activated: activated
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Level validation fix failed: ${error.message}`
    };
  }
}

async function fixMemberBalance(supabase: any): Promise<SystemFixResult> {
  try {
    let totalFixed = 0;
    const summary: string[] = [];

    // Ensure member_balance table exists and is populated
    const { data: memberCount, error: countError } = await supabase
      .from('members')
      .select('wallet_address', { count: 'exact', head: true });

    if (countError) throw countError;

    const { data: balanceCount, error: balanceCountError } = await supabase
      .from('member_balance')
      .select('wallet_address', { count: 'exact', head: true });

    if (balanceCountError && !balanceCountError.message.includes('relation does not exist')) throw balanceCountError;

    const membersTotal = memberCount || 0;
    const balancesTotal = balanceCount || 0;

    // Create missing balance records
    if (membersTotal > balancesTotal) {
      const { data: missingBalances, error: missingError } = await supabase
        .from('members')
        .select(`
          wallet_address,
          current_level,
          created_at,
          users!inner(username)
        `)
        .not('wallet_address', 'in',
          supabase.from('member_balance').select('wallet_address')
        );

      if (missingError) throw missingError;

      if (missingBalances && missingBalances.length > 0) {
        const balanceRecords = missingBalances.map(member => ({
          wallet_address: member.wallet_address,
          username: member.users.username,
          current_level: member.current_level,
          claimable_amount_usdt: 0,
          balance_updated: new Date().toISOString()
        }));

        const { error: insertError } = await supabase
          .from('member_balance')
          .insert(balanceRecords);

        if (insertError) throw insertError;

        totalFixed += missingBalances.length;
        summary.push(`Created ${missingBalances.length} missing balance records`);
      }
    }

    // Recalculate all balances
    const { data: recalcResult, error: recalcError } = await supabase
      .rpc('sync_member_balance');

    if (recalcError && !recalcError.message.includes('function does not exist')) throw recalcError;

    const recalculated = recalcResult?.updated_wallets || 0;
    if (recalculated > 0) {
      summary.push(`Recalculated ${recalculated} member balances`);
    }

    return {
      success: true,
      data: {
        fixed: totalFixed,
        details: `Successfully fixed ${totalFixed} member balance issues`,
        summary,
        breakdown: {
          missing_records_created: totalFixed,
          balances_recalculated: recalculated,
          total_members: membersTotal,
          total_balances: balancesTotal + totalFixed
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Member balance fix failed: ${error.message}`
    };
  }
}

async function fixRollupIntegrity(supabase: any): Promise<SystemFixResult> {
  try {
    let totalFixed = 0;
    const summary: string[] = [];

    // Complete incomplete rollup operations
    const { data: rollupResult, error } = await supabase
      .rpc('complete_incomplete_rollups');

    if (error && !error.message.includes('function does not exist')) throw error;

    const completed = rollupResult?.completed_count || 0;
    if (completed > 0) {
      totalFixed += completed;
      summary.push(`Completed ${completed} incomplete rollup operations`);
    }

    // Verify rollup targets and fix invalid recipients
    const { data: verifyResult, error: verifyError } = await supabase
      .rpc('verify_rollup_targets');

    if (verifyError && !verifyError.message.includes('function does not exist')) throw verifyError;

    const verified = verifyResult?.fixed_count || 0;
    if (verified > 0) {
      totalFixed += verified;
      summary.push(`Fixed ${verified} invalid rollup targets`);
    }

    return {
      success: true,
      data: {
        fixed: totalFixed,
        details: `Successfully fixed ${totalFixed} rollup integrity issues`,
        summary,
        breakdown: {
          completed_rollups: completed,
          fixed_targets: verified
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Rollup integrity fix failed: ${error.message}`
    };
  }
}

async function fixMatrixPositionConflicts(supabase: any): Promise<SystemFixResult> {
  try {
    let totalFixed = 0;
    const summary: string[] = [];

    // Apply deduplication logic to resolve position conflicts
    // Priority: direct referral > spillover, earlier timestamp > later timestamp
    const { data: conflicts, error } = await supabase
      .from('referrals')
      .select(`
        id,
        matrix_root_wallet,
        matrix_layer,
        matrix_position,
        member_wallet,
        is_direct_referral,
        placed_at
      `)
      .order('matrix_root_wallet')
      .order('matrix_layer')
      .order('matrix_position')
      .order('is_direct_referral', { ascending: false }) // Direct referrals first
      .order('placed_at'); // Earlier timestamps first

    if (error) throw error;

    // Group by position and identify duplicates
    const positionGroups = new Map();
    
    conflicts?.forEach(referral => {
      const key = `${referral.matrix_root_wallet}_${referral.matrix_layer}_${referral.matrix_position}`;
      if (!positionGroups.has(key)) {
        positionGroups.set(key, []);
      }
      positionGroups.get(key).push(referral);
    });

    // Remove duplicates (keep first one which has highest priority)
    for (const [key, referrals] of positionGroups.entries()) {
      if (referrals.length > 1) {
        const toRemove = referrals.slice(1); // Remove all except the first (highest priority)
        
        for (const referral of toRemove) {
          const { error: deleteError } = await supabase
            .from('referrals')
            .delete()
            .eq('id', referral.id);

          if (deleteError) throw deleteError;
          totalFixed++;
        }
      }
    }

    if (totalFixed > 0) {
      summary.push(`Resolved ${totalFixed} matrix position conflicts`);
      summary.push('Applied priority rules: direct > spillover, earlier > later');
    }

    return {
      success: true,
      data: {
        fixed: totalFixed,
        details: `Successfully resolved ${totalFixed} matrix position conflicts`,
        summary,
        breakdown: {
          conflicts_resolved: totalFixed,
          position_groups_checked: positionGroups.size
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Matrix position conflicts fix failed: ${error.message}`
    };
  }
}

async function refreshViews(supabase: any): Promise<SystemFixResult> {
  try {
    let totalFixed = 0;
    const summary: string[] = [];

    // List of views to refresh/recreate if needed
    const criticalViews = [
      'matrix_referrals_tree_view',
      'member_all_rewards_view', 
      'corrected_matrix_members_view'
    ];

    for (const viewName of criticalViews) {
      try {
        // Try to refresh if it's a materialized view
        const { error: refreshError } = await supabase
          .rpc(`refresh_${viewName}`);

        if (!refreshError) {
          totalFixed++;
          summary.push(`Refreshed ${viewName}`);
        }
      } catch (e) {
        // If refresh function doesn't exist, that's okay
        console.log(`No refresh function for ${viewName}`);
      }
    }

    // Update view statistics
    const { data: statsResult, error: statsError } = await supabase
      .rpc('update_view_statistics');

    if (statsError && !statsError.message.includes('function does not exist')) throw statsError;

    if (statsResult?.updated_count > 0) {
      summary.push(`Updated statistics for ${statsResult.updated_count} views`);
    }

    return {
      success: true,
      data: {
        fixed: totalFixed,
        details: `Successfully refreshed ${totalFixed} views`,
        summary,
        breakdown: {
          views_refreshed: totalFixed,
          stats_updated: statsResult?.updated_count || 0
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Views refresh failed: ${error.message}`
    };
  }
}

async function fixDataConsistency(supabase: any): Promise<SystemFixResult> {
  try {
    let totalFixed = 0;
    const summary: string[] = [];

    // Fix users/members count discrepancy
    const { data: userCount, error: userError } = await supabase
      .from('users')
      .select('wallet_address', { count: 'exact', head: true });

    const { data: memberCount, error: memberError } = await supabase
      .from('members')
      .select('wallet_address', { count: 'exact', head: true });

    if (userError) throw userError;
    if (memberError) throw memberError;

    const userTotal = userCount || 0;
    const memberTotal = memberCount || 0;

    if (Math.abs(userTotal - memberTotal) > 0) {
      // Run users sync to fix the discrepancy
      const syncResult = await fixUsersSync(supabase);
      if (syncResult.success && syncResult.data) {
        totalFixed += syncResult.data.fixed;
        summary.push(`Fixed user/member count discrepancy: ${syncResult.data.details}`);
      }
    }

    // Fix referrals vs rewards consistency
    const { data: directReferralCount, error: refError } = await supabase
      .from('referrals')
      .select('referrer_wallet', { count: 'exact', head: true })
      .eq('is_direct_referral', true)
      .eq('matrix_layer', 1);

    const { data: directRewardCount, error: rewardError } = await supabase
      .from('direct_referral_rewards')
      .select('referrer_wallet', { count: 'exact', head: true });

    if (refError) throw refError;
    if (rewardError && !rewardError.message.includes('relation does not exist')) throw rewardError;

    const referralTotal = directReferralCount || 0;
    const rewardTotal = directRewardCount || 0;

    if (Math.abs(referralTotal - rewardTotal) > 0) {
      // Create missing reward records for referrals
      const { data: missingRewards, error: missingError } = await supabase
        .rpc('create_missing_direct_rewards');

      if (missingError && !missingError.message.includes('function does not exist')) throw missingError;

      const created = missingRewards?.created_count || 0;
      if (created > 0) {
        totalFixed += created;
        summary.push(`Created ${created} missing direct referral rewards`);
      }
    }

    return {
      success: true,
      data: {
        fixed: totalFixed,
        details: `Successfully fixed ${totalFixed} data consistency issues`,
        summary,
        breakdown: {
          user_member_discrepancy_fixed: userTotal !== memberTotal,
          referral_reward_discrepancy_fixed: referralTotal !== rewardTotal,
          missing_rewards_created: missingRewards?.created_count || 0
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Data consistency fix failed: ${error.message}`
    };
  }
}

// Fix users who claimed NFT but missing membership/members records
async function fixClaimedNFTSync(supabase: any): Promise<SystemFixResult> {
  try {
    let totalFixed = 0;
    const summary: string[] = [];

    console.log('🔍 Checking for users with claimed NFTs but missing records...');

    // Get all users
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('wallet_address, username, created_at');

    if (usersError) throw usersError;

    for (const user of allUsers || []) {
      // Check if user has claimed NFT (check membership table)
      const { data: nftRecords, error: nftError } = await supabase
        .from('membership')
        .select('id, wallet_address, nft_level, claimed_at, is_member')
        .eq('wallet_address', user.wallet_address)
        .order('claimed_at', { ascending: false });

      if (nftError) {
        console.error(`Error checking NFT for ${user.wallet_address}:`, nftError);
        continue;
      }

      // If user has claimed NFT
      if (nftRecords && nftRecords.length > 0) {
        const latestNFT = nftRecords[0];
        const highestLevel = Math.max(...nftRecords.map(r => r.nft_level));

        // Check if member record exists
        const { data: memberRecord, error: memberError } = await supabase
          .from('members')
          .select('wallet_address, current_level, activation_sequence, activation_time')
          .eq('wallet_address', user.wallet_address)
          .maybeSingle();

        if (memberError && memberError.code !== 'PGRST116') {
          console.error(`Error checking member for ${user.wallet_address}:`, memberError);
          continue;
        }

        // If no member record, create it
        if (!memberRecord) {
          console.log(`📝 Creating member record for ${user.wallet_address} with level ${highestLevel}`);

          // Get next activation sequence
          const { data: maxSeq } = await supabase
            .from('members')
            .select('activation_sequence')
            .order('activation_sequence', { ascending: false })
            .limit(1)
            .maybeSingle();

          const nextSequence = (maxSeq?.activation_sequence || 0) + 1;

          const { error: insertMemberError } = await supabase
            .from('members')
            .insert({
              wallet_address: user.wallet_address,
              referrer_wallet: user.referrer_wallet || null,
              current_level: highestLevel,
              activation_sequence: nextSequence,
              activation_time: latestNFT.claimed_at || new Date().toISOString(),
              total_nft_claimed: nftRecords.length
            });

          if (insertMemberError) {
            console.error(`Failed to create member for ${user.wallet_address}:`, insertMemberError);
            summary.push(`❌ Failed to create member record for ${user.wallet_address}: ${insertMemberError.message}`);
          } else {
            totalFixed++;
            summary.push(`✅ Created member record for ${user.wallet_address} (Level ${highestLevel})`);
          }
        } else {
          // Member exists, check if level needs updating
          if (memberRecord.current_level < highestLevel) {
            const { error: updateError } = await supabase
              .from('members')
              .update({
                current_level: highestLevel,
                total_nft_claimed: nftRecords.length
              })
              .eq('wallet_address', user.wallet_address);

            if (updateError) {
              summary.push(`❌ Failed to update level for ${user.wallet_address}: ${updateError.message}`);
            } else {
              totalFixed++;
              summary.push(`✅ Updated ${user.wallet_address} level from ${memberRecord.current_level} to ${highestLevel}`);
            }
          }
        }
      }
    }

    return {
      success: true,
      data: {
        fixed: totalFixed,
        details: `Synchronized ${totalFixed} users with claimed NFTs`,
        summary,
        breakdown: {
          total_users_checked: allUsers?.length || 0,
          records_created_or_updated: totalFixed
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Claimed NFT sync fix failed: ${error.message}`
    };
  }
}

// Fix members without referrers (orphan members)
async function fixMissingReferrers(supabase: any): Promise<SystemFixResult> {
  try {
    let totalFixed = 0;
    const summary: string[] = [];

    console.log('🔍 Checking for members without referrers...');

    // Get all members without referrer_wallet (excluding the very first member)
    const { data: membersWithoutReferrer, error: membersError } = await supabase
      .from('members')
      .select('wallet_address, activation_sequence, activation_time, current_level')
      .is('referrer_wallet', null)
      .order('activation_sequence', { ascending: true });

    if (membersError) throw membersError;

    if (!membersWithoutReferrer || membersWithoutReferrer.length === 0) {
      return {
        success: true,
        data: {
          fixed: 0,
          details: 'No members without referrers found',
          summary: ['All members have valid referrers'],
          breakdown: {}
        }
      };
    }

    console.log(`Found ${membersWithoutReferrer.length} members without referrers`);

    for (const member of membersWithoutReferrer) {
      // Skip the very first member (activation_sequence = 1)
      if (member.activation_sequence === 1) {
        summary.push(`⏭️  Skipped ${member.wallet_address} (Genesis member, sequence #1)`);
        continue;
      }

      // Check if user has referrer_wallet in users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('wallet_address, referrer_wallet')
        .eq('wallet_address', member.wallet_address)
        .maybeSingle();

      if (userError) {
        console.error(`Error checking user ${member.wallet_address}:`, userError);
        continue;
      }

      let referrerWallet = userData?.referrer_wallet;

      // If no referrer in users table, try to find from referrals table
      if (!referrerWallet) {
        const { data: referralRecord, error: referralError } = await supabase
          .from('referrals')
          .select('referrer_wallet, referred_wallet')
          .eq('referred_wallet', member.wallet_address)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (referralError && referralError.code !== 'PGRST116') {
          console.error(`Error checking referral for ${member.wallet_address}:`, referralError);
        }

        referrerWallet = referralRecord?.referrer_wallet;
      }

      // If still no referrer found, assign to genesis member (first member)
      if (!referrerWallet) {
        const { data: genesisMember, error: genesisError } = await supabase
          .from('members')
          .select('wallet_address')
          .order('activation_sequence', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!genesisError && genesisMember) {
          referrerWallet = genesisMember.wallet_address;
          summary.push(`ℹ️  ${member.wallet_address} has no referrer, assigning to genesis member ${referrerWallet}`);
        } else {
          summary.push(`⚠️  Cannot find genesis member for ${member.wallet_address}`);
          continue;
        }
      }

      // Verify referrer exists in members table
      const { data: referrerMember, error: referrerError } = await supabase
        .from('members')
        .select('wallet_address')
        .eq('wallet_address', referrerWallet)
        .maybeSingle();

      if (referrerError || !referrerMember) {
        summary.push(`❌ Referrer ${referrerWallet} does not exist in members table for ${member.wallet_address}`);
        continue;
      }

      // Update member with referrer
      const { error: updateError } = await supabase
        .from('members')
        .update({ referrer_wallet: referrerWallet })
        .eq('wallet_address', member.wallet_address);

      if (updateError) {
        summary.push(`❌ Failed to update referrer for ${member.wallet_address}: ${updateError.message}`);
      } else {
        totalFixed++;
        summary.push(`✅ Set referrer for ${member.wallet_address} → ${referrerWallet}`);

        // Also update users table if needed
        if (userData && !userData.referrer_wallet) {
          await supabase
            .from('users')
            .update({ referrer_wallet: referrerWallet })
            .eq('wallet_address', member.wallet_address);
        }

        // Check if referral record exists, if not create it
        const { data: existingReferral } = await supabase
          .from('referrals')
          .select('id')
          .eq('referred_wallet', member.wallet_address)
          .eq('referrer_wallet', referrerWallet)
          .maybeSingle();

        if (!existingReferral) {
          // Get referrer's activation sequence
          const { data: referrerData } = await supabase
            .from('members')
            .select('activation_sequence')
            .eq('wallet_address', referrerWallet)
            .maybeSingle();

          const { error: referralError } = await supabase
            .from('referrals')
            .insert({
              referred_wallet: member.wallet_address,
              referrer_wallet: referrerWallet,
              referred_activation_sequence: member.activation_sequence,
              referred_activation_time: member.activation_time,
              referrer_activation_sequence: referrerData?.activation_sequence || 1,
              referral_depth: 1,
              created_at: member.activation_time
            });

          if (!referralError) {
            summary.push(`  ✅ Created referral record: ${referrerWallet} → ${member.wallet_address}`);
          }
        }
      }
    }

    return {
      success: true,
      data: {
        fixed: totalFixed,
        details: `Fixed ${totalFixed} members without referrers`,
        summary,
        breakdown: {
          total_orphan_members: membersWithoutReferrer.length,
          fixed_members: totalFixed
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Missing referrers fix failed: ${error.message}`
    };
  }
}

// Fix: membership有记录但members没有记录
async function fixMembershipToMembers(supabase: any): Promise<SystemFixResult> {
  try {
    let totalFixed = 0;
    const summary: string[] = [];

    console.log('🔍 Checking for membership records without corresponding members...');

    // Get all distinct wallet addresses from membership table
    const { data: membershipWallets, error: membershipError } = await supabase
      .from('membership')
      .select('wallet_address, nft_level, claimed_at')
      .order('wallet_address')
      .order('claimed_at', { ascending: false });

    if (membershipError) throw membershipError;

    // Group by wallet_address and get highest level for each
    const walletMap = new Map();
    for (const record of membershipWallets || []) {
      if (!walletMap.has(record.wallet_address)) {
        walletMap.set(record.wallet_address, {
          wallet_address: record.wallet_address,
          highest_level: record.nft_level,
          latest_claimed: record.claimed_at,
          total_nfts: 1
        });
      } else {
        const existing = walletMap.get(record.wallet_address);
        existing.highest_level = Math.max(existing.highest_level, record.nft_level);
        existing.total_nfts += 1;
      }
    }

    console.log(`Found ${walletMap.size} unique wallets in membership table`);

    for (const [wallet, info] of walletMap.entries()) {
      // Check if member record exists
      const { data: memberRecord, error: memberError } = await supabase
        .from('members')
        .select('wallet_address')
        .eq('wallet_address', wallet)
        .maybeSingle();

      if (memberError && memberError.code !== 'PGRST116') {
        console.error(`Error checking member ${wallet}:`, memberError);
        continue;
      }

      if (!memberRecord) {
        // Member doesn't exist, need to create
        console.log(`📝 Creating member record for ${wallet} with level ${info.highest_level}`);

        // Get user's referrer from users table
        const { data: userData } = await supabase
          .from('users')
          .select('referrer_wallet')
          .eq('wallet_address', wallet)
          .maybeSingle();

        // Get next activation sequence
        const { data: maxSeq } = await supabase
          .from('members')
          .select('activation_sequence')
          .order('activation_sequence', { ascending: false })
          .limit(1)
          .maybeSingle();

        const nextSequence = (maxSeq?.activation_sequence || 0) + 1;

        const { error: insertError } = await supabase
          .from('members')
          .insert({
            wallet_address: wallet,
            referrer_wallet: userData?.referrer_wallet || null,
            current_level: info.highest_level,
            activation_sequence: nextSequence,
            activation_time: info.latest_claimed || new Date().toISOString(),
            total_nft_claimed: info.total_nfts
          });

        if (insertError) {
          console.error(`Failed to create member ${wallet}:`, insertError);
          summary.push(`❌ Failed to create member for ${wallet}: ${insertError.message}`);
        } else {
          totalFixed++;
          summary.push(`✅ Created member record for ${wallet} (Level ${info.highest_level}, ${info.total_nfts} NFTs)`);
        }
      }
    }

    return {
      success: true,
      data: {
        fixed: totalFixed,
        details: `Created ${totalFixed} missing member records from membership table`,
        summary,
        breakdown: {
          total_membership_wallets: walletMap.size,
          members_created: totalFixed
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Membership to members sync failed: ${error.message}`
    };
  }
}

// Fix: members和membership都有记录但没有referrals记录
async function fixMissingReferralRecords(supabase: any): Promise<SystemFixResult> {
  try {
    let totalFixed = 0;
    const summary: string[] = [];

    console.log('🔍 Checking for members without referral records...');

    // Get all members who have referrer_wallet but no referrals record
    const { data: allMembers, error: membersError } = await supabase
      .from('members')
      .select('wallet_address, referrer_wallet, activation_sequence, activation_time')
      .not('referrer_wallet', 'is', null)
      .order('activation_sequence', { ascending: true });

    if (membersError) throw membersError;

    console.log(`Checking ${allMembers?.length || 0} members with referrers...`);

    for (const member of allMembers || []) {
      // Check if referral record exists
      const { data: referralRecord, error: referralError } = await supabase
        .from('referrals')
        .select('id')
        .eq('referred_wallet', member.wallet_address)
        .eq('referrer_wallet', member.referrer_wallet)
        .maybeSingle();

      if (referralError && referralError.code !== 'PGRST116') {
        console.error(`Error checking referral for ${member.wallet_address}:`, referralError);
        continue;
      }

      if (!referralRecord) {
        // Referral record missing, need to create it
        console.log(`📝 Creating referral record: ${member.referrer_wallet} → ${member.wallet_address}`);

        // Get referrer's activation sequence
        const { data: referrerData, error: referrerError } = await supabase
          .from('members')
          .select('activation_sequence')
          .eq('wallet_address', member.referrer_wallet)
          .maybeSingle();

        if (referrerError) {
          console.error(`Error getting referrer data for ${member.referrer_wallet}:`, referrerError);
          summary.push(`⚠️  Referrer ${member.referrer_wallet} not found in members for ${member.wallet_address}`);
          continue;
        }

        const { error: insertError } = await supabase
          .from('referrals')
          .insert({
            referred_wallet: member.wallet_address,
            referrer_wallet: member.referrer_wallet,
            referred_activation_sequence: member.activation_sequence,
            referred_activation_time: member.activation_time,
            referrer_activation_sequence: referrerData?.activation_sequence || 1,
            referral_depth: 1,
            created_at: member.activation_time || new Date().toISOString()
          });

        if (insertError) {
          console.error(`Failed to create referral for ${member.wallet_address}:`, insertError);
          summary.push(`❌ Failed to create referral: ${member.referrer_wallet} → ${member.wallet_address}: ${insertError.message}`);
        } else {
          totalFixed++;
          summary.push(`✅ Created referral: ${member.referrer_wallet} → ${member.wallet_address}`);
        }
      }
    }

    return {
      success: true,
      data: {
        fixed: totalFixed,
        details: `Created ${totalFixed} missing referral records`,
        summary,
        breakdown: {
          total_members_checked: allMembers?.length || 0,
          referrals_created: totalFixed
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Missing referral records fix failed: ${error.message}`
    };
  }
}

// Fix: 没有触发矩阵排列matrix_referrals
async function fixMissingMatrixPlacements(supabase: any): Promise<SystemFixResult> {
  try {
    let totalFixed = 0;
    const summary: string[] = [];

    console.log('🔍 Checking for members without matrix placements...');

    // Get all activated members ordered by activation sequence
    const { data: allMembers, error: membersError } = await supabase
      .from('members')
      .select('wallet_address, referrer_wallet, activation_sequence, activation_time, current_level')
      .order('activation_sequence', { ascending: true });

    if (membersError) throw membersError;

    console.log(`Checking ${allMembers?.length || 0} members for matrix placements...`);

    for (const member of allMembers || []) {
      // Check if member has matrix_referrals records
      const { data: matrixRecords, error: matrixError } = await supabase
        .from('matrix_referrals')
        .select('id, matrix_root_wallet, layer, position')
        .eq('member_wallet', member.wallet_address);

      if (matrixError) {
        console.error(`Error checking matrix for ${member.wallet_address}:`, matrixError);
        continue;
      }

      // If no matrix placement exists, need to trigger placement
      if (!matrixRecords || matrixRecords.length === 0) {
        console.log(`📝 Triggering matrix placement for ${member.wallet_address}...`);

        // Call the matrix placement edge function
        try {
          const { data: placementResult, error: placementError } = await supabase.functions.invoke(
            'process-matrix-placement',
            {
              body: {
                member_wallet: member.wallet_address,
                referrer_wallet: member.referrer_wallet,
                activation_sequence: member.activation_sequence,
                current_level: member.current_level
              }
            }
          );

          if (placementError) {
            console.error(`Failed to place ${member.wallet_address}:`, placementError);
            summary.push(`❌ Failed to place ${member.wallet_address}: ${placementError.message}`);
          } else {
            totalFixed++;
            summary.push(`✅ Placed ${member.wallet_address} in matrix (Root: ${placementResult?.matrix_root || 'N/A'})`);
          }
        } catch (err) {
          // If edge function doesn't exist, try direct insertion
          console.log(`Edge function not available, using direct placement for ${member.wallet_address}`);

          // Find the matrix root (referrer or their upline)
          let matrixRoot = member.referrer_wallet;

          if (matrixRoot) {
            // Simple placement: put under referrer in Layer 1, position L/M/R
            const { data: existingPositions } = await supabase
              .from('matrix_referrals')
              .select('position')
              .eq('matrix_root_wallet', matrixRoot)
              .eq('layer', 1);

            const positions = ['L', 'M', 'R'];
            const usedPositions = existingPositions?.map(p => p.position) || [];
            const availablePosition = positions.find(p => !usedPositions.includes(p));

            if (availablePosition) {
              const { error: insertError } = await supabase
                .from('matrix_referrals')
                .insert({
                  matrix_root_wallet: matrixRoot,
                  member_wallet: member.wallet_address,
                  parent_wallet: matrixRoot,
                  parent_depth: 0,
                  layer: 1,
                  position: availablePosition,
                  referral_type: 'direct',
                  created_at: member.activation_time
                });

              if (insertError) {
                summary.push(`❌ Failed direct placement for ${member.wallet_address}: ${insertError.message}`);
              } else {
                totalFixed++;
                summary.push(`✅ Direct placed ${member.wallet_address} under ${matrixRoot} at 1-${availablePosition}`);
              }
            } else {
              summary.push(`⚠️  No available Layer 1 positions for ${member.wallet_address} under ${matrixRoot}`);
            }
          } else {
            summary.push(`⚠️  No referrer found for ${member.wallet_address}, skipping matrix placement`);
          }
        }
      }
    }

    return {
      success: true,
      data: {
        fixed: totalFixed,
        details: `Placed ${totalFixed} members in matrix`,
        summary,
        breakdown: {
          total_members_checked: allMembers?.length || 0,
          placements_created: totalFixed
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Missing matrix placements fix failed: ${error.message}`
    };
  }
}

// Fix: 没有触发直推奖励100USD
async function fixMissingDirectRewards(supabase: any): Promise<SystemFixResult> {
  try {
    let totalFixed = 0;
    const summary: string[] = [];

    console.log('🔍 Checking for missing direct referral rewards...');

    // Get all referrals (direct referrals should generate 100 USD rewards)
    const { data: allReferrals, error: referralsError } = await supabase
      .from('referrals')
      .select('referrer_wallet, referred_wallet, referred_activation_sequence, referred_activation_time')
      .eq('referral_depth', 1)
      .order('referred_activation_sequence', { ascending: true });

    if (referralsError) throw referralsError;

    console.log(`Checking ${allReferrals?.length || 0} direct referrals for rewards...`);

    for (const referral of allReferrals || []) {
      // Skip if referrer is null
      if (!referral.referrer_wallet) continue;

      // Check if direct reward exists for this referral
      const { data: existingReward, error: rewardError } = await supabase
        .from('direct_rewards')
        .select('id, status')
        .eq('triggering_member_wallet', referral.referred_wallet)
        .eq('reward_recipient_wallet', referral.referrer_wallet)
        .maybeSingle();

      if (rewardError && rewardError.code !== 'PGRST116') {
        console.error(`Error checking reward for ${referral.referred_wallet}:`, rewardError);
        continue;
      }

      // If no reward exists, create it
      if (!existingReward) {
        console.log(`📝 Creating direct reward: ${referral.referrer_wallet} ← ${referral.referred_wallet}`);

        // Get recipient's current level
        const { data: recipientMember } = await supabase
          .from('members')
          .select('current_level')
          .eq('wallet_address', referral.referrer_wallet)
          .maybeSingle();

        const recipientLevel = recipientMember?.current_level || 1;

        const { error: insertError } = await supabase
          .from('direct_rewards')
          .insert({
            triggering_member_wallet: referral.referred_wallet,
            reward_recipient_wallet: referral.referrer_wallet,
            reward_amount: 100.0, // Direct referral reward is always 100 USD
            status: recipientLevel >= 1 ? 'claimed' : 'pending',
            recipient_required_level: 1,
            recipient_current_level: recipientLevel,
            requires_third_upgrade: false,
            is_third_generation: false,
            created_at: referral.referred_activation_time,
            claimed_at: recipientLevel >= 1 ? referral.referred_activation_time : null
          });

        if (insertError) {
          console.error(`Failed to create reward for ${referral.referrer_wallet}:`, insertError);
          summary.push(`❌ Failed: ${referral.referrer_wallet} ← ${referral.referred_wallet}: ${insertError.message}`);
        } else {
          totalFixed++;
          summary.push(`✅ Created direct reward: ${referral.referrer_wallet} ← ${referral.referred_wallet} (100 USD)`);
        }
      }
    }

    return {
      success: true,
      data: {
        fixed: totalFixed,
        details: `Created ${totalFixed} missing direct referral rewards`,
        summary,
        breakdown: {
          total_referrals_checked: allReferrals?.length || 0,
          rewards_created: totalFixed
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Missing direct rewards fix failed: ${error.message}`
    };
  }
}

// Fix: level 2-19会员升级触发对应等级的层级奖励给matrix的root
async function fixMissingLayerRewards(supabase: any): Promise<SystemFixResult> {
  try {
    let totalFixed = 0;
    const summary: string[] = [];

    console.log('🔍 Checking for missing layer rewards from level upgrades...');

    // Get all membership records (each represents an NFT claim/upgrade)
    const { data: allMemberships, error: membershipsError } = await supabase
      .from('membership')
      .select('wallet_address, nft_level, claimed_at, is_upgrade')
      .gte('nft_level', 2) // Only Level 2-19 trigger layer rewards
      .lte('nft_level', 19)
      .order('claimed_at', { ascending: true });

    if (membershipsError) throw membershipsError;

    console.log(`Checking ${allMemberships?.length || 0} level 2-19 upgrades for layer rewards...`);

    // NFT Price table
    const nftPrices: { [key: number]: number } = {
      2: 150,
      3: 200,
      4: 400,
      5: 800,
      6: 1600,
      7: 3200,
      8: 6400,
      9: 12800,
      10: 25600,
      11: 51200,
      12: 102400,
      13: 204800,
      14: 409600,
      15: 819200,
      16: 1638400,
      17: 3276800,
      18: 6553600,
      19: 13107200
    };

    for (const membership of allMemberships || []) {
      const level = membership.nft_level;
      const rewardAmount = nftPrices[level] || 0;

      if (rewardAmount === 0) continue;

      // Find all matrix roots where this member is placed
      const { data: matrixPlacements, error: matrixError } = await supabase
        .from('matrix_referrals')
        .select('matrix_root_wallet, layer, position')
        .eq('member_wallet', membership.wallet_address);

      if (matrixError) {
        console.error(`Error checking matrix for ${membership.wallet_address}:`, matrixError);
        continue;
      }

      // For each matrix root, check if layer reward exists
      for (const placement of matrixPlacements || []) {
        // Check if layer reward exists
        const { data: existingReward, error: rewardError } = await supabase
          .from('layer_rewards')
          .select('id, status')
          .eq('triggering_member_wallet', membership.wallet_address)
          .eq('reward_recipient_wallet', placement.matrix_root_wallet)
          .eq('matrix_root_wallet', placement.matrix_root_wallet)
          .eq('triggering_nft_level', level)
          .eq('matrix_layer', placement.layer)
          .maybeSingle();

        if (rewardError && rewardError.code !== 'PGRST116') {
          console.error(`Error checking layer reward:`, rewardError);
          continue;
        }

        // If no reward exists, create it
        if (!existingReward) {
          console.log(`📝 Creating layer reward: Level ${level} → ${placement.matrix_root_wallet} (Layer ${placement.layer})`);

          // Get recipient's current level
          const { data: recipientMember } = await supabase
            .from('members')
            .select('current_level')
            .eq('wallet_address', placement.matrix_root_wallet)
            .maybeSingle();

          const recipientLevel = recipientMember?.current_level || 1;
          const recipientQualified = recipientLevel >= level;

          const { error: insertError } = await supabase
            .from('layer_rewards')
            .insert({
              triggering_member_wallet: membership.wallet_address,
              reward_recipient_wallet: placement.matrix_root_wallet,
              matrix_root_wallet: placement.matrix_root_wallet,
              triggering_nft_level: level,
              reward_amount: rewardAmount,
              layer_position: placement.position,
              matrix_layer: placement.layer,
              status: recipientQualified ? 'claimable' : 'pending',
              recipient_required_level: level,
              recipient_current_level: recipientLevel,
              requires_direct_referrals: false,
              direct_referrals_required: 0,
              direct_referrals_current: 0,
              expires_at: recipientQualified ? null : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              created_at: membership.claimed_at,
              claimed_at: recipientQualified ? membership.claimed_at : null
            });

          if (insertError) {
            console.error(`Failed to create layer reward:`, insertError);
            summary.push(`❌ Failed: L${level} ${membership.wallet_address} → ${placement.matrix_root_wallet}: ${insertError.message}`);
          } else {
            totalFixed++;
            summary.push(`✅ Created layer reward: L${level} ${membership.wallet_address} → ${placement.matrix_root_wallet} ($${rewardAmount})`);
          }
        }
      }
    }

    return {
      success: true,
      data: {
        fixed: totalFixed,
        details: `Created ${totalFixed} missing layer rewards for level 2-19 upgrades`,
        summary,
        breakdown: {
          total_upgrades_checked: allMemberships?.length || 0,
          layer_rewards_created: totalFixed
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Missing layer rewards fix failed: ${error.message}`
    };
  }
}

async function fixMemberData(supabase: any, options: any): Promise<SystemFixResult> {
  try {
    const { wallet_address } = options;
    
    if (!wallet_address) {
      return {
        success: false,
        error: 'wallet_address is required in options'
      };
    }

    const fixes = {
      actions_taken: [] as string[],
      errors: [] as string[],
      data_created: [] as any[]
    };

    console.log(`🔧 Fixing all data for wallet: ${wallet_address}`);

    // 1. Check and fix user record
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .ilike('wallet_address', wallet_address)
      .single();

    if (!existingUser) {
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          wallet_address: wallet_address,
          username: `User${wallet_address.slice(-6)}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (userError) {
        fixes.errors.push(`Failed to create user: ${userError.message}`);
      } else {
        fixes.actions_taken.push('Created missing user record');
        fixes.data_created.push({ type: 'user', data: newUser });
      }
    } else {
      fixes.actions_taken.push('User record exists');
    }

    // 2. Check and fix member record
    const { data: existingMember } = await supabase
      .from('members')
      .select('*')
      .ilike('wallet_address', wallet_address)
      .single();

    if (!existingMember) {
      const { data: newMember, error: memberError } = await supabase
        .from('members')
        .insert({
          wallet_address: wallet_address,
          current_level: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (memberError) {
        fixes.errors.push(`Failed to create member: ${memberError.message}`);
      } else {
        fixes.actions_taken.push('Created member record with Level 1');
        fixes.data_created.push({ type: 'member', data: newMember });
      }
    } else {
      // Ensure member has proper level
      if ((existingMember.current_level || 0) < 1) {
        const { error: updateError } = await supabase
          .from('members')
          .update({
            current_level: Math.max(existingMember.current_level || 1, 1),
            updated_at: new Date().toISOString()
          })
          .ilike('wallet_address', wallet_address);

        if (updateError) {
          fixes.errors.push(`Failed to update member: ${updateError.message}`);
        } else {
          fixes.actions_taken.push('Updated member level');
        }
      } else {
        fixes.actions_taken.push('Member record has proper level');
      }
    }

    // 3. Check and fix matrix structure
    const { data: existingMatrix } = await supabase
      .from('referrals')
      .select('*')
      .eq('matrix_root_wallet', wallet_address)
      .limit(1);

    if (!existingMatrix || existingMatrix.length === 0) {
      // Create full Layer 1 (L, M, R) + some Layer 2 spillovers to demonstrate overflow
      const testReferrals = [
        {
          member_wallet: wallet_address,
          matrix_layer: 1,
          matrix_position: 'L',
          is_direct_referral: true,
          sequence: 1
        },
        {
          member_wallet: `${wallet_address.slice(0, -1)}2`,
          matrix_layer: 1,
          matrix_position: 'M',
          is_direct_referral: true,
          sequence: 2
        },
        {
          member_wallet: `${wallet_address.slice(0, -1)}3`,
          matrix_layer: 1,
          matrix_position: 'R',
          is_direct_referral: true,
          sequence: 3
        },
        // Layer 1 is full, next referrals should go to Layer 2 (spillover)
        {
          member_wallet: `${wallet_address.slice(0, -1)}4`,
          matrix_layer: 2,
          matrix_position: 'L',
          is_direct_referral: false,
          sequence: 4
        },
        {
          member_wallet: `${wallet_address.slice(0, -1)}5`,
          matrix_layer: 2,
          matrix_position: 'M',
          is_direct_referral: false,
          sequence: 5
        }
      ];

      let createdCount = 0;
      for (const referral of testReferrals) {
        // Only create the wallet_address entry since it exists in members table
        if (referral.member_wallet === wallet_address) {
          const { error: referralError } = await supabase
            .from('referrals')
            .insert({
              member_wallet: referral.member_wallet,
              matrix_root_wallet: wallet_address,
              referrer_wallet: wallet_address,
              matrix_layer: referral.matrix_layer,
              matrix_position: referral.matrix_position,
              matrix_root_sequence: referral.sequence,
              member_activation_sequence: 1,
              is_direct_referral: referral.is_direct_referral,
              placed_at: new Date(Date.now() - (referral.sequence * 3600000)).toISOString() // stagger by hours
            });

          if (referralError) {
            fixes.errors.push(`Failed to create matrix entry ${referral.matrix_position}: ${referralError.message}`);
          } else {
            createdCount++;
            fixes.actions_taken.push(`Created matrix entry at ${referral.matrix_layer}-${referral.matrix_position}`);
          }
        }
      }

      if (createdCount === 0) {
        fixes.errors.push('No matrix entries could be created due to foreign key constraints');
      }
    } else {
      fixes.actions_taken.push(`Matrix structure exists (${existingMatrix.length} entries)`);
    }

    // 4. Check and fix balance record
    const { data: existingBalance } = await supabase
      .from('user_balances')
      .select('*')
      .ilike('wallet_address', wallet_address)
      .single();

    if (!existingBalance) {
      const { error: balanceError } = await supabase
        .from('user_balances')
        .insert({
          wallet_address: wallet_address,
          bcc_transferable: 100.0,
          bcc_locked: 50.0,
          bcc_total: 150.0,
          usdc_claimable: 25.0,
          usdc_total_earned: 25.0,
          last_updated: new Date().toISOString()
        });

      if (balanceError) {
        fixes.errors.push(`Failed to create balance: ${balanceError.message}`);
      } else {
        fixes.actions_taken.push('Created initial balance record');
      }
    } else {
      fixes.actions_taken.push('Balance record exists');
    }

    // 5. Create sample reward data for testing (using layer_rewards table)
    const { data: existingRewards } = await supabase
      .from('layer_rewards')
      .select('*')
      .eq('reward_recipient_wallet', wallet_address)
      .limit(1);

    if (!existingRewards || existingRewards.length === 0) {
      // Get member's current level to create appropriate rewards
      const { data: memberData } = await supabase
        .from('members')
        .select('current_level')
        .eq('wallet_address', wallet_address)
        .single();

      const currentLevel = memberData?.current_level || 1;
      
      // Get direct referrals for this member (for generating direct referral rewards)
      const { data: directReferrals } = await supabase
        .from('referrals')
        .select('member_wallet, is_direct_referral, placed_at')
        .eq('referrer_wallet', wallet_address)
        .eq('is_direct_referral', true)
        .order('placed_at', { ascending: false });

      const sampleRewards = [];

      // 1. 直推奖励 (Direct Referral Rewards): 每个直推产生100 USD奖励
      if (directReferrals && directReferrals.length > 0) {
        for (const referral of directReferrals) {
          sampleRewards.push({
            triggering_member_wallet: referral.member_wallet,
            reward_recipient_wallet: wallet_address,
            matrix_root_wallet: wallet_address,
            reward_amount: 100.0, // Level 1 direct referral = 100 USD
            matrix_layer: 1,
            triggering_nft_level: 1,
            recipient_required_level: 1,
            recipient_current_level: currentLevel,
            status: 'claimable',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: referral.placed_at || new Date().toISOString()
          });
        }
        fixes.actions_taken.push(`Generated ${directReferrals.length} direct referral rewards`);
      }

      // 2. Layer奖励 (Layer Rewards): Layer 2-19 升级触发, 金额=该level NFT价格100%
      // NFT价格规律: Level 1=100, Level 2=150, Level 3=200, Level 4=400, 依此类推
      for (let level = 2; level <= Math.min(currentLevel, 19); level++) {
        let nftPrice;
        if (level === 2) {
          nftPrice = 150; // Level 2 = 150 USD
        } else {
          nftPrice = 100 * Math.pow(2, level - 2); // Level 3=200, Level 4=400, etc.
        }
        
        sampleRewards.push({
          triggering_member_wallet: wallet_address,
          reward_recipient_wallet: wallet_address, // 接收者是matrix root
          matrix_root_wallet: wallet_address,
          reward_amount: nftPrice, // 该level NFT价格的100%
          matrix_layer: level,
          triggering_nft_level: level,
          recipient_required_level: level,
          recipient_current_level: currentLevel,
          status: 'claimable',
          expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString()
        });
      }

      for (const reward of sampleRewards) {
        const { error: rewardError } = await supabase
          .from('layer_rewards')
          .insert(reward);

        if (rewardError) {
          fixes.errors.push(`Failed to create reward: ${rewardError.message}`);
        } else {
          fixes.actions_taken.push(`Created reward ($${reward.reward_amount})`);
        }
      }
    } else {
      fixes.actions_taken.push('Reward claims already exist');
    }

    const totalFixed = fixes.actions_taken.length;
    const hasErrors = fixes.errors.length > 0;

    return {
      success: !hasErrors,
      data: {
        fixed: totalFixed,
        details: `Processed ${totalFixed} fixes for wallet ${wallet_address}`,
        summary: fixes.actions_taken,
        breakdown: {
          actions_completed: fixes.actions_taken,
          errors_encountered: fixes.errors,
          data_created: fixes.data_created
        }
      },
      error: hasErrors ? `Some fixes failed: ${fixes.errors.join(', ')}` : undefined
    };

  } catch (error) {
    return {
      success: false,
      error: `Member data fix failed: ${error.message}`
    };
  }
}