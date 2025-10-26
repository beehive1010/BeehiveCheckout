/**
 * Matrix Tree Data Hook - Unified hook for querying v_matrix_tree_19_layers view
 *
 * This hook provides standardized access to the complete 19-layer matrix tree data.
 * All matrix components should use this hook instead of querying views directly.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface MatrixTreeNode {
  matrix_root_wallet: string;
  layer: number;
  member_wallet: string;
  member_username: string | null;
  member_level: number;
  activation_sequence: number;
  parent_wallet: string | null;
  slot: string | null; // L, M, R
  activation_time: string | null;
  referral_type: string; // direct, spillover
  has_children: boolean;
  children_count: number;
  children_slots: {
    L: string | null;
    M: string | null;
    R: string | null;
  } | null;
}

export interface MatrixTreeData {
  nodes: MatrixTreeNode[];
  totalNodes: number;
  maxLayer: number;
  matrixRootWallet: string;
}

/**
 * Hook to fetch complete matrix tree data for a given matrix root
 *
 * @param matrixRootWallet - The wallet address of the matrix root
 * @param layer - Optional layer filter (1-19). If not specified, returns all layers.
 * @returns React Query result with matrix tree data
 *
 * @example
 * ```tsx
 * // Get all layers for a matrix root
 * const { data, isLoading } = useMatrixTreeData('0x1234...');
 *
 * // Get specific layer only
 * const { data, isLoading } = useMatrixTreeData('0x1234...', 3);
 * ```
 */
export function useMatrixTreeData(
  matrixRootWallet?: string,
  layer?: number
) {
  return useQuery<MatrixTreeData>({
    queryKey: ['matrix-tree-19-layers', matrixRootWallet, layer],
    queryFn: async (): Promise<MatrixTreeData> => {
      if (!matrixRootWallet) {
        throw new Error('Matrix root wallet is required');
      }

      console.log('📊 Fetching matrix tree data for:', matrixRootWallet, 'layer:', layer || 'all');

      let query = supabase
        .from('v_matrix_tree_19_layers')
        .select('*')
        .eq('matrix_root_wallet', matrixRootWallet);

      // Filter by layer if specified
      if (layer !== undefined && layer > 0) {
        query = query.eq('layer', layer);
      }

      const { data, error } = await query.order('layer').order('activation_sequence');

      if (error) {
        console.error('❌ Error fetching matrix tree data:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('📭 No matrix tree data found for:', matrixRootWallet);
        return {
          nodes: [],
          totalNodes: 0,
          maxLayer: 0,
          matrixRootWallet
        };
      }

      console.log('✅ Fetched', data.length, 'matrix tree nodes');

      // Calculate max layer
      const maxLayer = Math.max(...data.map(node => node.layer), 0);

      return {
        nodes: data as MatrixTreeNode[],
        totalNodes: data.length,
        maxLayer,
        matrixRootWallet
      };
    },
    enabled: !!matrixRootWallet,
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
  });
}

/**
 * Hook to fetch matrix tree data for a specific member's position in the matrix
 * This finds the matrix root for the member and returns their branch
 *
 * @param memberWallet - The wallet address of the member
 * @param maxDepth - Maximum depth to fetch from member's position (default: 3)
 * @returns React Query result with matrix tree data starting from member's position
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useMatrixTreeForMember('0x5678...', 3);
 * ```
 */
export function useMatrixTreeForMember(
  memberWallet?: string,
  maxDepth: number = 3
) {
  return useQuery<MatrixTreeData>({
    queryKey: ['matrix-tree-for-member', memberWallet, maxDepth],
    queryFn: async (): Promise<MatrixTreeData> => {
      if (!memberWallet) {
        throw new Error('Member wallet is required');
      }

      console.log('🔍 Finding matrix root for member:', memberWallet);

      // First, find the matrix root for this member
      const { data: memberData, error: memberError } = await supabase
        .from('matrix_referrals')
        .select('matrix_root_wallet, layer')
        .eq('member_wallet', memberWallet)
        .order('layer', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (memberError) {
        console.error('❌ Error finding matrix root for member:', memberError);
        throw memberError;
      }

      if (!memberData) {
        // Member might be a matrix root themselves
        console.log('📍 Member is likely a matrix root');
        return {
          nodes: [],
          totalNodes: 0,
          maxLayer: 0,
          matrixRootWallet: memberWallet
        };
      }

      const matrixRoot = memberData.matrix_root_wallet;
      const memberLayer = memberData.layer;

      console.log('✅ Found matrix root:', matrixRoot, 'member at layer:', memberLayer);

      // Fetch tree data from member's position down to maxDepth
      const maxLayer = Math.min(memberLayer + maxDepth, 19);

      let query = supabase
        .from('v_matrix_tree_19_layers')
        .select('*')
        .eq('matrix_root_wallet', matrixRoot)
        .gte('layer', memberLayer)
        .lte('layer', maxLayer);

      const { data, error } = await query.order('layer').order('activation_sequence');

      if (error) {
        console.error('❌ Error fetching matrix tree data:', error);
        throw error;
      }

      console.log('✅ Fetched', data?.length || 0, 'nodes for member branch');

      return {
        nodes: (data as MatrixTreeNode[]) || [],
        totalNodes: data?.length || 0,
        maxLayer: maxLayer,
        matrixRootWallet: matrixRoot
      };
    },
    enabled: !!memberWallet,
    staleTime: 30000,
    gcTime: 300000,
  });
}

/**
 * Hook to fetch only the children of a specific node in the matrix tree
 *
 * @param matrixRootWallet - The wallet address of the matrix root
 * @param parentWallet - The wallet address of the parent node
 * @returns React Query result with children nodes (L, M, R)
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useMatrixNodeChildren('0x1234...', '0x5678...');
 * ```
 */
export function useMatrixNodeChildren(
  matrixRootWallet?: string,
  parentWallet?: string
) {
  return useQuery<{ L: MatrixTreeNode | null; M: MatrixTreeNode | null; R: MatrixTreeNode | null }>({
    queryKey: ['matrix-node-children', matrixRootWallet, parentWallet],
    queryFn: async () => {
      if (!matrixRootWallet || !parentWallet) {
        throw new Error('Matrix root wallet and parent wallet are required');
      }

      console.log('👶 Fetching children for parent:', parentWallet);

      const { data, error } = await supabase
        .from('v_matrix_tree_19_layers')
        .select('*')
        .eq('matrix_root_wallet', matrixRootWallet)
        .eq('parent_wallet', parentWallet)
        .order('slot');

      if (error) {
        console.error('❌ Error fetching children:', error);
        throw error;
      }

      // Organize children by slot (L, M, R)
      const children = {
        L: data?.find(node => node.slot === 'L') as MatrixTreeNode | null || null,
        M: data?.find(node => node.slot === 'M') as MatrixTreeNode | null || null,
        R: data?.find(node => node.slot === 'R') as MatrixTreeNode | null || null,
      };

      console.log('✅ Found children:', Object.values(children).filter(Boolean).length);

      return children;
    },
    enabled: !!matrixRootWallet && !!parentWallet,
    staleTime: 30000,
    gcTime: 300000,
  });
}

/**
 * Hook to fetch layer statistics using v_matrix_layer_statistics view
 *
 * @param matrixRootWallet - The wallet address of the matrix root
 * @returns React Query result with layer statistics
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useMatrixLayerStats('0x1234...');
 * ```
 */
export function useMatrixLayerStats(matrixRootWallet?: string) {
  return useQuery({
    queryKey: ['matrix-layer-statistics', matrixRootWallet],
    queryFn: async () => {
      if (!matrixRootWallet) {
        throw new Error('Matrix root wallet is required');
      }

      console.log('📊 Fetching layer statistics for:', matrixRootWallet);

      const { data, error } = await supabase
        .from('v_matrix_layer_statistics')
        .select('*')
        .eq('matrix_root_wallet', matrixRootWallet)
        .order('layer');

      if (error) {
        console.error('❌ Error fetching layer statistics:', error);
        throw error;
      }

      console.log('✅ Fetched layer statistics for', data?.length || 0, 'layers');

      return data || [];
    },
    enabled: !!matrixRootWallet,
    staleTime: 30000,
    gcTime: 300000,
  });
}

/**
 * Hook to fetch referral statistics using v_referral_statistics view
 *
 * @param memberWallet - The wallet address of the member
 * @returns React Query result with referral statistics
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useReferralStats('0x1234...');
 * ```
 */
export function useReferralStats(memberWallet?: string) {
  return useQuery({
    queryKey: ['referral-statistics', memberWallet],
    queryFn: async () => {
      if (!memberWallet) {
        throw new Error('Member wallet is required');
      }

      console.log('📊 Fetching referral statistics for:', memberWallet);

      const { data, error } = await supabase
        .from('v_referral_statistics')
        .select('*')
        .eq('member_wallet', memberWallet)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching referral statistics:', error);
        throw error;
      }

      console.log('✅ Fetched referral statistics:', data);

      return data || {
        direct_referral_count: 0,
        max_spillover_layer: 0,
        total_team_count: 0,
        matrix_19_layer_count: 0,
        activation_rate_percentage: 0
      };
    },
    enabled: !!memberWallet,
    staleTime: 30000,
    gcTime: 300000,
  });
}
