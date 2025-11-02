import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';

// 获取用户所在的系统矩阵根
export function useUserMatrixRoot(userWallet: string) {
  return useQuery({
    queryKey: ['user-matrix-root', userWallet],
    queryFn: async () => {
      if (!userWallet) throw new Error('No user wallet provided');

      console.log('🔍 Getting matrix root for user:', userWallet);

      // ✅ 查询用户在members表中的记录（使用新架构）
      const { data, error } = await supabase
        .from('members')
        .select('matrix_root_wallet, layer_level, parent_wallet, position')
        .eq('wallet_address', userWallet)
        .order('layer_level', { ascending: true })
        .limit(1);

      if (error) {
        console.error('❌ Error getting user matrix root:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('📍 User is a matrix root (no parent matrix found)');
        // 用户可能就是矩阵根本身
        return {
          systemMatrixRoot: userWallet,
          userLayer: 0,
          isMatrixRoot: true
        };
      }

      console.log('📍 User matrix root info:', data[0]);

      return {
        systemMatrixRoot: data[0].matrix_root_wallet,
        userLayer: data[0].layer_level,
        userParent: data[0].parent_wallet,
        userPosition: data[0].position,
        isMatrixRoot: false
      };
    },
    enabled: !!userWallet,
    staleTime: 30000, // Cache for 30 seconds
  });
}

// 获取用户在系统矩阵中的下线（包括滑落成员）
export function useUserDownline(userWallet: string, systemMatrixRoot?: string) {
  return useQuery({
    queryKey: ['user-downline', userWallet, systemMatrixRoot],
    queryFn: async () => {
      if (!userWallet) throw new Error('No user wallet provided');
      if (!systemMatrixRoot) throw new Error('No system matrix root provided');

      console.log('🔍 Getting downline for user:', userWallet, 'in matrix:', systemMatrixRoot);

      // 查询用户在系统矩阵中作为 parent_wallet 的所有下线
      const { data, error } = await supabase
        .from('v_matrix_direct_children')
        .select(`
          layer_index,
          slot_index,
          slot_num_seq,
          member_wallet,
          parent_wallet,
          referral_type,
          placed_at,
          child_level,
          child_nft_count
        `)
        .eq('matrix_root_wallet', systemMatrixRoot)
        .eq('parent_wallet', userWallet)
        .order('slot_num_seq');

      if (error) {
        console.error('❌ Error getting user downline:', error);
        throw error;
      }

      console.log('📊 User downline data:', data);

      // 组织成 L, M, R 格式
      const matrixPositions = ['L', 'M', 'R'];
      const matrix3x3 = matrixPositions.map(position => {
        const member = data?.find(m => m.slot_index === position);

        return {
          position: position,
          member: member ? {
            wallet: member.member_wallet,
            joinedAt: member.placed_at,
            type: member.referral_type,
            level: member.child_level,
            nftCount: member.child_nft_count,
            canExpand: false // TODO: Check if member has children
          } : null
        };
      });

      return {
        userWallet,
        systemMatrixRoot,
        positions: matrix3x3,
        totalMembers: data?.length || 0,
        rawData: data
      };
    },
    enabled: !!userWallet && !!systemMatrixRoot,
    staleTime: 5000,
    refetchInterval: 15000,
  });
}

// 3x3矩阵分层显示hook - 避免递归滑落混乱
export function useMatrixByLevel(matrixRootWallet: string, parentWallet?: string, currentLevel = 1) {
  return useQuery({
    queryKey: ['matrix-level', matrixRootWallet, parentWallet, currentLevel],
    queryFn: async () => {
      if (!matrixRootWallet) throw new Error('No matrix root wallet');
      
      let query = supabase
        .from('v_matrix_direct_children')
        .select(`
          layer_index,
          slot_index,
          slot_num_seq,
          member_wallet,
          parent_wallet,
          referral_type,
          placed_at
        `)
        .eq('matrix_root_wallet', matrixRootWallet);

      if (currentLevel === 1) {
        // Level 1: 只显示直接挂在matrix root下的L, M, R
        query = query
          .eq('layer_index', 1)
          .in('slot_index', ['L', 'M', 'R']);
      } else {
        // Level 2+: 显示特定parent下的子成员
        if (!parentWallet) throw new Error('Parent wallet required for level 2+');

        query = query
          .eq('parent_wallet', parentWallet)
          .eq('layer_index', currentLevel);
      }

      const { data: membersData, error } = await query.order('slot_num_seq');
      
      if (error) {
        console.error('Matrix query error:', error);
        throw error;
      }
      
      // 组织成3x3格式
      const matrixPositions = ['L', 'M', 'R'];
      const matrix3x3 = matrixPositions.map(position => {
        const member = membersData?.find(m => m.slot_index === position);

        return {
          position: position,
          member: member ? {
            wallet: member.member_wallet,
            joinedAt: member.placed_at,
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
    .from('v_matrix_direct_children')
    .select('*', { count: 'exact', head: true })
    .eq('matrix_root_wallet', matrixRootWallet)
    .eq('parent_wallet', memberWallet);

  return (count || 0) > 0;
}

// 获取parent的位置信息
async function getParentPosition(parentWallet: string, matrixRootWallet: string): Promise<string> {
  const { data } = await supabase
    .from('v_matrix_direct_children')
    .select('slot_index')
    .eq('matrix_root_wallet', matrixRootWallet)
    .eq('member_wallet', parentWallet)
    .single();

  return data?.slot_index || 'L';
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
          .from('v_matrix_direct_children')
          .select(`
            layer_index,
            slot_index,
            slot_num_seq,
            member_wallet,
            parent_wallet,
            referral_type,
            placed_at
          `)
          .eq('matrix_root_wallet', matrixRootWallet)
          .eq('parent_wallet', parentWallet)
          .order('slot_num_seq');
          
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
          const child = childrenData?.find((c: any) => c.slot_index === pos);

          return {
            position: pos,
            member: child ? {
              wallet: child.member_wallet,
              joinedAt: child.placed_at,
              type: child.referral_type,
              fullPosition: child.slot_index,
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
        // 如果有originalRootWallet，说明我们在drill-down模式，需要查询子节点的下级
        // 否则currentViewWallet就是矩阵根
        const matrixRootWallet = originalRootWallet || currentViewWallet;
        const isDrillDown = !!originalRootWallet && currentViewWallet !== originalRootWallet;

        console.log('🔍 Query mode:', isDrillDown ? 'DRILL-DOWN' : 'ROOT-VIEW');
        console.log('📍 Matrix root:', matrixRootWallet);
        console.log('👁️ Current view:', currentViewWallet);
        console.log('🎚️ Target layer:', targetLayer);

        // 使用 matrix_referrals_v2 表直接查询 parent_wallet
        // 当drill-down时，查询以currentViewWallet为parent的成员
        let query;

        if (isDrillDown && targetLayer === 1) {
          // Drill-down模式：查询currentViewWallet的直接下级（parent_wallet = currentViewWallet）
          console.log('🔽 Drill-down mode: Getting children of', currentViewWallet);

          query = supabase
            .from('v_matrix_direct_children')
            .select(`
              member_wallet,
              matrix_root_wallet,
              layer_index,
              slot_index,
              slot_num_seq,
              referral_type,
              placed_at,
              parent_wallet
            `)
            .eq('matrix_root_wallet', matrixRootWallet)
            .eq('parent_wallet', currentViewWallet);

        } else {
          // 正常模式：使用 v_matrix_direct_children view（自动过滤每层只显示上一层的直接子成员）
          query = supabase
            .from('v_matrix_direct_children')
            .select(`
              member_wallet,
              matrix_root_wallet,
              layer_index,
              slot_index,
              slot_num_seq,
              referral_type,
              placed_at,
              parent_wallet
            `)
            .eq('matrix_root_wallet', matrixRootWallet)
            .eq('layer_index', targetLayer);
        }

        const { data: matrixData, error: matrixError } = await query.order('slot_num_seq');

        if (matrixError) {
          console.error('❌ Error fetching matrix data:', matrixError);
          throw matrixError;
        }

        console.log(`📊 Matrix layer ${targetLayer} data for current view ${currentViewWallet}:`, matrixData);

        // 标准化数据格式（使用 v2 字段）
        const normalizedData = matrixData?.map((item: any) => ({
          member_wallet: item.member_wallet,
          matrix_root_wallet: item.matrix_root_wallet,
          matrix_position: item.slot_index,
          referral_type: item.referral_type,
          placed_at: item.placed_at
        })) || [];

        console.log(`📊 Normalized matrix data:`, normalizedData);
        
        // 获取用户信息
        const memberWallets = normalizedData?.map(m => m.member_wallet) || [];
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

        // 组织成标准3x3格式 - 根据层级不同处理
        let matrix3x3 = [];

        if (targetLayer === 1) {
          // Layer 1: 标准L, M, R布局
          const matrixPositions = ['L', 'M', 'R'];
          const memberPromises = matrixPositions.map(async position => {
            // 在drill-down模式下，position可能是完整路径（如"L.M.R"），我们需要提取最后一个字母
            const member = normalizedData?.find((m: any) => {
              const pos = m.matrix_position;
              if (!pos) return false;
              // 如果是drill-down模式，position可能包含点，取最后一部分
              const lastPart = pos.includes('.') ? pos.split('.').pop() : pos;
              return lastPart === position;
            });
            return await createMemberObject(member, position, usersData);
          });
          matrix3x3 = await Promise.all(memberPromises);
        } else if (targetLayer === 2) {
          // Layer 2: 按照L下级、M下级、R下级分组显示
          const displayPositions = ['L', 'M', 'R'];
          const memberPromises = displayPositions.map(async (position) => {
            // 查找该父位置下的所有子成员 (例如 L.L, L.M, L.R)
            const childMembers = normalizedData?.filter(m =>
              m.matrix_position && m.matrix_position.startsWith(`${position}.`)
            ) || [];

            // 如果有多个子成员，优先显示第一个（按位置排序）
            const sortedChildren = childMembers.sort((a, b) =>
              (a.matrix_position || '').localeCompare(b.matrix_position || '')
            );
            const member = sortedChildren[0] || null;

            return await createMemberObject(member, position, usersData);
          });
          matrix3x3 = await Promise.all(memberPromises);
        } else {
          // Layer 3+: 获取该层级所有成员，按顺序显示前3个在L, M, R位置
          // 这样确保每一层都有清晰的3x3布局，用户可以点击任意成员继续深入
          const matrixPositions = ['L', 'M', 'R'];
          const sortedMembers = normalizedData?.sort((a, b) => {
            // 按位置字符串排序，确保显示顺序一致
            return (a.matrix_position || '').localeCompare(b.matrix_position || '');
          }) || [];

          const memberPromises = matrixPositions.map(async (position, index) => {
            const member = sortedMembers[index];
            return await createMemberObject(member, position, usersData);
          });
          matrix3x3 = await Promise.all(memberPromises);
        }

        // 辅助函数：创建成员对象
        async function createMemberObject(member: any, position: string, usersData: any[]) {
          if (!member) {
            return {
              position,
              member: null
            };
          }

          const userData = usersData.find((u: any) =>
            u.wallet_address.toLowerCase() === member.member_wallet.toLowerCase()
          );

          // 查询该成员的下级，检查L/M/R位置是否有成员
          let hasChildInL = false;
          let hasChildInM = false;
          let hasChildInR = false;

          try {
            const { data: childrenData } = await supabase
              .from('v_matrix_direct_children')
              .select('slot_index')
              .eq('matrix_root_wallet', matrixRootWallet)
              .eq('parent_wallet', member.member_wallet);

            if (childrenData && childrenData.length > 0) {
              // 检查每个位置
              childrenData.forEach((child: any) => {
                const pos = child.slot_index;
                if (!pos) return;
                if (pos === 'L') hasChildInL = true;
                if (pos === 'M') hasChildInM = true;
                if (pos === 'R') hasChildInR = true;
              });
            }
          } catch (error) {
            console.warn('Could not check children for', member.member_wallet, error);
          }

          return {
            position,
            member: {
              wallet: member.member_wallet,
              joinedAt: member.placed_at,
              type: member.referral_type || 'direct',
              username: userData?.username || `User${member.member_wallet.slice(-4)}`,
              isActivated: true,
              isDirect: member.referral_type === 'direct',
              isSpillover: member.referral_type === 'spillover',
              hasChildInL,
              hasChildInM,
              hasChildInR,
              actualPosition: member.matrix_position || position // 保留实际位置信息
            }
          };
        }

        // 使用 Promise.all 并行创建所有成员对象

        console.log(`📊 Organized matrix 3x3 for ${currentViewWallet}:`, matrix3x3);

        return {
          matrixRootWallet: currentViewWallet,
          targetLayer,
          layer1Matrix: matrix3x3, // 保持兼容性
          totalLayer1Members: normalizedData?.length || 0,
          // 新增字段
          currentLayerMatrix: matrix3x3,
          totalCurrentLayerMembers: normalizedData?.length || 0
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