// Unified Supabase client configuration for Beehive Platform
// This file consolidates all Supabase functionality into a single client instance
// to eliminate "Multiple GoTrueClient instances detected" warnings

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.types';

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

// Create the single, unified Supabase client instance
export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Edge Functions base URL
export const EDGE_FUNCTIONS_URL = `${supabaseUrl}/functions/v1`;

// =============================================================================
// UTILITY FUNCTION TO CALL SUPABASE EDGE FUNCTIONS
// =============================================================================

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
    if (error instanceof Error) {
      console.error(`Edge Function [${functionName}] Error:`, {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
    } else {
      console.error(`Edge Function [${functionName}] Error:`, error);
    }
    throw error;
  }
}

// =============================================================================
// USER AUTHENTICATION & REGISTRATION SERVICE
// =============================================================================

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
      console.warn('Auth edge function error, assuming user does not exist:', error.message);
      return { exists: false, error: null };
    }
  },

  // Get member info via activate-membership Edge Function
  async getMemberInfo(walletAddress: string) {
    try {
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
      
      const memberData = result.member || null;
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

  // Check if user is an activated member - use auth Edge Function
  async isActivatedMember(walletAddress: string) {
    try {
      // Use working auth Edge Function to get user status
      const result = await callEdgeFunction('auth', {
        action: 'get-user'
      }, walletAddress);

      if (!result.success) {
        // If user is not registered, return false without error
        if (result.error === 'REGISTRATION_REQUIRED' || result.error === 'User not found') {
          return { isActivated: false, memberData: null, error: null };
        }
        return { isActivated: false, memberData: null, error: { message: result.error } };
      }

      // Extract activation status from auth response
      const isActivated = result.isMember && result.membershipLevel > 0;
      const memberData = result.member || null;

      return {
        isActivated,
        memberData,
        error: null
      };
    } catch (error: any) {
      console.error('Error checking activated member:', error);
      // Don't throw error for unregistered users
      if (error.message?.includes('REGISTRATION_REQUIRED') || error.message?.includes('User not found')) {
        return { isActivated: false, memberData: null, error: null };
      }
      return { isActivated: false, memberData: null, error: { message: error.message } };
    }
  },

  // Validate referrer
  async validateReferrer(referrerWallet: string) {
    try {
      const result = await callEdgeFunction('auth', {
        action: 'validate-referrer',
        referrerWallet
      });

      return {
        isValid: result.success && result.isValid,
        referrer: result.referrer || null,
        error: result.success ? null : { message: result.error || 'Invalid referrer' }
      };
    } catch (error: any) {
      console.error('Error validating referrer:', error);
      return { isValid: false, referrer: null, error: { message: error.message } };
    }
  }
};

// =============================================================================
// BALANCE SERVICE
// =============================================================================

export const balanceService = {
  // Get user balance via Edge Function
  async getUserBalance(walletAddress: string) {
    try {
      const result = await callEdgeFunction('balance', {
        action: 'get-balance'
      }, walletAddress);

      if (!result.success) {
        return { data: null, error: { message: result.error || 'Failed to get balance' } };
      }

      return { data: result.balance, error: null };
    } catch (error: any) {
      console.error('Error getting user balance:', error);
      return { data: null, error: { message: error.message } };
    }
  },

  // Update user balance via Edge Function
  async updateUserBalance(walletAddress: string, balanceData: any) {
    try {
      const result = await callEdgeFunction('balance', {
        action: 'update-balance',
        ...balanceData
      }, walletAddress);

      if (!result.success) {
        throw new Error(result.error || 'Failed to update balance');
      }

      return { data: result.balance, error: null };
    } catch (error: any) {
      console.error('Error updating user balance:', error);
      return { data: null, error: { message: error.message } };
    }
  }
};

// =============================================================================
// DATABASE FUNCTIONS (RPC)
// =============================================================================

export const dbFunctions = {
  // Working functions from database schema
  async analyzeMatrixStructure() {
    return await supabase.rpc('analyze_matrix_structure');
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
    });
  },

  async calculateNFTTotalPrice(level: number) {
    return await supabase.rpc('calculate_nft_total_price', {
      p_level: level
    });
  },

  async calculateTotalBCCLocked(tier?: number) {
    return await supabase.rpc('calculate_total_bcc_locked', {
      p_tier: tier
    });
  },

  async calculateTotalNFTCost(level: number) {
    return await supabase.rpc('calculate_total_nft_cost', {
      p_level: level
    });
  },

  async checkAdminPermission(permission: string, walletAddress: string) {
    return await supabase.rpc('check_admin_permission', {
      p_permission: permission,
      p_wallet_address: walletAddress
    });
  },

  async checkMatrixHealth() {
    return await supabase.rpc('check_matrix_health');
  },

  async claimPendingRewards(walletAddress: string) {
    return await supabase.rpc('claim_pending_rewards', {
      p_wallet_address: walletAddress
    });
  },

  async claimRewardToBalance(rewardId: string, walletAddress: string) {
    return await supabase.rpc('claim_layer_reward', {
      p_reward_id: rewardId,
      p_member_wallet: walletAddress
    });
  },

  async getCurrentActivationTier(walletAddress: string) {
    return await supabase.rpc('get_current_activation_tier', {
      p_wallet_address: walletAddress
    });
  },

  async getCurrentWalletAddress() {
    return await supabase.rpc('get_current_wallet_address');
  },

  async getMatrixTree(walletAddress: string) {
    return await supabase.rpc('get_matrix_tree', {
      p_wallet_address: walletAddress
    });
  },

  async isAdmin(walletAddress: string) {
    return await supabase.rpc('is_admin', {
      p_wallet_address: walletAddress
    });
  },

  async isMemberActivated(walletAddress: string) {
    return await supabase.rpc('is_member_activated', {
      p_wallet_address: walletAddress
    });
  },

  async processMembershipActivation(walletAddress: string) {
    return await supabase.rpc('process_membership_activation', {
      p_wallet_address: walletAddress
    });
  },

  async processRewardRollup(walletAddress: string) {
    return await supabase.rpc('process_reward_rollup', {
      p_wallet_address: walletAddress
    });
  },

  async updateMatrixLayerSummary() {
    return await supabase.rpc('update_matrix_layer_summary');
  },

  async unlockBCCForNFTLevel(walletAddress: string, level: number) {
    return await supabase.rpc('unlock_bcc_for_nft_level', {
      p_wallet_address: walletAddress,
      p_level: level
    });
  },

  async updateUserBCCBalance(walletAddress: string, amount: number) {
    return await supabase.rpc('update_user_bcc_balance', {
      p_wallet_address: walletAddress,
      p_amount: amount
    });
  },

  async updateUserUSDTBalance(walletAddress: string, amount: number) {
    return await supabase.rpc('update_user_usdc_balance', {
      p_wallet_address: walletAddress,
      p_amount: amount
    });
  },

  async withdrawRewardBalance(walletAddress: string, amount: number) {
    return await supabase.rpc('withdraw_reward_balance', {
      p_wallet_address: walletAddress,
      p_amount: amount
    });
  },

  // Additional functions from supabase-original.ts
  async activateMemberWithNFTClaim(walletAddress: string, nftType?: string, paymentMethod?: string, transactionHash?: string) {
    return await supabase.rpc('activate_member_with_nft_claim', {
      p_wallet_address: walletAddress,
      p_nft_type: nftType,
      p_payment_method: paymentMethod,
      p_transaction_hash: transactionHash
    });
  },

  async activateMemberWithTierRewards(walletAddress: string) {
    return await supabase.rpc('activate_member_with_tier_rewards', {
      p_wallet_address: walletAddress
    });
  },

  async calculateBCCUnlock(nftLevel: number, tier: number) {
    return await supabase.rpc('calculate_bcc_unlock', {
      p_nft_level: nftLevel,
      p_tier: tier
    });
  },

  async canReceiveLayerReward(claimNumber: number, layer: number, rootWallet: string) {
    return await supabase.rpc('can_receive_layer_reward', {
      p_claim_number: claimNumber,
      p_layer: layer,
      p_root_wallet: rootWallet
    });
  },

  async countDirectReferrals(walletAddress: string) {
    return await supabase.rpc('count_direct_referrals', {
      p_wallet_address: walletAddress
    });
  },

  async createReferralLink(walletAddress: string) {
    return await supabase.rpc('create_referral_link', {
      p_wallet_address: walletAddress
    });
  },

  async generateReferralToken(walletAddress: string) {
    return await supabase.rpc('generate_referral_token', {
      p_wallet_address: walletAddress
    });
  }
};

// =============================================================================
// LEGACY COMPATIBILITY EXPORTS
// =============================================================================

// Export aliases for backward compatibility
export const supabaseApi = supabase;

// Default export
export default {
  supabase,
  authService,
  balanceService,
  dbFunctions,
  callEdgeFunction,
  EDGE_FUNCTIONS_URL
};