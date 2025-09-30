import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';

// 3x3矩阵分层显示hook - 避免递归滑落混乱
export function useMatrixByLevel(matrixRootWallet: string, parentWallet?: string, currentLevel = 1) {
  return useQuery({
    queryKey: ['matrix-level', matrixRootWallet, parentWallet, currentLevel],
    queryFn: async () => {
      if (!matrixRootWallet) throw new Error('No matrix root wallet');
      
      let query = supabase
        .from('referrals')
        .select(`
          matrix_layer,
          matrix_position,
          member_wallet,
          referrer_wallet,
          member_activation_sequence,
          is_spillover_placement,
          placed_at
        `)
        .eq('matrix_root_wallet', matrixRootWallet);
      
      if (currentLevel === 1) {
        // Level 1: 只显示直接挂在matrix root下的L, M, R
        query = query
          .eq('matrix_layer', 1)
          .in('matrix_position', ['L', 'M', 'R']);
      } else {
        // Level 2+: 显示特定parent下的子成员
        if (!parentWallet) throw new Error('Parent wallet required for level 2+');
        
        query = query
          .eq('referrer_wallet', parentWallet)
          .eq('matrix_layer', currentLevel);
      }
      
      const { data: membersData, error } = await query.order('matrix_position');
      
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
        
        const member = membersData?.find(m => m.matrix_position === targetPosition);
        
        return {
          position: targetPosition,
          member: member ? {
            wallet: member.member_wallet,
            joinedAt: member.placed_at,
            type: member.is_spillover_placement ? 'is_spillover' : 'is_direct',
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
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('matrix_root_wallet', matrixRootWallet)
    .eq('referrer_wallet', memberWallet);
  
  return (count || 0) > 0;
}

// 获取parent的位置信息
async function getParentPosition(parentWallet: string, matrixRootWallet: string): Promise<string> {
  const { data } = await supabase
    .from('referrals')
    .select('matrix_position')
    .eq('matrix_root_wallet', matrixRootWallet)
    .eq('member_wallet', parentWallet)
    .single();
  
  return data?.matrix_position || 'L';
}

// 获取特定成员的下级成员
export function useMatrixChildren(matrixRootWallet: string, parentWallet: string) {
  return useQuery({
    queryKey: ['matrix-children', matrixRootWallet, parentWallet],
    queryFn: async () => {
      if (!matrixRootWallet || !parentWallet) {
        throw new Error('Matrix root and parent wallet required');
      }
      
      console.log('🔍 Getting matrix children from DB for parent:', parentWallet);
      
      try {

        // 直接从数据库查询指定parent的下级成员
        console.log('🔍 Looking for children of parent:', parentWallet, 'in matrix root:', matrixRootWallet);
        
        const { data: childrenData, error: childrenError } = await supabase
          .from('referrals')
          .select(`
            matrix_layer,
            matrix_position,
            member_wallet,
            referrer_wallet,
            is_spillover_placement,
            placed_at
          `)
          .eq('matrix_root_wallet', matrixRootWallet)
          .eq('referrer_wallet', parentWallet)
          .order('matrix_position');
          
        if (childrenError) {
          console.error('❌ Error fetching children:', childrenError);
          throw childrenError;
        }
        
        console.log('📊 Raw children data from DB:', childrenData);
        
        console.log('📊 Children found for parent', parentWallet, ':', childrenMembers);

        // 组织成3x3子矩阵 - 查找直接子位置
        const childPositions = ['L', 'M', 'R'];
        const children3x3 = childPositions.map(pos => {
          // 查找该位置对应的子成员（查找以.L .M .R结尾的位置）
          const child = childrenData?.find((c: any) => {
            const position = c.matrix_position || '';
            // 匹配 position.L, position.M, position.R 的格式
            return position.endsWith(`.${pos}`) || position === pos;
          });
          
          return {
            position: pos,
            member: child ? {
              wallet: child.member_wallet,
              joinedAt: child.placed_at,
              type: child.is_spillover_placement ? 'is_spillover' : 'is_direct',
              fullPosition: child.matrix_position,
              hasChildren: false, // TODO: 可以后续查询
              childrenCount: 0
            } : null
          };
        });
        
        console.log('📊 Organized children 3x3:', children3x3);
        
        console.log('📊 Organized children 3x3:', children3x3);
        
        return {
          parentWallet,
          matrixRootWallet,
          children: children3x3,
          totalChildren: childrenData?.length || 0
        };
        
      } catch (error) {
        console.error('❌ Matrix children DB error:', error);
        throw error;
      }
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
      
      console.log('🔍 Getting matrix data from DB for root:', matrixRootWallet);
      
      try {
        // 直接从数据库获取Layer 1数据
        const { data: layer1Data, error: layer1Error } = await supabase
          .from('referrals')
          .select(`
            matrix_layer,
            matrix_position,
            member_wallet,
            referrer_wallet,
            is_spillover_placement,
            placed_at
          `)
          .eq('matrix_root_wallet', matrixRootWallet)
          .eq('matrix_layer', 1)
          .in('matrix_position', ['L', 'M', 'R'])
          .order('matrix_position');
          
        if (layer1Error) {
          console.error('❌ Error fetching layer 1 data:', layer1Error);
          throw layer1Error;
        }
        
        console.log('📊 Layer 1 data from DB:', layer1Data);

        // 组织成标准3x3格式
        const matrixPositions = ['L', 'M', 'R'];
        
        const matrix3x3 = matrixPositions.map(position => {
          const member = layer1Data?.find((m: any) => m.matrix_position === position);
          
          if (!member) {
            return {
              position,
              member: null
            };
          }

          // 检查该成员是否有子节点
          return {
            position,
            member: {
              wallet: member.member_wallet,
              joinedAt: member.placed_at,
              type: member.is_spillover_placement ? 'is_spillover' : 'is_direct',
              hasChildren: true, // 暂时设为true，实际检查可以后续优化
              childrenCount: 0, // 暂时设为0
              username: `User${member.member_wallet.slice(-4)}`, // 临时用户名
              isActivated: true,
              hasChildInL: false,
              hasChildInM: false,
              hasChildInR: false
            }
          };
        });

        console.log('📊 Organized matrix 3x3:', matrix3x3);

        return {
          matrixRootWallet,
          layer1Matrix: matrix3x3,
          totalLayer1Members: layer1Data?.length || 0
        };
        
      } catch (error) {
        console.error('❌ Matrix DB error:', error);
        throw error;
      }
    },
    enabled: !!matrixRootWallet,
    staleTime: 5000,
    refetchInterval: 15000,
  });
}