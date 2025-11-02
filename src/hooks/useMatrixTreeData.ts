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
  current_level: number;  // ✅ Fixed: use current_level from view
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
        .ilike('matrix_root_wallet', matrixRootWallet);

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

      // First, find the matrix root for this member from members table
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('matrix_root_wallet, layer_level')
        .ilike('wallet_address', memberWallet)
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
      const memberLayer = memberData.layer_level;

      console.log('✅ Found matrix root:', matrixRoot, 'member at layer:', memberLayer);

      // Fetch tree data from member's position down to maxDepth
      const maxLayer = Math.min(memberLayer + maxDepth, 19);

      let query = supabase
        .from('v_matrix_tree_19_layers')
        .select('*')
        .ilike('matrix_root_wallet', matrixRoot)
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
 * Note: This uses parent_wallet directly, not matrix_root_wallet filter
 *
 * @param userWallet - The wallet address of the user (for reference, not used in query)
 * @param parentWallet - The wallet address of the parent node
 * @returns React Query result with children nodes (L, M, R)
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useMatrixNodeChildren('0x1234...', '0x5678...');
 * ```
 */
export function useMatrixNodeChildren(
  userWallet?: string,
  parentWallet?: string
) {
  return useQuery<{ L: MatrixTreeNode | null; M: MatrixTreeNode | null; R: MatrixTreeNode | null }>({
    queryKey: ['matrix-node-children', userWallet, parentWallet],
    queryFn: async () => {
      if (!parentWallet) {
        throw new Error('Parent wallet is required');
      }

      console.log('👶 Fetching children for parent:', parentWallet);

      // Query children directly by parent_wallet from members table
      const { data, error } = await supabase
        .from('members')
        .select(`
          wallet_address,
          parent_wallet,
          slot,
          layer_level,
          referrer_wallet,
          activation_time,
          activation_sequence,
          current_level
        `)
        .ilike('parent_wallet', parentWallet)
        .order('slot');

      if (error) {
        console.error('❌ Error fetching children:', error);
        throw error;
      }

      // Check if children have their own children
      const childrenWallets = data?.map(d => d.wallet_address) || [];
      const { data: grandchildrenData } = await supabase
        .from('members')
        .select('parent_wallet, slot')
        .in('parent_wallet', childrenWallets);

      // Build children_slots for each child
      const childrenSlotsMap = new Map<string, any>();
      grandchildrenData?.forEach(gc => {
        if (!childrenSlotsMap.has(gc.parent_wallet)) {
          childrenSlotsMap.set(gc.parent_wallet, { L: null, M: null, R: null });
        }
        const slots = childrenSlotsMap.get(gc.parent_wallet);
        if (gc.slot) {
          slots[gc.slot] = gc.parent_wallet; // Just mark as filled
        }
      });

      // Transform to MatrixTreeNode format
      const transformNode = (node: any): MatrixTreeNode | null => {
        if (!node) return null;
        const childrenSlots = childrenSlotsMap.get(node.wallet_address) || { L: null, M: null, R: null };
        // Calculate referral_type: direct if parent = referrer, otherwise spillover
        const referralType = node.parent_wallet?.toLowerCase() === node.referrer_wallet?.toLowerCase()
          ? 'direct'
          : 'spillover';
        return {
          matrix_root_wallet: '', // Not used anymore
          layer: node.layer_level,
          member_wallet: node.wallet_address,
          member_username: null,
          current_level: node.current_level || 0,
          activation_sequence: node.activation_sequence || 0,
          parent_wallet: node.parent_wallet,
          slot: node.slot,
          activation_time: node.activation_time,
          referral_type: referralType,
          has_children: Object.values(childrenSlots).some(s => s !== null),
          children_count: Object.values(childrenSlots).filter(s => s !== null).length,
          children_slots: childrenSlots
        };
      };

      // Organize children by slot (L, M, R)
      const children = {
        L: transformNode(data?.find(node => node.slot === 'L') || null),
        M: transformNode(data?.find(node => node.slot === 'M') || null),
        R: transformNode(data?.find(node => node.slot === 'R') || null),
      };

      console.log('✅ Found children:', Object.values(children).filter(Boolean).length);

      return children;
    },
    enabled: !!parentWallet,
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
        .ilike('matrix_root_wallet', matrixRootWallet)
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
        .ilike('member_wallet', memberWallet)
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

/**
 * Hook to search for members in a user's 19-layer subtree
 *
 * @param userWallet - The wallet address of the user whose subtree to search
 * @param searchQuery - Search query for wallet address
 * @returns React Query result with matching nodes
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useMatrixGlobalSearch('0x1234...', '0x5678');
 * ```
 */
export function useMatrixGlobalSearch(
  userWallet?: string,
  searchQuery?: string
) {
  return useQuery<MatrixTreeNode[]>({
    queryKey: ['matrix-global-search', userWallet, searchQuery],
    queryFn: async (): Promise<MatrixTreeNode[]> => {
      if (!userWallet || !searchQuery || searchQuery.trim().length === 0) {
        return [];
      }

      const query = searchQuery.toLowerCase().trim();
      console.log('🔍 Searching user subtree for:', query, 'user:', userWallet);

      // Use fn_get_user_matrix_subtree to get all members in user's 19-layer tree
      const { data: subtreeData, error } = await supabase
        .rpc('fn_get_user_matrix_subtree', { p_root_wallet: userWallet });

      if (error) {
        console.error('❌ Error in global search:', error);
        throw error;
      }

      // Filter results by search query (wallet address only, as we don't have usernames)
      const filtered = subtreeData?.filter((node: any) =>
        node.member_wallet?.toLowerCase().includes(query) &&
        node.depth_from_user > 0 // Exclude the root user
      ) || [];

      // Transform to MatrixTreeNode format
      const results: MatrixTreeNode[] = filtered.map((node: any) => ({
        matrix_root_wallet: '', // Not used
        layer: node.layer,
        member_wallet: node.member_wallet,
        member_username: null,
        current_level: node.current_level || 0,
        activation_sequence: node.activation_sequence || 0,
        parent_wallet: node.parent_wallet,
        slot: node.slot,
        activation_time: node.activation_time,
        referral_type: node.referral_type || 'direct',
        has_children: node.has_children || false,
        children_count: node.children_count || 0,
        children_slots: node.children_slots || { L: null, M: null, R: null }
      }));

      console.log('✅ Found', results.length, 'matching members');

      return results;
    },
    enabled: !!userWallet && !!searchQuery && searchQuery.trim().length > 0,
    staleTime: 10000, // Cache for 10 seconds
    gcTime: 60000, // Keep in cache for 1 minute
  });
}
