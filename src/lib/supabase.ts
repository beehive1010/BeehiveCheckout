// Supabase client configuration for Beehive Platform
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create typed Supabase client for database operations
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Direct database function caller - typed according to database.types.ts
export const dbFunctions = {
  // User activation functions
  async activateNewUser(walletAddress: string) {
    return await supabase.rpc('activate_new_user', {
      p_wallet_address: walletAddress
    })
  },

  async activateMemberWithNFTClaim(walletAddress: string, nftType?: string, paymentMethod?: string, transactionHash?: string) {
    return await supabase.rpc('activate_member_with_nft_claim', {
      p_wallet_address: walletAddress,
      p_nft_type: nftType,
      p_payment_method: paymentMethod,
      p_transaction_hash: transactionHash
    })
  },

  async activateMemberWithTierRewards(walletAddress: string) {
    return await supabase.rpc('activate_member_with_tier_rewards', {
      p_wallet_address: walletAddress
    })
  },

  // Reward functions
  async claimRewardToBalance(claimId: string, walletAddress: string) {
    return await supabase.rpc('claim_reward_to_balance', {
      p_claim_id: claimId,
      p_wallet_address: walletAddress
    })
  },

  async claimPendingRewards(walletAddress: string) {
    return await supabase.rpc('claim_pending_rewards', {
      p_wallet_address: walletAddress
    })
  },

  // Calculation functions
  async calculateNFTTotalPrice(level: number) {
    return await supabase.rpc('calculate_nft_total_price', {
      p_level: level
    })
  },

  async calculateTotalNFTCost(level: number) {
    return await supabase.rpc('calculate_total_nft_cost', {
      p_level: level
    })
  },

  async calculateBCCUnlock(nftLevel: number, tier: number) {
    return await supabase.rpc('calculate_bcc_unlock', {
      p_nft_level: nftLevel,
      p_tier: tier
    })
  },

  // Reward checking functions
  async canReceiveLayerReward(claimNumber: number, layer: number, rootWallet: string) {
    return await supabase.rpc('can_receive_layer_reward', {
      p_claim_number: claimNumber,
      p_layer: layer,
      p_root_wallet: rootWallet
    })
  },

  async canRootClaimLayerReward(layer: number, rootWallet: string, layer1ClaimCount?: number) {
    return await supabase.rpc('can_root_claim_layer_reward', {
      p_layer: layer,
      p_root_wallet: rootWallet,
      p_layer_1_claim_count: layer1ClaimCount
    })
  },

  // Member management functions
  async createMemberWithPending(walletAddress: string, usePending?: boolean) {
    return await supabase.rpc('create_member_with_pending', {
      p_wallet_address: walletAddress,
      p_use_pending: usePending
    })
  },

  async countDirectReferrals(walletAddress: string) {
    return await supabase.rpc('count_direct_referrals', {
      p_wallet_address: walletAddress
    })
  },

  // Utility functions
  async cleanupExpiredUsers() {
    return await supabase.rpc('cleanup_expired_users', {})
  },

  // Admin functions
  async clearMemberActivationPending(adminWallet: string, targetWallet: string, reason?: string) {
    return await supabase.rpc('clear_member_activation_pending', {
      p_admin_wallet: adminWallet,
      p_target_wallet: targetWallet,
      p_reason: reason
    })
  },

  async setMemberActivationPending(adminWallet: string, targetWallet: string, pendingHours: number, reason?: string) {
    return await supabase.rpc('set_member_activation_pending', {
      p_admin_wallet: adminWallet,
      p_target_wallet: targetWallet,
      p_pending_hours: pendingHours,
      p_reason: reason
    })
  },

  async toggleActivationPendingGlobal(adminWallet: string, enabled: boolean, pendingHours?: number, reason?: string) {
    return await supabase.rpc('toggle_activation_pending_global', {
      p_admin_wallet: adminWallet,
      p_enabled: enabled,
      p_pending_hours: pendingHours,
      p_reason: reason
    })
  },

  async isAdmin(walletAddress: string) {
    return await supabase.rpc('is_admin', {
      p_wallet_address: walletAddress
    })
  },

  // Timer functions
  async createCountdownTimer(walletAddress: string, timerType: string, title: string, durationHours: number, description?: string, autoAction?: string, adminWallet?: string) {
    return await supabase.rpc('create_countdown_timer', {
      p_wallet_address: walletAddress,
      p_timer_type: timerType,
      p_title: title,
      p_duration_hours: durationHours,
      p_description: description,
      p_auto_action: autoAction,
      p_admin_wallet: adminWallet
    })
  },

  async getActiveCountdowns(walletAddress: string) {
    return await supabase.rpc('get_active_countdowns', {
      p_wallet_address: walletAddress
    })
  },

  // Referral functions
  async createReferralLink(walletAddress: string) {
    return await supabase.rpc('create_referral_link', {
      p_wallet_address: walletAddress
    })
  },

  async generateReferralToken(walletAddress: string) {
    return await supabase.rpc('generate_referral_token', {
      p_wallet_address: walletAddress
    })
  },

  async processReferralLink(referralToken: string, walletAddress?: string) {
    return await supabase.rpc('process_referral_link', {
      p_referral_token: referralToken,
      p_wallet_address: walletAddress
    })
  },

  async processReferralRewards(walletAddress: string, nftLevel: number) {
    return await supabase.rpc('process_referral_rewards', {
      p_wallet_address: walletAddress,
      p_nft_level: nftLevel
    })
  },

  // Matrix functions
  async findNextMatrixPosition(rootWallet: string, newMemberWallet: string) {
    return await supabase.rpc('find_next_matrix_position', {
      p_root_wallet: rootWallet,
      p_new_member_wallet: newMemberWallet
    })
  },

  async placeMemberInMatrix(rootWallet: string, memberWallet: string, placerWallet: string, matrixPosition: string) {
    return await supabase.rpc('place_member_in_matrix', {
      p_root_wallet: rootWallet,
      p_member_wallet: memberWallet,
      p_placer_wallet: placerWallet,
      p_matrix_position: matrixPosition
    })
  },

  async updateMatrixLayerSummary() {
    return await supabase.rpc('update_matrix_layer_summary', {})
  },

  // Layer reward functions
  async createLayerRewardClaim(rootWallet: string, layer: number, nftLevel: number, triggeringMemberWallet: string, transactionHash: string) {
    return await supabase.rpc('create_layer_reward_claim', {
      p_root_wallet: rootWallet,
      p_layer: layer,
      p_nft_level: nftLevel,
      p_triggering_member_wallet: triggeringMemberWallet,
      p_transaction_hash: transactionHash
    })
  },

  async createLayerRewardClaimWithNotifications(rootWallet: string, layer: number, nftLevel: number, triggeringMemberWallet: string, transactionHash: string) {
    return await supabase.rpc('create_layer_reward_claim_with_notifications', {
      p_root_wallet: rootWallet,
      p_layer: layer,
      p_nft_level: nftLevel,
      p_triggering_member_wallet: triggeringMemberWallet,
      p_transaction_hash: transactionHash
    })
  },

  async distributeLayerRewards(nftLevel: number, payerWallet: string, transactionHash: string) {
    return await supabase.rpc('distribute_layer_rewards', {
      p_nft_level: nftLevel,
      p_payer_wallet: payerWallet,
      p_transaction_hash: transactionHash
    })
  },

  // Purchase processing functions
  async processBCCPurchase(walletAddress: string, amountUsdt: number, transactionHash: string, sourceTransactionId?: string) {
    return await supabase.rpc('process_bcc_purchase', {
      p_wallet_address: walletAddress,
      p_amount_usdt: amountUsdt,
      p_transaction_hash: transactionHash,
      p_source_transaction_id: sourceTransactionId
    })
  },

  async processNFTPurchaseWithRequirements(walletAddress: string, nftLevel: number, paymentAmountUsdc: number, transactionHash: string) {
    return await supabase.rpc('process_nft_purchase_with_requirements', {
      p_wallet_address: walletAddress,
      p_nft_level: nftLevel,
      p_payment_amount_usdc: paymentAmountUsdc,
      p_transaction_hash: transactionHash
    })
  },

  async processNFTPurchaseWithUnlock(walletAddress: string, nftLevel: number, paymentAmountUsdc: number, transactionHash: string) {
    return await supabase.rpc('process_nft_purchase_with_unlock', {
      p_wallet_address: walletAddress,
      p_nft_level: nftLevel,
      p_payment_amount_usdc: paymentAmountUsdc,
      p_transaction_hash: transactionHash
    })
  },

  // BCC and token functions
  async spendBCCTokens(walletAddress: string, amountBcc: number, itemType: string, itemId: string) {
    return await supabase.rpc('spend_bcc_tokens', {
      p_wallet_address: walletAddress,
      p_amount_bcc: amountBcc,
      p_item_type: itemType,
      p_item_id: itemId
    })
  },

  async unlockBCCForNFTLevel(walletAddress: string, nftLevel: number) {
    return await supabase.rpc('unlock_bcc_for_nft_level', {
      p_wallet_address: walletAddress,
      p_nft_level: nftLevel
    })
  },

  // Withdrawal functions
  async withdrawRewardBalance(walletAddress: string, amountUsdt: number) {
    return await supabase.rpc('withdraw_reward_balance', {
      p_wallet_address: walletAddress,
      p_amount_usdt: amountUsdt
    })
  },

  // Information functions
  async getCurrentWalletAddress() {
    return await supabase.rpc('get_current_wallet_address', {})
  },

  async getDefaultPendingHours() {
    return await supabase.rpc('get_default_pending_hours', {})
  },

  async getMemberTier(walletAddress: string) {
    return await supabase.rpc('get_member_tier', {
      p_wallet_address: walletAddress
    })
  },

  async getNFTFeeBreakdown(nftLevel: number) {
    return await supabase.rpc('get_nft_fee_breakdown', {
      p_nft_level: nftLevel
    })
  },

  async getPendingActivations(adminWallet: string) {
    return await supabase.rpc('get_pending_activations', {
      p_admin_wallet: adminWallet
    })
  },

  async isActivationPendingEnabled() {
    return await supabase.rpc('is_activation_pending_enabled', {})
  },

  async isValidWalletAddress(walletAddress: string) {
    return await supabase.rpc('is_valid_wallet_address', {
      p_wallet_address: walletAddress
    })
  },

  // Processing and maintenance functions
  async processActivationRewards(walletAddress: string, nftLevel: number) {
    return await supabase.rpc('process_activation_rewards', {
      p_wallet_address: walletAddress,
      p_nft_level: nftLevel
    })
  },

  async processExpiredRewards() {
    return await supabase.rpc('process_expired_rewards', {})
  },

  async processRewardSystemMaintenance() {
    return await supabase.rpc('process_reward_system_maintenance', {})
  },

  async runScheduledCleanup() {
    return await supabase.rpc('run_scheduled_cleanup', {})
  },

  async updateMemberRequirements(walletAddress: string) {
    return await supabase.rpc('update_member_requirements', {
      p_wallet_address: walletAddress
    })
  },

  async upsertUser(walletAddress: string, username?: string) {
    return await supabase.rpc('upsert_user', {
      p_wallet_address: walletAddress,
      p_username: username
    })
  },

  // Wallet session functions
  async createWalletSession(walletAddress: string, signature: string, message: string) {
    return await supabase.rpc('create_wallet_session', {
      p_wallet_address: walletAddress,
      p_signature: signature,
      p_message: message
    })
  },

  async validateWalletSignature(walletAddress: string, signature: string, message: string) {
    return await supabase.rpc('validate_wallet_signature', {
      p_wallet_address: walletAddress,
      p_signature: signature,
      p_message: message
    })
  },

  // Notification functions
  async createRewardCountdownNotification(walletAddress: string, timerId: string) {
    return await supabase.rpc('create_reward_countdown_notification', {
      p_wallet_address: walletAddress,
      p_timer_id: timerId
    })
  }
}

// Supabase Edge Function client with wallet authentication
export class SupabaseApiClient {
  private baseUrl: string
  private anonKey: string
  
  constructor() {
    this.baseUrl = `${supabaseUrl}/functions/v1`
    this.anonKey = supabaseAnonKey
  }

  private async getHeaders(walletAddress?: string, requireAuth = true) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.anonKey}` // Always use anon key for our custom functions
    }

    if (walletAddress) {
      headers['x-wallet-address'] = walletAddress // Preserve original case for withdrawal compatibility
    }

    return headers
  }

  private async getUnauthenticatedHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.anonKey}`
    }
  }

  async callFunction(
    functionName: string, 
    data: any, 
    walletAddress?: string,
    requireAuth = true
  ): Promise<any> {
    const response = await fetch(`${this.baseUrl}/${functionName}`, {
      method: 'POST',
      headers: await this.getHeaders(walletAddress, requireAuth),
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API Error: ${response.status} - ${errorText}`)
    }

    return response.json()
  }

  // Authentication methods
  async login(walletAddress: string, signature: string, message: string) {
    return this.callFunction('auth', {
      action: 'login',
      signature,
      message
    }, walletAddress)
  }

  async register(
    walletAddress: string, 
    referrerWallet?: string, 
    username?: string, 
    email?: string
  ) {
    return this.callFunction('auth', {
      action: 'register',
      referrerWallet,
      username,
      email
    }, walletAddress, false) // No auth required
  }

  async getUser(walletAddress: string) {
    return this.callFunction('auth', {
      action: 'get-user'
    }, walletAddress, false) // No auth required
  }

  async activateMembership(walletAddress: string) {
    // After membership activation, user will need auth for future operations
    return this.callFunction('auth', {
      action: 'activate-membership'
    }, walletAddress, true) // Require auth after activation
  }

  async upgradeToLevel(walletAddress: string, nftLevel: number, paymentAmountUsdc: number, transactionHash: string) {
    return this.callFunction('nft-upgrade', {
      wallet_address: walletAddress,
      nft_level: nftLevel,
      payment_amount_usdc: paymentAmountUsdc,
      transaction_hash: transactionHash
    }, walletAddress, false) // No auth required for first NFT claim
  }

  // Referral link methods
  async createReferralLink(
    walletAddress: string, 
    baseUrl = 'https://beehive-platform.com/register',
    maxUses?: number, 
    expiresDays?: number
  ) {
    return this.callFunction('auth', {
      action: 'create-referral-link',
      baseUrl,
      maxUses,
      expiresDays
    }, walletAddress)
  }

  async processReferralLink(walletAddress: string, referralToken: string) {
    return this.callFunction('auth', {
      action: 'process-referral-link',
      referralToken
    }, walletAddress)
  }

  // Process referral link click (without registration)
  async trackReferralClick(referralToken: string) {
    return this.callFunction('auth', {
      action: 'process-referral-link',
      referralToken
    }) // No wallet address = just click tracking
  }

  // Note: Countdown and pending functions removed - not supported in simplified auth
  // These would need separate Edge Functions if required

  // BCC Purchase methods
  async getBccConfig() {
    return this.callFunction('bcc-purchase', {
      action: 'get-config'
    })
  }

  async createBccPurchase(
    walletAddress: string, 
    amountUSDC: number, 
    network: string, 
    paymentMethod: string,
    transactionHash?: string,
    bridgeUsed?: boolean
  ) {
    return this.callFunction('bcc-purchase', {
      action: 'create-purchase',
      amountUSDC,
      network,
      paymentMethod,
      transactionHash,
      bridgeUsed
    }, walletAddress)
  }

  async confirmBccPayment(
    walletAddress: string,
    orderId: string,
    transactionHash: string,
    actualAmountReceived?: number
  ) {
    return this.callFunction('bcc-purchase', {
      action: 'confirm-payment',
      orderId,
      transactionHash,
      actualAmountReceived
    }, walletAddress)
  }

  async getBccHistory(walletAddress: string, limit = 20, offset = 0) {
    return this.callFunction('bcc-purchase', {
      action: 'get-history',
      limit,
      offset
    }, walletAddress)
  }

  async getPendingBccPurchases(walletAddress: string) {
    return this.callFunction('bcc-purchase', {
      action: 'get-pending'
    }, walletAddress)
  }

  // Matrix methods
  async getMatrix(walletAddress: string, rootWallet?: string, layer?: number) {
    return this.callFunction('matrix', {
      action: 'get-matrix',
      rootWallet: rootWallet || walletAddress,
      layer
    }, walletAddress)
  }

  async placeMember(
    walletAddress: string,
    rootWallet: string,
    memberWallet: string,
    placerWallet: string,
    placementType = 'direct'
  ) {
    return this.callFunction('matrix', {
      action: 'place-member',
      rootWallet,
      memberWallet,
      placerWallet,
      placementType
    }, walletAddress)
  }

  async getDownline(walletAddress: string, layer?: number, limit = 50, offset = 0) {
    return this.callFunction('matrix', {
      action: 'get-downline',
      layer,
      limit,
      offset
    }, walletAddress)
  }

  async getUpline(walletAddress: string) {
    return this.callFunction('matrix', {
      action: 'get-upline'
    }, walletAddress)
  }

  async getMatrixStats(walletAddress: string) {
    return this.callFunction('matrix', {
      action: 'get-matrix-stats'
    }, walletAddress)
  }

  // Rewards methods
  async getRewards(walletAddress: string, level?: number, layer?: number, limit = 50, offset = 0) {
    return this.callFunction('rewards', {
      action: 'get-rewards',
      level,
      layer,
      limit,
      offset
    }, walletAddress)
  }

  async claimRewards(walletAddress: string, rewardIds: string[]) {
    return this.callFunction('rewards', {
      action: 'claim-rewards',
      rewardIds
    }, walletAddress)
  }

  async getRewardHistory(walletAddress: string, limit = 50, offset = 0) {
    return this.callFunction('rewards', {
      action: 'get-reward-history',
      limit,
      offset
    }, walletAddress)
  }

  async getPendingRewards(walletAddress: string) {
    return this.callFunction('rewards', {
      action: 'get-pending-rewards'
    }, walletAddress)
  }

  // NFT Upgrade methods
  async getLevelInfo(walletAddress: string, level?: number) {
    return this.callFunction('nft-upgrade', {
      action: 'get-level-info',
      level
    }, walletAddress, false) // No auth required to view level info
  }

  async checkUpgradeEligibility(walletAddress: string, level: number) {
    return this.callFunction('nft-upgrade', {
      action: 'check-eligibility',
      level
    }, walletAddress, false) // No auth required to check eligibility
  }

  async processUpgrade(
    walletAddress: string,
    level: number,
    paymentMethod: string,
    transactionHash?: string,
    network?: string
  ) {
    // Level 1 NFT claims never require authentication
    const requiresAuth = level !== 1
    
    return this.callFunction('nft-upgrade', {
      action: 'process-upgrade',
      level,
      paymentMethod,
      transactionHash,
      network
    }, walletAddress, requiresAuth)
  }

  async getUpgradeHistory(walletAddress: string, limit = 20, offset = 0) {
    return this.callFunction('nft-upgrade', {
      action: 'get-upgrade-history',
      limit,
      offset
    }, walletAddress)
  }

  // Balance methods
  async getBalance(walletAddress: string) {
    return this.callFunction('balance', {
      action: 'get-balance'
    }, walletAddress)
  }

  async getTransactions(walletAddress: string, limit = 50, offset = 0) {
    return this.callFunction('balance', {
      action: 'get-transactions',
      limit,
      offset
    }, walletAddress)
  }

  async transferBcc(
    walletAddress: string,
    amount: number,
    recipientWallet: string,
    purpose?: string
  ) {
    return this.callFunction('balance', {
      action: 'transfer-bcc',
      amount,
      recipientWallet,
      purpose
    }, walletAddress)
  }

  async spendBcc(
    walletAddress: string,
    amount: number,
    itemType: string,
    itemId: string,
    purpose?: string,
    nftType?: string
  ) {
    return this.callFunction('balance', {
      action: 'spend-bcc',
      amount,
      itemType,
      itemId,
      purpose,
      nftType
    }, walletAddress)
  }

  async getEarningHistory(walletAddress: string, limit = 50, offset = 0) {
    return this.callFunction('balance', {
      action: 'get-earning-history',
      limit,
      offset
    }, walletAddress)
  }

  // Admin methods (require admin privileges)
  async getAdminSettings(adminWallet: string) {
    return this.callFunction('admin', {
      action: 'get-settings'
    }, adminWallet)
  }

  async toggleGlobalPending(adminWallet: string, enabled: boolean, reason?: string) {
    return this.callFunction('admin', {
      action: 'toggle-global-pending',
      enabled,
      reason
    }, adminWallet)
  }

  async setMemberPending(
    adminWallet: string,
    targetWallet: string,
    pendingHours: number,
    reason?: string
  ) {
    return this.callFunction('admin', {
      action: 'set-member-pending',
      targetWallet,
      pendingHours,
      reason
    }, adminWallet)
  }

  async clearMemberPending(
    adminWallet: string,
    targetWallet: string,
    reason?: string
  ) {
    return this.callFunction('admin', {
      action: 'clear-member-pending',
      targetWallet,
      reason
    }, adminWallet)
  }

  async getPendingMembers(adminWallet: string) {
    return this.callFunction('admin', {
      action: 'get-pending-members'
    }, adminWallet)
  }

  async getAdminActions(adminWallet: string, limit = 50, offset = 0) {
    return this.callFunction('admin', {
      action: 'get-admin-actions',
      limit,
      offset
    }, adminWallet)
  }
}

export const supabaseApi = new SupabaseApiClient()