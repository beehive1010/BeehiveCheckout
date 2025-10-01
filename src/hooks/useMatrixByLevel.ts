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
    console.log('🔍 Getting network members for:', userWallet);
    
    // 直接使用简单的推荐查询（移除了有问题的RPC调用）
    const { data: directReferrals, error: directError } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('referrer_wallet', userWallet);
      
    if (directError) {
      console.error('Error fetching direct referrals:', directError);
      return [];
    }
    
    const addresses = directReferrals?.map(u => u.wallet_address) || [];
    console.log('📝 Found direct referrals:', addresses.length);
    
    // 检查哪些是已激活的成员
    if (addresses.length === 0) return [];
    
    const { data: membersData, error: membersError } = await supabase
      .from('members')
      .select('wallet_address')
      .in('wallet_address', addresses);
      
    if (membersError) {
      console.error('Error checking member status:', membersError);
      return addresses; // 如果检查失败，返回所有推荐用户
    }
    
    const activeMembers = membersData?.map(m => m.wallet_address) || [];
    console.log('✅ Active members found:', activeMembers.length);
    return activeMembers;
  } catch (error) {
    console.error('Error in getUserNetworkMembers:', error);
    return [];
  }
}

// 主要的分层矩阵显示hook - 显示指定节点的子节点
export function useLayeredMatrix(currentViewWallet: string, targetLayer: number = 1, originalRootWallet?: string) {
  return useQuery({
    queryKey: ['layered-matrix-root', currentViewWallet, targetLayer, originalRootWallet],
    queryFn: async () => {
      if (!currentViewWallet) throw new Error('No current view wallet');
      
      console.log('🔍 Getting matrix data for current view wallet:', currentViewWallet, 'layer:', targetLayer, 'original root:', originalRootWallet);
      
      try {
        // 确定矩阵根钱包
        const matrixRootWallet = originalRootWallet || currentViewWallet;
        
        // 使用matrix_referrals_tree_view查询当前节点的指定层级数据
        const { data: matrixData, error: matrixError } = await supabase
          .from('matrix_referrals_tree_view')
          .select(`
            member_wallet,
            matrix_root_wallet,
            matrix_layer,
            matrix_position,
            referral_type,
            placed_at
          `)
          .eq('matrix_root_wallet', currentViewWallet)
          .eq('matrix_layer', targetLayer)
          .in('matrix_position', ['L', 'M', 'R'])
          .order('matrix_position');
          
        if (matrixError) {
          console.error('❌ Error fetching matrix data:', matrixError);
          throw matrixError;
        }
        
        console.log(`📊 Matrix layer ${targetLayer} data for root ${currentViewWallet}:`, matrixData);
        
        // 获取用户信息
        const memberWallets = matrixData?.map(m => m.member_wallet) || [];
        let usersData = [];

        if (memberWallets.length > 0) {
          const { data: users, error: usersError } = await supabase
            .from('users')
            .select('wallet_address, username')
            .in('wallet_address', memberWallets);
            
          if (!usersError) {
            usersData = users || [];
          }
        }

        // 组织成标准3x3格式 - 按matrix_position分配
        const matrixPositions = ['L', 'M', 'R'];
        
        const matrix3x3 = matrixPositions.map(position => {
          // 查找匹配该位置的成员
          const member = matrixData?.find((m: any) => m.matrix_position === position);
          
          if (!member) {
            return {
              position,
              member: null
            };
          }

          const userData = usersData.find((u: any) => 
            u.wallet_address.toLowerCase() === member.member_wallet.toLowerCase()
          );

          return {
            position,
            member: {
              wallet: member.member_wallet,
              joinedAt: member.placed_at,
              type: member.referral_type || 'is_direct', // 保持与UI一致的类型值
              username: userData?.username || `User${member.member_wallet.slice(-4)}`,
              isActivated: true, // 假设view中的数据都是已激活的
              isDirect: member.referral_type === 'is_direct',
              isSpillover: member.referral_type === 'is_spillover',
              // 添加子节点状态检查
              hasChildInL: false, // TODO: 可以后续查询
              hasChildInM: false,
              hasChildInR: false
            }
          };
        });

        console.log(`📊 Organized matrix 3x3 for ${currentViewWallet}:`, matrix3x3);

        return {
          matrixRootWallet: currentViewWallet,
          targetLayer,
          layer1Matrix: matrix3x3, // 保持兼容性
          totalLayer1Members: matrixData?.length || 0,
          // 新增字段
          currentLayerMatrix: matrix3x3,
          totalCurrentLayerMembers: matrixData?.length || 0
        };
        
      } catch (error) {
        console.error('❌ User network matrix error:', error);
        throw error;
      }
    },
    enabled: !!currentViewWallet,
    staleTime: 5000,
    refetchInterval: 15000,
  });
}