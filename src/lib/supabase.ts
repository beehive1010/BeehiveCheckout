// Supabase client configuration for Beehive Platform
// This file re-exports from supabaseClient.ts to maintain a single client instance
// and avoid "Multiple GoTrueClient instances detected" warnings

// Re-export the unified Supabase client instance
export { supabase, authService, callEdgeFunction, EDGE_FUNCTIONS_URL } from './supabaseClient'

// Import supabase for local use in dbFunctions
import { supabase } from './supabaseClient'

// Legacy export alias for compatibility
export { supabase as supabaseApi } from './supabaseClient'

// Database functions that exist in the current schema
export const dbFunctions = {
  // Working functions from database.types.ts
  async analyzeMatrixStructure() {
    return await supabase.rpc('analyze_matrix_structure')
  },

  async calculateLevelBCCUnlock(level: number, tier?: number) {
    return supabase.rpc('calculate_level_bcc_unlock', {
        p_level: level,
        p_tier: tier
    });
  },

  async calculateMatrixParent(memberAddr: string, referrerAddr: string) {
    return await supabase.rpc('calculate_matrix_parent', {
      member_addr: memberAddr,
      referrer_addr: referrerAddr
    })
  },

  async calculateNFTTotalPrice(level: number) {
    return await supabase.rpc('calculate_nft_total_price', {
      p_level: level
    })
  },

  async calculateTotalBCCLocked(tier?: number) {
    return await supabase.rpc('calculate_total_bcc_locked', {
      p_tier: tier
    })
  },

  async calculateTotalNFTCost(level: number) {
    return await supabase.rpc('calculate_total_nft_cost', {
      p_level: level
    })
  },

  async checkAdminPermission(permission: string, walletAddress: string) {
    return await supabase.rpc('check_admin_permission', {
      p_permission: permission,
      p_wallet_address: walletAddress
    })
  },

  async checkMatrixHealth() {
    return await supabase.rpc('check_matrix_health')
  },

  async claimPendingRewards(walletAddress: string) {
    return await supabase.rpc('claim_pending_rewards', {
      p_wallet_address: walletAddress
    })
  },

  async claimRewardToBalance(rewardId: string, walletAddress: string) {
    return await supabase.rpc('claim_layer_reward', {
      p_reward_id: rewardId,
      p_member_wallet: walletAddress
    })
  },

  async getCurrentActivationTier(walletAddress: string) {
    return await supabase.rpc('get_current_activation_tier', {
      p_wallet_address: walletAddress
    })
  },

  async getCurrentWalletAddress() {
    return await supabase.rpc('get_current_wallet_address')
  },

  async getMatrixTree(walletAddress: string) {
    return await supabase.rpc('get_matrix_tree', {
      p_wallet_address: walletAddress
    })
  },

  async isAdmin(walletAddress: string) {
    return await supabase.rpc('is_admin', {
      p_wallet_address: walletAddress
    })
  },

  async isMemberActivated(walletAddress: string) {
    return await supabase.rpc('is_member_activated', {
      p_wallet_address: walletAddress
    })
  },

  async processMembershipActivation(walletAddress: string) {
    return await supabase.rpc('process_membership_activation', {
      p_wallet_address: walletAddress
    })
  },

  async processRewardRollup(walletAddress: string) {
    return await supabase.rpc('process_reward_rollup', {
      p_wallet_address: walletAddress
    })
  },

  async updateMatrixLayerSummary() {
    return await supabase.rpc('update_matrix_layer_summary')
  },

  async unlockBCCForNFTLevel(walletAddress: string, level: number) {
    return await supabase.rpc('unlock_bcc_for_nft_level', {
      p_wallet_address: walletAddress,
      p_level: level
    })
  },

  async updateUserBCCBalance(walletAddress: string, amount: number) {
    return await supabase.rpc('update_user_bcc_balance', {
      p_wallet_address: walletAddress,
      p_amount: amount
    })
  },

  async updateUserUSDTBalance(walletAddress: string, amount: number) {
    return await supabase.rpc('update_user_usdc_balance', {
      p_wallet_address: walletAddress,
      p_amount: amount
    })
  },

  async withdrawRewardBalance(walletAddress: string, amount: number) {
    return await supabase.rpc('withdraw_reward_balance', {
      p_wallet_address: walletAddress,
      p_amount: amount
    })
  },

  // All database functions are now implemented above
  // No stubs needed
}