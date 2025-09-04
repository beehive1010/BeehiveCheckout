import { db } from '../../db';
import { referrals, users, members } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

export interface SupabaseMatrixPlacement {
  success: boolean;
  layer: number;
  position: 'L' | 'M' | 'R';
  parentWallet: string;
  placementType: 'direct' | 'spillover';
  message: string;
}

/**
 * Supabase优化的矩阵放置服务
 * 使用数据库函数和触发器来确保数据一致性
 */
export class SupabaseMatrixService {

  /**
   * 使用Supabase数据库函数自动放置用户
   */
  async autoPlaceUser(memberWallet: string, referrerWallet: string): Promise<SupabaseMatrixPlacement> {
    try {
      console.log(`🔄 Supabase自动放置: ${memberWallet} → 推荐者: ${referrerWallet}`);
      
      // 调用Supabase存储过程进行自动放置
      const result = await db.execute(sql`
        SELECT * FROM auto_place_user(${memberWallet.toLowerCase()}, ${referrerWallet.toLowerCase()})
      `);

      const placement = result.rows[0] as any;
      
      if (!placement || !placement.success) {
        throw new Error(placement?.message_result || '放置失败');
      }

      console.log(`✅ Supabase放置成功: Layer ${placement.layer_result} ${placement.position_result}`);
      
      return {
        success: true,
        layer: placement.layer_result,
        position: placement.position_result as 'L' | 'M' | 'R',
        parentWallet: placement.parent_result,
        placementType: placement.placement_type_result as 'direct' | 'spillover',
        message: placement.message_result
      };
    } catch (error) {
      console.error('Supabase自动放置失败:', error);
      
      return {
        success: false,
        layer: 0,
        position: 'L',
        parentWallet: '',
        placementType: 'direct',
        message: `放置失败: ${error}`
      };
    }
  }

  /**
   * 获取团队统计信息（使用数据库函数）
   */
  async getTeamStatistics(rootWallet: string): Promise<{
    totalTeamSize: number;
    directReferrals: number;
    layerCounts: Record<number, number>;
  }> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM get_team_statistics(${rootWallet.toLowerCase()})
      `);

      const stats = result.rows[0] as any;
      
      return {
        totalTeamSize: parseInt(stats?.total_team_size || '0'),
        directReferrals: parseInt(stats?.direct_referrals || '0'),
        layerCounts: stats?.layer_counts || {}
      };
    } catch (error) {
      console.error('获取团队统计失败:', error);
      return {
        totalTeamSize: 0,
        directReferrals: 0,
        layerCounts: {}
      };
    }
  }

  /**
   * 获取矩阵树结构（使用数据库函数）
   */
  async getMatrixTree(rootWallet: string, maxLayers: number = 5): Promise<{
    root: string;
    layers: Record<number, Array<{
      memberWallet: string;
      position: 'L' | 'M' | 'R';
      parentWallet: string;
      placementType: 'direct' | 'spillover';
      placedAt: Date;
    }>>;
  }> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM get_matrix_tree(${rootWallet.toLowerCase()}, ${maxLayers})
      `);

      const treeData = result.rows;
      const layers: Record<number, any[]> = {};

      // 组织层级数据
      for (const row of treeData as any[]) {
        const layer = row.layer_num;
        if (!layers[layer]) {
          layers[layer] = [];
        }
        
        layers[layer].push({
          memberWallet: row.member_wallet,
          position: row.position_slot as 'L' | 'M' | 'R',
          parentWallet: row.parent_wallet_address || rootWallet,
          placementType: row.placement_type as 'direct' | 'spillover',
          placedAt: new Date(row.placed_at)
        });
      }

      return {
        root: rootWallet,
        layers
      };
    } catch (error) {
      console.error('获取矩阵树失败:', error);
      return {
        root: rootWallet,
        layers: {}
      };
    }
  }

  /**
   * 获取某层的详细成员信息
   */
  async getLayerMembersDetailed(rootWallet: string, layer: number): Promise<Array<{
    memberWallet: string;
    username?: string;
    position: 'L' | 'M' | 'R';
    parentWallet: string;
    placementType: 'direct' | 'spillover';
    currentLevel: number;
    isActivated: boolean;
    placedAt: Date;
  }>> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM get_layer_members_detailed(${rootWallet.toLowerCase()}, ${layer})
      `);

      return (result.rows as any[]).map(row => ({
        memberWallet: row.member_wallet,
        username: row.username,
        position: row.position as 'L' | 'M' | 'R',
        parentWallet: row.parent_wallet,
        placementType: row.placement_type as 'direct' | 'spillover',
        currentLevel: row.current_level || 0,
        isActivated: row.is_activated || false,
        placedAt: new Date(row.placed_at)
      }));
    } catch (error) {
      console.error('获取层级成员详情失败:', error);
      return [];
    }
  }

  /**
   * 获取上级链（用于奖励分配）
   */
  async getUplineChain(memberWallet: string, rootWallet: string): Promise<Array<{
    uplineWallet: string;
    uplineLayer: number;
    uplinePosition: string;
    depthFromMember: number;
  }>> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM get_upline_chain(${memberWallet.toLowerCase()}, ${rootWallet.toLowerCase()})
      `);

      return (result.rows as any[]).map(row => ({
        uplineWallet: row.upline_wallet,
        uplineLayer: row.upline_layer,
        uplinePosition: row.upline_position,
        depthFromMember: row.depth_from_member
      }));
    } catch (error) {
      console.error('获取上级链失败:', error);
      return [];
    }
  }

  /**
   * 获取用户的矩阵位置信息
   */
  async getMemberPosition(memberWallet: string, rootWallet: string): Promise<{
    layer: number;
    position: 'L' | 'M' | 'R';
    parentWallet: string;
    placementType: 'direct' | 'spillover';
  } | null> {
    try {
      const [placement] = await db
        .select()
        .from(referrals)
        .where(and(
          eq(referrals.rootWallet, rootWallet.toLowerCase()),
          eq(referrals.memberWallet, memberWallet.toLowerCase()),
          eq(referrals.isActive, true)
        ));

      if (!placement) return null;

      return {
        layer: placement.layer,
        position: placement.position as 'L' | 'M' | 'R',
        parentWallet: placement.parentWallet || rootWallet,
        placementType: placement.placementType as 'direct' | 'spillover'
      };
    } catch (error) {
      console.error('获取成员位置失败:', error);
      return null;
    }
  }

  /**
   * 获取矩阵活动日志
   */
  async getMatrixActivityLog(rootWallet: string, limit: number = 50): Promise<Array<{
    id: string;
    memberWallet: string;
    actionType: string;
    layer?: number;
    position?: string;
    details: any;
    createdAt: Date;
  }>> {
    try {
      const result = await db.execute(sql`
        SELECT id, member_wallet, action_type, layer, position, details, created_at
        FROM matrix_activity_log 
        WHERE root_wallet = ${rootWallet.toLowerCase()}
        ORDER BY created_at DESC 
        LIMIT ${limit}
      `);

      return (result.rows as any[]).map(row => ({
        id: row.id,
        memberWallet: row.member_wallet,
        actionType: row.action_type,
        layer: row.layer,
        position: row.position,
        details: row.details,
        createdAt: new Date(row.created_at)
      }));
    } catch (error) {
      console.error('获取矩阵活动日志失败:', error);
      return [];
    }
  }

  /**
   * 验证矩阵完整性
   */
  async validateMatrixIntegrity(rootWallet: string): Promise<{
    isValid: boolean;
    issues: string[];
    totalMembers: number;
    layerDistribution: Record<number, number>;
  }> {
    try {
      // 获取基本统计
      const stats = await this.getTeamStatistics(rootWallet);
      
      // 检查层级分布是否合理
      const issues: string[] = [];
      const layerDistribution = stats.layerCounts;
      
      // 检查每层的容量限制
      for (let layer = 1; layer <= 19; layer++) {
        const maxCapacity = Math.pow(3, layer);
        const currentCount = layerDistribution[layer] || 0;
        
        if (currentCount > maxCapacity) {
          issues.push(`Layer ${layer} 超出容量限制: ${currentCount}/${maxCapacity}`);
        }
        
        // 检查层级连续性
        if (layer > 1 && currentCount > 0 && (layerDistribution[layer - 1] || 0) === 0) {
          issues.push(`Layer ${layer} 存在但Layer ${layer - 1} 为空`);
        }
      }

      return {
        isValid: issues.length === 0,
        issues,
        totalMembers: stats.totalTeamSize,
        layerDistribution
      };
    } catch (error) {
      console.error('验证矩阵完整性失败:', error);
      return {
        isValid: false,
        issues: [`验证失败: ${error}`],
        totalMembers: 0,
        layerDistribution: {}
      };
    }
  }

  /**
   * 强制同步矩阵统计数据
   */
  async syncMatrixStats(rootWallet: string): Promise<void> {
    try {
      // 手动触发统计更新
      await db.execute(sql`
        UPDATE members 
        SET 
          total_team_size = (
            SELECT COUNT(*) 
            FROM referrals 
            WHERE root_wallet = ${rootWallet.toLowerCase()} 
            AND is_active = true
          ),
          total_direct_referrals = (
            SELECT COUNT(*) 
            FROM referrals 
            WHERE root_wallet = ${rootWallet.toLowerCase()} 
            AND layer = 1 
            AND is_active = true
          ),
          max_layer = (
            SELECT COALESCE(MAX(layer), 0)
            FROM referrals 
            WHERE root_wallet = ${rootWallet.toLowerCase()} 
            AND is_active = true
          ),
          updated_at = NOW()
        WHERE wallet_address = ${rootWallet.toLowerCase()}
      `);
      
      console.log(`📊 矩阵统计已同步: ${rootWallet}`);
    } catch (error) {
      console.error('同步矩阵统计失败:', error);
      throw error;
    }
  }
}

export const supabaseMatrixService = new SupabaseMatrixService();