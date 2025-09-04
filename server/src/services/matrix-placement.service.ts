import { db } from '../../db';
import { referrals, users, members } from '@shared/schema';
import { eq, and, inArray, count } from 'drizzle-orm';

export interface MatrixPlacement {
  memberWallet: string;
  rootWallet: string;
  parentWallet: string;
  placerWallet: string;
  layer: number;
  position: 'L' | 'M' | 'R';
  placementType: 'direct' | 'spillover';
}

export interface MatrixStats {
  totalTeamSize: number;
  directReferrals: number;
  layerCounts: Record<number, number>;
}

/**
 * 3×3强制矩阵放置服务
 * 实现正确的滑落逻辑：L → M → R 优先级填补
 * 支持19层深度的矩阵结构
 */
export class MatrixPlacementService {

  /**
   * 将新会员放置到推荐者的矩阵中
   * @param memberWallet 新会员钱包地址
   * @param referrerWallet 推荐者钱包地址（作为矩阵根）
   * @returns 放置结果
   */
  async placeInMatrix(memberWallet: string, referrerWallet: string): Promise<MatrixPlacement> {
    const member = memberWallet.toLowerCase();
    const referrer = referrerWallet.toLowerCase();
    
    console.log(`🎯 开始矩阵放置: ${member} → 推荐者: ${referrer}`);

    // 检查会员是否已经在此推荐者的矩阵中
    const [existingPlacement] = await db
      .select()
      .from(referrals)
      .where(and(
        eq(referrals.rootWallet, referrer),
        eq(referrals.memberWallet, member)
      ));

    if (existingPlacement) {
      throw new Error(`会员 ${member} 已在推荐者 ${referrer} 的矩阵中`);
    }

    // 寻找最佳放置位置
    const placement = await this.findBestPlacement(member, referrer);
    
    // 执行放置
    await this.executePlacement(placement);
    
    // 更新团队统计
    await this.updateTeamStats(referrer);
    
    console.log(`✅ 矩阵放置完成: Layer ${placement.layer}, Position ${placement.position}, Type: ${placement.placementType}`);
    
    return placement;
  }

  /**
   * 寻找最佳放置位置
   * 使用BFS算法，按L→M→R优先级填补空位
   */
  private async findBestPlacement(memberWallet: string, rootWallet: string): Promise<MatrixPlacement> {
    // 首先尝试直接推荐（Layer 1）
    const directPlacement = await this.tryDirectPlacement(memberWallet, rootWallet);
    if (directPlacement) {
      return directPlacement;
    }

    // 如果Layer 1已满，寻找滑落位置
    return await this.findSpilloverPlacement(memberWallet, rootWallet);
  }

  /**
   * 尝试直接推荐到Layer 1
   */
  private async tryDirectPlacement(memberWallet: string, rootWallet: string): Promise<MatrixPlacement | null> {
    // 获取Layer 1的现有成员
    const layer1Members = await db
      .select()
      .from(referrals)
      .where(and(
        eq(referrals.rootWallet, rootWallet),
        eq(referrals.layer, 1)
      ));

    // 检查L、M、R位置的可用性
    const occupiedPositions = layer1Members.map(m => m.position);
    const availablePositions = ['L', 'M', 'R'].filter(pos => !occupiedPositions.includes(pos));

    if (availablePositions.length > 0) {
      // 选择第一个可用位置（L优先）
      const position = availablePositions[0] as 'L' | 'M' | 'R';
      
      return {
        memberWallet,
        rootWallet,
        parentWallet: rootWallet,
        placerWallet: rootWallet,
        layer: 1,
        position,
        placementType: 'direct'
      };
    }

    return null;
  }

  /**
   * 寻找滑落位置
   * 从Layer 1开始，逐层寻找第一个有空位的节点
   */
  private async findSpilloverPlacement(memberWallet: string, rootWallet: string): Promise<MatrixPlacement> {
    // 使用BFS遍历矩阵，寻找第一个有空位的位置
    const queue: Array<{wallet: string, layer: number}> = [{wallet: rootWallet, layer: 0}];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (visited.has(current.wallet)) continue;
      visited.add(current.wallet);

      // 检查当前节点的子位置
      const childLayer = current.layer + 1;
      if (childLayer > 19) continue; // 最大19层

      const children = await db
        .select()
        .from(referrals)
        .where(and(
          eq(referrals.rootWallet, rootWallet),
          eq(referrals.parentWallet, current.wallet)
        ));

      const occupiedPositions = children.map(c => c.position);
      const availablePositions = ['L', 'M', 'R'].filter(pos => !occupiedPositions.includes(pos));

      if (availablePositions.length > 0) {
        // 找到可用位置，执行滑落放置
        const position = availablePositions[0] as 'L' | 'M' | 'R';
        
        return {
          memberWallet,
          rootWallet,
          parentWallet: current.wallet,
          placerWallet: current.wallet, // 滑落情况下，放置者就是直接上级
          layer: childLayer,
          position,
          placementType: 'spillover'
        };
      } else {
        // 当前节点已满，将子节点加入队列继续搜索
        for (const child of children) {
          if (!visited.has(child.memberWallet)) {
            queue.push({
              wallet: child.memberWallet,
              layer: childLayer
            });
          }
        }
      }
    }

    throw new Error(`矩阵已满或无法找到放置位置 (Root: ${rootWallet})`);
  }

  /**
   * 执行矩阵放置
   */
  private async executePlacement(placement: MatrixPlacement): Promise<void> {
    await db.insert(referrals).values({
      rootWallet: placement.rootWallet,
      memberWallet: placement.memberWallet,
      layer: placement.layer,
      position: placement.position,
      parentWallet: placement.parentWallet,
      placerWallet: placement.placerWallet,
      placementType: placement.placementType,
      isActive: true,
      placedAt: new Date()
    });

    console.log(`💾 矩阵记录已保存: ${placement.memberWallet} → Layer ${placement.layer} ${placement.position}`);
  }

  /**
   * 更新团队统计数据
   * 更新推荐者（根）的团队总数和直推数量
   */
  private async updateTeamStats(rootWallet: string): Promise<void> {
    try {
      // 计算团队总数
      const [totalTeamResult] = await db
        .select({ count: count() })
        .from(referrals)
        .where(and(
          eq(referrals.rootWallet, rootWallet),
          eq(referrals.isActive, true)
        ));

      const totalTeamSize = totalTeamResult.count || 0;

      // 计算直推数量（Layer 1的成员数）
      const [directReferralsResult] = await db
        .select({ count: count() })
        .from(referrals)
        .where(and(
          eq(referrals.rootWallet, rootWallet),
          eq(referrals.layer, 1),
          eq(referrals.isActive, true)
        ));

      const directReferrals = directReferralsResult.count || 0;

      // 更新members表的统计数据
      await db.update(members)
        .set({
          totalTeamSize,
          totalDirectReferrals: directReferrals,
          updatedAt: new Date()
        })
        .where(eq(members.walletAddress, rootWallet));

      console.log(`📊 团队统计已更新: ${rootWallet} - 总团队: ${totalTeamSize}, 直推: ${directReferrals}`);
    } catch (error) {
      console.error('更新团队统计失败:', error);
    }
  }

  /**
   * 获取会员的矩阵位置信息
   */
  async getMatrixPosition(memberWallet: string, rootWallet: string): Promise<{
    layer: number;
    position: 'L' | 'M' | 'R';
    placementType: 'direct' | 'spillover';
    parentWallet: string;
  } | null> {
    const [placement] = await db
      .select()
      .from(referrals)
      .where(and(
        eq(referrals.rootWallet, rootWallet.toLowerCase()),
        eq(referrals.memberWallet, memberWallet.toLowerCase())
      ));

    if (!placement) return null;

    return {
      layer: placement.layer,
      position: placement.position as 'L' | 'M' | 'R',
      placementType: placement.placementType as 'direct' | 'spillover',
      parentWallet: placement.parentWallet || rootWallet
    };
  }

  /**
   * 获取推荐者的团队统计
   */
  async getTeamStats(rootWallet: string): Promise<MatrixStats> {
    try {
      // 获取所有团队成员
      const teamMembers = await db
        .select()
        .from(referrals)
        .where(and(
          eq(referrals.rootWallet, rootWallet.toLowerCase()),
          eq(referrals.isActive, true)
        ));

      // 统计各层人数
      const layerCounts: Record<number, number> = {};
      let directReferrals = 0;

      for (const member of teamMembers) {
        layerCounts[member.layer] = (layerCounts[member.layer] || 0) + 1;
        
        if (member.layer === 1) {
          directReferrals++;
        }
      }

      return {
        totalTeamSize: teamMembers.length,
        directReferrals,
        layerCounts
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
   * 获取指定层的团队成员
   */
  async getLayerMembers(rootWallet: string, layer: number): Promise<Array<{
    memberWallet: string;
    position: 'L' | 'M' | 'R';
    parentWallet: string;
    placementType: 'direct' | 'spillover';
    placedAt: Date;
  }>> {
    const members = await db
      .select()
      .from(referrals)
      .where(and(
        eq(referrals.rootWallet, rootWallet.toLowerCase()),
        eq(referrals.layer, layer),
        eq(referrals.isActive, true)
      ));

    return members.map(member => ({
      memberWallet: member.memberWallet,
      position: member.position as 'L' | 'M' | 'R',
      parentWallet: member.parentWallet || rootWallet,
      placementType: member.placementType as 'direct' | 'spillover',
      placedAt: member.placedAt
    }));
  }

  /**
   * 获取完整的矩阵树结构
   */
  async getMatrixTree(rootWallet: string, maxLayer: number = 5): Promise<any> {
    const tree = { 
      root: rootWallet, 
      layers: {} as Record<number, any[]>
    };

    for (let layer = 1; layer <= maxLayer; layer++) {
      const layerMembers = await this.getLayerMembers(rootWallet, layer);
      tree.layers[layer] = layerMembers;
    }

    return tree;
  }
}

export const matrixPlacementService = new MatrixPlacementService();