import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { walletAddress, triggerType = 'manual' } = req.body;

  if (!walletAddress) {
    return res.status(400).json({ error: 'Wallet address required' });
  }

  try {
    // Get current balance
    const { data: currentBalance, error: balanceError } = await supabase
      .from('user_balances')
      .select('bcc_balance, bcc_locked, bcc_total_unlocked')
      .eq('wallet_address', walletAddress)
      .single();

    if (balanceError || !currentBalance) {
      return res.status(404).json({ error: 'Balance not found' });
    }

    if (currentBalance.bcc_locked <= 0) {
      return res.status(400).json({ error: 'No locked BCC to release' });
    }

    // Check last release time (enforce 72-hour cooldown)
    const { data: lastRelease } = await supabase
      .from('bcc_release_logs')
      .select('created_at')
      .eq('wallet_address', walletAddress)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (lastRelease && triggerType === 'manual') {
      const timeSinceLastRelease = Date.now() - new Date(lastRelease.created_at).getTime();
      const seventyTwoHours = 72 * 60 * 60 * 1000;
      
      if (timeSinceLastRelease < seventyTwoHours) {
        const timeRemaining = seventyTwoHours - timeSinceLastRelease;
        return res.status(400).json({ 
          error: 'Release cooldown active',
          timeRemaining: timeRemaining,
          nextReleaseTime: new Date(Date.now() + timeRemaining).toISOString()
        });
      }
    }

    // Calculate release amount (100 BCC or remaining locked amount, whichever is smaller)
    const releaseAmount = Math.min(currentBalance.bcc_locked, 100);
    const newLockedAmount = currentBalance.bcc_locked - releaseAmount;
    const newAvailableAmount = currentBalance.bcc_balance + releaseAmount;
    const newTotalUnlocked = currentBalance.bcc_total_unlocked + releaseAmount;

    // Get member level for logging
    const { data: memberData } = await supabase
      .from('members')
      .select('current_level')
      .eq('wallet_address', walletAddress)
      .single();

    // Update balance
    const { error: updateError } = await supabase
      .from('user_balances')
      .update({
        bcc_balance: newAvailableAmount,
        bcc_locked: newLockedAmount,
        bcc_total_unlocked: newTotalUnlocked,
        last_updated: new Date().toISOString(),
      })
      .eq('wallet_address', walletAddress);

    if (updateError) {
      console.error('Balance update error:', updateError);
      return res.status(500).json({ error: 'Failed to update balance' });
    }

    // Log the release
    const { error: logError } = await supabase
      .from('bcc_release_logs')
      .insert({
        wallet_address: walletAddress,
        bcc_released: releaseAmount,
        bcc_remaining_locked: newLockedAmount,
        from_level: memberData?.current_level || 1,
        to_level: memberData?.current_level || 1,
        release_reason: triggerType === 'manual' ? 'Manual 72-hour release' : 'Automatic 72-hour release',
      });

    if (logError) {
      console.error('Release log error:', logError);
      // Continue despite logging error
    }

    res.status(200).json({
      success: true,
      release: {
        amount: releaseAmount,
        remainingLocked: newLockedAmount,
        newAvailableBalance: newAvailableAmount,
        totalUnlocked: newTotalUnlocked,
      },
      message: `Successfully released ${releaseAmount} BCC`,
    });

  } catch (error) {
    console.error('Process release error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}