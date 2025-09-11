import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.types';

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

// Create typed Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Edge Functions base URL
export const EDGE_FUNCTIONS_URL = `${supabaseUrl}/functions/v1`;

// Utility function to call Supabase Edge Functions
export async function callEdgeFunction(
  functionName: string,
  data: any = {},
  walletAddress?: string
): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseKey}`,
  };

  if (walletAddress) {
    headers['x-wallet-address'] = walletAddress;
  }

  try {
    const response = await fetch(`${EDGE_FUNCTIONS_URL}/${functionName}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Edge Function [${functionName}] Error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Edge Function [${functionName}] Error:`, error);
    throw error;
  }
}

// === USER AUTHENTICATION & REGISTRATION ===
export const authService = {
  // Register user via Edge Function to bypass RLS
  async registerUser(walletAddress: string, username: string, email?: string, referrerWallet?: string) {
    try {
      const result = await callEdgeFunction('auth', {
        action: 'register',
        username,
        email,
        referrerWallet
      }, walletAddress);

      if (!result.success) {
        throw new Error(result.error || result.message || 'Registration failed');
      }

      // Handle both new registration and existing user cases
      return { 
        data: result.user, 
        error: null,
        isExisting: result.action === 'exists'
      };
    } catch (error: any) {
      console.error('Registration error:', error);
      return { data: null, error: { message: error.message } };
    }
  },

  // Get user by wallet address via Edge Function
  async getUser(walletAddress: string) {
    try {
      const result = await callEdgeFunction('auth', {
        action: 'get-user'
      }, walletAddress);

      if (!result.success) {
        return { data: null, error: { message: result.error || 'User not found' } };
      }

      return { data: result.user, error: null };
    } catch (error: any) {
      console.error('Error getting user:', error);
      return { data: null, error: { message: error.message } };
    }
  },

  // Check if user exists via Auth Edge Function
  async userExists(walletAddress: string) {
    try {
      const result = await callEdgeFunction('auth', {
        action: 'get-user'
      }, walletAddress);

      return { exists: result.success && result.isRegistered, error: null };
    } catch (error: any) {
      // If edge function has issues, fall back to assuming user doesn't exist
      console.warn('Auth edge function error, assuming user does not exist:', error.message);
      return { exists: false, error: null };
    }
  },

  // Get member info via activate-membership Edge Function (check_existing) to bypass RLS
  async getMemberInfo(walletAddress: string) {
    try {
      // Use fast database-only get-member-info instead of slow blockchain check_existing
      const result = await callEdgeFunction('activate-membership', {
        action: 'get-member-info'
      }, walletAddress);
      
      if (!result.success) {
        return { data: null, error: { message: result.error || result.message || 'Member not found' } };
      }
      
      console.log('🔍 getMemberInfo API result:', {
        success: result.success,
        isActivated: result.isActivated,
        currentLevel: result.currentLevel,
        hasMemberData: !!result.member
      });
      
      // Extract member data from the get-member-info response
      const memberData = result.member || null;
      // Also include the isActivated field from the API response
      return { 
        data: memberData, 
        isActivated: result.isActivated,
        currentLevel: result.currentLevel,
        error: null 
      };
    } catch (error: any) {
      console.error('Error getting member info:', error);
      return { data: null, error: { message: error.message } };
    }
  },

  // Check if user is activated member via activate-membership Edge Function (check_existing)
  async isActivatedMember(walletAddress: string) {
    try {
      const result = await callEdgeFunction('activate-membership', {
        transactionHash: 'check_existing',
        level: 1
      }, walletAddress);
      
      if (!result.success) {
        return { isActivated: false, memberData: null, error: { message: result.error || result.message } };
      }
      
      const memberData = result.member || null;
      const isActivated = result.hasNFT || (memberData?.current_level > 0) || false;
      
      console.log(`🔍 Member activation status for ${walletAddress}:`, { 
        isActivated, 
        level: memberData?.current_level,
        hasNFT: result.hasNFT 
      });
      
      return { 
        isActivated, 
        memberData, 
        error: null 
      };
    } catch (error: any) {
      console.error('Error checking member activation:', error);
      return { isActivated: false, memberData: null, error: { message: error.message } };
    }
  },
};

// === NFT LEVELS & PRICING ===
export const nftService = {
  // Get all active NFT levels
  async getNFTLevels() {
    return supabase
      .from('nft_levels')
      .select('*')
      .eq('is_active', true)
      .order('level', { ascending: true });
  },

  // Get specific NFT level
  async getNFTLevel(level: number) {
    return supabase
      .from('nft_levels')
      .select('*')
      .eq('level', level)
      .eq('is_active', true)
      .single();
  },

  // Check NFT upgrade eligibility using Edge Function
  async checkUpgradeEligibility(walletAddress: string, level: number) {
    return callEdgeFunction('nft-upgrades', {
      action: 'check-eligibility',
      level,
    }, walletAddress);
  },

  // Process NFT upgrade using Edge Function
  async processNFTUpgrade(walletAddress: string, upgradeData: {
    level: number;
    transactionHash: string;
    payment_amount_usdc: number;
    paymentMethod?: string;
    network?: string;
  }) {
    return callEdgeFunction('nft-upgrades', {
      action: 'process-upgrade',
      ...upgradeData,
    }, walletAddress);
  },
};

// === ORDERS & PURCHASES ===
export const orderService = {
  // Create order record
  async createOrder(orderData: Database['public']['Tables']['bcc_purchase_orders']['Insert']) {
    return supabase
      .from('bcc_purchase_orders')
      .insert([{
        ...orderData,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();
  },

  // Get user orders
  async getUserOrders(walletAddress: string, limit = 50) {
    return supabase
      .from('bcc_purchase_orders')
      .select('*')
      .ilike('wallet_address', walletAddress)
      .order('created_at', { ascending: false })
      .limit(limit);
  },

  // Create NFT purchase record
  async createNFTPurchase(purchaseData: Database['public']['Tables']['nft_purchases']['Insert']) {
    return supabase
      .from('nft_purchases')
      .insert([{
        ...purchaseData,
        purchased_at: new Date().toISOString(),
      }])
      .select()
      .single();
  },

  // Update order status
  async updateOrderStatus(orderId: string, status: string, completedAt?: string) {
    return supabase
      .from('bcc_purchase_orders')
      .update({ 
        status, 
        completed_at: completedAt || null,
      })
      .eq('id', orderId)
      .select()
      .single();
  },
};

// === MEMBER MANAGEMENT ===
export const memberService = {
  // Create member record (activation)
  async createMember(memberData: Database['public']['Tables']['members']['Insert']) {
    return supabase
      .from('members')
      .insert([{
        ...memberData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();
  },

  // Update member information
  async updateMember(walletAddress: string, updates: Database['public']['Tables']['members']['Update']) {
    return supabase
      .from('members')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .ilike('wallet_address', walletAddress)
      .select()
      .single();
  },

  // Get member activation tiers
  async getActivationTiers() {
    return supabase
      .from('member_activation_tiers')
      .select('*')
      .eq('is_active', true)
      .order('tier', { ascending: true });
  },

  // Get current activation tier (based on total activated members)
  async getCurrentActivationTier() {
    // This could be implemented with a database function or calculated
    const { count } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('is_activated', true);

    if (!count) return 1;
    
    if (count <= 9999) return 1;
    if (count <= 29999) return 2; // 10k-29k
    if (count <= 99999) return 3; // 30k-99k
    return 4; // 100k+
  },
};

// === MATRIX & REFERRALS ===
export const matrixService = {
  // Place member in 3x3 matrix using Edge Function
  // Automatically finds optimal placement with L→M→R priority  
  async placeMemberInMatrix(
    memberWallet: string,
    placerWallet: string,
    rootWallet: string,
    placementType: string = 'direct'
  ) {
    return callEdgeFunction('matrix', {
      action: 'place-member',
      rootWallet,
      memberWallet,
      placerWallet,
      placementType
    }, memberWallet);
  },

  // Find available placement position in matrix using Edge Function
  async findAvailablePlacement(rootWallet: string, newMemberWallet: string) {
    return callEdgeFunction('matrix', {
      action: 'find-optimal-position',
      rootWallet,
      memberWallet: newMemberWallet
    }, newMemberWallet);
  },

  // Get matrix tree structure using Edge Function
  async getMatrixTree(rootWallet: string, layer?: number) {
    return callEdgeFunction('matrix', {
      action: 'get-matrix',
      rootWallet,
      layer
    }, rootWallet);
  },

  // Get downline members using Edge Function
  async getDownline(walletAddress: string, layer?: number, limit = 50, offset = 0) {
    return callEdgeFunction('matrix', {
      action: 'get-downline',
      layer,
      limit,
      offset
    }, walletAddress);
  },

  // Get upline chain using Edge Function  
  async getUpline(walletAddress: string) {
    return callEdgeFunction('matrix', {
      action: 'get-upline'
    }, walletAddress);
  },

  // Process spillover using Edge Function
  async processSpillover(rootWallet: string, triggerLayer: number) {
    return callEdgeFunction('matrix', {
      action: 'process-spillover',
      rootWallet,
      triggerLayer
    }, rootWallet);
  },

  // Get referrals for a root wallet
  async getReferrals(rootWallet: string, layer?: number) {
    let query = supabase
      .from('referrals')
      .select(`
        *,
        member_info:users!referrals_member_wallet_fkey(wallet_address, username)
      `)
      .eq('matrix_root', rootWallet)
      .eq('is_active', true);

    if (layer) {
      query = query.eq('matrix_layer', layer);
    }

    return query.order('placed_at', { ascending: true });
  },

  // Get matrix statistics using direct database queries for real data
  async getMatrixStats(walletAddress: string) {
    try {
      // Get direct referrals count (layer 1 referrals) - use ilike for case-insensitive matching
      const { count: directReferralsCount } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .ilike('matrix_parent', walletAddress)
        .eq('matrix_layer', 1);

      // Get total team size (all referrals) - use ilike for case-insensitive matching
      const { count: totalTeamSize } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .ilike('matrix_root', walletAddress);

      // Get max layer - use ilike for case-insensitive matching
      const { data: maxLayerData } = await supabase
        .from('referrals')
        .select('matrix_layer')
        .ilike('matrix_root', walletAddress)
        .order('matrix_layer', { ascending: false })
        .limit(1);

      const maxLayer = maxLayerData?.[0]?.matrix_layer || 0;

      // Get recent activity (last 10 referrals) - use ilike for case-insensitive matching
      const { data: recentActivity } = await supabase
        .from('referrals')
        .select(`
          member_wallet,
          placed_at,
          matrix_layer,
          matrix_position,
          is_active
        `)
        .ilike('matrix_root', walletAddress)
        .order('placed_at', { ascending: false })
        .limit(10);

      return {
        success: true,
        data: {
          directReferrals: directReferralsCount || 0,
          totalTeamSize: totalTeamSize || 0,
          maxLayer: maxLayer,
          recentActivity: recentActivity || []
        }
      };
    } catch (error) {
      console.error('Error fetching matrix stats:', error);
      return {
        success: false,
        error: error,
        data: {
          directReferrals: 0,
          totalTeamSize: 0,
          maxLayer: 0,
          recentActivity: []
        }
      };
    }
  },

  // Create referral record (usually handled by matrix placement)
  async createReferral(referralData: {
    root_wallet: string;
    member_wallet: string;
    parent_wallet?: string;
    placer_wallet: string;
    position: string;
    layer: number;
    placement_type: string;
    referrer_wallet?: string;
  }) {
    return supabase
      .from('referrals')
      .insert([{
        ...referralData,
        is_active: true,
        referrer_wallet: referralData.referrer_wallet || referralData.placer_wallet,
      }])
      .select()
      .single();
  },

  // Update referral status
  async updateReferralStatus(referralId: string, isActive: boolean) {
    return supabase
      .from('referrals')
      .update({ is_active: isActive })
      .eq('id', referralId)
      .select()
      .single();
  },

  // Count direct referrals (layer 1 referrals placed by this wallet)
  async countDirectReferrals(walletAddress: string) {
    const { count } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('placer_wallet', walletAddress)
      .eq('layer', 1);

    return count || 0;
  },
};

// === REWARDS MANAGEMENT ===
export const rewardService = {
  // Get reward dashboard data using Edge Function
  async getRewardDashboard(walletAddress: string) {
    return callEdgeFunction('rewards', {
      action: 'dashboard'
    }, walletAddress);
  },

  // Get claimable rewards using direct database queries for real data
  async getClaimableRewards(walletAddress: string) {
    try {
      // Get all reward claims for statistics
      const { data: allRewards, error: allError } = await supabase
        .from('reward_claims')
        .select(`
          id,
          reward_amount_usdc,
          status,
          created_at,
          expires_at,
          claimed_at,
          layer,
          nft_level,
          root_wallet
        `)
        .ilike('root_wallet', walletAddress)
        .order('created_at', { ascending: false });

      if (allError) throw allError;

      // Get claimable rewards (pending and available)
      const claimableRewards = allRewards?.filter(r => ['pending', 'available'].includes(r.status)) || [];
      const pendingRewards = allRewards?.filter(r => r.status === 'pending') || [];
      const availableRewards = allRewards?.filter(r => r.status === 'available') || [];
      const claimedRewards = allRewards?.filter(r => r.status === 'completed') || [];

      // Calculate total claimed amount (ensure numeric conversion)
      const totalClaimed = claimedRewards.reduce((sum, reward) => sum + Number(reward.reward_amount_usdc || 0), 0);
      const totalPending = pendingRewards.reduce((sum, reward) => sum + Number(reward.reward_amount_usdc || 0), 0);
      const totalAvailable = availableRewards.reduce((sum, reward) => sum + Number(reward.reward_amount_usdc || 0), 0);

      return { 
        success: true, 
        claimable: claimableRewards,
        pending: pendingRewards,
        available: availableRewards,
        claimed: claimedRewards,
        totalClaimed: totalClaimed,
        totalPending: totalPending,
        totalAvailable: totalAvailable,
        stats: {
          totalClaimed: totalClaimed,
          totalPending: totalPending,
          totalAvailable: totalAvailable,
          claimableCount: claimableRewards.length,
          pendingCount: pendingRewards.length,
          availableCount: availableRewards.length,
          claimedCount: claimedRewards.length
        }
      };
    } catch (error: any) {
      console.error('Error fetching claimable rewards:', error);
      return { 
        success: false, 
        error: error.message, 
        claimable: [], 
        pending: [], 
        available: [],
        claimed: [],
        totalClaimed: 0,
        totalPending: 0,
        totalAvailable: 0,
        stats: {
          totalClaimed: 0,
          totalPending: 0,
          totalAvailable: 0,
          claimableCount: 0,
          pendingCount: 0,
          availableCount: 0,
          claimedCount: 0
        }
      };
    }
  },

  // Get reward balance using Edge Function
  async getRewardBalance(walletAddress: string) {
    return callEdgeFunction('rewards', {
      action: 'get-balance'
    }, walletAddress);
  },

  // Get reward history using Edge Function
  async getRewardHistory(walletAddress: string, limit = 50) {
    return callEdgeFunction('rewards', {
      action: 'get-claims'
    }, walletAddress);
  },

  // Claim reward using Edge Function
  async claimReward(walletAddress: string, rewardId: string) {
    return callEdgeFunction('rewards', {
      action: 'claim-reward',
      reward_id: rewardId
    }, walletAddress);
  },

  // Withdraw reward balance using Edge Function
  async withdrawRewardBalance(walletAddress: string, withdrawData: {
    amount_usdt?: number;
    amount_bcc?: number;
    withdrawal_address: string;
    withdrawal_type: 'usdt' | 'bcc';
  }) {
    return callEdgeFunction('rewards', {
      action: 'withdraw-balance',
      ...withdrawData
    }, walletAddress);
  },

  // Get reward notifications using Edge Function
  async getRewardNotifications(walletAddress: string) {
    return callEdgeFunction('rewards', {
      action: 'get-notifications'
    }, walletAddress);
  },

  // Get reward timers using Edge Function
  async getRewardTimers(walletAddress: string) {
    return callEdgeFunction('rewards', {
      action: 'get-reward-timers'
    }, walletAddress);
  },

  // Create layer reward using Edge Function
  async createLayerReward(payer_wallet: string, amount_usdt: number, nft_level: number, source_transaction_id: string) {
    return callEdgeFunction('rewards', {
      action: 'create-layer-reward',
      nft_level,
      layer: nft_level,
      root_wallet: payer_wallet,
      triggering_member_wallet: payer_wallet,
      transaction_hash: source_transaction_id
    }, payer_wallet);
  },

  // Distribute layer rewards using Edge Function
  async distributeLayerRewards(payer_wallet: string, amount_usdt: number, nft_level: number, source_transaction_id: string) {
    return callEdgeFunction('rewards', {
      action: 'distribute-layer-rewards',
      payer_wallet,
      amount_usdt,
      nft_level,
      source_transaction_id
    }, payer_wallet);
  },

  // Check pending rewards using Edge Function
  async checkPendingRewards(walletAddress: string) {
    return callEdgeFunction('rewards', {
      action: 'check-pending-rewards'
    }, walletAddress);
  },
};

// === BALANCE MANAGEMENT ===
export const balanceService = {
  // Get user balance using direct database queries for real data
  async getUserBalance(walletAddress: string) {
    try {
      console.log('🔍 Getting balance for wallet:', walletAddress);
      
      // Get user balance from user_balances table
      const { data: balanceData, error: balanceError } = await supabase
        .from('user_balances')
        .select('*')
        .ilike('wallet_address', walletAddress)
        .single();

      if (balanceError && balanceError.code !== 'PGRST116') {
        console.error('❌ Error fetching balance:', balanceError);
        throw balanceError;
      }

      console.log('💰 Raw balance data:', balanceData);

      // If no balance record exists, create default one or return defaults
      if (!balanceData) {
        console.log('📝 No balance record found, returning defaults');
        return {
          success: true,
          data: {
            wallet_address: walletAddress,
            bcc_transferable: 0,
            bcc_locked: 0,
            bcc_total: 0,
            usdc_claimable: 0,
            usdc_total_earned: 0,
            last_updated: new Date().toISOString()
          }
        };
      }

      return {
        success: true,
        data: balanceData
      };
    } catch (error) {
      console.error('❌ Failed to get user balance:', error);
      return {
        success: false,
        error,
        data: null
      };
    }
  },

  // Get balance breakdown using Edge Function
  async getBalanceBreakdown(walletAddress: string) {
    return callEdgeFunction('balance', {
      action: 'breakdown',
    }, walletAddress);
  },

  // Update BCC balance using Edge Function
  async updateBccBalance(walletAddress: string, changes: {
    transferable?: number;
    restricted?: number;
    locked?: number;
  }, reason: string) {
    return callEdgeFunction('balance', {
      action: 'update-bcc',
      changes,
      reason,
    }, walletAddress);
  },
};

// === ACTIVATION PROCESSING ===
export const activationService = {
  // Complete member activation using database function
  async completeMemberActivation(walletAddress: string, activationData: {
    transactionHash: string;
    nftLevel: number;
    paymentMethod: string;
    paymentAmountUsdc: number;
    referrerWallet?: string;
  }) {
    // Use the comprehensive activation function that handles NFT, member creation, matrix placement, and rewards
    return callEdgeFunction('membership', {
      action: 'activate-member-with-nft-claim',
      wallet_address: walletAddress,
      transaction_hash: activationData.transactionHash,
      payment_method: activationData.paymentMethod,
      nft_type: `level_${activationData.nftLevel}`
    }, walletAddress);
  },

  // Process NFT upgrade using Edge Function
  async processNFTUpgrade(walletAddress: string, upgradeData: {
    level: number;
    transactionHash: string;
    payment_method: string;
    payment_amount_usdc: number;
    network?: string;
  }) {
    return callEdgeFunction('nft-upgrades', {
      action: 'upgrade-level',
      ...upgradeData,
      wallet_address: walletAddress
    }, walletAddress);
  },

  // Process activation rewards using Edge Function
  async processActivationRewards(walletAddress: string, nftLevel: number) {
    return callEdgeFunction('rewards', {
      action: 'process-activation-rewards',
      new_member_wallet: walletAddress,
      activation_level: nftLevel,
      tx_hash: `activation_${walletAddress}_${Date.now()}`
    }, walletAddress);
  },

  // Activate member with tier rewards using Edge Function
  async activateMemberWithTierRewards(walletAddress: string) {
    return callEdgeFunction('membership', {
      action: 'activate-member-with-tier-rewards',
      wallet_address: walletAddress
    }, walletAddress);
  },

  // Check if member can be activated (has all requirements)
  async checkActivationEligibility(walletAddress: string) {
    try {
      // Check if user is already activated
      const { data: memberData } = await supabase
        .from('members')
        .select('current_level')
        .ilike('wallet_address', walletAddress)
        .single();

      if (memberData?.current_level && memberData.current_level > 0) {
        return {
          eligible: false,
          reason: 'Member is already activated',
          data: memberData
        };
      }

      // Check if user exists in users table
      const { data: userData } = await supabase
        .from('users')
        .select('wallet_address, username, referrer_wallet')
        .ilike('wallet_address', walletAddress)
        .single();

      if (!userData) {
        return {
          eligible: false,
          reason: 'User must be registered first',
          data: null
        };
      }

      return {
        eligible: true,
        reason: 'Ready for activation',
        data: userData
      };

    } catch (error) {
      console.error('Eligibility check error:', error);
      return {
        eligible: false,
        reason: 'Error checking eligibility',
        data: null
      };
    }
  },
};

// === TRANSACTION HISTORY ===
export const transactionService = {
  // Get transaction history for a wallet
  async getTransactionHistory(walletAddress: string, limit = 50, offset = 0): Promise<{
    success: boolean;
    data: any[];
    errors: string[];
    hasErrors: boolean;
  }> {
    const transactions: any[] = [];
    let hasErrors = false;
    const errors: string[] = [];

    // Get NFT purchases from orders table using Edge Function fallback
    try {
      const orderResult = await callEdgeFunction('transactions', {
        action: 'get-orders',
        wallet_address: walletAddress,
        limit,
        offset
      }, walletAddress);

      if (orderResult.success && orderResult.data) {
        orderResult.data.forEach((order: any) => {
          transactions.push({
            id: `order_${order.id || Date.now()}`,
            type: 'nft_purchase' as const,
            category: 'debit' as const,
            amount: order.total_amount || order.amount || 0,
            currency: (order.currency || 'USDT') as 'USDT' | 'USDC',
            status: (order.status || 'pending') as 'pending' | 'completed' | 'failed' | 'cancelled',
            title: `NFT Level ${order.metadata?.level || order.level || 'Unknown'} Purchase`,
            description: `Purchased membership NFT Level ${order.metadata?.level || order.level || 'Unknown'}`,
            created_at: order.created_at || new Date().toISOString(),
            completed_at: order.completed_at,
            transaction_hash: order.transaction_hash,
            network: order.network || 'arbitrum-sepolia',
            metadata: order.metadata
          });
        });
      } else {
        hasErrors = true;
        errors.push('Failed to load purchase history');
      }
    } catch (error) {
      console.error('Error in orders query:', error);
      hasErrors = true;
      errors.push('Failed to load purchase history');
    }

    // Get reward claims using Edge Function fallback
    try {
      const rewardResult = await callEdgeFunction('transactions', {
        action: 'get-rewards',
        wallet_address: walletAddress,
        limit,
        offset
      }, walletAddress);

      if (rewardResult.success && rewardResult.data) {
        rewardResult.data.forEach((reward: any) => {
          transactions.push({
            id: `reward_${reward.id || Date.now()}`,
            type: 'reward_claim' as const,
            category: 'credit' as const,
            amount: reward.amount || 0,
            currency: (reward.currency || 'USDT') as 'USDT' | 'USDC' | 'BCC',
            status: (reward.status || 'pending') as 'pending' | 'completed' | 'failed' | 'cancelled',
            title: `Layer ${reward.matrix_layer || 1} Reward ${reward.status === 'completed' ? 'Claimed' : 'Pending'}`,
            description: `${reward.reward_type || 'Matrix'} reward from layer ${reward.matrix_layer || 1}`,
            created_at: reward.created_at || new Date().toISOString(),
            completed_at: reward.claimed_at,
            metadata: { 
              layer: reward.matrix_layer, 
              reward_type: reward.reward_type 
            }
          });
        });
      } else {
        hasErrors = true;
        errors.push('Failed to load reward history');
      }
    } catch (error) {
      console.error('Error in rewards query:', error);
      hasErrors = true;
      errors.push('Failed to load reward history');
    }

    // Sort combined transactions by date
    transactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return {
      success: !hasErrors,
      data: sortedTransactions,
      errors,
      hasErrors
    };
  },

  // Get transaction statistics
  async getTransactionStats(walletAddress: string) {
    try {
      // Get statistics using Edge Function fallback
      const statsResult = await callEdgeFunction('transactions', {
        action: 'get-stats',
        wallet_address: walletAddress
      }, walletAddress);

      if (statsResult.success && statsResult.data) {
        return {
          success: true,
          data: {
            totalSpent: statsResult.data.totalSpent || 0,
            totalRewards: statsResult.data.totalRewards || 0,
            totalTransactions: statsResult.data.totalTransactions || 0,
            rewardTransactions: statsResult.data.rewardTransactions || 0
          }
        };
      }

      // Fallback to default values
      const totalSpent = 0;
      const totalRewards = 0;

      // Get transaction counts
      const { count: totalTransactions } = await supabase
        .from('bcc_purchase_orders')
        .select('*', { count: 'exact', head: true })
        .eq('wallet_address', walletAddress);

      const { count: rewardTransactions } = await supabase
        .from('reward_claims')
        .select('*', { count: 'exact', head: true })
        .ilike('claimer_wallet', walletAddress);

      return {
        totalSpent,
        totalRewards,
        totalTransactions: (totalTransactions || 0) + (rewardTransactions || 0),
        netEarnings: totalRewards - totalSpent
      };
    } catch (error) {
      console.error('Error fetching transaction stats:', error);
      return {
        totalSpent: 0,
        totalRewards: 0,
        totalTransactions: 0,
        netEarnings: 0
      };
    }
  },
};


export default supabase;