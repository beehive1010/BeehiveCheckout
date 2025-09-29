// =============================================
// Matrix Data Adapter - 统一数据接口适配器
// 确保所有组件都能正确访问matrix数据，无论数据库字段如何变化
// =============================================

export interface StandardMatrixMember {
  // 🎯 标准化字段名 - 所有组件统一使用这些字段
  walletAddress: string;          // 成员钱包地址
  username?: string;              // 用户显示名
  layer: number;                  // matrix层级 (1-19)
  position: string;               // matrix位置 ('L'|'M'|'R' 或复合位置)
  isActive: boolean;              // 激活状态
  placedAt: string;               // 放置时间

  // 🔍 关系字段
  matrixRootWallet: string;       // matrix根钱包
  parentWallet?: string;          // 直接parent
  referrerWallet?: string;        // 原始推荐人

  // 📊 状态字段
  currentLevel?: number;          // 当前NFT等级
  activationSequence?: number;    // 激活序号
  isSpillover?: boolean;          // 是否spillover放置
  referralDepth?: number;         // 推荐深度

  // 📋 描述字段
  layerDescription?: string;      // 层级描述
  positionDescription?: string;   // 位置描述
}

export interface MatrixLayerStats {
  layer: number;
  totalMembers: number;
  activeMembers: number;
  leftMembers: number;
  middleMembers: number;
  rightMembers: number;
  maxCapacity: number;
  fillPercentage: number;
  activationRate: number;
  layerStatus: 'completed' | 'active' | 'empty';
  isBalanced?: boolean;
}

export interface MatrixSummaryStats {
  totalMembers: number;
  totalActive: number;
  deepestLayer: number;
  layersWithData: number;
  directReferrals: number;
  spilloverMembers: number;
}

// =============================================
// 数据适配器函数
// =============================================

/**
 * 将数据库原始数据转换为标准格式
 * 支持新旧字段名的自动适配
 */
export function adaptMatrixMemberData(rawData: any): StandardMatrixMember {
  return {
    // 🎯 优先使用新字段名，fallback到旧字段名
    walletAddress: rawData.wallet_address || rawData.member_wallet || '',
    username: rawData.username || rawData.display_name || undefined,
    layer: rawData.matrix_layer || rawData.layer || 1,
    position: rawData.matrix_position || rawData.position || 'L',
    isActive: rawData.is_active ?? rawData.is_activated ?? false,
    placedAt: rawData.placed_at || rawData.created_at || rawData.activation_time || new Date().toISOString(),

    // 🔍 关系字段
    matrixRootWallet: rawData.matrix_root_wallet || '',
    parentWallet: rawData.parent_wallet || undefined,
    referrerWallet: rawData.referrer_wallet || undefined,

    // 📊 状态字段
    currentLevel: rawData.current_level || undefined,
    activationSequence: rawData.activation_sequence || undefined,
    isSpillover: rawData.is_spillover ?? false,
    referralDepth: rawData.referral_depth || rawData.parent_depth || undefined,

    // 📋 描述字段
    layerDescription: rawData.layer_description || `Layer ${rawData.matrix_layer || rawData.layer || 1}`,
    positionDescription: rawData.position_description || getPositionDescription(rawData.matrix_position || rawData.position)
  };
}

/**
 * 批量转换多个成员数据
 */
export function adaptMatrixMembersData(rawDataArray: any[]): StandardMatrixMember[] {
  if (!Array.isArray(rawDataArray)) {
    return [];
  }

  return rawDataArray.map(adaptMatrixMemberData);
}

/**
 * 适配层级统计数据
 */
export function adaptLayerStatsData(rawData: any): MatrixLayerStats {
  const totalMembers = rawData.total_members || rawData.totalMembers || 0;
  const activeMembers = rawData.active_members || rawData.activeMembers || 0;
  const layer = rawData.layer || 1;
  const maxCapacity = Math.pow(3, layer);

  return {
    layer,
    totalMembers,
    activeMembers,
    leftMembers: rawData.left_members || rawData.leftMembers || 0,
    middleMembers: rawData.middle_members || rawData.middleMembers || 0,
    rightMembers: rawData.right_members || rawData.rightMembers || 0,
    maxCapacity,
    fillPercentage: totalMembers > 0 ? (totalMembers / maxCapacity) * 100 : 0,
    activationRate: totalMembers > 0 ? (activeMembers / totalMembers) * 100 : 0,
    layerStatus: rawData.layer_status || (
      totalMembers >= maxCapacity ? 'completed' :
      totalMembers > 0 ? 'active' : 'empty'
    ),
    isBalanced: rawData.is_balanced || isLayerBalanced(rawData)
  };
}

/**
 * 适配汇总统计数据
 */
export function adaptSummaryStatsData(rawData: any): MatrixSummaryStats {
  return {
    totalMembers: rawData.total_members || rawData.totalMembers || 0,
    totalActive: rawData.total_active || rawData.totalActive || 0,
    deepestLayer: rawData.deepest_layer || rawData.deepestLayer || 0,
    layersWithData: rawData.layers_with_data || rawData.layersWithData || 0,
    directReferrals: rawData.direct_referrals || rawData.directReferrals || 0,
    spilloverMembers: rawData.spillover_members || rawData.spilloverMembers || 0
  };
}

// =============================================
// 数据过滤和分组函数
// =============================================

/**
 * 按层级分组数据
 */
export function groupMembersByLayer(members: StandardMatrixMember[]): Record<number, StandardMatrixMember[]> {
  return members.reduce((groups, member) => {
    const layer = member.layer;
    if (!groups[layer]) {
      groups[layer] = [];
    }
    groups[layer].push(member);
    return groups;
  }, {} as Record<number, StandardMatrixMember[]>);
}

/**
 * 按位置分组数据 (L/M/R)
 */
export function groupMembersByPosition(members: StandardMatrixMember[]): Record<string, StandardMatrixMember[]> {
  return members.reduce((groups, member) => {
    // 提取基础位置 (L, M, R)
    const basePosition = getBasePosition(member.position);
    if (!groups[basePosition]) {
      groups[basePosition] = [];
    }
    groups[basePosition].push(member);
    return groups;
  }, {} as Record<string, StandardMatrixMember[]>);
}

/**
 * 过滤激活成员
 */
export function filterActiveMembers(members: StandardMatrixMember[]): StandardMatrixMember[] {
  return members.filter(member => member.isActive);
}

/**
 * 过滤特定层级的成员
 */
export function filterMembersByLayer(members: StandardMatrixMember[], layer: number): StandardMatrixMember[] {
  return members.filter(member => member.layer === layer);
}

// =============================================
// 辅助函数
// =============================================

/**
 * 获取位置描述
 */
function getPositionDescription(position: string): string {
  if (!position) return 'Unknown';

  if (position === 'L') return 'Left';
  if (position === 'M') return 'Middle';
  if (position === 'R') return 'Right';
  if (position.endsWith('.L')) return 'Left Branch';
  if (position.endsWith('.M')) return 'Middle Branch';
  if (position.endsWith('.R')) return 'Right Branch';

  return position;
}

/**
 * 获取基础位置 (从复合位置中提取L/M/R)
 */
function getBasePosition(position: string): string {
  if (!position) return 'L';

  // 对于复合位置如 'L.M.R'，取最后一个
  const parts = position.split('.');
  const lastPart = parts[parts.length - 1];

  if (['L', 'M', 'R'].includes(lastPart)) {
    return lastPart;
  }

  // 对于单一位置
  if (['L', 'M', 'R'].includes(position)) {
    return position;
  }

  return 'L'; // 默认
}

/**
 * 判断层级是否平衡
 */
function isLayerBalanced(statsData: any): boolean {
  const left = statsData.left_members || statsData.leftMembers || 0;
  const middle = statsData.middle_members || statsData.middleMembers || 0;
  const right = statsData.right_members || statsData.rightMembers || 0;

  const max = Math.max(left, middle, right);
  const min = Math.min(left, middle, right);

  // 如果最大值和最小值的差不超过1，认为是平衡的
  return (max - min) <= 1;
}

/**
 * 计算层级容量
 */
export function getLayerCapacity(layer: number): number {
  return Math.pow(3, layer);
}

/**
 * 计算填充率
 */
export function calculateFillRate(memberCount: number, layer: number): number {
  const capacity = getLayerCapacity(layer);
  return capacity > 0 ? (memberCount / capacity) * 100 : 0;
}

/**
 * 验证matrix数据完整性
 */
export function validateMatrixData(member: StandardMatrixMember): boolean {
  return !!(
    member.walletAddress &&
    member.layer >= 1 &&
    member.layer <= 19 &&
    member.position &&
    member.matrixRootWallet
  );
}

// =============================================
// Supabase查询辅助函数
// =============================================

/**
 * 构建标准的matrix查询
 */
export function buildMatrixQuery(supabase: any, rootWallet: string, options: {
  layer?: number;
  limit?: number;
  offset?: number;
} = {}) {
  let query = supabase
    .from('matrix_referrals')
    .select('*')
    .eq('matrix_root_wallet', rootWallet);

  if (options.layer) {
    query = query.eq('parent_depth', options.layer);
  }

  query = query.order('parent_depth').order('position');

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  return query;
}

/**
 * 构建层级统计查询
 */
export function buildLayerStatsQuery(supabase: any, rootWallet: string) {
  return supabase
    .from('matrix_referrals')
    .select('parent_depth, position, member_wallet')
    .eq('matrix_root_wallet', rootWallet)
    .order('parent_depth');
}