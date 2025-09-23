import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { walletAddress, rewardId } = req.body;

  if (!walletAddress || !rewardId) {
    return res.status(400).json({ error: 'Wallet address and reward ID required' });
  }

  try {
    // Get the reward to verify it's claimable
    const { data: reward, error: rewardError } = await supabase
      .from('layer_rewards')
      .select('*')
      .eq('id', rewardId)
      .eq('reward_recipient_wallet', walletAddress)
      .single();

    if (rewardError || !reward) {
      return res.status(404).json({ error: 'Reward not found' });
    }

    if (reward.status !== 'claimable') {
      return res.status(400).json({ 
        error: 'Reward not claimable',
        currentStatus: reward.status,
        expiresAt: reward.expires_at,
      });
    }

    if (reward.claimed_at) {
      return res.status(400).json({ error: 'Reward already claimed' });
    }

    // Check if reward has expired
    if (reward.expires_at && new Date(reward.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Reward has expired' });
    }

    // Update reward status to claimed
    const { error: updateRewardError } = await supabase
      .from('layer_rewards')
      .update({
        status: 'claimed',
        claimed_at: new Date().toISOString(),
      })
      .eq('id', rewardId);

    if (updateRewardError) {
      console.error('Update reward error:', updateRewardError);
      return res.status(500).json({ error: 'Failed to update reward status' });
    }

    // Update user balance
    const { data: currentBalance, error: balanceError } = await supabase
      .from('user_balances')
      .select('reward_balance, total_earned, available_balance')
      .eq('wallet_address', walletAddress)
      .single();

    if (balanceError) {
      console.error('Balance query error:', balanceError);
      // Continue even if balance query fails - we'll create a record
    }

    const newRewardBalance = (currentBalance?.reward_balance || 0) + reward.reward_amount;
    const newTotalEarned = (currentBalance?.total_earned || 0) + reward.reward_amount;
    const newAvailableBalance = (currentBalance?.available_balance || 0) + reward.reward_amount;

    const { error: updateBalanceError } = await supabase
      .from('user_balances')
      .upsert({
        wallet_address: walletAddress,
        reward_balance: newRewardBalance,
        total_earned: newTotalEarned,
        available_balance: newAvailableBalance,
        last_updated: new Date().toISOString(),
      });

    if (updateBalanceError) {
      console.error('Balance update error:', updateBalanceError);
      // Rollback reward status
      await supabase
        .from('layer_rewards')
        .update({
          status: 'claimable',
          claimed_at: null,
        })
        .eq('id', rewardId);
      
      return res.status(500).json({ error: 'Failed to update balance' });
    }

    res.status(200).json({
      success: true,
      claimedReward: {
        id: reward.id,
        amount: reward.reward_amount,
        layer: reward.matrix_layer,
        position: reward.layer_position,
        claimedAt: new Date().toISOString(),
      },
      updatedBalance: {
        rewardBalance: newRewardBalance,
        totalEarned: newTotalEarned,
        availableBalance: newAvailableBalance,
      },
      message: `Successfully claimed $${reward.reward_amount.toFixed(2)} reward`,
    });

  } catch (error) {
    console.error('Claim reward error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}