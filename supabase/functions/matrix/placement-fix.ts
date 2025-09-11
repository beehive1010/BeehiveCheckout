// 修复的Matrix Placement算法
// 确保位置唯一性和正确的L-M-R顺序

interface PlacementResult {
  success: boolean;
  layer: number;
  position: string;
  error?: string;
  conflictDetected?: boolean;
}

// 修复的位置查找算法 - 严格检查位置占用
async function findNextAvailablePosition(supabase: any, rootWallet: string): Promise<PlacementResult> {
  console.log(`🔍 Finding next available position for root: ${rootWallet}`);
  
  // 从第1层开始检查
  for (let layer = 1; layer <= 19; layer++) {
    console.log(`📊 Checking layer ${layer}...`);
    
    // L-M-R 严格顺序检查
    const positions = ['L', 'M', 'R'];
    
    for (const position of positions) {
      // 检查 referrals 表中的占用情况
      const { data: existingReferrals, error: referralsError } = await supabase
        .from('referrals')
        .select('id, member_wallet')
        .ilike('matrix_root', rootWallet)
        .eq('matrix_layer', layer)
        .eq('matrix_position', position)
        .limit(1);
      
      if (referralsError) {
        console.error(`❌ Error checking referrals: ${referralsError.message}`);
        return {
          success: false,
          layer: 0,
          position: '',
          error: `Database error: ${referralsError.message}`
        };
      }
      
      // 检查 individual_matrix_placements 表中的占用情况
      const { data: existingPlacements, error: placementsError } = await supabase
        .from('individual_matrix_placements')
        .select('id, wallet_address')
        .ilike('matrix_owner', rootWallet)
        .eq('layer', layer)
        .eq('position', position)
        .limit(1);
      
      if (placementsError) {
        console.error(`❌ Error checking placements: ${placementsError.message}`);
        return {
          success: false,
          layer: 0,
          position: '',
          error: `Database error: ${placementsError.message}`
        };
      }
      
      // 检查 matrix_activity_log 表中的占用情况（如果存在）
      let existingActivity = [];
      try {
        const { data: activityData, error: activityError } = await supabase
          .from('matrix_activity_log')
          .select('id, member_wallet')
          .ilike('matrix_owner', rootWallet)
          .eq('matrix_layer', layer)
          .eq('matrix_position', position)
          .limit(1);
        
        if (!activityError) {
          existingActivity = activityData || [];
        }
      } catch (error) {
        // matrix_activity_log表可能不存在，忽略错误
        console.log(`ℹ️ matrix_activity_log table not accessible, skipping check`);
      }
      
      // 如果所有表都显示该位置空闲，则可以使用
      const isOccupied = (existingReferrals?.length > 0) || 
                        (existingPlacements?.length > 0) || 
                        (existingActivity?.length > 0);
      
      if (!isOccupied) {
        console.log(`✅ Found available position: Layer ${layer}, Position ${position}`);
        return {
          success: true,
          layer: layer,
          position: position
        };
      } else {
        console.log(`❌ Position occupied: Layer ${layer}, Position ${position}`);
        
        // 检测冲突 - 如果多个表有不同的占用者
        const referralUser = existingReferrals?.[0]?.member_wallet;
        const placementUser = existingPlacements?.[0]?.wallet_address;
        const activityUser = existingActivity?.[0]?.member_wallet;
        
        const occupiedBy = [referralUser, placementUser, activityUser].filter(Boolean);
        const uniqueUsers = [...new Set(occupiedBy)];
        
        if (uniqueUsers.length > 1) {
          console.error(`🚨 CONFLICT DETECTED at Layer ${layer}, Position ${position}: Multiple users (${uniqueUsers.join(', ')})`);
          return {
            success: false,
            layer: layer,
            position: position,
            error: `Position conflict detected: ${uniqueUsers.join(', ')}`,
            conflictDetected: true
          };
        }
      }
    }
  }
  
  return {
    success: false,
    layer: 0,
    position: '',
    error: 'All 19 layers are full'
  };
}

// 修复的安全放置函数 - 带冲突检测和回滚
async function safelyPlaceMember(
  supabase: any, 
  rootWallet: string, 
  memberWallet: string, 
  layer: number, 
  position: string
): Promise<PlacementResult> {
  console.log(`🔒 Safely placing member ${memberWallet} at Layer ${layer}, Position ${position} for root ${rootWallet}`);
  
  try {
    // 开始事务（使用RPC函数）
    const { data: placementResult, error: placementError } = await supabase.rpc(
      'safe_matrix_placement',
      {
        p_root_wallet: rootWallet,
        p_member_wallet: memberWallet,
        p_layer: layer,
        p_position: position
      }
    );
    
    if (placementError) {
      console.error(`❌ Placement failed: ${placementError.message}`);
      return {
        success: false,
        layer: layer,
        position: position,
        error: `Placement failed: ${placementError.message}`
      };
    }
    
    if (!placementResult?.success) {
      return {
        success: false,
        layer: layer,
        position: position,
        error: placementResult?.error || 'Unknown placement error'
      };
    }
    
    console.log(`✅ Member placed successfully: ${memberWallet} -> Layer ${layer}, Position ${position}`);
    return {
      success: true,
      layer: layer,
      position: position
    };
    
  } catch (error) {
    console.error(`❌ Safe placement error: ${error.message}`);
    return {
      success: false,
      layer: layer,
      position: position,
      error: `Safe placement error: ${error.message}`
    };
  }
}

// 验证放置结果的函数
async function verifyPlacement(
  supabase: any,
  rootWallet: string,
  memberWallet: string,
  layer: number,
  position: string
): Promise<boolean> {
  console.log(`🔍 Verifying placement for ${memberWallet}...`);
  
  try {
    // 检查 referrals 表
    const { data: referralData, error: referralError } = await supabase
      .from('referrals')
      .select('member_wallet')
      .ilike('matrix_root', rootWallet)
      .eq('matrix_layer', layer)
      .eq('matrix_position', position)
      .ilike('member_wallet', memberWallet)
      .single();
    
    if (referralError && referralError.code !== 'PGRST116') {
      console.error(`❌ Verification error in referrals: ${referralError.message}`);
      return false;
    }
    
    // 检查 individual_matrix_placements 表
    const { data: placementData, error: placementError } = await supabase
      .from('individual_matrix_placements')
      .select('wallet_address')
      .ilike('matrix_owner', rootWallet)
      .eq('layer', layer)
      .eq('position', position)
      .ilike('wallet_address', memberWallet)
      .single();
    
    if (placementError && placementError.code !== 'PGRST116') {
      console.error(`❌ Verification error in placements: ${placementError.message}`);
      return false;
    }
    
    const isInReferrals = !!referralData;
    const isInPlacements = !!placementData;
    
    console.log(`📊 Verification results: referrals=${isInReferrals}, placements=${isInPlacements}`);
    
    // 至少应该在一个表中
    return isInReferrals || isInPlacements;
    
  } catch (error) {
    console.error(`❌ Verification error: ${error.message}`);
    return false;
  }
}

// 导出修复的函数
export {
  findNextAvailablePosition,
  safelyPlaceMember,
  verifyPlacement
};