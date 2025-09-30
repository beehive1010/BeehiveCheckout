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
      
      console.log('🔍 Getting matrix children from DB for parent:', parentWallet);
      
      try {

        // 直接从数据库查询指定parent的下级成员
        console.log('🔍 Looking for children of parent:', parentWallet, 'in matrix root:', matrixRootWallet);
        
        const { data: childrenData, error: childrenError } = await supabase
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
          
        if (childrenError) {
          console.error('❌ Error fetching children:', childrenError);
          throw childrenError;
        }
        
        console.log('📊 Raw children data from DB:', childrenData);
        
        console.log('📊 Children found for parent', parentWallet, ':', childrenData?.length || 0);

        // 组织成3x3子矩阵 - 查找直接子位置
        const childPositions = ['L', 'M', 'R'];
        const children3x3 = childPositions.map(pos => {
          // 查找该位置对应的子成员
          const child = childrenData?.find((c: any) => {
            const position = c.position || '';
            // 对于第二层数据，直接匹配position（L, M, R）或者以.L .M .R结尾的
            return position === pos || position.endsWith(`.${pos}`);
          });
          
          return {
            position: pos,
            member: child ? {
              wallet: child.member_wallet,
              joinedAt: child.created_at,
              type: child.referral_type,
              fullPosition: child.position,
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

// 获取用户完整递归网络成员列表的辅助函数
async function getUserNetworkMembers(userWallet: string): Promise<string[]> {
  try {
    // 使用递归CTE查询获取完整网络
    const { data: networkData, error: networkError } = await supabase.rpc('sql', {
      query: `
        WITH RECURSIVE referral_tree AS (
          SELECT wallet_address, referrer_wallet, 1 as level
          FROM users 
          WHERE referrer_wallet = '${userWallet}'
          
          UNION ALL
          
          SELECT u.wallet_address, u.referrer_wallet, rt.level + 1
          FROM users u
          INNER JOIN referral_tree rt ON u.referrer_wallet = rt.wallet_address
          WHERE rt.level < 10
        )
        SELECT rt.wallet_address
        FROM referral_tree rt
        INNER JOIN members m ON rt.wallet_address = m.wallet_address
      `
    });
    
    if (networkError) {
      console.log('RPC query failed, using direct approach');
      // 回退到简单的直接推荐查询
      const { data: directReferrals, error: directError } = await supabase
        .from('users')
        .select('wallet_address')
        .eq('referrer_wallet', userWallet);
        
      if (directError) {
        console.error('Error fetching direct referrals:', directError);
        return [];
      }
      
      const addresses = directReferrals?.map(u => u.wallet_address) || [];
      
      // 检查哪些是已激活的成员
      if (addresses.length === 0) return [];
      
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('wallet_address')
        .in('wallet_address', addresses);
        
      return membersData?.map(m => m.wallet_address) || [];
    }
    
    return networkData?.map((row: any) => row.wallet_address) || [];
  } catch (error) {
    console.error('Error in getUserNetworkMembers:', error);
    return [];
  }
}

// 主要的分层矩阵显示hook - 显示用户在全局矩阵中的网络
export function useLayeredMatrix(userWallet: string, targetLayer: number = 1) {
  return useQuery({
    queryKey: ['layered-matrix-network', userWallet, targetLayer],
    queryFn: async () => {
      if (!userWallet) throw new Error('No user wallet');
      
      console.log('🔍 Getting user network matrix data for wallet:', userWallet, 'layer:', targetLayer);
      
      try {
        // 获取用户的网络成员
        const networkMembers = await getUserNetworkMembers(userWallet);
        
        if (networkMembers.length === 0) {
          console.log('No network members found for user:', userWallet);
          return {
            matrixRootWallet: userWallet,
            targetLayer,
            layer1Matrix: [],
            totalLayer1Members: 0,
            currentLayerMatrix: [],
            totalCurrentLayerMembers: 0
          };
        }
        
        // 获取这些成员在全局矩阵中的位置数据
        const { data: layerData, error: layerError } = await supabase
          .from('matrix_referrals')
          .select(`
            layer,
            position,
            member_wallet,
            parent_wallet,
            referral_type,
            created_at
          `)
          .in('member_wallet', networkMembers)
          .eq('layer', targetLayer)
          .order('position');
          
        if (layerError) {
          console.error('❌ Error fetching user network matrix data:', layerError);
          throw layerError;
        }
        
        console.log(`📊 User network layer ${targetLayer} data:`, layerData);

        // 组织成标准3x3格式 - 根据位置分组显示
        const matrixPositions = ['L', 'M', 'R'];
        
        const matrix3x3 = matrixPositions.map(position => {
          // 查找匹配该位置的成员（可能有多个，因为全局矩阵中位置格式如 L.M.R）
          const members = layerData?.filter((m: any) => 
            m.position === position || m.position?.startsWith(`${position}.`) || m.position?.endsWith(`.${position}`)
          ) || [];
          
          // 如果有多个成员，选择第一个作为代表
          const member = members[0];
          
          if (!member) {
            return {
              position,
              member: null
            };
          }

          return {
            position,
            member: {
              wallet: member.member_wallet,
              joinedAt: member.created_at,
              type: member.referral_type,
              hasChildren: members.length > 1, // 如果有多个成员在此位置，表示有子节点
              childrenCount: members.length - 1,
              username: `User${member.member_wallet.slice(-4)}`,
              isActivated: true,
              hasChildInL: false,
              hasChildInM: false,
              hasChildInR: false,
              allMembers: members // 保存所有在此位置的成员
            }
          };
        });

        console.log(`📊 Organized user network layer ${targetLayer} matrix 3x3:`, matrix3x3);

        return {
          matrixRootWallet: userWallet,
          targetLayer,
          layer1Matrix: matrix3x3, // 保持兼容性
          totalLayer1Members: layerData?.length || 0,
          // 新增字段
          currentLayerMatrix: matrix3x3,
          totalCurrentLayerMembers: layerData?.length || 0
        };
        
      } catch (error) {
        console.error('❌ User network matrix error:', error);
        throw error;
      }
    },
    enabled: !!userWallet,
    staleTime: 5000,
    refetchInterval: 15000,
  });
}