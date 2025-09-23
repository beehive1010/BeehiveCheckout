import { supabase } from '../supabase';

/**
 * API Service Layer for handling both local API routes and Supabase Edge Functions
 * This allows seamless switching between different backend implementations
 */

// Configuration to switch between API types
const USE_EDGE_FUNCTIONS = true; // Set to false to use local API routes

export class APIService {
  /**
   * BCC Balance operations
   */
  static async getBCCBalance(walletAddress: string) {
    if (USE_EDGE_FUNCTIONS) {
      const { data, error } = await supabase.functions.invoke('bcc-balance', {
        body: { walletAddress },
      });

      if (error) throw new Error(error.message);
      
      // Transform Edge Function response to match expected format
      return {
        bcc_balance: data.balance?.available || 0,
        bcc_locked: data.balance?.locked || 0,
        bcc_total_unlocked: data.balance?.totalUnlocked || 0,
        bcc_used: data.balance?.used || 0,
        last_updated: data.balance?.lastUpdated || null,
      };
    } else {
      // Fallback to direct database query
      const { data, error } = await supabase
        .from('user_balances')
        .select('bcc_balance, bcc_locked, bcc_total_unlocked, bcc_used, last_updated')
        .eq('wallet_address', walletAddress)
        .single();

      if (error) throw error;
      return data;
    }
  }

  static async processBCCRelease(walletAddress: string, triggerType = 'manual') {
    if (USE_EDGE_FUNCTIONS) {
      const { data, error } = await supabase.functions.invoke('bcc-release', {
        body: { walletAddress, triggerType },
      });

      if (error) throw new Error(error.message);
      return data;
    } else {
      // Fallback to database function
      const { data, error } = await supabase.rpc('unlock_bcc_for_level', {
        p_wallet_address: walletAddress,
        p_level: 1, // Default level
      });

      if (error) throw error;
      return data;
    }
  }

  /**
   * Rewards operations
   */
  static async getRewardsStatus(walletAddress: string) {
    if (USE_EDGE_FUNCTIONS) {
      const { data, error } = await supabase.functions.invoke('rewards-status', {
        body: { walletAddress },
      });

      if (error) throw new Error(error.message);
      
      // Transform Edge Function response to match expected format
      return {
        claimable: data.rewards?.claimable || [],
        pending: data.rewards?.pending || [],
        balance: data.balance || {},
        summary: data.summary || {},
      };
    } else {
      // Fallback to direct database queries
      const { data: rewards, error } = await supabase
        .from('layer_rewards')
        .select('*')
        .eq('reward_recipient_wallet', walletAddress)
        .in('status', ['claimable', 'pending'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return rewards || [];
    }
  }

  static async claimReward(walletAddress: string, rewardId: string) {
    if (USE_EDGE_FUNCTIONS) {
      const { data, error } = await supabase.functions.invoke('rewards-claim', {
        body: { walletAddress, rewardId },
      });

      if (error) throw new Error(error.message);
      return data;
    } else {
      // Fallback to database function
      const { data, error } = await supabase.rpc('claim_pending_rewards', {
        p_wallet_address: walletAddress,
      });

      if (error) throw error;
      return data;
    }
  }

  /**
   * User Balance operations
   */
  static async getUserBalance(walletAddress: string) {
    // Always use direct database query for balance as it's core data
    const { data, error } = await supabase
      .from('user_balances')
      .select('reward_balance, total_withdrawn, available_balance')
      .eq('wallet_address', walletAddress)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * BCC Release Log operations
   */
  static async getBCCReleaseLogs(walletAddress: string, limit = 5) {
    const { data, error } = await supabase
      .from('bcc_release_logs')
      .select('*')
      .eq('wallet_address', walletAddress)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Layer Rewards operations
   */
  static async getLayerRewards(walletAddress: string, statuses = ['claimable', 'pending']) {
    const { data, error } = await supabase
      .from('layer_rewards')
      .select('*')
      .eq('reward_recipient_wallet', walletAddress)
      .in('status', statuses)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Withdrawal operations
   */
  static async withdrawRewards(walletAddress: string, amount: number) {
    const { data, error } = await supabase.rpc('withdraw_member_rewards', {
      p_wallet_address: walletAddress,
      p_withdraw_amount: amount,
    });

    if (error) throw error;
    return data;
  }
}

// Export individual functions for compatibility
export const {
  getBCCBalance,
  processBCCRelease,
  getRewardsStatus,
  claimReward,
  getUserBalance,
  getBCCReleaseLogs,
  getLayerRewards,
  withdrawRewards,
} = APIService;