import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// 递归矩阵Hook - 专门处理递归占位逻辑
export function useRecursiveMatrix(rootWallet: string, targetLayer: number = 1) {
  return useQuery({
    queryKey: ['recursive-matrix', rootWallet, targetLayer],
    queryFn: async () => {
      if (!rootWallet) throw new Error('No root wallet');
      
      console.log('🔍 Getting recursive matrix data for root:', rootWallet, 'layer:', targetLayer);
      
      try {
        // 获取所有以该钱包为根的推荐，按激活顺序排列
        const { data: allReferrals, error: referralsError } = await supabase
          .from('referrals')
          .select(`
            member_wallet,
            referrer_wallet,
            matrix_root_wallet,
            matrix_layer,
            matrix_position,
            is_direct_referral,
            is_spillover_placement,
            member_activation_sequence,
            placed_at
          `)
          .eq('matrix_root_wallet', rootWallet)
          .order('member_activation_sequence');

        if (referralsError) {
          console.error('❌ Error fetching recursive matrix data:', referralsError);
          throw referralsError;
        }

        console.log(`📊 Found ${allReferrals?.length || 0} total referrals for root ${rootWallet}`);

        // 获取用户信息
        const memberWallets = allReferrals?.map(r => r.member_wallet) || [];
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

        // 模拟递归矩阵分配逻辑
        const simulateRecursivePlacement = () => {
          const result = [];
          const positions = ['L', 'M', 'R'];
          let currentLayer = 1;
          let currentPositionInLayer = 0;
          
          for (let i = 0; i < allReferrals.length; i++) {
            const member = allReferrals[i];
            const positionLetter = positions[currentPositionInLayer % 3];
            
            // 计算当前应该在哪一层
            const layerNumber = Math.floor(i / 3) + 1;
            
            result.push({
              ...member,
              calculatedLayer: layerNumber,
              calculatedPosition: positionLetter,
              sequenceIndex: i + 1
            });
            
            currentPositionInLayer++;
          }
          
          return result;
        };

        const simulatedPlacements = simulateRecursivePlacement();
        
        // 获取目标层级的成员
        const targetLayerMembers = simulatedPlacements.filter(m => m.calculatedLayer === targetLayer);
        
        console.log(`📊 Layer ${targetLayer} members:`, targetLayerMembers.length);

        // 组织成3x3格式
        const matrixPositions = ['L', 'M', 'R'];
        
        const matrix3x3 = matrixPositions.map(position => {
          const member = targetLayerMembers.find(m => m.calculatedPosition === position);
          
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
              type: member.is_spillover_placement ? 'is_spillover' : 'is_direct',
              username: userData?.username || `User${member.member_wallet.slice(-4)}`,
              isActivated: true,
              isDirect: member.is_direct_referral,
              isSpillover: member.is_spillover_placement,
              sequenceIndex: member.sequenceIndex,
              actualLayer: member.matrix_layer,
              actualPosition: member.matrix_position,
              calculatedLayer: member.calculatedLayer,
              calculatedPosition: member.calculatedPosition,
              // 添加匹配状态
              isMatching: member.matrix_layer === member.calculatedLayer && 
                         member.matrix_position === member.calculatedPosition
            }
          };
        });

        // 计算总层数（基于推荐总数）
        const totalLayers = Math.ceil(allReferrals.length / 3);
        
        console.log(`📊 Matrix organized for layer ${targetLayer}:`, matrix3x3);
        console.log(`📈 Total calculated layers: ${totalLayers}`);

        return {
          matrixRootWallet: rootWallet,
          targetLayer,
          totalReferrals: allReferrals.length,
          totalCalculatedLayers: totalLayers,
          layer1Matrix: matrix3x3, // 保持兼容性
          totalLayer1Members: targetLayerMembers.length,
          currentLayerMatrix: matrix3x3,
          totalCurrentLayerMembers: targetLayerMembers.length,
          // 额外信息
          allReferrals: allReferrals,
          simulatedPlacements: simulatedPlacements
        };
        
      } catch (error) {
        console.error('❌ Recursive matrix error:', error);
        throw error;
      }
    },
    enabled: !!rootWallet,
    staleTime: 5000,
    refetchInterval: 15000,
  });
}