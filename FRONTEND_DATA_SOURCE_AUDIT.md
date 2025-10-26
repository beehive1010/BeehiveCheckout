# 前端数据源审计和优化计划

**Date**: 2025-10-27
**Purpose**: 审计所有referrals和matrix相关组件的数据源，确保使用正确的views，优化移动端体验

---

## 📊 当前数据源使用情况

### User端页面

#### 1. Dashboard.tsx (src/pages/Dashboard.tsx)
**当前数据源**:
- Line 145-149: `referrals_stats_view` - ✅ 正确（获取直推人数）
- Line 158-162: `v_matrix_overview` - ⚠️ 旧视图（应该用新的）
- Line 171-175: `v_total_team_count` - ⚠️ 旧视图（应该用新的）
- Line 236-238: `user_balances` - ✅ 正确（获取奖励数据）

**问题**:
- Line 204: 有未定义变量 `matrixSummary`
- 未使用新创建的 `v_referral_statistics` 视图
- 可以简化为单一视图查询

**建议优化**:
```typescript
// 替换为新的v_referral_statistics视图
const { data: referralStats, error: referralError } = await supabase
  .from('v_referral_statistics')
  .select('*')
  .eq('member_wallet', walletAddress)
  .maybeSingle();

// 这样可以一次性获取：
// - direct_referral_count (直推人数)
// - max_spillover_layer (最大层级)
// - total_team_count (团队总人数)
// - matrix_19_layer_count (19层矩阵人数)
// - activation_rate_percentage (激活率)
```

#### 2. Referrals.tsx (src/pages/Referrals.tsx)
**当前数据源**:
- Line 21: `useUserReferralStats()` hook - 需要检查
- Line 98-100: `MatrixLayerStatsView` component - 需要检查
- Line 104-108: `InteractiveMatrixView` component - 需要检查
- Line 112-116: `MobileMatrixView` component - 需要检查
- Line 122-124: `ReferralsStats` component - 需要检查

**建议优化**:
- 检查所有子组件是否使用正确的数据源
- 确保移动端和桌面端组件使用相同的数据源
- 优化移动端显示体验

#### 3. InteractiveMatrixView.tsx (src/components/matrix/InteractiveMatrixView.tsx)
**当前数据源**:
- Line 58: `useLayeredMatrix(currentRoot, currentLayer, originalRoot)` hook - 需要检查

**建议优化**:
- 应该使用 `v_matrix_tree_19_layers` 视图
- 支持drill-down和layer导航
- 优化桌面端显示

---

## 📱 Admin端页面

### 需要检查的Admin组件

#### 1. AdminMatrix.tsx (src/pages/admin/AdminMatrix.tsx)
- 需要检查数据源
- 需要检查AdminMatrixTreeVisualization组件的数据源

#### 2. AdminMatrixTreeVisualization.tsx (src/components/admin/AdminMatrixTreeVisualization.tsx)
- Line 19KB大文件，需要检查数据源
- 应该使用 `v_matrix_tree_19_layers` 视图
- **关键**: 需要优化移动端显示体验

#### 3. AdminReferrals.tsx (src/pages/admin/AdminReferrals.tsx)
- 需要检查数据源

---

## 🎯 优化计划

### Phase 1: 数据源标准化 (优先级: 🔴 高)

#### Task 1.1: 更新Dashboard使用新视图
**文件**: `src/pages/Dashboard.tsx`
**改动**:
```typescript
// 删除多个查询，统一使用v_referral_statistics
const loadMatrixData = useCallback(async () => {
  const { data: stats, error } = await supabase
    .from('v_referral_statistics')
    .select('direct_referral_count, max_spillover_layer, total_team_count, matrix_19_layer_count')
    .eq('member_wallet', walletAddress)
    .maybeSingle();

  return {
    directReferrals: stats?.direct_referral_count || 0,
    totalTeamSize: stats?.total_team_count || 0,
    maxLayer: stats?.max_spillover_layer || 0,
    // ...
  };
}, [walletAddress]);
```

**预期效果**:
- 减少3个数据库查询 → 1个查询
- 减少网络请求
- 提高加载速度
- 数据一致性更好

#### Task 1.2: 创建统一的Matrix数据hook
**新文件**: `src/hooks/useMatrixTreeData.ts`
```typescript
export function useMatrixTreeData(matrixRootWallet: string, layer?: number) {
  return useQuery({
    queryKey: ['matrix-tree', matrixRootWallet, layer],
    queryFn: async () => {
      const query = supabase
        .from('v_matrix_tree_19_layers')
        .select('*')
        .eq('matrix_root_wallet', matrixRootWallet);

      if (layer) {
        query.eq('layer', layer);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });
}
```

#### Task 1.3: 更新所有Matrix组件使用新hook
**影响的文件**:
- `InteractiveMatrixView.tsx`
- `MobileMatrixView.tsx`
- `MatrixLayerStatsView.tsx`
- `AdminMatrixTreeVisualization.tsx`

**改动**: 统一使用 `useMatrixTreeData` hook 和 `v_matrix_tree_19_layers` 视图

---

### Phase 2: 移动端优化 (优先级: 🟡 中)

#### Task 2.1: 优化AdminMatrixTreeVisualization移动端显示
**文件**: `src/components/admin/AdminMatrixTreeVisualization.tsx`
**问题**: 19KB大文件，可能在移动端加载慢，显示不友好

**优化方案**:
1. **按需加载** (On-demand loading)
   - 首次只加载Layer 1
   - 用户展开时才加载子层
   - 使用虚拟滚动

2. **响应式设计**
   - 移动端：垂直卡片布局
   - 桌面端：树形结构布局
   - 适配不同屏幕尺寸

3. **性能优化**
   - 使用React.memo避免不必要的重渲染
   - 实现虚拟化列表（react-window）
   - 懒加载子节点数据

**示例代码**:
```typescript
// 移动端适配
const MobileMatrixNode = React.memo(({ node }) => (
  <Card className="w-full">
    {/* 紧凑的移动端布局 */}
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <Badge>{node.slot}</Badge>
        <span className="text-sm">{node.member_username}</span>
      </div>
      {node.has_children && (
        <Button
          size="sm"
          onClick={() => loadChildren(node.member_wallet)}
          className="w-full"
        >
          展开 ({node.children_count})
        </Button>
      )}
    </div>
  </Card>
));

// 桌面端使用原有的树形布局
const DesktopMatrixNode = React.memo(({ node }) => (
  // 原有的树形结构...
));

// 响应式组件
export function ResponsiveMatrixTree({ rootWallet }) {
  const isMobile = useIsMobile();

  return isMobile ? (
    <MobileMatrixView rootWallet={rootWallet} />
  ) : (
    <DesktopMatrixView rootWallet={rootWallet} />
  );
}
```

#### Task 2.2: 优化Referrals页面移动端布局
**文件**: `src/pages/Referrals.tsx`

**当前问题**:
- Tabs在移动端可能不够清晰
- Matrix view在移动端显示可能过大

**优化方案**:
```typescript
// 移动端优先的Tabs布局
<Tabs defaultValue="stats" className="w-full">
  <TabsList className="grid w-full grid-cols-3 h-auto">
    <TabsTrigger value="stats" className="py-3">
      <div className="flex flex-col items-center gap-1">
        <ChartBarIcon className="h-4 w-4" />
        <span className="text-xs">{t('referrals.stats')}</span>
      </div>
    </TabsTrigger>
    <TabsTrigger value="matrix" className="py-3">
      <div className="flex flex-col items-center gap-1">
        <GridIcon className="h-4 w-4" />
        <span className="text-xs">{t('referrals.matrix')}</span>
      </div>
    </TabsTrigger>
    <TabsTrigger value="team" className="py-3">
      <div className="flex flex-col items-center gap-1">
        <UsersIcon className="h-4 w-4" />
        <span className="text-xs">{t('referrals.team')}</span>
      </div>
    </TabsTrigger>
  </TabsList>
</Tabs>
```

#### Task 2.3: 创建移动端专用Matrix卡片组件
**新文件**: `src/components/matrix/CompactMatrixCard.tsx`

**设计**:
- 紧凑的卡片布局
- 显示关键信息：username, level, slot, children count
- 支持滑动展开/收起
- 触摸友好的按钮大小（最小44x44px）

---

### Phase 3: 清理废弃代码 (优先级: 🟢 低)

#### Task 3.1: 识别废弃的views
**需要检查的旧views**:
- `v_matrix_overview` - 如果没有其他地方使用，可以删除
- `v_total_team_count` - 如果没有其他地方使用，可以删除
- 其他旧的matrix相关views

#### Task 3.2: 识别废弃的hooks
**可能废弃的hooks**:
- `useUserReferralStats` - 如果可以用新views替代
- 其他旧的matrix hooks

#### Task 3.3: 删除未使用的组件
**候选组件**:
- `_archive/` 目录下的组件（已归档）
- 重复的Matrix visualization组件

---

## 🔍 详细审计清单

### 需要检查的Hooks

- [ ] `useUserReferralStats` - src/hooks/useBeeHiveStats.ts
- [ ] `useLayeredMatrix` - src/hooks/useMatrixByLevel.ts
- [ ] `useMatrixData` - 如果存在
- [ ] 其他matrix相关hooks

### 需要检查的Components

#### Matrix Components
- [ ] `InteractiveMatrixView.tsx` - 数据源和移动端适配
- [ ] `MobileMatrixView.tsx` - 是否使用正确views
- [ ] `MatrixLayerStatsView.tsx` - 是否使用v_matrix_layer_statistics
- [ ] `DrillDownMatrixView.tsx` - 是否还在使用
- [ ] `SimpleMatrixView.tsx` - 是否还在使用
- [ ] `ModernMatrixView.tsx` - 是否还在使用
- [ ] `RecursiveMatrixView.tsx` - 是否还在使用
- [ ] `EnhancedMatrixView.tsx` - 是否还在使用
- [ ] `LayeredMatrixView.tsx` - 是否还在使用
- [ ] `MatrixNetworkStatsV2.tsx` - 是否还在使用

#### Referral Components
- [ ] `ReferralsStats.tsx` - 数据源
- [ ] `ReferralStatsCard.tsx` - 数据源
- [ ] `DirectReferralsCard.tsx` - 数据源
- [ ] `ReferralMatrixVisualization.tsx` - 数据源

#### Admin Components
- [ ] `AdminMatrixTreeVisualization.tsx` - 数据源和移动端优化
- [ ] `AdminMatrix.tsx` - 数据源
- [ ] `AdminReferrals.tsx` - 数据源

---

## 📋 执行步骤

### Step 1: 完整审计 (2-3小时)
1. ✅ 读取所有相关组件和hooks
2. ⏳ 记录每个组件使用的数据源
3. ⏳ 标记需要更新的地方
4. ⏳ 创建详细的数据流图

### Step 2: 数据源标准化 (4-6小时)
1. ⏳ 更新Dashboard.tsx
2. ⏳ 创建useMatrixTreeData hook
3. ⏳ 更新所有Matrix组件
4. ⏳ 测试数据正确性

### Step 3: 移动端优化 (6-8小时)
1. ⏳ 优化AdminMatrixTreeVisualization
2. ⏳ 优化Referrals页面布局
3. ⏳ 创建CompactMatrixCard组件
4. ⏳ 测试移动端体验

### Step 4: 清理和文档 (2-3小时)
1. ⏳ 删除废弃views
2. ⏳ 删除废弃hooks
3. ⏳ 删除未使用组件
4. ⏳ 更新文档

---

## 🎯 预期成果

### 数据一致性
- ✅ 所有组件使用统一的数据源
- ✅ 减少重复查询
- ✅ 提高数据准确性

### 性能提升
- ✅ Dashboard加载速度提升 30-50%
- ✅ Matrix组件渲染速度提升 20-30%
- ✅ 减少数据库查询次数 40-60%

### 移动端体验
- ✅ AdminMatrixTree在移动端可用且流畅
- ✅ 所有matrix组件适配移动端
- ✅ 触摸友好的交互设计

### 代码质量
- ✅ 清理废弃代码，减少维护负担
- ✅ 统一数据访问模式
- ✅ 更好的代码组织

---

## 📊 当前进度

- ✅ Matrix数据修复完成 (14,167条记录)
- ✅ 新views创建完成 (3个views)
- ✅ 函数修复完成 (fn_place_member_branch_bfs)
- ⏳ 前端审计进行中...
- ⏳ 数据源标准化待开始
- ⏳ 移动端优化待开始

---

**Next Actions**:
1. 完成所有hooks和components的数据源审计
2. 开始Phase 1: 数据源标准化
3. 开始Phase 2: 移动端优化

**Report Generated**: 2025-10-27
**Status**: In Progress - Audit Phase
