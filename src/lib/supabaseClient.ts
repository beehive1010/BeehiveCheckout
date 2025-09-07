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
  // Place member in 3x3 matrix using database function
  // Automatically finds optimal placement with L→M→R priority
  async placeMemberInMatrix(
    memberWallet: string,
    placerWallet: string,
    rootWallet: string,
    placementType: string = 'direct'
  ) {
    const { data, error } = await supabase
      .rpc('place_member_in_matrix', {
        p_member_wallet: memberWallet,
        p_placer_wallet: placerWallet,
        p_root_wallet: rootWallet,
        p_placement_type: placementType
      });

    return { data, error };
  },

  // Find available placement position in matrix
  // This analyzes the current matrix structure to determine where new member should go
  async findAvailablePlacement(rootWallet: string, newMemberWallet: string) {
    // Get current matrix structure for analysis
    const { data: matrixData, error: matrixError } = await this.getReferrals(rootWallet);
    if (matrixError) return { error: matrixError };

    // Analyze matrix to find first incomplete position using L→M→R priority
    return this.analyzeMatrixForPlacement(matrixData || [], rootWallet);
  },

  // Analyze matrix structure to find optimal placement
  // Implements L→M→R priority: Left → Middle → Right positions
  analyzeMatrixForPlacement(matrixData: any[], rootWallet: string) {
    // Build matrix tree structure
    const matrixTree = this.buildMatrixTree(matrixData);
    
    // Find first incomplete position using breadth-first search with L→M→R priority
    const placement = this.findFirstIncompletePosition(matrixTree, rootWallet);
    
    return { data: placement, error: null };
  },

  // Build tree structure from referrals data
  buildMatrixTree(referrals: any[]) {
    const tree: Record<string, any> = {};
    
    // Group referrals by parent
    referrals.forEach(referral => {
      const parentWallet = referral.parent_wallet || referral.root_wallet;
      if (!tree[parentWallet]) {
        tree[parentWallet] = {
          L: null, M: null, R: null,
          children: []
        };
      }
      
      tree[parentWallet][referral.position] = referral;
      tree[parentWallet].children.push(referral);
    });
    
    return tree;
  },

  // Find first incomplete position using L→M→R priority
  findFirstIncompletePosition(matrixTree: Record<string, any>, rootWallet: string) {
    // Start with root wallet
    const queue = [rootWallet];
    
    while (queue.length > 0) {
      const currentWallet = queue.shift()!;
      const node = matrixTree[currentWallet];
      
      if (!node) {
        // This wallet has no children yet, can place in L position
        return {
          parentWallet: currentWallet,
          position: 'L',
          layer: 1
        };
      }
      
      // Check L→M→R priority
      if (!node.L) {
        return {
          parentWallet: currentWallet,
          position: 'L',
          layer: this.calculateLayer(matrixTree, currentWallet, rootWallet) + 1
        };
      }
      if (!node.M) {
        return {
          parentWallet: currentWallet,
          position: 'M',
          layer: this.calculateLayer(matrixTree, currentWallet, rootWallet) + 1
        };
      }
      if (!node.R) {
        return {
          parentWallet: currentWallet,
          position: 'R',
          layer: this.calculateLayer(matrixTree, currentWallet, rootWallet) + 1
        };
      }
      
      // All positions filled, add children to queue for next layer
      queue.push(node.L.member_wallet, node.M.member_wallet, node.R.member_wallet);
    }
    
    return null; // Matrix is full (shouldn't happen in practice)
  },

  // Calculate layer depth for a wallet in the matrix
  calculateLayer(matrixTree: Record<string, any>, walletAddress: string, rootWallet: string) {
    if (walletAddress === rootWallet) return 0;
    
    // Find this wallet in the matrix and calculate its depth
    const findDepth = (wallet: string, depth: number): number => {
      const node = matrixTree[wallet];
      if (!node) return -1;
      
      for (const child of node.children) {
        if (child.member_wallet === walletAddress) {
          return depth + 1;
        }
      }
      
      // Recursively search children
      for (const child of node.children) {
        const childDepth = findDepth(child.member_wallet, depth + 1);
        if (childDepth !== -1) return childDepth;
      }
      
      return -1;
    };
    
    return findDepth(rootWallet, 0);
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

  // Get matrix statistics
  async getMatrixStats(walletAddress: string) {
    const { data: referrals, error } = await this.getReferrals(walletAddress);
    if (error) return { error };

    // Calculate statistics
    const totalMembers = referrals?.length || 0;
    const layerCounts = referrals?.reduce((acc: Record<number, number>, ref) => {
      acc[ref.layer] = (acc[ref.layer] || 0) + 1;
      return acc;
    }, {}) || {};

    return {
      data: {
        totalMembers,
        layerCounts,
        maxLayer: Math.max(...Object.keys(layerCounts).map(Number), 0),
        referrals
      },
      error: null
    };
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
  // Complete member activation with matrix placement
  async completeMemberActivation(walletAddress: string, activationData: {
    transactionHash: string;
    nftLevel: number;
    paymentMethod: string;
    paymentAmountUsdc: number;
    referrerWallet?: string;
  }) {
    try {
      // Step 1: Complete NFT upgrade
      const nftResult = await nftService.processNFTUpgrade(walletAddress, {
        level: activationData.nftLevel,
        transactionHash: activationData.transactionHash,
        payment_method: activationData.paymentMethod,
        payment_amount_usdc: activationData.paymentAmountUsdc,
      });

      if (nftResult.error) {
        throw new Error(`NFT upgrade failed: ${nftResult.error.message}`);
      }

      // Step 2: Activate member in members table (using database function)
      const memberResult = await supabase.rpc('create_member_with_pending', {
        p_wallet_address: walletAddress,
        p_use_pending: false
      });

      if (memberResult.error) {
        throw new Error(`Member activation failed: ${memberResult.error.message}`);
      }

      // Step 3: Place member in matrix if they have a referrer
      if (activationData.referrerWallet) {
        const placementResult = await matrixService.placeMemberInMatrix(
          walletAddress,
          activationData.referrerWallet,
          activationData.referrerWallet,
          'direct'
        );

        if (placementResult.error) {
          console.error('Matrix placement failed:', placementResult.error);
          // Continue with activation even if matrix placement fails
        }
      }

      // Step 4: Process activation rewards
      await this.processActivationRewards(walletAddress, activationData.nftLevel);

      return {
        data: {
          nftUpgrade: nftResult.data,
          memberActivation: memberResult.data,
          message: 'Member activation completed successfully'
        },
        error: null
      };

    } catch (error) {
      console.error('Activation error:', error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown activation error')
      };
    }
  },

  // Process all activation rewards using database function
  async processActivationRewards(walletAddress: string, nftLevel: number) {
    const { data, error } = await supabase.rpc('process_activation_rewards', {
      p_new_member_wallet: walletAddress,
      p_activation_level: nftLevel,
      p_tx_hash: `activation_${walletAddress}_${Date.now()}`
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