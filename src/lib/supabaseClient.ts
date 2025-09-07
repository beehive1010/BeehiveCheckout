import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

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
  // Register user in users table
  async registerUser(walletAddress: string, username: string, email?: string, referrerWallet?: string) {
    return supabase
      .from('users')
      .insert([
        {
          wallet_address: walletAddress,
          username,
          email: email || null,
          referrer_wallet: referrerWallet || null,
          current_level: 0,
          is_upgraded: false,
          upgrade_timer_enabled: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();
  },

  // Get user by wallet address
  async getUser(walletAddress: string) {
    return supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();
  },

  // Check if user exists
  async userExists(walletAddress: string) {
    const { data, error } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('wallet_address', walletAddress)
      .single();
    
    return { exists: !error && !!data, error };
  },

  // Get member info (check if user is activated)
  async getMemberInfo(walletAddress: string) {
    return supabase
      .from('members')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();
  },

  // Check if user is activated member
  async isActivatedMember(walletAddress: string) {
    const { data, error } = await supabase
      .from('members')
      .select('is_activated, current_level')
      .eq('wallet_address', walletAddress)
      .eq('is_activated', true)
      .single();
    
    return { isActivated: !error && !!data, memberData: data, error };
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
  async createOrder(orderData: Database['public']['Tables']['orders']['Insert']) {
    return supabase
      .from('orders')
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
      .from('orders')
      .select('*')
      .eq('wallet_address', walletAddress)
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
      .from('orders')
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
      .eq('wallet_address', walletAddress)
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
      .eq('root_wallet', rootWallet)
      .eq('is_active', true);

    if (layer) {
      query = query.eq('layer', layer);
    }

    return query.order('created_at', { ascending: true });
  },

  // Get matrix statistics using Edge Function
  async getMatrixStats(walletAddress: string) {
    return callEdgeFunction('matrix', {
      action: 'get-matrix-stats'
    }, walletAddress);
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
  }) {
    return supabase
      .from('referrals')
      .insert([{
        ...referralData,
        is_active: true,
        created_at: new Date().toISOString(),
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
  // Create layer reward
  async createLayerReward(rewardData: Database['public']['Tables']['layer_rewards']['Insert']) {
    return supabase
      .from('layer_rewards')
      .insert([{
        ...rewardData,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();
  },

  // Get claimable rewards using Edge Function
  async getClaimableRewards(walletAddress: string) {
    return callEdgeFunction('rewards', {
      action: 'get-claimable-rewards',
    }, walletAddress);
  },

  // Get reward history using Edge Function
  async getRewardHistory(walletAddress: string, limit = 50) {
    return callEdgeFunction('rewards', {
      action: 'get-reward-history',
      limit,
    }, walletAddress);
  },

  // Claim reward using Edge Function
  async claimReward(walletAddress: string, rewardData: {
    reward_claim_id: string;
    layer: number;
  }) {
    return callEdgeFunction('rewards', {
      action: 'claim-reward',
      ...rewardData,
    }, walletAddress);
  },

  // Create reward claim record
  async createRewardClaim(claimData: Database['public']['Tables']['reward_claims']['Insert']) {
    return supabase
      .from('reward_claims')
      .insert([{
        ...claimData,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();
  },
};

// === BALANCE MANAGEMENT ===
export const balanceService = {
  // Get user balance using Edge Function
  async getUserBalance(walletAddress: string) {
    return callEdgeFunction('balance', {
      action: 'get-balance',
    }, walletAddress);
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
    const { data, error } = await supabase.rpc('activate_member_with_nft_claim', {
      p_wallet_address: walletAddress,
      p_transaction_hash: activationData.transactionHash,
      p_payment_method: activationData.paymentMethod,
      p_nft_type: `level_${activationData.nftLevel}`
    });

    return { data, error };
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

  // Process activation rewards using database function
  async processActivationRewards(walletAddress: string, nftLevel: number) {
    const { data, error } = await supabase.rpc('process_activation_rewards', {
      p_new_member_wallet: walletAddress,
      p_activation_level: nftLevel,
      p_tx_hash: `activation_${walletAddress}_${Date.now()}`
    });

    return { data, error };
  },

  // Activate member with tier rewards using database function
  async activateMemberWithTierRewards(walletAddress: string) {
    const { data, error } = await supabase.rpc('activate_member_with_tier_rewards', {
      p_wallet_address: walletAddress
    });

    return { data, error };
  },

  // Check if member can be activated (has all requirements)
  async checkActivationEligibility(walletAddress: string) {
    try {
      // Check if user is already activated
      const { data: memberData } = await supabase
        .from('members')
        .select('is_activated, current_level')
        .eq('wallet_address', walletAddress)
        .single();

      if (memberData?.is_activated) {
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
        .eq('wallet_address', walletAddress)
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


export default supabase;