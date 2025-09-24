import {supabase} from '../../lib/supabase';

export interface PendingRewardsProcessResult {
  success: boolean;
  message: string;
  statistics?: {
    layer_rewards_updated: number;
    reward_claims_updated: number;
    timers_cancelled: number;
    members_processed: number;
    processed_at: string;
  };
  error_code?: string;
}

export interface RewardTimerStatus {
  id: string;
  reward_id: string;
  recipient_wallet: string;
  timer_type: string;
  expires_at: string;
  is_active: boolean;
}

export interface PendingReward {
  id: string;
  reward_amount: number;
  matrix_layer: number;
  status: string;
  recipient_required_level: number;
  recipient_current_level: number;
  expires_at?: string;
  has_timer: boolean;
  timer_expires_at?: string;
}

export const pendingRewardsApi = {
  /**
   * Process all eligible pending rewards and cancel timers
   */
  async processAllPendingRewards(): Promise<PendingRewardsProcessResult> {
    try {
      console.log('🔄 Processing all eligible pending rewards...');
      
      const { data, error } = await supabase.rpc('process_all_eligible_pending_rewards');
      
      if (error) {
        console.error('❌ Process pending rewards error:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      console.log('✅ Processing completed:', data);
      return data as PendingRewardsProcessResult;
      
    } catch (error) {
      console.error('❌ Process pending rewards API error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  },

  /**
   * Get pending rewards for a specific wallet
   */
  async getPendingRewards(walletAddress: string): Promise<PendingReward[]> {
    try {
      console.log('🔍 Fetching pending rewards for wallet:', walletAddress);
      
      const { data: rewardsData, error: rewardsError } = await supabase
        .from('layer_rewards')
        .select(`
          id,
          reward_amount,
          matrix_layer,
          status,
          recipient_required_level,
          recipient_current_level,
          expires_at,
          reward_timers (
            id,
            expires_at,
            is_active
          )
        `)
        .eq('reward_recipient_wallet', walletAddress)
        .in('status', ['pending', 'claimable']);
      
      if (rewardsError) {
        console.error('❌ Get pending rewards error:', rewardsError);
        throw new Error(`Database error: ${rewardsError.message}`);
      }
      
      // Transform data to include timer information
      const rewards: PendingReward[] = (rewardsData || []).map(reward => ({
        id: reward.id,
        reward_amount: reward.reward_amount,
        matrix_layer: reward.matrix_layer,
        status: reward.status,
        recipient_required_level: reward.recipient_required_level,
        recipient_current_level: reward.recipient_current_level,
        expires_at: reward.expires_at,
        has_timer: reward.reward_timers && reward.reward_timers.length > 0,
        timer_expires_at: reward.reward_timers?.[0]?.is_active 
          ? reward.reward_timers[0].expires_at 
          : undefined
      }));
      
      console.log(`✅ Found ${rewards.length} pending/claimable rewards for wallet ${walletAddress}`);
      return rewards;
      
    } catch (error) {
      console.error('❌ Get pending rewards API error:', error);
      return [];
    }
  },

  /**
   * Get active timers for a specific wallet
   */
  async getActiveTimers(walletAddress: string): Promise<RewardTimerStatus[]> {
    try {
      console.log('🔍 Fetching active timers for wallet:', walletAddress);
      
      const { data, error } = await supabase
        .from('reward_timers')
        .select('*')
        .eq('recipient_wallet', walletAddress)
        .eq('is_active', true)
        .order('expires_at', { ascending: true });
      
      if (error) {
        console.error('❌ Get active timers error:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      console.log(`✅ Found ${data?.length || 0} active timers for wallet ${walletAddress}`);
      return data as RewardTimerStatus[] || [];
      
    } catch (error) {
      console.error('❌ Get active timers API error:', error);
      return [];
    }
  },

  /**
   * Manually cancel timers for a specific wallet (when member upgrades)
   */
  async cancelTimersForUpgrade(walletAddress: string): Promise<{ success: boolean; cancelled_count: number }> {
    try {
      console.log('🔄 Cancelling timers for upgraded member:', walletAddress);
      
      // Cancel active timers for rewards that should now be claimable
      const { error } = await supabase
        .from('reward_timers')
        .update({ 
          is_active: false, 
          updated_at: new Date().toISOString() 
        })
        .eq('recipient_wallet', walletAddress)
        .eq('is_active', true);
      
      if (error) {
        console.error('❌ Cancel timers error:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      // Get count of cancelled timers
      const { count } = await supabase
        .from('reward_timers')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_wallet', walletAddress)
        .eq('is_active', false);
      
      console.log(`✅ Cancelled timers for wallet ${walletAddress}`);
      return { success: true, cancelled_count: count || 0 };
      
    } catch (error) {
      console.error('❌ Cancel timers API error:', error);
      return { success: false, cancelled_count: 0 };
    }
  }
};