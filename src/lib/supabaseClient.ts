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
  // Create referral record
  async createReferral(referralData: Database['public']['Tables']['referrals']['Insert']) {
    return supabase
      .from('referrals')
      .insert([{
        ...referralData,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();
  },

  // Get referrals for a root wallet
  async getReferrals(rootWallet: string, layer?: number) {
    let query = supabase
      .from('referrals')
      .select(`
        *,
        member_info:users!referrals_member_wallet_fkey(wallet_address, username, avatar_url)
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
      action: 'get-matrix-stats',
    }, walletAddress);
  },

  // Find available matrix placement using Edge Function
  async findAvailablePlacement(rootWallet: string, newMemberWallet: string) {
    return callEdgeFunction('matrix', {
      action: 'find-placement',
      rootWallet,
      newMemberWallet,
    });
  },

  // Place member in matrix using Edge Function
  async placeMemberInMatrix(placementData: {
    rootWallet: string;
    memberWallet: string;
    parentWallet: string;
    placerWallet: string;
    layer: number;
    position: string;
    placementType: string;
  }) {
    return callEdgeFunction('matrix', {
      action: 'place-member',
      ...placementData,
    });
  },

  // Count direct referrals
  async countDirectReferrals(walletAddress: string) {
    const { count } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('placer_wallet', walletAddress) // Direct referrals are placed by this wallet
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
  // Complete member activation (called after NFT claim)
  async completeMemberActivation(walletAddress: string, activationData: {
    transactionHash: string;
    nftLevel: number;
    paymentMethod: string;
    paymentAmountUsdc: number;
    referrerWallet?: string;
  }) {
    // This would typically be handled by an Edge Function to ensure atomicity
    return callEdgeFunction('nft-upgrades', {
      action: 'activate-membership',
      ...activationData,
    }, walletAddress);
  },

  // Process all activation rewards (BCC bonus, tier rewards, matrix placement)
  async processActivationRewards(walletAddress: string, nftLevel: number) {
    return callEdgeFunction('rewards', {
      action: 'process-activation-rewards',
      nftLevel,
    }, walletAddress);
  },
};

// === MATRIX & REFERRAL MANAGEMENT ===
export const matrixService = {
  // Find placement position for new member in 3x3 matrix
  async findOptimalPlacement(referrerWallet: string, newMemberWallet: string) {
    return callEdgeFunction('matrix', {
      action: 'find-placement',
      referrerWallet,
      newMemberWallet,
    }, newMemberWallet);
  },

  // Create referral record with matrix placement
  async createReferralRecord(referralData: {
    referrerWallet: string;
    referredWallet: string;
    level: number;
    position: string; // 'L', 'M', 'R'
    layer: number;
  }) {
    return callEdgeFunction('matrix', {
      action: 'create-referral',
      ...referralData,
    }, referralData.referredWallet);
  },

  // Get user's matrix tree
  async getUserMatrix(walletAddress: string, depth = 3) {
    return callEdgeFunction('matrix', {
      action: 'get-matrix',
      depth,
    }, walletAddress);
  },

  // Get user's referral network
  async getReferralNetwork(walletAddress: string) {
    return supabase
      .from('referrals')
      .select('*')
      .eq('referrer_wallet', walletAddress)
      .order('created_at', { ascending: false });
  },
};

// === REWARD PROCESSING ===
export const rewardService = {
  // Process layer rewards when downline member activates
  async processLayerRewards(activatedMemberWallet: string, nftLevel: number) {
    return callEdgeFunction('rewards', {
      action: 'process-layer-rewards',
      activatedMemberWallet,
      nftLevel,
    }, activatedMemberWallet);
  },

  // Get user's pending rewards
  async getPendingRewards(walletAddress: string) {
    return supabase
      .from('layer_rewards')
      .select('*')
      .eq('member_wallet', walletAddress)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
  },

  // Claim available rewards
  async claimRewards(walletAddress: string, rewardIds: string[]) {
    return callEdgeFunction('rewards', {
      action: 'claim-rewards',
      rewardIds,
    }, walletAddress);
  },
};

export default supabase;