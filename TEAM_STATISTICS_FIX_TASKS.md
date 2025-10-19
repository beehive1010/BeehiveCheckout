# 团队统计修复任务清单

**创建日期**: 2025-10-19
**基于**: DATABASE_MATRIX_STATUS_REPORT.md
**优先级**: 高

---

## 📊 团队人数统计定义

### 1️⃣ 总团队人数 (Total Team Count)

**定义**: 通过递归referrer树计算的所有下级成员，**不受19层限制**

**计算方式**:
```typescript
// 递归查找所有referrer_wallet链上的下级
function calculateTotalTeam(rootWallet: string, allMembers: Member[]): number {
  const downlineSet = new Set<string>();

  function findDownline(wallet: string) {
    allMembers.forEach(member => {
      if (member.referrer_wallet?.toLowerCase() === wallet.toLowerCase() &&
          !downlineSet.has(member.wallet_address.toLowerCase())) {
        downlineSet.add(member.wallet_address.toLowerCase());
        findDownline(member.wallet_address); // 递归查找
      }
    });
  }

  findDownline(rootWallet);
  return downlineSet.size;
}
```

**数据源**: `members` 表的 `referrer_wallet` 字段

**包括**:
- ✅ 所有层级的成员（Layer 1, 2, 3, ..., 无限）
- ✅ 激活和未激活的成员
- ✅ 直推和间接推荐的成员

**示例**:
```
A 推荐 B (Layer 1)
B 推荐 C (Layer 2)
C 推荐 D (Layer 3)
...
Z 推荐 AA (Layer 30)

A的总团队人数 = B, C, D, ..., Z, AA (所有人)
```

---

### 2️⃣ 激活团队人数 (Active Team in Matrix)

**定义**: 在19层矩阵中占据slot位置的会员人数

**计算方式**:
```sql
SELECT COUNT(DISTINCT member_wallet)
FROM matrix_referrals
WHERE matrix_root_wallet = ?
  AND layer >= 1
  AND layer <= 19
  AND slot IS NOT NULL;
```

**数据源**: `matrix_referrals` 表

**包括**:
- ✅ Layer 1-19 中的成员
- ✅ 有明确slot位置的成员（L/M/R）
- ❌ 不包括Layer 20+的成员（违反业务规则）
- ❌ 不包括未在矩阵中占位的成员

**示例**:
```
A的19层矩阵:
Layer 1: 3个成员
Layer 2: 9个成员
...
Layer 19: 3^19个成员（如果全满）

A的激活团队人数 = Layer 1-19的总人数
```

---

## 🎯 修复任务清单

### Task 1: 更新数据库视图 ✅

**目标**: 创建视图支持两种统计

#### 1.1 创建总团队统计视图

**文件**: `create_v_total_team_count.sql`

```sql
-- 使用递归CTE计算总团队人数（所有层级）
CREATE OR REPLACE VIEW v_total_team_count AS
WITH RECURSIVE downline_tree AS (
    -- Base case: 直接推荐
    SELECT
        m1.wallet_address as root_wallet,
        m2.wallet_address as member_wallet,
        1 as depth
    FROM members m1
    INNER JOIN members m2 ON m2.referrer_wallet = m1.wallet_address

    UNION ALL

    -- Recursive case: 间接推荐
    SELECT
        dt.root_wallet,
        m.wallet_address as member_wallet,
        dt.depth + 1
    FROM downline_tree dt
    INNER JOIN members m ON m.referrer_wallet = dt.member_wallet
    WHERE dt.depth < 100  -- 防止无限递归
)
SELECT
    root_wallet,
    COUNT(DISTINCT member_wallet) as total_team_count,
    MAX(depth) as max_referral_depth,
    COUNT(DISTINCT member_wallet) FILTER (
        WHERE EXISTS (
            SELECT 1 FROM members m2
            WHERE m2.wallet_address = downline_tree.member_wallet
            AND m2.current_level >= 1
        )
    ) as activated_count_all_layers
FROM downline_tree
GROUP BY root_wallet;

COMMENT ON VIEW v_total_team_count IS
'Total team count using recursive referrer tree - includes ALL layers, not limited to 19-layer matrix';

GRANT SELECT ON v_total_team_count TO authenticated, anon;
```

#### 1.2 更新矩阵激活统计视图

确保 `v_matrix_overview` 正确计算19层矩阵内的激活人数：

```sql
-- 验证v_matrix_overview正确性
SELECT
    wallet_address,
    total_members,      -- 19层矩阵中的总人数
    active_members,     -- 19层矩阵中current_level >= 1的人数
    deepest_layer
FROM v_matrix_overview
WHERE wallet_address = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab';
```

**状态**: 🟡 需要创建 `v_total_team_count` 视图

---

### Task 2: 更新 useBeeHiveStats Hook

**文件**: `src/hooks/useBeeHiveStats.ts`

**目标**: 同时提供两种团队统计

#### 2.1 修改 useUserReferralStats

```typescript
export function useUserReferralStats() {
  const { walletAddress } = useWallet();

  return useQuery<UserReferralStats>({
    queryKey: ['/api/stats/user-referrals', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');

      // 1. 总团队人数（递归referrer树，所有层级）
      const { data: allMembersData } = await supabase
        .from('members')
        .select('wallet_address, referrer_wallet');

      let totalTeamCount = 0;
      if (allMembersData) {
        const downlineSet = new Set<string>();
        const findDownline = (rootWallet: string) => {
          allMembersData.forEach(member => {
            if (member.referrer_wallet?.toLowerCase() === rootWallet.toLowerCase() &&
                !downlineSet.has(member.wallet_address.toLowerCase())) {
              downlineSet.add(member.wallet_address.toLowerCase());
              findDownline(member.wallet_address); // 递归
            }
          });
        };
        findDownline(walletAddress);
        totalTeamCount = downlineSet.size;
      }

      // 2. 激活团队人数（19层矩阵内占位）
      const { data: matrixOverview } = await supabase
        .from('v_matrix_overview')
        .select('*')
        .ilike('wallet_address', walletAddress)
        .maybeSingle();

      const activeTeamInMatrix = matrixOverview?.active_members || 0;
      const totalMembersInMatrix = matrixOverview?.total_members || 0;

      // 3. 其他统计...
      const { data: referralStats } = await supabase
        .from('referrals_stats_view')
        .select('*')
        .ilike('referrer_wallet', walletAddress)
        .maybeSingle();

      return {
        // 总团队人数（所有层级）
        totalTeamCount: totalTeamCount,

        // 19层矩阵内的统计
        matrixStats: {
          totalMembers: totalMembersInMatrix,      // 矩阵内总人数
          activeMembers: activeTeamInMatrix,       // 矩阵内激活人数
          deepestLayer: matrixOverview?.deepest_layer || 0
        },

        directReferralCount: referralStats?.direct_referrals || 0,
        totalEarnings: '0',
        // ... 其他字段
      };
    },
    enabled: !!walletAddress,
  });
}
```

**变更说明**:
- ✅ 保留递归计算总团队人数的逻辑
- ✅ 新增 `matrixStats` 对象区分矩阵内统计
- ✅ 明确字段含义

**状态**: 🟡 当前代码已部分实现，需要规范返回值

---

### Task 3: 更新前端组件

#### 3.1 ReferralsStats 组件

**文件**: `src/components/referrals/ReferralsStats.tsx`

**显示要求**:
```typescript
// 显示两种统计
<div className="stats-grid">
  {/* 总团队（所有层级） */}
  <StatCard
    title="总团队人数"
    value={totalTeamCount}
    description="所有推荐层级"
    icon={<Users />}
  />

  {/* 矩阵团队（19层内） */}
  <StatCard
    title="矩阵激活团队"
    value={activeTeamInMatrix}
    description="19层矩阵内激活"
    icon={<Target />}
  />
</div>
```

**需要修改的位置**:
- Line 88-111: 数据获取逻辑
- Line 150-180: 统计卡片显示

**状态**: 🟡 需要更新

---

#### 3.2 MatrixLayerStats 组件

**文件**: `src/components/matrix/MatrixLayerStats.tsx`

**显示要求**:
```typescript
// 汇总统计应该显示19层内的数据
const renderSummaryStats = () => {
  // totalMembers: 19层矩阵内总人数
  const totalMembers = layerStats.reduce((sum, stat) => sum + stat.totalMembers, 0);

  // activeMembers: 19层矩阵内current_level >= 1的人数
  const totalActive = layerStats.reduce((sum, stat) => sum + stat.activeMembers, 0);

  return (
    <div>
      <StatCard title="矩阵总人数" value={totalMembers} />
      <StatCard title="激活会员" value={totalActive} />
    </div>
  );
};
```

**状态**: ✅ 当前逻辑正确（已基于v_matrix_layers_v2）

---

#### 3.3 Dashboard / Me 页面

**文件**: `src/pages/Me.tsx` 或 Dashboard 相关组件

**显示要求**:
```typescript
const { data: stats } = useUserReferralStats();

// 显示区分
<div className="dashboard-stats">
  <div className="total-team">
    <h3>全部团队</h3>
    <p className="count">{stats?.totalTeamCount || 0}</p>
    <p className="description">包括所有推荐层级</p>
  </div>

  <div className="matrix-team">
    <h3>矩阵团队</h3>
    <p className="count">{stats?.matrixStats.totalMembers || 0}</p>
    <p className="description">19层矩阵内</p>
  </div>

  <div className="active-team">
    <h3>激活团队</h3>
    <p className="count">{stats?.matrixStats.activeMembers || 0}</p>
    <p className="description">已激活会员</p>
  </div>
</div>
```

**状态**: 🟡 需要检查现有实现

---

### Task 4: 数据验证

#### 4.1 验证总团队计算

**SQL 验证脚本**:
```sql
-- 测试钱包: 0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab
WITH RECURSIVE downline AS (
    SELECT
        wallet_address,
        referrer_wallet,
        1 as depth
    FROM members
    WHERE referrer_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'

    UNION ALL

    SELECT
        m.wallet_address,
        m.referrer_wallet,
        d.depth + 1
    FROM members m
    INNER JOIN downline d ON m.referrer_wallet = d.wallet_address
    WHERE d.depth < 100
)
SELECT
    COUNT(*) as total_team_count,
    MAX(depth) as max_depth,
    COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM members m2
        WHERE m2.wallet_address = downline.wallet_address
        AND m2.current_level >= 1
    )) as activated_count
FROM downline;
```

**预期结果**:
```
total_team_count | max_depth | activated_count
-----------------|-----------|----------------
4000+            | 30+       | 2000+
```

---

#### 4.2 验证矩阵团队计算

**SQL 验证脚本**:
```sql
-- 验证19层矩阵统计
SELECT
    COUNT(DISTINCT member_wallet) as total_in_matrix,
    COUNT(DISTINCT member_wallet) FILTER (
        WHERE EXISTS (
            SELECT 1 FROM members m
            WHERE m.wallet_address = mr.member_wallet
            AND m.current_level >= 1
        )
    ) as active_in_matrix,
    MAX(layer) as deepest_layer
FROM matrix_referrals mr
WHERE matrix_root_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'
  AND layer >= 1
  AND layer <= 19;
```

**预期结果**:
```
total_in_matrix | active_in_matrix | deepest_layer
----------------|------------------|---------------
2118            | 1500+            | 19+
```

---

#### 4.3 对比两种统计

**验证脚本**:
```sql
-- 同时查询两种统计并对比
WITH total_team AS (
    -- 递归计算总团队
    SELECT COUNT(*) as total_count
    FROM (
        WITH RECURSIVE downline AS (
            SELECT wallet_address, 1 as depth
            FROM members
            WHERE referrer_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'
            UNION ALL
            SELECT m.wallet_address, d.depth + 1
            FROM members m
            INNER JOIN downline d ON m.referrer_wallet = d.wallet_address
            WHERE d.depth < 100
        )
        SELECT * FROM downline
    ) t
),
matrix_team AS (
    -- 矩阵内团队
    SELECT COUNT(DISTINCT member_wallet) as matrix_count
    FROM matrix_referrals
    WHERE matrix_root_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'
      AND layer >= 1 AND layer <= 19
)
SELECT
    tt.total_count as "总团队（所有层级）",
    mt.matrix_count as "矩阵团队（19层内）",
    tt.total_count - mt.matrix_count as "差额（超过19层）"
FROM total_team tt, matrix_team mt;
```

**预期结果**:
```
总团队（所有层级） | 矩阵团队（19层内） | 差额（超过19层）
------------------|-------------------|----------------
4000+             | 2118              | 1882+
```

**结论**: 总团队应该 >= 矩阵团队（因为包括未占位和超过19层的成员）

---

### Task 5: 创建数据验证报告

**文件**: `DATA_VALIDATION_REPORT.md`

**包含内容**:
1. 两种统计的实际数据对比
2. 前10个钱包的统计示例
3. 异常情况检查（总团队 < 矩阵团队的情况）
4. Layer分布验证
5. 前端组件显示截图

---

## 🔍 验证清单

### 数据层验证
- [ ] v_total_team_count 视图创建成功
- [ ] v_matrix_overview 数据正确
- [ ] 递归查询返回正确的总团队数
- [ ] 矩阵查询返回正确的19层团队数
- [ ] 两种统计关系正确（总团队 >= 矩阵团队）

### Hook层验证
- [ ] useUserReferralStats 返回两种统计
- [ ] useUserMatrixStats 返回正确的矩阵数据
- [ ] 数据结构清晰明确

### 组件层验证
- [ ] ReferralsStats 显示两种统计
- [ ] MatrixLayerStats 显示19层数据
- [ ] Dashboard 显示完整统计
- [ ] 所有组件无错误
- [ ] 中英文翻译正确

### UI/UX验证
- [ ] 统计卡片标签清晰
- [ ] 描述文字准确
- [ ] 工具提示说明区别
- [ ] 移动端显示正常

---

## 📊 预期数据示例

### 示例钱包: 0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab

```json
{
  "totalTeamCount": 4061,           // 所有层级
  "matrixStats": {
    "totalMembers": 2118,           // 19层矩阵内总人数
    "activeMembers": 1800,          // 19层矩阵内激活人数
    "deepestLayer": 19              // 最深达到19层
  },
  "directReferralCount": 3,         // Layer 1直推
  "beyondMatrix": 1943              // 超过19层的人数
}
```

**解释**:
- 总团队 4061人（包括所有推荐链上的成员）
- 矩阵团队 2118人（只计算19层内的占位成员）
- 差额 1943人（这些人在推荐链上但未在19层矩阵中占位，可能在更深层级或等待占位）

---

## 🚀 执行顺序

1. ✅ **Step 1**: 创建 v_total_team_count 视图
2. ✅ **Step 2**: 验证视图数据正确性
3. ✅ **Step 3**: 更新 useBeeHiveStats hook
4. ✅ **Step 4**: 更新 ReferralsStats 组件
5. ✅ **Step 5**: 更新其他相关组件
6. ✅ **Step 6**: 运行数据验证脚本
7. ✅ **Step 7**: 前端测试所有页面
8. ✅ **Step 8**: 创建验证报告

---

## 📝 注意事项

### 性能考虑

1. **递归查询优化**:
   - 使用物化视图缓存总团队统计
   - 限制递归深度（depth < 100）
   - 添加索引: `CREATE INDEX idx_members_referrer ON members(referrer_wallet)`

2. **前端查询优化**:
   - 使用 React Query 缓存
   - staleTime: 5000ms
   - refetchInterval: 15000ms

### 数据一致性

1. **触发器更新**:
   - 新成员加入时更新统计
   - 成员激活时更新激活人数
   - 矩阵占位时更新矩阵统计

2. **定期同步**:
   - 每小时重新计算一次总团队统计
   - 验证两种统计的一致性

---

**创建者**: Claude Code
**状态**: 🟡 进行中
**下一步**: 创建 v_total_team_count 视图并验证数据
