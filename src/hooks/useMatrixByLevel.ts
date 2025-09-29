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
      
      console.log('🔍 Getting matrix children via API for parent:', parentWallet);
      
      try {
        // 使用Matrix API获取完整的矩阵成员数据
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/matrix-view`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'x-wallet-address': matrixRootWallet,
          },
          body: JSON.stringify({
            action: 'get-matrix-members'
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Matrix API Error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('🔍 Matrix API response for children:', result);

        if (!result.success) {
          throw new Error(result.error || 'Matrix API call failed');
        }

        // 从所有成员中找到指定parent的下级
        const allMembers = result.data.tree_members || [];
        const childrenMembers = allMembers.filter((member: any) => 
          member.parent_wallet === parentWallet
        );
        
        console.log('📊 Children found for parent', parentWallet, ':', childrenMembers);

        // 组织成3x3子矩阵
        const childPositions = ['L', 'M', 'R'];
        const children3x3 = childPositions.map(pos => {
          // 查找该位置对应的子成员
          const child = childrenMembers.find((c: any) => 
            c.matrix_position === pos || c.matrix_position?.endsWith(`.${pos}`)
          );
          
          return {
            position: pos,
            member: child ? {
              wallet: child.wallet_address,
              joinedAt: child.joined_at,
              type: child.placement_type || 'matrix_placement',
              fullPosition: child.matrix_position,
              username: child.username,
              isActivated: child.is_activated
            } : null
          };
        });
        
        console.log('📊 Organized children 3x3:', children3x3);
        
        return {
          parentWallet,
          matrixRootWallet,
          children: children3x3,
          totalChildren: childrenMembers.length
        };
        
      } catch (error) {
        console.error('❌ Matrix children API error:', error);
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
    queryKey: ['layered-matrix', matrixRootWallet, Date.now()], // Add timestamp to force refresh
    queryFn: async () => {
      if (!matrixRootWallet) throw new Error('No matrix root wallet');
      
      console.log('🔍 Getting matrix data via Matrix API for root:', matrixRootWallet);
      
      try {
        // 使用Matrix API获取成员数据，而不是直接查询数据库
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/matrix-view`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'x-wallet-address': matrixRootWallet,
          },
          body: JSON.stringify({
            action: 'get-matrix-members'
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Matrix API Error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('🔍 Matrix API response:', result);

        if (!result.success) {
          throw new Error(result.error || 'Matrix API call failed');
        }

        const matrixData = result.data;
        const layer1Members = matrixData.matrix_data.by_layer['1'] || [];
        
        console.log('📊 Layer 1 members from API:', layer1Members);
        console.log('📊 Layer 1 member count:', layer1Members.length);

        // 组织成标准3x3格式并计算每个成员的下级数量
        const matrixPositions = ['L', 'M', 'R'];
        const allMembers = matrixData.tree_members || [];
        
        const matrix3x3 = matrixPositions.map(position => {
          const member = layer1Members.find((m: any) => m.matrix_position === position);
          
          if (!member) {
            return {
              position,
              member: null
            };
          }

          // 计算该成员的下级数量和具体位置
          const childrenMembers = allMembers.filter((m: any) => 
            m.parent_wallet === member.wallet_address
          );
          const childrenCount = childrenMembers.length;
          
          // 检查具体 L M R 位置是否有成员
          const hasChildInL = childrenMembers.some((m: any) => m.matrix_position?.endsWith('.L'));
          const hasChildInM = childrenMembers.some((m: any) => m.matrix_position?.endsWith('.M')); 
          const hasChildInR = childrenMembers.some((m: any) => m.matrix_position?.endsWith('.R'));
          
          return {
            position,
            member: {
              wallet: member.wallet_address,
              joinedAt: member.joined_at,
              type: (member.is_spillover || member.placement_type === 'spillover_placement') ? 'is_spillover' : 'is_direct',
              hasChildren: childrenCount > 0,
              childrenCount: childrenCount,
              username: member.username,
              isActivated: member.is_activated,
              hasChildInL: hasChildInL,
              hasChildInM: hasChildInM,
              hasChildInR: hasChildInR
            }
          };
        });

        console.log('📊 Organized matrix 3x3:', matrix3x3);

        return {
          matrixRootWallet,
          layer1Matrix: matrix3x3,
          totalLayer1Members: layer1Members.length
        };
        
      } catch (error) {
        console.error('❌ Matrix API error:', error);
        throw error;
      }
    },
    enabled: !!matrixRootWallet,
    staleTime: 0, // Force fresh data
    refetchInterval: 5000,
    cacheTime: 0, // Don't cache results
  });
}