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
    // Get BCC balance data
    const { data: balanceData, error: balanceError } = await supabase
      .from('user_balances')
      .select(`
        bcc_balance,
        bcc_locked,
        bcc_total_unlocked,
        bcc_used,
        last_updated,
        activation_tier,
        tier_multiplier
      `)
      .eq('wallet_address', walletAddress)
      .single();

    if (balanceError) {
      console.error('Balance query error:', balanceError);
      return res.status(404).json({ error: 'Balance not found' });
    }

    // Get recent BCC release logs
    const { data: releaseLogs, error: releaseError } = await supabase
      .from('bcc_release_logs')
      .select('*')
      .eq('wallet_address', walletAddress)
      .order('created_at', { ascending: false })
      .limit(5);

    if (releaseError) {
      console.error('Release logs query error:', releaseError);
    }

    // Calculate next release time (72 hours from last release)
    const latestRelease = releaseLogs?.[0];
    const nextReleaseTime = latestRelease 
      ? new Date(new Date(latestRelease.created_at).getTime() + 72 * 60 * 60 * 1000)
      : null;

    // Get member level for BCC unlock calculations
    const { data: memberData } = await supabase
      .from('members')
      .select('current_level')
      .eq('wallet_address', walletAddress)
      .single();

    const response = {
      balance: {
        available: balanceData.bcc_balance || 0,
        locked: balanceData.bcc_locked || 0,
        totalUnlocked: balanceData.bcc_total_unlocked || 0,
        used: balanceData.bcc_used || 0,
        lastUpdated: balanceData.last_updated,
      },
      release: {
        nextReleaseTime: nextReleaseTime?.toISOString() || null,
        canRelease: balanceData.bcc_locked > 0,
        estimatedRelease: Math.min(balanceData.bcc_locked || 0, 100), // 100 BCC per 72hr cycle
      },
      member: {
        currentLevel: memberData?.current_level || 1,
        activationTier: balanceData.activation_tier || 1,
        tierMultiplier: balanceData.tier_multiplier || 1,
      },
      recentReleases: releaseLogs || [],
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}