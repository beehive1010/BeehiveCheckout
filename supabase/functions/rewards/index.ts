// Beehive Platform - Rewards Management Edge Function
// Handles reward claims, processing, and management
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};
serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: corsHeaders
        });
    }
    try {
        const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
        const url = new URL(req.url);
        let action = url.pathname.split('/').pop();
        let requestBody = null;
        console.log(`Rewards function: ${req.method} ${url.pathname}`);
        // Parse request body once at the beginning for all POST requests
        if (req.method === 'POST') {
            try {
                requestBody = await req.json();
                req.parsedBody = requestBody; // Store for later use
            } catch  {
                // Non-JSON body, continue
            }
        }
        // Handle specific endpoint patterns (order matters - check more specific paths first)
        if (url.pathname.endsWith('/claimable')) {
            action = 'get-claims';
        } else if (url.pathname.endsWith('/claim') || url.pathname.includes('/claim/')) {
            action = 'claim-reward';
        } else if (url.pathname.endsWith('/user')) {
            action = 'get-balance';
        } else if (url.pathname.endsWith('/withdraw')) {
            action = 'withdraw-balance';
        } else if (url.pathname.endsWith('/timers')) {
            action = 'get-reward-timers';
        } else if (url.pathname.endsWith('/pending')) {
            action = 'check-pending-rewards';
        } else if (url.pathname.endsWith('/notifications')) {
            action = 'get-notifications';
        } else if (url.pathname.endsWith('/dashboard')) {
            action = 'dashboard';
        } else if (url.pathname.endsWith('/maintenance')) {
            action = 'maintenance';
        } else if (url.pathname.endsWith('/stats')) {
            action = 'dashboard';
        } else if (url.pathname.endsWith('/history')) {
            action = 'get-claims';
        } else if (!action || action === 'rewards') {
            // Fallback: try query params or request body
            action = url.searchParams.get('action') || requestBody?.action || 'get-balance';
        }
        console.log(`Resolved action: ${action}`);
        switch(action){
            case 'get-claims':
                return await getRewardClaims(req, supabaseClient);
            case 'claim-reward':
                return await claimReward(req, supabaseClient);
            case 'get-notifications':
                return await getRewardNotifications(req, supabaseClient);
            case 'withdraw-balance':
                return await withdrawRewardBalance(req, supabaseClient);
            case 'get-balance':
                return await getRewardBalance(req, supabaseClient);
            case 'get-activity':
                return await getDashboardActivity(req, supabaseClient);
            case 'maintenance':
                return await runMaintenance(req, supabaseClient);
            case 'dashboard':
                return await getRewardDashboard(req, supabaseClient);
            case 'check-pending-rewards':
                return await checkPendingRewards(req, supabaseClient);
            case 'process-expired-rewards':
                return await processExpiredRewards(req, supabaseClient);
            case 'get-reward-timers':
                return await getRewardTimers(req, supabaseClient);
            case 'update-reward-status':
                return await updateRewardStatus(req, supabaseClient);
            case 'process-level-activation-rewards':
                return await processLevelActivationRewards(req, supabaseClient);
            default:
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Unknown action'
                }), {
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/json'
                    },
                    status: 400
                });
        }
    } catch (error) {
        console.error('Rewards function error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Internal server error',
            message: error.message
        }), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            },
            status: 500
        });
    }
});
async function getRewardClaims(req, supabaseClient) {
    // Use already parsed body or URL parameters
    const requestData = req.parsedBody || {};
    const url = new URL(req.url);
    const wallet_address = requestData.wallet_address || req.headers.get('x-wallet-address');
    const { status, layer } = requestData;
    if (!wallet_address) {
        return new Response(JSON.stringify({
            success: false,
            error: 'rewards.errors.wallet_address_required'
        }), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            },
            status: 400
        });
    }
    let query = supabaseClient.from('reward_claims_dashboard').select('*').eq('root_wallet', wallet_address);
    if (status) {
        query = query.eq('status', status);
    }
    if (layer) {
        query = query.eq('layer', layer);
    }
    const { data: claims, error } = await query.order('created_at', {
        ascending: false
    });
    if (error) {
        console.error('Get claims error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to fetch claims'
        }), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            },
            status: 500
        });
    }
    return new Response(JSON.stringify({
        success: true,
        data: claims
    }), {
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
        }
    });
}
async function claimReward(req, supabaseClient) {
    const requestData = req.parsedBody || {};
    const { claim_id, wallet_address } = requestData;
    console.log(`🎯 Claiming reward: ${claim_id} for ${wallet_address}`);
    if (!claim_id || !wallet_address) {
        return new Response(JSON.stringify({
            success: false,
            error: 'rewards.errors.claim_id_and_wallet_required'
        }), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            },
            status: 400
        });
    }
    try {
        // 1. Get reward from layer_rewards table using case-insensitive matching
        const { data: rewardArray, error: rewardError } = await supabaseClient
            .from('layer_rewards')
            .select('*')
            .eq('id', claim_id)
            .ilike('reward_recipient_wallet', wallet_address.toLowerCase());
        
        const reward = rewardArray?.[0] || null;
        
        if (rewardError || !reward) {
            console.log(`❌ Reward not found: ${claim_id}`, rewardError);
            return new Response(JSON.stringify({
                success: false,
                error: 'rewards.errors.reward_not_found_or_access_denied'
            }), {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                },
                status: 404
            });
        }
        
        console.log(`📋 Found reward: Layer ${reward.matrix_layer}, ${reward.reward_amount} USDT, Status: ${reward.status}`);
        
        // 2. Check if reward is already claimed
        if (reward.status === 'claimed') {
            return new Response(JSON.stringify({
                success: false,
                error: 'rewards.errors.already_claimed',
                claimed_at: reward.claimed_at
            }), {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                },
                status: 400
            });
        }
        
        // 3. Handle different reward statuses - claimable vs pending
        if (reward.status === 'claimable') {
            // ✅ CLAIMABLE REWARD - Process immediately
            console.log(`💰 Processing claimable reward: ${reward.reward_amount} USDT`);
            
        } else if (reward.status === 'pending') {
            // ⏳ PENDING REWARD - Create countdown timer
            console.log(`⏳ Processing pending reward: ${reward.reward_amount} USDT`);
            return await handlePendingRewardClaim(supabaseClient, reward, wallet_address);
            
        } else {
            return new Response(JSON.stringify({
                success: false,
                error: 'rewards.errors.invalid_status_for_claim',
                current_status: reward.status
            }), {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                },
                status: 400
            });
        }
        
        // 3. Check if this is the 3rd reward for this layer and recipient (3rd reward validation rule)
        const { data: rewardCountArray } = await supabaseClient
            .from('layer_rewards')
            .select('id, created_at')
            .eq('reward_recipient_wallet', reward.reward_recipient_wallet.toLowerCase())
            .eq('matrix_layer', reward.matrix_layer)
            .order('created_at', { ascending: true });
            
        // Find the position of this reward in the sequence
        const rewardIndex = rewardCountArray?.findIndex(r => r.id === reward.id);
        const isThirdReward = rewardIndex === 2; // 0-based index, so 3rd reward is index 2
        
        // 4. CRITICAL BUSINESS RULE: 3rd reward special validation
        // - 1st layer 3rd reward: requires Level 2+
        // - 2nd layer 3rd reward: requires Level 3+ 
        // - 3rd-18th layer 3rd reward: requires Level (layer+1)+
        if (isThirdReward) {
            const { data: memberArray, error: memberError } = await supabaseClient
                .from('members')
                .select('current_level')
                .ilike('wallet_address', wallet_address.toLowerCase());
                
            const memberData = memberArray?.[0] || null;
            
            if (memberError || !memberData) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'rewards.errors.member_verification_failed',
                    message: 'Unable to verify member level requirements for 3rd reward'
                }), {
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/json'
                    },
                    status: 400
                });
            }
            
            // Calculate required level for 3rd reward: layer + 1 (minimum 2)
            const requiredLevel = Math.max(2, reward.matrix_layer + 1);
            
            if (memberData.current_level < requiredLevel) {
                console.log(`❌ 3rd reward blocked: Layer ${reward.matrix_layer}, Level ${memberData.current_level} < ${requiredLevel}`);
                return new Response(JSON.stringify({
                    success: false,
                    error: 'rewards.errors.third_reward_level_insufficient',
                    message: `Layer ${reward.matrix_layer} third reward requires Level ${requiredLevel}+ to claim`,
                    restriction_type: 'third_reward_validation',
                    layer: reward.matrix_layer,
                    required_level: requiredLevel,
                    current_level: memberData.current_level,
                    reward_amount: reward.reward_amount,
                    countdown_expires: 'rewards.countdown.hours_72_from_activation'
                }), {
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/json'
                    },
                    status: 403
                });
            }
            
            console.log(`✅ 3rd reward validation passed: Layer ${reward.matrix_layer}, Level ${memberData.current_level} >= ${requiredLevel}`);
        }
        
        // 5. Process the claim
        const { error: updateError } = await supabaseClient
            .from('layer_rewards')
            .update({
                status: 'claimed',
                updated_at: new Date().toISOString()
            })
            .eq('id', claim_id);
            
        if (updateError) {
            throw new Error(`Failed to update reward status: ${updateError.message}`);
        }
        
        // 6. Update user balance - for CLAIMABLE rewards only
        if (reward.reward_type === 'layer_reward') {
            const { data: currentBalanceArray } = await supabaseClient
                .from('user_balances')
                .select('usdc_claimable, usdc_claimed_total')
                .ilike('wallet_address', wallet_address.toLowerCase());
                
            const currentBalance = currentBalanceArray?.[0] || null;
            
            if (currentBalance) {
                const newClaimable = Math.max(0, currentBalance.usdc_claimable - reward.reward_amount);
                const newClaimed = currentBalance.usdc_claimed_total + reward.reward_amount;
                
                const { error: balanceError } = await supabaseClient
                    .from('user_balances')
                    .update({
                        usdc_claimable: newClaimable,
                        usdc_claimed_total: newClaimed,
                        updated_at: new Date().toISOString()
                    })
                    .ilike('wallet_address', wallet_address.toLowerCase());
                    
                if (balanceError) {
                    console.error('❌ Balance update failed:', balanceError);
                } else {
                    console.log(`✅ Balance updated: -${reward.reward_amount} claimable, +${reward.reward_amount} claimed`);
                }
            } else {
                // Create balance record if doesn't exist
                const { error: createBalanceError } = await supabaseClient
                    .from('user_balances')
                    .insert({
                        wallet_address: wallet_address.toLowerCase(),
                        usdc_claimable: 0,
                        usdc_pending: 0,
                        usdc_claimed_total: reward.reward_amount,
                        bcc_transferable: 0,
                        bcc_locked: 0,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
                    
                if (createBalanceError) {
                    console.error('❌ Create balance failed:', createBalanceError);
                } else {
                    console.log(`✅ Created balance record: +${reward.reward_amount} claimed`);
                }
            }
        }
        
        // 7. Success response
        console.log(`✅ Reward claimed successfully: ${reward.reward_amount} USDT`);
        return new Response(JSON.stringify({
            success: true,
            message: 'rewards.messages.claim_successful',
            reward: {
                id: reward.id,
                reward_amount: reward.reward_amount,
                amount_bcc: reward.amount_bcc || 0,
                layer: reward.matrix_layer,
                from_member: reward.triggering_member_wallet,
                claimed_at: new Date().toISOString()
            },
            balance_updated: true
        }), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            },
            status: 200
        });
    } catch (error) {
        console.error('❌ Claim reward error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'rewards.errors.claim_processing_failed',
            debug: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            },
            status: 500
        });
    }
}
async function runMaintenance(req, supabaseClient) {
    // Run reward system maintenance (expired rewards, rollups, etc.)
    const { data: maintenanceResult, error } = await supabaseClient.rpc('process_reward_system_maintenance');
    if (error) {
        console.error('Maintenance error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Maintenance failed'
        }), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            },
            status: 500
        });
    }
    return new Response(JSON.stringify({
        success: true,
        message: 'Maintenance completed',
        data: maintenanceResult
    }), {
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
        }
    });
}
async function getRewardDashboard(req, supabaseClient) {
    const requestData = req.parsedBody || {};
    const wallet_address = requestData.wallet_address || req.headers.get('x-wallet-address');
    if (!wallet_address) {
        return new Response(JSON.stringify({
            success: false,
            error: 'rewards.errors.wallet_address_required'
        }), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            },
            status: 400
        });
    }
    // Get reward claims summary from reward_claims_dashboard view (which maps to layer_rewards)
    const { data: claimsSummary, error: claimsError } = await supabaseClient.from('reward_claims_dashboard').select('status, layer, reward_amount_usdc').eq('root_wallet', wallet_address);
    if (claimsError) {
        console.error('Dashboard claims error:', claimsError);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to fetch dashboard data'
        }), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            },
            status: 500
        });
    }
    // Get member requirements
    const { data: requirements, error: reqError } = await supabaseClient.from('member_requirements_view').select('*').eq('wallet_address', wallet_address).maybeSingle();
    if (reqError) {
        console.error('Dashboard requirements error:', reqError);
    }
    // Calculate summary statistics
    const totalClaimed = claimsSummary.filter((c)=>c.status === 'claimed').reduce((sum, c)=>sum + parseFloat(c.reward_amount_usdc), 0);
    const totalPending = claimsSummary.filter((c)=>c.status === 'pending').reduce((sum, c)=>sum + parseFloat(c.reward_amount_usdc), 0);
    const totalClaimable = claimsSummary.filter((c)=>c.status === 'claimable').reduce((sum, c)=>sum + parseFloat(c.reward_amount_usdc), 0);
    return new Response(JSON.stringify({
        success: true,
        data: {
            wallet_address,
            reward_summary: {
                total_claimed_usdc: totalClaimed,
                total_pending_usdc: totalPending,
                total_claimable_usdc: totalClaimable,
                total_claims: claimsSummary.length
            },
            member_requirements: requirements || null,
            recent_claims: claimsSummary.slice(0, 10)
        }
    }), {
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
        }
    });
}
async function getRewardNotifications(req, supabaseClient) {
    const requestData = req.parsedBody || {};
    const { wallet_address, is_read, limit = 50 } = requestData;
    if (!wallet_address) {
        return new Response(JSON.stringify({
            success: false,
            error: 'rewards.errors.wallet_address_required'
        }), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            },
            status: 400
        });
    }
    let query = supabaseClient.from('reward_notifications').select('*').eq('wallet_address', wallet_address);
    if (typeof is_read === 'boolean') {
        query = query.eq('is_read', is_read);
    }
    const { data: notifications, error } = await query.order('created_at', {
        ascending: false
    }).limit(limit);
    if (error) {
        console.error('Get notifications error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to fetch notifications'
        }), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            },
            status: 500
        });
    }
    return new Response(JSON.stringify({
        success: true,
        data: notifications,
        unread_count: notifications.filter((n)=>!n.is_read).length
    }), {
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
        }
    });
}
async function withdrawRewardBalance(req, supabaseClient) {
    const requestData = req.parsedBody || {};
    const { wallet_address, amount_usdc, withdrawal_address } = requestData;
    if (!wallet_address || !amount_usdc) {
        return new Response(JSON.stringify({
            success: false,
            error: 'wallet_address and amount_usdc required'
        }), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            },
            status: 400
        });
    }
    // Process withdrawal using database function
    const { data: withdrawalResult, error } = await supabaseClient.rpc('withdraw_reward_balance', {
        p_wallet_address: wallet_address,
        p_amount_usdc: amount_usdc,
        p_withdrawal_address: withdrawal_address
    });
    if (error || !withdrawalResult?.success) {
        console.error('Withdrawal error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: withdrawalResult?.error || 'Withdrawal failed',
            details: error?.message
        }), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            },
            status: 400
        });
    }
    console.log(`Withdrawal processed: ${amount_usdc} USDC for ${wallet_address}`);
    return new Response(JSON.stringify({
        success: true,
        message: 'Withdrawal processed successfully',
        data: withdrawalResult
    }), {
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
        }
    });
}
async function getRewardBalance(req, supabaseClient) {
    let wallet_address;
    // Handle both GET and POST requests
    if (req.method === 'GET') {
        wallet_address = req.headers.get('x-wallet-address');
    } else {
        const body = req.parsedBody || {};
        wallet_address = body.wallet_address || req.headers.get('x-wallet-address');
    }
    if (!wallet_address) {
        return new Response(JSON.stringify({
            success: false,
            error: 'rewards.errors.wallet_address_required'
        }), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            },
            status: 400
        });
    }
    // Get reward balance from user_balances table
    const { data: balanceArray, error } = await supabaseClient.from('user_balances').select('*').eq('wallet_address', wallet_address);
    const balanceData = balanceArray?.[0] || null;
    if (error) {
        console.error('Balance fetch error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to fetch balance',
            details: error.message,
            wallet_address: wallet_address
        }), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            },
            status: 500
        });
    }
    return new Response(JSON.stringify({
        success: true,
        data: balanceData || {
            wallet_address,
            bcc_transferable: 0,
            bcc_locked: 0,
            usdt_earnings: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
    }), {
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
        }
    });
}
// New functions for enhanced reward management
async function checkPendingRewards(req, supabaseClient) {
    const requestData = req.parsedBody || {};
    const { wallet_address } = requestData;
    if (!wallet_address) {
        return new Response(JSON.stringify({
            success: false,
            error: 'rewards.errors.wallet_address_required'
        }), {
            status: 400,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            }
        });
    }
    try {
        // Get pending rewards with countdown timers
        const { data: pendingRewards, error } = await supabaseClient.from('reward_claims_dashboard').select(`
        *,
        countdown_timers (
          id,
          timer_type,
          title,
          ends_at,
          status,
          auto_action
        )
      `).eq('root_wallet', wallet_address).eq('status', 'pending').order('created_at', {
            ascending: false
        });
        if (error) {
            throw error;
        }
        // Calculate time remaining for each pending reward
        const enrichedRewards = (pendingRewards || []).map((reward)=>{
            const timer = reward.countdown_timers?.[0];
            let timeRemaining = null;
            let canUpgrade = false;
            if (timer) {
                const now = new Date();
                const endTime = new Date(timer.ends_at);
                const remainingMs = endTime.getTime() - now.getTime();
                if (remainingMs > 0) {
                    timeRemaining = {
                        hours: Math.floor(remainingMs / (1000 * 60 * 60)),
                        minutes: Math.floor(remainingMs % (1000 * 60 * 60) / (1000 * 60)),
                        total_hours: remainingMs / (1000 * 60 * 60)
                    };
                } else {
                    // Timer expired - should be processed
                    canUpgrade = true;
                }
            }
            return {
                ...reward,
                time_remaining: timeRemaining,
                can_upgrade: canUpgrade,
                is_expired: timeRemaining === null && timer
            };
        });
        return new Response(JSON.stringify({
            success: true,
            data: {
                pending_rewards: enrichedRewards,
                total_pending: enrichedRewards.length,
                expired_count: enrichedRewards.filter((r)=>r.is_expired).length,
                upgrade_ready_count: enrichedRewards.filter((r)=>r.can_upgrade).length
            }
        }), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('Check pending rewards error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to check pending rewards',
            details: error.message
        }), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            },
            status: 500
        });
    }
}
async function processExpiredRewards(req, supabaseClient) {
    try {
        // Process expired rewards using the stored procedure
        const { data: processResult, error } = await supabaseClient.rpc('process_expired_rewards');
        if (error) {
            throw error;
        }
        console.log('✅ Expired rewards processed:', processResult);
        return new Response(JSON.stringify({
            success: true,
            message: 'Expired rewards processed successfully',
            data: processResult
        }), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('Process expired rewards error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to process expired rewards',
            details: error.message
        }), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            },
            status: 500
        });
    }
}
async function getRewardTimers(req, supabaseClient) {
    const requestData = req.parsedBody || {};
    const { wallet_address, timer_type } = requestData;
    if (!wallet_address) {
        return new Response(JSON.stringify({
            success: false,
            error: 'rewards.errors.wallet_address_required'
        }), {
            status: 400,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            }
        });
    }
    try {
        let query = supabaseClient.from('countdown_timers').select('*').eq('wallet_address', wallet_address).eq('status', 'active').order('created_at', {
            ascending: false
        });
        if (timer_type) {
            query = query.eq('timer_type', timer_type);
        }
        const { data: timers, error } = await query;
        if (error) {
            throw error;
        }
        // Enrich timers with remaining time calculation
        const enrichedTimers = (timers || []).map((timer)=>{
            const now = new Date();
            const endTime = new Date(timer.ends_at);
            const remainingMs = endTime.getTime() - now.getTime();
            return {
                ...timer,
                time_remaining: remainingMs > 0 ? {
                    total_ms: remainingMs,
                    hours: Math.floor(remainingMs / (1000 * 60 * 60)),
                    minutes: Math.floor(remainingMs % (1000 * 60 * 60) / (1000 * 60)),
                    seconds: Math.floor(remainingMs % (1000 * 60) / 1000)
                } : null,
                is_expired: remainingMs <= 0
            };
        });
        return new Response(JSON.stringify({
            success: true,
            data: {
                timers: enrichedTimers,
                active_count: enrichedTimers.filter((t)=>!t.is_expired).length,
                expired_count: enrichedTimers.filter((t)=>t.is_expired).length
            }
        }), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('Get reward timers error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to fetch reward timers',
            details: error.message
        }), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            },
            status: 500
        });
    }
}
async function updateRewardStatus(req, supabaseClient) {
    const requestData = req.parsedBody || {};
    const { wallet_address, claim_id, new_status, admin_override } = requestData;
    if (!wallet_address || !claim_id || !new_status) {
        return new Response(JSON.stringify({
            success: false,
            error: 'wallet_address, claim_id, and new_status required'
        }), {
            status: 400,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            }
        });
    }
    try {
        // Verify the reward claim exists and belongs to the user (unless admin override)
        const { data: existingClaim, error: fetchError } = await supabaseClient.from('layer_rewards').select('*').eq('id', claim_id).maybeSingle();
        
        if (fetchError) {
            return new Response(JSON.stringify({
                success: false,
                error: `Database error: ${fetchError.message}`
            }), {
                status: 500,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        }
        if (fetchError || !existingClaim) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Reward claim not found'
            }), {
                status: 404,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        }
        // Check authorization (either owner or admin)
        let isAuthorized = existingClaim.reward_recipient_wallet === wallet_address;
        if (!isAuthorized && admin_override) {
            // Check if user is admin
            const { data: adminCheck } = await supabaseClient.rpc('is_admin', {
                p_wallet_address: wallet_address
            });
            isAuthorized = adminCheck?.is_admin || false;
        }
        if (!isAuthorized) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Unauthorized to update this reward claim'
            }), {
                status: 403,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        }
        // Validate status transition
        const validTransitions = {
            'pending': [
                'claimable',
                'expired',
                'rolled_up'
            ],
            'claimable': [
                'claimed',
                'expired'
            ],
            'claimed': [],
            'expired': [
                'rolled_up'
            ],
            'rolled_up': [] // Final state
        };
        if (!validTransitions[existingClaim.status]?.includes(new_status)) {
            return new Response(JSON.stringify({
                success: false,
                error: `Invalid status transition from ${existingClaim.status} to ${new_status}`
            }), {
                status: 400,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        }
        // Update the reward status
        const updateData: any = {
            status: new_status,
            updated_at: new Date().toISOString()
        };
        // Add specific fields based on new status
        if (new_status === 'claimed') {
            updateData.claimed_at = new Date().toISOString();
        } else if (new_status === 'expired') {
            updateData.expired_at = new Date().toISOString();
        } else if (new_status === 'claimable') {
            updateData.claimable_at = new Date().toISOString();
        }
        const { data: updatedClaim, error: updateError } = await supabaseClient.from('layer_rewards').update(updateData).eq('id', claim_id).select().single();
        if (updateError) {
            throw updateError;
        }
        console.log(`Reward claim ${claim_id} status updated from ${existingClaim.status} to ${new_status}`);
        return new Response(JSON.stringify({
            success: true,
            message: `Reward status updated to ${new_status}`,
            data: updatedClaim
        }), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('Update reward status error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to update reward status',
            details: error.message
        }), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            },
            status: 500
        });
    }
}
async function getDashboardActivity(req, supabaseClient) {
    let wallet_address, limit;
    // Handle both GET and POST requests
    if (req.method === 'GET') {
        wallet_address = req.headers.get('x-wallet-address');
        limit = parseInt(new URL(req.url).searchParams.get('limit') || '10');
    } else {
        const body = req.parsedBody || {};
        wallet_address = body.walletAddress || body.wallet_address || req.headers.get('x-wallet-address');
        limit = body.limit || 10;
    }
    if (!wallet_address) {
        return new Response(JSON.stringify({
            success: false,
            error: 'rewards.errors.wallet_address_required'
        }), {
            status: 400,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            }
        });
    }
    try {
        // Get recent user activity (transactions, claims, etc.)
        const { data: activity, error } = await supabaseClient.from('user_activity_log').select(`
        *,
        activity_type,
        activity_data,
        created_at
      `).eq('wallet_address', wallet_address).order('created_at', {
            ascending: false
        }).limit(limit);
        if (error) {
            console.error('Activity fetch error:', error);
            return new Response(JSON.stringify({
                success: false,
                error: 'Failed to fetch activity'
            }), {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                },
                status: 500
            });
        }
        return new Response(JSON.stringify({
            success: true,
            activity: activity || []
        }), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('Get dashboard activity error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to fetch dashboard activity',
            details: error.message
        }), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            },
            status: 500
        });
    }
}
// NEW: Process Level Activation Rewards - Core Business Logic
async function processLevelActivationRewards(req, supabaseClient) {
    const requestData = req.parsedBody || {};
    const { memberWallet, activatedLevel, rootWallet } = requestData;
    if (!memberWallet || !activatedLevel) {
        return new Response(JSON.stringify({
            success: false,
            error: 'memberWallet and activatedLevel required'
        }), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            },
            status: 400
        });
    }
    try {
        console.log(`🎁 Processing Level ${activatedLevel} NFT activation rewards for ${memberWallet}`);
        // CORE BUSINESS RULE: Layer X rewards only trigger when Level X NFT is activated
        // Find all positions where this member is placed that match the activated level
        const { data: memberPositions, error: positionError } = await supabaseClient.from('referrals').select(`
        member_wallet,
        matrix_root_wallet,
        matrix_layer,
        matrix_position,
        referrer_wallet
      `).eq('member_wallet', memberWallet);
        if (positionError) {
            throw new Error(`Failed to fetch member positions: ${positionError.message}`);
        }
        console.log(`📍 Found ${memberPositions?.length || 0} matrix positions for member`);
        const rewardsCreated = [];
        // Process rewards for each position - CORRECTED LOGIC
        for (const position of memberPositions || []){
            // ✅ CORRECT RULE: Only Layer X root gets reward when Layer X member activates Level X NFT
            // Layer 2 member activating Level 2 NFT → only Layer 2 root gets reward
            if (activatedLevel === position.matrix_layer) {
                console.log(`✅ Creating Layer ${position.matrix_layer} reward for Level ${activatedLevel} NFT activation (Layer ${position.matrix_layer} member activated matching Level ${activatedLevel})`);
                // Get matrix root's member data to check qualification
                const { data: rootMemberData } = await supabaseClient.from('members').select('current_level').eq('wallet_address', position.matrix_root_wallet).maybeSingle();
                // ✅ CORRECTED: Calculate reward amount based on the LAYER being rewarded, not the activated level
                // Layer 2 root gets Layer 2 reward amount when member activates Level 2+ NFT
                const rewardAmount = calculateNFTLevelReward(position.matrix_layer);
                // Determine reward status based on business rules
                let rewardStatus = 'pending';
                let rewardRule = 'Matrix root must own >= NFT level being activated';
                // Check if matrix root qualifies for immediate claimability
                const rootLevel = rootMemberData?.current_level || 0;
                if (position.matrix_layer === 1 && position.matrix_position === 'R') {
                    // Special rule: Layer 1 R position requires Level 2+
                    rewardStatus = rootLevel >= 2 ? 'claimable' : 'pending';
                    rewardRule = 'Layer 1 R position requires Level 2+ matrix root';
                } else {
                    // ✅ CORRECT RULE: Layer X root must own Level >= X to claim Layer X reward
                    // Layer 2 root needs Level >= 2 to claim when Layer 2 member activates Level 2
                    rewardStatus = rootLevel >= position.matrix_layer ? 'claimable' : 'pending';
                    rewardRule = `Layer ${position.matrix_layer} root must own Level >= ${position.matrix_layer} to claim reward`;
                }
                // Create reward record
                const expiresAt = new Date();
                expiresAt.setHours(expiresAt.getHours() + 72);
                const { data: newReward, error: rewardError } = await supabaseClient.from('layer_rewards').insert({
                    reward_recipient_wallet: position.matrix_root_wallet,
                    triggering_member_wallet: memberWallet,
                    matrix_root_wallet: position.matrix_root_wallet,
                    matrix_layer: position.matrix_layer,
                    triggering_nft_level: activatedLevel,
                    reward_amount: rewardAmount,
                    status: rewardStatus,
                    expires_at: expiresAt.toISOString(),
                    metadata: {
                        reward_type: 'Layer Reward',
                        matrix_layer: position.matrix_layer,
                        matrix_position: position.matrix_position,
                        nft_level_activated: activatedLevel,
                        matrix_root_level: rootLevel,
                        reward_rule: rewardRule,
                        activation_scenario: `Layer ${position.matrix_layer} member activated Level ${activatedLevel} NFT, triggering Layer ${position.matrix_layer} root reward`
                    }
                }).select().single();
                if (rewardError) {
                    console.error(`❌ Failed to create reward:`, rewardError);
                } else {
                    rewardsCreated.push(newReward);
                    console.log(`✅ Created Layer ${position.matrix_layer} reward: ${rewardAmount} USDC (${rewardStatus})`);
                }
            } else {
                console.log(`⏩ Skipping Layer ${position.matrix_layer} - Member activated Level ${activatedLevel} but is in Layer ${position.matrix_layer} (Layer ≠ Level)`);
            }
        }
        // Update user reward balances
        if (rewardsCreated.length > 0) {
            await updateUserRewardBalances(supabaseClient, rewardsCreated);
        }
        return new Response(JSON.stringify({
            success: true,
            message: `Level ${activatedLevel} NFT activation processed`,
            data: {
                activated_level: activatedLevel,
                rewards_created: rewardsCreated.length,
                rewards: rewardsCreated.map((r)=>({
                    root_wallet: r.root_wallet,
                    layer: r.matrix_layer,
                    amount_usdc: r.reward_amount_usdc,
                    status: r.status
                }))
            }
        }), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('Process level activation rewards error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to process level activation rewards',
            details: error.message
        }), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            },
            status: 500
        });
    }
}
// Calculate NFT Level reward amount based on pricing structure
function calculateNFTLevelReward(nftLevel) {
    if (nftLevel === 1) {
        return 100.00; // Level 1 special price
    } else if (nftLevel <= 19) {
        return 100 + (nftLevel - 1) * 50; // Level 2-19: 150, 200, 250...1000
    } else {
        return 1000; // Max price for Level 19+
    }
}
// Handle pending reward claims - create countdown timer
async function handlePendingRewardClaim(supabaseClient, reward, wallet_address) {
    try {
        console.log(`⏳ Creating 72-hour countdown for pending reward: ${reward.id}`);
        
        // Get the exact wallet address from members table to match foreign key
        const { data: memberData } = await supabaseClient
            .from('members')
            .select('wallet_address')
            .ilike('wallet_address', wallet_address)
            .maybeSingle();
            
        const exactWalletAddress = memberData?.wallet_address || wallet_address;
        
        // Check if countdown timer already exists
        const { data: existingTimer } = await supabaseClient
            .from('countdown_timers')
            .select('*')
            .eq('wallet_address', exactWalletAddress)
            .eq('timer_type', 'pending_reward')
            .eq('metadata->>reward_id', reward.id)
            .eq('is_active', true)
            .maybeSingle();
            
        if (existingTimer) {
            const now = new Date();
            const endTime = new Date(existingTimer.end_time);
            const remainingMs = endTime.getTime() - now.getTime();
            
            return new Response(JSON.stringify({
                success: false,
                error: 'rewards.errors.countdown_already_active',
                timer_info: {
                    end_time: existingTimer.end_time,
                    time_remaining_hours: Math.max(0, remainingMs / (1000 * 60 * 60)),
                    reward_amount: reward.reward_amount,
                    action_required: 'Upgrade to required NFT level to claim'
                }
            }), {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                },
                status: 409
            });
        }
        
        // Create 72-hour countdown timer
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 72);
        
        const { data: newTimer, error: timerError } = await supabaseClient
            .from('countdown_timers')
            .insert({
                wallet_address: exactWalletAddress,
                timer_type: 'pending_reward',
                title: `Layer ${reward.matrix_layer} Reward Countdown`,
                description: `You have 72 hours to upgrade your NFT level to claim this ${reward.reward_amount} USDT reward`,
                start_time: new Date().toISOString(),
                end_time: expiresAt.toISOString(),
                is_active: true,
                auto_action: 'expire_reward',
                metadata: {
                    reward_id: reward.id,
                    reward_amount: reward.reward_amount,
                    reward_layer: reward.matrix_layer,
                    triggering_member_wallet: reward.triggering_member_wallet,
                    required_action: 'Upgrade NFT level'
                }
            })
            .select()
            .single();
            
        if (timerError) {
            throw new Error(`Failed to create countdown timer: ${timerError.message}`);
        }
        
        console.log(`✅ Created 72-hour countdown timer for reward ${reward.id}`);
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Pending reward countdown started',
            timer: {
                id: newTimer.id,
                reward_id: reward.id,
                reward_amount: reward.reward_amount,
                layer: reward.matrix_layer,
                end_time: expiresAt.toISOString(),
                hours_remaining: 72,
                action_required: 'Upgrade your NFT to the required level to claim this reward'
            }
        }), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            }
        });
        
    } catch (error) {
        console.error('❌ Handle pending reward error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to process pending reward',
            details: error.message
        }), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            },
            status: 500
        });
    }
}

// Update user reward balances after creating new rewards
async function updateUserRewardBalances(supabaseClient, newRewards) {
    try {
        // Group rewards by root_wallet
        const rewardsByRoot = newRewards.reduce((acc, reward)=>{
            const root = reward.root_wallet;
            if (!acc[root]) {
                acc[root] = {
                    claimable: 0,
                    pending: 0
                };
            }
            if (reward.status === 'claimable') {
                acc[root].claimable += parseFloat(reward.reward_amount_usdc);
            } else if (reward.status === 'pending') {
                acc[root].pending += parseFloat(reward.reward_amount_usdc);
            }
            return acc;
        }, {});
        // Update each user's balance
        for (const [rootWallet, amounts] of Object.entries(rewardsByRoot) as [string, {claimable: number, pending: number}][]){
            const { error } = await supabaseClient.from('user_reward_balances').upsert({
                wallet_address: rootWallet,
                usdc_claimable: amounts.claimable,
                usdc_pending: amounts.pending,
                usdc_claimed: 0
            }, {
                onConflict: 'wallet_address',
                ignoreDuplicates: false
            });
            if (error) {
                console.error(`❌ Failed to update balance for ${rootWallet}:`, error);
            } else {
                console.log(`✅ Updated reward balance: ${rootWallet} (+${amounts.claimable} claimable, +${amounts.pending} pending)`);
            }
        }
    } catch (error) {
        console.error('Update user reward balances error:', error);
    }
}
