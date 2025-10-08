/**
 * Optimized Activation Status Hook
 *
 * Uses the optimized database function get_member_activation_status()
 * for fast, single-query activation state checking
 *
 * Performance improvements:
 * - Single RPC call instead of multiple table queries
 * - Cached results with React Query
 * - Reduced database load
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';

export interface ActivationStatus {
  isActivated: boolean;
  currentLevel: number;
  highestNftLevel: number;
  totalNftsOwned: number;
  claimableRewards: number;
  pendingRewards: number;
  canActivate: boolean;
  canUpgrade: boolean;
  nextLevel: number;
}

interface UseActivationStatusOptions {
  walletAddress?: string;
  enabled?: boolean;
  refetchInterval?: number;
}

/**
 * Hook to check member activation status with optimized performance
 *
 * @param options - Configuration options
 * @returns Activation status data and query state
 *
 * @example
 * ```tsx
 * const { data: status, isLoading } = useActivationStatus({
 *   walletAddress: '0x...',
 *   refetchInterval: 10000 // Refresh every 10 seconds
 * });
 *
 * if (status?.canActivate) {
 *   return <ActivateButton />;
 * }
 *
 * if (status?.canUpgrade) {
 *   return <UpgradeButton nextLevel={status.nextLevel} />;
 * }
 * ```
 */
export function useActivationStatus(options: UseActivationStatusOptions = {}) {
  const { walletAddress, enabled = true, refetchInterval } = options;

  return useQuery<ActivationStatus | null>({
    queryKey: ['activation-status', walletAddress],
    queryFn: async () => {
      if (!walletAddress) {
        return null;
      }

      console.log(`🔍 Fetching activation status for ${walletAddress}`);

      try {
        // Use optimized RPC function - single database call
        const { data, error } = await supabase
          .rpc('get_member_activation_status', {
            p_wallet_address: walletAddress
          })
          .single();

        if (error) {
          console.error('❌ Failed to fetch activation status:', error);
          throw error;
        }

        if (!data) {
          // User not found, can activate
          return {
            isActivated: false,
            currentLevel: 0,
            highestNftLevel: 0,
            totalNftsOwned: 0,
            claimableRewards: 0,
            pendingRewards: 0,
            canActivate: true,
            canUpgrade: false,
            nextLevel: 1
          };
        }

        const status: ActivationStatus = {
          isActivated: data.is_activated,
          currentLevel: data.current_level,
          highestNftLevel: data.highest_nft_level,
          totalNftsOwned: data.total_nfts_owned,
          claimableRewards: parseFloat(data.claimable_rewards) || 0,
          pendingRewards: parseFloat(data.pending_rewards) || 0,
          canActivate: data.can_activate,
          canUpgrade: data.can_upgrade,
          nextLevel: data.next_level
        };

        console.log(`✅ Activation status loaded:`, {
          isActivated: status.isActivated,
          currentLevel: status.currentLevel,
          canActivate: status.canActivate,
          canUpgrade: status.canUpgrade
        });

        return status;

      } catch (error) {
        console.error('❌ Error fetching activation status:', error);
        throw error;
      }
    },
    enabled: enabled && !!walletAddress,
    refetchInterval: refetchInterval || 30000, // Default: refresh every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
    retry: 2,
    retryDelay: 1000
  });
}

/**
 * Legacy compatibility hook - uses view instead of RPC function
 * Use useActivationStatus() for better performance
 */
export function useActivationStatusView(walletAddress?: string) {
  return useQuery({
    queryKey: ['activation-status-view', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return null;

      const { data, error } = await supabase
        .from('v_member_activation_status')
        .select('*')
        .ilike('wallet_address', walletAddress)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching activation status view:', error);
        throw error;
      }

      return data;
    },
    enabled: !!walletAddress,
    refetchInterval: 30000
  });
}
