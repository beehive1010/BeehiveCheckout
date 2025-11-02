import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useToast } from './use-toast';

/**
 * 成员管理 API Hooks
 * 参考 Express MemberController 设计
 */

// ============================================
// Types
// ============================================
export interface Member {
  wallet_address: string;
  member_username: string | null;
  referrer_wallet: string | null;
  matrix_root_wallet: string | null;
  parent_wallet: string | null;
  position: 'L' | 'M' | 'R' | null;
  layer_level: number | null;
  current_level: number;
  total_nft_claimed: number;
  activation_sequence: number | null;
  activation_time: string | null;
}

export interface CreateMemberData {
  wallet_address: string;
  username?: string;
  referrer_wallet?: string;
}

export interface UpdateMemberData {
  username?: string;
  referrer_wallet?: string;
}

export interface MemberLayerInfo {
  wallet_address: string;
  layer_level: number | null;
  position: string | null;
  parent_wallet: string | null;
  children_count: number;
  direct_children: Array<{
    wallet_address: string;
    position: string;
    username: string | null;
  }>;
}

// ============================================
// Query Hooks (READ operations)
// ============================================

/**
 * 获取单个成员 (by wallet address)
 * 对应: GET /members/:wallet
 */
export function useMember(walletAddress: string | null) {
  return useQuery({
    queryKey: ['member', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('Wallet address is required');

      const { data, error } = await supabase
        .from('v_member_overview')
        .select('*')
        .ilike('wallet_address', walletAddress)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!walletAddress,
    staleTime: 30000, // 30秒缓存
  });
}

/**
 * 获取所有成员 (分页)
 * 对应: GET /members?limit=100&offset=0
 */
export function useMembers(options: { limit?: number; offset?: number } = {}) {
  const { limit = 100, offset = 0 } = options;

  return useQuery({
    queryKey: ['members', limit, offset],
    queryFn: async () => {
      const { data, count, error } = await supabase
        .from('v_member_overview')
        .select('*', { count: 'exact' })
        .order('activation_sequence', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return { members: data || [], total: count || 0 };
    },
    staleTime: 60000, // 1分钟缓存
  });
}

/**
 * 获取成员层级信息
 * 对应: GET /members/:id/layer-info
 */
export function useMemberLayerInfo(walletAddress: string | null) {
  return useQuery({
    queryKey: ['member-layer-info', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('Wallet address is required');

      // 获取成员基本层级信息
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('wallet_address, layer_level, position, parent_wallet')
        .ilike('wallet_address', walletAddress)
        .single();

      if (memberError) throw memberError;

      // 获取直接子节点
      const { data: children, error: childrenError } = await supabase
        .from('members')
        .select('wallet_address, position, member_username')
        .ilike('parent_wallet', walletAddress)
        .order('position');

      if (childrenError) throw childrenError;

      const layerInfo: MemberLayerInfo = {
        wallet_address: member.wallet_address,
        layer_level: member.layer_level,
        position: member.position,
        parent_wallet: member.parent_wallet,
        children_count: children?.length || 0,
        direct_children: children?.map(c => ({
          wallet_address: c.wallet_address,
          position: c.position,
          username: c.member_username
        })) || []
      };

      return layerInfo;
    },
    enabled: !!walletAddress,
    staleTime: 30000,
  });
}

/**
 * 搜索成员 (by wallet or username)
 * 对应: GET /search?term=xxx
 */
export function useSearchMembers(searchTerm: string) {
  return useQuery({
    queryKey: ['search-members', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 3) return [];

      const { data, error } = await supabase
        .from('v_member_overview')
        .select('wallet_address, member_username, current_level, is_active')
        .or(`wallet_address.ilike.%${searchTerm}%,member_username.ilike.%${searchTerm}%`)
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: searchTerm.length >= 3,
  });
}

// ============================================
// Mutation Hooks (CREATE/UPDATE/DELETE operations)
// ============================================

/**
 * 创建新成员
 * 对应: POST /members
 */
export function useCreateMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (memberData: CreateMemberData) => {
      const { data, error } = await supabase.functions.invoke('member-management/create', {
        body: memberData
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to create member');

      return data.member;
    },
    onSuccess: (newMember) => {
      // 使缓存失效，触发重新获取
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['member', newMember.wallet_address] });

      toast({
        title: 'Success',
        description: 'Member created successfully',
        duration: 3000
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
        duration: 5000
      });
    }
  });
}

/**
 * 更新成员信息
 * 对应: PUT /members/:id
 */
export function useUpdateMember(walletAddress: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (updateData: UpdateMemberData) => {
      const { data, error } = await supabase.functions.invoke('member-management/update', {
        body: updateData,
        headers: {
          'x-wallet-address': walletAddress
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to update member');

      return data.member;
    },
    onSuccess: (updatedMember) => {
      // 更新缓存
      queryClient.setQueryData(['member', walletAddress], updatedMember);
      queryClient.invalidateQueries({ queryKey: ['members'] });

      toast({
        title: 'Success',
        description: 'Member updated successfully',
        duration: 3000
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
        duration: 5000
      });
    }
  });
}

/**
 * 删除成员
 * 对应: DELETE /members/:id
 */
export function useDeleteMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (walletAddress: string) => {
      const { data, error } = await supabase.functions.invoke('member-management/delete', {
        headers: {
          'x-wallet-address': walletAddress
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to delete member');

      return data;
    },
    onSuccess: (_, walletAddress) => {
      // 移除缓存
      queryClient.removeQueries({ queryKey: ['member', walletAddress] });
      queryClient.invalidateQueries({ queryKey: ['members'] });

      toast({
        title: 'Success',
        description: 'Member deleted successfully',
        duration: 3000
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
        duration: 5000
      });
    }
  });
}

// ============================================
// Export all hooks
// ============================================
export default {
  // Queries
  useMember,
  useMembers,
  useMemberLayerInfo,
  useSearchMembers,

  // Mutations
  useCreateMember,
  useUpdateMember,
  useDeleteMember
};
