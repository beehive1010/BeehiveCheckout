import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';

// 3x3矩阵分层显示hook - 避免递归滑落混乱
export function useMatrixByLevel(matrixRootWallet: string, parentWallet?: string, currentLevel = 1) {
  return useQuery({
    queryKey: ['matrix-level', matrixRootWallet, parentWallet, currentLevel],
    queryFn: async () => {
      if (!matrixRootWallet) throw new Error('No matrix root wallet');
      
      let query = supabase
        .from('matrix_referrals')
        .select(`
          layer,
          position,
          member_wallet,
          parent_wallet,
          parent_depth,
          referral_type,
          created_at
        `)
        .eq('matrix_root_wallet', matrixRootWallet);
      
      if (currentLevel === 1) {
        // Level 1: 只显示直接挂在matrix root下的L, M, R
        query = query
          .eq('layer', 1)
          .eq('parent_wallet', matrixRootWallet)
          .in('position', ['L', 'M', 'R']);
      } else {
        // Level 2+: 显示特定parent下的子成员
        if (!parentWallet) throw new Error('Parent wallet required for level 2+');
        
        query = query
          .eq('parent_wallet', parentWallet)
          .eq('layer', currentLevel);
      }
      
      const { data: membersData, error } = await query.order('position');
      
      if (error) {
        console.error('Matrix query error:', error);
        throw error;
      }
      
      // 组织成3x3格式
      const matrixPositions = ['L', 'M', 'R'];
      const matrix3x3 = matrixPositions.map(position => {
        let targetPosition = position;
        
        // 对于Level 2+，查找对应的子位置
        if (currentLevel > 1) {
          // 例如：如果parent在L位置，我们查找L.L, L.M, L.R
          const parentPosition = getParentPosition(parentWallet!, matrixRootWallet);
          targetPosition = `${parentPosition}.${position}`;
        }
        
        const member = membersData?.find(m => m.position === targetPosition);
        
        return {
          position: targetPosition,
          member: member ? {
            wallet: member.member_wallet,
            joinedAt: member.created_at,
            type: member.referral_type,
            canExpand: false // 暂时设为false，后面会在useLayeredMatrix中正确设置
          } : null
        };
      });
      
      return {
        currentLevel,
        matrixRootWallet,
        parentWallet,
        positions: matrix3x3,
        totalMembers: membersData?.length || 0
      };
    },
    enabled: !!matrixRootWallet,
    staleTime: 5000,
    refetchInterval: 15000,
  });
}

// 检查成员是否有下级
async function hasChildren(memberWallet: string, matrixRootWallet: string): Promise<boolean> {
  const { count } = await supabase
    .from('matrix_referrals')
    .select('*', { count: 'exact', head: true })
    .eq('matrix_root_wallet', matrixRootWallet)
    .eq('parent_wallet', memberWallet);
  
  return (count || 0) > 0;
}

// 获取parent的位置信息
async function getParentPosition(parentWallet: string, matrixRootWallet: string): Promise<string> {
  const { data } = await supabase
    .from('matrix_referrals')
    .select('position')
    .eq('matrix_root_wallet', matrixRootWallet)
    .eq('member_wallet', parentWallet)
    .single();
  
  return data?.position || 'L';
}

// 获取特定成员的下级成员
export function useMatrixChildren(matrixRootWallet: string, parentWallet: string) {
  return useQuery({
    queryKey: ['matrix-children', matrixRootWallet, parentWallet],
    queryFn: async () => {
      if (!matrixRootWallet || !parentWallet) {
        throw new Error('Matrix root and parent wallet required');
      }
      
      const { data: childrenData, error } = await supabase
        .from('matrix_referrals')
        .select(`
          layer,
          position,
          member_wallet,
          parent_wallet,
          referral_type,
          created_at
        `)
        .eq('matrix_root_wallet', matrixRootWallet)
        .eq('parent_wallet', parentWallet)
        .order('position');
      
      if (error) {
        console.error('Children query error:', error);
        throw error;
      }
      
      // 组织成3x3子矩阵
      const childPositions = ['L', 'M', 'R'];
      const children3x3 = childPositions.map(pos => {
        // 查找该位置对应的子成员
        // 例如：parent在L位置，子位置就是L.L, L.M, L.R
        const child = childrenData?.find(c => c.position.endsWith(`.${pos}`));
        
        return {
          position: pos,
          member: child ? {
            wallet: child.member_wallet,
            joinedAt: child.created_at,
            type: child.referral_type,
            fullPosition: child.position
          } : null
        };
      });
      
      return {
        parentWallet,
        matrixRootWallet,
        children: children3x3,
        totalChildren: childrenData?.length || 0
      };
    },
    enabled: !!matrixRootWallet && !!parentWallet,
    staleTime: 5000,
    refetchInterval: 15000,
  });
}

// 主要的分层矩阵显示hook
export function useLayeredMatrix(matrixRootWallet: string) {
  return useQuery({
    queryKey: ['layered-matrix', matrixRootWallet],
    queryFn: async () => {
      if (!matrixRootWallet) throw new Error('No matrix root wallet');
      
      // 只获取Layer 1的直接成员
      console.log('🔍 Querying matrix data for root:', matrixRootWallet);
      console.log('🔍 Query params - matrix_root_wallet:', matrixRootWallet);
      console.log('🔍 Query params - layer:', 1);
      console.log('🔍 Query params - parent_wallet:', matrixRootWallet);
      
      const { data: layer1Data, error } = await supabase
        .from('matrix_referrals')
        .select(`
          position,
          member_wallet,
          referral_type,
          created_at
        `)
        .eq('matrix_root_wallet', matrixRootWallet)
        .eq('layer', 1)
        .eq('parent_wallet', matrixRootWallet) // 确保是直接挂在root下的
        .order('position');
      
      console.log('📊 Layer 1 query result:', { layer1Data, error, matrixRootWallet });
      console.log('📊 Layer 1 data count:', layer1Data?.length || 0);
      if (layer1Data && layer1Data.length > 0) {
        console.log('📊 Sample data:', layer1Data[0]);
      }
      
      if (error) {
        console.error('Layered matrix query error:', error);
        throw error;
      }
      
      // 检查每个Layer 1成员是否有下级
      const layer1WithChildren = await Promise.all(
        (layer1Data || []).map(async (member) => {
          const { count } = await supabase
            .from('matrix_referrals')
            .select('*', { count: 'exact', head: true })
            .eq('matrix_root_wallet', matrixRootWallet)
            .eq('parent_wallet', member.member_wallet);
          
          return {
            ...member,
            hasChildren: (count || 0) > 0,
            childrenCount: count || 0
          };
        })
      );
      
      // 组织成标准3x3格式
      const matrixPositions = ['L', 'M', 'R'];
      const matrix3x3 = matrixPositions.map(position => {
        const member = layer1WithChildren.find(m => m.position === position);
        
        return {
          position,
          member: member ? {
            wallet: member.member_wallet,
            joinedAt: member.created_at,
            type: member.referral_type,
            hasChildren: member.hasChildren,
            childrenCount: member.childrenCount
          } : null
        };
      });
      
      return {
        matrixRootWallet,
        layer1Matrix: matrix3x3,
        totalLayer1Members: layer1Data?.length || 0
      };
    },
    enabled: !!matrixRootWallet,
    staleTime: 3000,
    refetchInterval: 10000,
  });
}