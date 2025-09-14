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

      // Return the complete result with all properties (isMember, canAccessReferrals, etc.)
      return { 
        data: {
          ...result.user,
          isMember: result.isMember,
          membershipLevel: result.membershipLevel,
          canAccessReferrals: result.isMember || false,
          member: result.member,
          balance: result.balance,
          referral_stats: result.referral_stats
        }, 
        error: null 
      };
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


  async isActivatedMember(walletAddress: string) {
    try {
      // First check database activation status using get-member-info action
      console.log(`🔍 Checking database activation for ${walletAddress}`);
      const dbResult = await callEdgeFunction('activate-membership', {
        action: 'get-member-info'
      }, walletAddress);
      
      if (dbResult.success && (dbResult.isActivated || dbResult.currentLevel > 0)) {
        console.log(`✅ Database shows user is activated: Level ${dbResult.currentLevel}`);
        return { 
          isActivated: true, 
          memberData: dbResult.member,
          error: null 
        };
      }
      
      // If not activated in database, fall back to blockchain check
      console.log(`🔗 Database shows no activation, checking blockchain for ${walletAddress}`);
      const chainResult = await callEdgeFunction('activate-membership', {
        transactionHash: 'check_existing',
        level: 1
      }, walletAddress);
      
      if (!chainResult.success) {
        console.log(`❌ No activation found in database or blockchain for ${walletAddress}`);
        return { isActivated: false, memberData: null, error: { message: chainResult.error || chainResult.message } };
      }
      
      const memberData = chainResult.member || null;
      const isActivated = chainResult.hasNFT || (memberData?.current_level > 0) || false;
      
      // If user has NFT but no member record, they should still be considered activated
      if (chainResult.hasNFT && !memberData) {
        console.log(`🔄 User has Level 1 NFT but no member record - treating as activated`);
        return {
          isActivated: true,
          memberData: { current_level: 1, wallet_address: walletAddress },
          error: null
        };
      }

      
      console.log(`🔍 Final activation status for ${walletAddress}:`, { 
        isActivated, 
        level: memberData?.current_level,
        hasNFT: chainResult.hasNFT,
        source: 'blockchain'
      });
      
      return { 
        isActivated, 
        memberData, 
        error: null 
      };
      
    } catch (error: any) {
      console.error('Error checking member activation:', error);
      
      // Final fallback: direct database check
      try {
        console.log('🔄 Error occurred, trying direct database fallback...');
        const { data: fallbackMember } = await this.supabase
          .from('members')
          .select('current_level, wallet_address, activation_time')
          .eq('wallet_address', walletAddress)
          .single();
        
        if (fallbackMember && fallbackMember.current_level > 0) {
          console.log('✅ Found membership in final database fallback');
          return { 
            isActivated: true, 
            memberData: fallbackMember, 
            error: null 
          };
        }
      } catch (fallbackError) {
        console.warn('Final database fallback failed:', fallbackError);
      }
      
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
      .select('*')
      .eq('matrix_root_wallet', rootWallet)
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
        .ilike('matrix_root_wallet', walletAddress);

      // Get max layer - use ilike for case-insensitive matching
      const { data: maxLayerData } = await supabase
        .from('referrals')
        .select('matrix_layer')
        .ilike('matrix_root_wallet', walletAddress)
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
        .ilike('matrix_root_wallet', walletAddress)
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

  // === NEW SPILLOVER MATRIX SUPPORT ===
  
  // Get spillover matrix data (actual matrix with capacity limits)
  async getSpilloverMatrix(rootWallet: string, layer?: number) {
    let query = supabase
      .from('spillover_matrix')
      .select('*')
      .eq('matrix_root_wallet', rootWallet)
      .eq('is_active', true);

    if (layer) {
      query = query.eq('matrix_layer', layer);
    }

    return query.order('matrix_layer', { ascending: true })
                .order('placed_at', { ascending: true });
  },

  // Get original referral relationships (before spillover)
  async getOriginalReferrals(rootWallet: string, layer?: number) {
    let query = supabase
      .from('referrals')
      .select('*')
      .eq('matrix_root_wallet', rootWallet)
      .eq('is_active', true);

    if (layer) {
      query = query.eq('matrix_layer', layer);
    }

    return query.order('matrix_layer', { ascending: true })
                .order('placed_at', { ascending: true });
  },

  // Get spillover matrix statistics using new functions
  async getSpilloverMatrixStats(walletAddress: string) {
    try {
      // Use the new PostgreSQL function for layer statistics
      const { data: layerStats } = await supabase
        .rpc('get_matrix_layer_stats', { p_matrix_root: walletAddress });

      // Get total members in spillover matrix
      const { count: totalSpilloverMembers } = await supabase
        .from('spillover_matrix')
        .select('*', { count: 'exact', head: true })
        .ilike('matrix_root_wallet', walletAddress);

      // Get members with spillover
      const { count: spilloverCount } = await supabase
        .from('spillover_matrix')
        .select('*', { count: 'exact', head: true })
        .ilike('matrix_root_wallet', walletAddress)
        .neq('matrix_layer', 'original_layer');

      return {
        success: true,
        data: {
          layerStats: layerStats || [],
          totalSpilloverMembers: totalSpilloverMembers || 0,
          spilloverCount: spilloverCount || 0
        }
      };
    } catch (error) {
      console.error('Error fetching spillover matrix stats:', error);
      return {
        success: false,
        error: error,
        data: {
          layerStats: [],
          totalSpilloverMembers: 0,
          spilloverCount: 0
        }
      };
    }
  },

  // Get member position in spillover matrix
  async getMemberSpilloverPosition(memberWallet: string, matrixRoot: string) {
    try {
      const { data: position } = await supabase
        .rpc('get_member_spillover_position', { 
          p_member_wallet: memberWallet, 
          p_matrix_root: matrixRoot 
        });

      return {
        success: true,
        data: position?.[0] || null
      };
    } catch (error) {
      console.error('Error fetching member spillover position:', error);
      return {
        success: false,
        error: error,
        data: null
      };
    }
  },

  // Compare original vs spillover matrix
  async getMatrixComparison(rootWallet: string) {
    try {
      // Get original referrals
      const originalResult = await this.getOriginalReferrals(rootWallet);
      
      // Get spillover matrix
      const spilloverResult = await this.getSpilloverMatrix(rootWallet);

      return {
        success: true,
        data: {
          original: originalResult.data || [],
          spillover: spilloverResult.data || [],
          originalCount: originalResult.data?.length || 0,
          spilloverCount: spilloverResult.data?.length || 0
        }
      };
    } catch (error) {
      console.error('Error comparing matrices:', error);
      return {
        success: false,
        error: error,
        data: {
          original: [],
          spillover: [],
          originalCount: 0,
          spilloverCount: 0
        }
      };
    }
  },

  // Trigger matrix rewards for new member
  async triggerMatrixRewards(newMemberWallet: string) {
    try {
      const { data, error } = await supabase
        .rpc('trigger_matrix_rewards_on_join', { 
          p_new_member_wallet: newMemberWallet 
        });

      if (error) throw error;

      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('Error triggering matrix rewards:', error);
      return {
        success: false,
        error: error
      };
    }
  },

  // Calculate NFT price according to MarketingPlan
  // Level 1: 100 USDC, Level 2: 150 USDC, ..., Level 19: 1000 USDC
  // Formula: 50 + (level * 50)
  calculateNFTPrice(level: number): number {
    if (level < 1 || level > 19) return 0;
    return 50 + (level * 50);
  },

  // Trigger matrix rewards when member reaches new level (according to MarketingPlan)
  async triggerMatrixRewardsOnLevelUp(memberWallet: string, newLevel: number) {
    try {
      // This should call the updated reward function that uses NFT prices
      const { data, error } = await supabase
        .rpc('trigger_matrix_rewards_on_level_up', { 
          p_member_wallet: memberWallet,
          p_new_level: newLevel
        });

      if (error) throw error;

      return {
        success: true,
        data: data,
        rewardAmount: this.calculateNFTPrice(newLevel)
      };
    } catch (error) {
      console.error('Error triggering matrix rewards on level up:', error);
      return {
        success: false,
        error: error,
        rewardAmount: 0
      };
    }
  },

  // Check Layer 1 Right position special reward conditions
  async checkLayer1RightReward(newMemberWallet: string, matrixRoot: string) {
    try {
      const { data, error } = await supabase
        .rpc('trigger_layer1_right_reward', { 
          p_new_member_wallet: newMemberWallet,
          p_matrix_root: matrixRoot
        });

      if (error) throw error;

      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('Error checking Layer 1 Right reward:', error);
      return {
        success: false,
        error: error
      };
    }
  },

  // === BCC LOCKED RELEASE SYSTEM ===

  // Calculate BCC release amount for level upgrade
  calculateBCCReleaseAmount(fromLevel: number, toLevel: number): number {
    if (fromLevel >= toLevel || fromLevel < 1 || toLevel > 19) return 0;
    
    let totalRelease = 0;
    for (let level = fromLevel + 1; level <= toLevel; level++) {
      totalRelease += this.calculateNFTPrice(level);
    }
    return totalRelease;
  },

  // Release BCC on level upgrade
  async releaseBCCOnLevelUp(walletAddress: string, newLevel: number) {
    try {
      const { data, error } = await supabase
        .rpc('release_bcc_on_level_up', { 
          p_wallet_address: walletAddress,
          p_new_level: newLevel
        });

      if (error) throw error;

      return {
        success: data?.[0]?.success || false,
        bccReleased: data?.[0]?.bcc_released || 0,
        bccRemainingLocked: data?.[0]?.bcc_remaining_locked || 0,
        message: data?.[0]?.message || ''
      };
    } catch (error) {
      console.error('Error releasing BCC on level up:', error);
      return {
        success: false,
        bccReleased: 0,
        bccRemainingLocked: 0,
        message: `Error: ${error}`
      };
    }
  },

  // Process complete member level upgrade (Matrix rewards + BCC release)
  async processMemberLevelUpgrade(walletAddress: string, newLevel: number) {
    try {
      const { data, error } = await supabase
        .rpc('process_member_level_upgrade', { 
          p_wallet_address: walletAddress,
          p_new_level: newLevel
        });

      if (error) throw error;

      const result = data?.[0];
      return {
        success: result?.upgrade_success || false,
        matrixRewardsTriggered: result?.matrix_rewards_triggered || false,
        bccReleased: result?.bcc_released || 0,
        bccRemainingLocked: result?.bcc_remaining_locked || 0,
        message: result?.upgrade_message || '',
        nftPrice: this.calculateNFTPrice(newLevel),
        expectedBCCRelease: this.calculateNFTPrice(newLevel) // Same as NFT price
      };
    } catch (error) {
      console.error('Error processing member level upgrade:', error);
      return {
        success: false,
        matrixRewardsTriggered: false,
        bccReleased: 0,
        bccRemainingLocked: 0,
        message: `Error: ${error}`,
        nftPrice: 0,
        expectedBCCRelease: 0
      };
    }
  },

  // Get BCC release history for a user
  async getBCCReleaseHistory(walletAddress: string, limit: number = 10) {
    try {
      const { data, error } = await supabase
        .rpc('get_bcc_release_history', { 
          p_wallet_address: walletAddress,
          p_limit: limit
        });

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error fetching BCC release history:', error);
      return {
        success: false,
        data: []
      };
    }
  },

  // === NOTIFICATIONS SYSTEM ===

  // Get user notifications
  async getUserNotifications(walletAddress: string, limit: number = 20) {
    try {
      const { data, error } = await supabase
        .rpc('get_user_notifications', { 
          p_wallet_address: walletAddress,
          p_limit: limit
        });

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      return {
        success: false,
        data: []
      };
    }
  },

  // Mark notification as read
  async markNotificationAsRead(notificationId: string) {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      return {
        success: true
      };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return {
        success: false,
        error: error
      };
    }
  },

  // Create custom notification
  async createNotification(
    walletAddress: string, 
    title: string, 
    message: string, 
    type: string = 'info',
    category: string = 'general',
    priority: number = 1,
    metadata: object = {}
  ) {
    try {
      const { data, error } = await supabase
        .rpc('create_notification', { 
          p_wallet_address: walletAddress,
          p_title: title,
          p_message: message,
          p_type: type,
          p_category: category,
          p_priority: priority,
          p_metadata: metadata
        });

      if (error) throw error;

      return {
        success: true,
        notificationId: data
      };
    } catch (error) {
      console.error('Error creating notification:', error);
      return {
        success: false,
        error: error
      };
    }
  },

  // Process complete member level upgrade with notifications
  async processMemberLevelUpgradeWithNotifications(walletAddress: string, newLevel: number) {
    try {
      const { data, error } = await supabase
        .rpc('process_member_level_upgrade_with_notifications', { 
          p_wallet_address: walletAddress,
          p_new_level: newLevel
        });

      if (error) throw error;

      const result = data?.[0];
      return {
        success: result?.upgrade_success || false,
        bccReleased: result?.bcc_released || 0,
        bccRemainingLocked: result?.bcc_remaining_locked || 0,
        notificationsCreated: result?.notifications_created || 0,
        message: result?.upgrade_message || '',
        nftPrice: this.calculateNFTPrice(newLevel),
        expectedBCCRelease: this.calculateNFTPrice(newLevel)
      };
    } catch (error) {
      console.error('Error processing member level upgrade with notifications:', error);
      return {
        success: false,
        bccReleased: 0,
        bccRemainingLocked: 0,
        notificationsCreated: 0,
        message: `Error: ${error}`,
        nftPrice: 0,
        expectedBCCRelease: 0
      };
    }
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

  // Create layer reward using database function
  async createLayerReward(payer_wallet: string, amount_usdt: number, nft_level: number, source_transaction_id: string) {
    const { data, error } = await supabase.rpc('create_layer_reward_claim', {
      p_nft_level: nft_level,
      p_layer: nft_level, // Assuming layer matches NFT level
      p_root_wallet: payer_wallet,
      p_triggering_member_wallet: payer_wallet,
      p_transaction_hash: source_transaction_id
    });

    return { data, error };
  },

  // Distribute layer rewards using database function
  async distributeLayerRewards(payer_wallet: string, amount_usdt: number, nft_level: number, source_transaction_id: string) {
    const { data, error } = await supabase.rpc('distribute_layer_rewards', {
      p_payer_wallet: payer_wallet,
      p_amount_usdt: amount_usdt,
      p_nft_level: nft_level,
      p_source_transaction_id: source_transaction_id
    });

    return { data, error };
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
        .ilike('wallet_address', walletAddress)
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
  async getTransactionHistory(walletAddress: string, limit = 50, offset = 0) {
    const transactions = [];
    let hasErrors = false;
    const errors = [];

    // Get NFT purchases from bcc_purchase_orders table
    try {
      const { data: orders, error: ordersError } = await supabase
        .from('bcc_purchase_orders')
        .select(`
          id,
          wallet_address,
          total_amount,
          currency,
          status,
          created_at,
          completed_at,
          transaction_hash,
          network,
          metadata
        `)
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        hasErrors = true;
        errors.push('Failed to load purchase history');
      } else if (orders) {
        // Transform orders to transaction format
        orders.forEach(order => {
          transactions.push({
            id: `order_${order.id}`,
            type: 'nft_purchase' as const,
            category: 'debit' as const,
            amount: order.total_amount,
            currency: order.currency as 'USDT' | 'USDC',
            status: order.status as 'pending' | 'completed' | 'failed' | 'cancelled',
            title: `NFT Level ${order.metadata?.level || 'Unknown'} Purchase`,
            description: `Purchased membership NFT Level ${order.metadata?.level || 'Unknown'}`,
            created_at: order.created_at,
            completed_at: order.completed_at,
            transaction_hash: order.transaction_hash,
            network: order.network,
            metadata: order.metadata
          });
        });
      }
    } catch (error) {
      console.error('Error in orders query:', error);
      hasErrors = true;
      errors.push('Failed to load purchase history');
    }

    // Get reward claims from reward_claims table
    try {
      const { data: rewards, error: rewardsError } = await supabase
        .from('reward_claims')
        .select(`
          id,
          claimer_wallet,
          amount,
          currency,
          status,
          created_at,
          claimed_at,
          matrix_layer,
          reward_type
        `)
        .ilike('claimer_wallet', walletAddress)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (rewardsError) {
        console.error('Error fetching rewards:', rewardsError);
        hasErrors = true;
        errors.push('Failed to load reward history');
      } else if (rewards) {
        // Transform reward claims to transaction format
        rewards.forEach(reward => {
          transactions.push({
            id: `reward_${reward.id}`,
            type: 'reward_claim' as const,
            category: 'credit' as const,
            amount: reward.amount,
            currency: reward.currency as 'USDT' | 'USDC' | 'BCC',
            status: reward.status as 'pending' | 'completed' | 'failed' | 'cancelled',
            title: `Layer ${reward.matrix_layer} Reward ${reward.status === 'completed' ? 'Claimed' : 'Pending'}`,
            description: `${reward.reward_type || 'Matrix'} reward from layer ${reward.matrix_layer}`,
            created_at: reward.created_at,
            completed_at: reward.claimed_at,
            metadata: { 
              layer: reward.matrix_layer, 
              reward_type: reward.reward_type 
            }
          });
        });
      }
    } catch (error) {
      console.error('Error in rewards query:', error);
      hasErrors = true;
      errors.push('Failed to load reward history');
    }

    // Sort combined transactions by date
    transactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { 
      data: transactions.slice(0, limit), 
      error: hasErrors ? { message: errors.join(', ') } : null,
      partialData: hasErrors && transactions.length > 0
    };
  },

  // Get transaction statistics
  async getTransactionStats(walletAddress: string) {
    try {
      // Get total spent on NFTs
      const { data: ordersData } = await supabase
        .from('bcc_purchase_orders')
        .select('total_amount, status')
        .eq('wallet_address', walletAddress)
        .eq('status', 'completed');

      const totalSpent = ordersData?.reduce((sum, order) => sum + order.total_amount, 0) || 0;

      // Get total rewards claimed
      const { data: rewardsData } = await supabase
        .from('reward_claims')
        .select('amount, status')
        .ilike('claimer_wallet', walletAddress)
        .eq('status', 'completed');

      const totalRewards = rewardsData?.reduce((sum, reward) => sum + reward.amount, 0) || 0;

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