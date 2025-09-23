import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { walletAddress } = req.query;

  if (!walletAddress || typeof walletAddress !== 'string') {
    return res.status(400).json({ error: 'Valid wallet address required' });
  }

  try {
    // Get all rewards for the user
    const { data: rewards, error: rewardsError } = await supabase
      .from('layer_rewards')
      .select(`
        id,
        reward_amount,
        status,
        created_at,
        expires_at,
        claimed_at,
        matrix_layer,
        layer_position,
        triggering_member_wallet,
        triggering_nft_level,
        roll_up_reason,
        recipient_current_level,
        recipient_required_level,
        requires_direct_referrals,
        direct_referrals_current,
        direct_referrals_required
      `)
      .eq('reward_recipient_wallet', walletAddress)
      .order('created_at', { ascending: false });

    if (rewardsError) {
      console.error('Rewards query error:', rewardsError);
      return res.status(500).json({ error: 'Failed to fetch rewards' });
    }

    // Get user balance
    const { data: balance } = await supabase
      .from('user_balances')
      .select('reward_balance, total_earned, total_withdrawn, available_balance')
      .eq('wallet_address', walletAddress)
      .single();

    // Categorize rewards
    const claimableRewards = rewards?.filter(r => r.status === 'claimable') || [];
    const pendingRewards = rewards?.filter(r => r.status === 'pending') || [];
    const claimedRewards = rewards?.filter(r => r.status === 'claimed') || [];
    const expiredRewards = rewards?.filter(r => r.status === 'expired' || r.status === 'rolled_up') || [];

    // Calculate totals
    const totalClaimable = claimableRewards.reduce((sum, r) => sum + r.reward_amount, 0);
    const totalPending = pendingRewards.reduce((sum, r) => sum + r.reward_amount, 0);
    const totalClaimed = claimedRewards.reduce((sum, r) => sum + r.reward_amount, 0);

    // Check for expired rewards that should be processed
    const now = new Date();
    const expiredPendingRewards = pendingRewards.filter(r => 
      r.expires_at && new Date(r.expires_at) < now
    );

    // Get reward timers for active rewards
    const activeRewardIds = [...claimableRewards, ...pendingRewards].map(r => r.id);
    const { data: timers } = await supabase
      .from('reward_timers')
      .select('*')
      .in('reward_id', activeRewardIds);

    const response = {
      summary: {
        totalClaimable: totalClaimable,
        totalPending: totalPending,
        totalClaimed: totalClaimed,
        claimableCount: claimableRewards.length,
        pendingCount: pendingRewards.length,
        claimedCount: claimedRewards.length,
        expiredCount: expiredRewards.length,
      },
      balance: {
        rewardBalance: balance?.reward_balance || 0,
        totalEarned: balance?.total_earned || 0,
        totalWithdrawn: balance?.total_withdrawn || 0,
        availableBalance: balance?.available_balance || 0,
      },
      rewards: {
        claimable: claimableRewards.map(r => ({
          ...r,
          timeRemaining: null, // Already claimable
          canClaim: true,
        })),
        pending: pendingRewards.map(r => {
          const timer = timers?.find(t => t.reward_id === r.id);
          const expiresAt = r.expires_at ? new Date(r.expires_at) : null;
          const canClaim = expiresAt ? expiresAt <= now : false;
          
          return {
            ...r,
            timeRemaining: expiresAt && !canClaim ? expiresAt.getTime() - now.getTime() : 0,
            canClaim,
            timer: timer || null,
          };
        }),
        claimed: claimedRewards.slice(0, 10), // Latest 10 claimed rewards
        expired: expiredRewards,
      },
      needsProcessing: expiredPendingRewards.length > 0,
      lastUpdated: new Date().toISOString(),
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}