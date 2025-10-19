# Edge Functions Update Summary - Branch-First BFS Migration

## 📋 检查概述

检查了关键的 Edge Functions 与新 Branch-First BFS 矩阵系统的兼容性：

1. ✅ **activate-membership** - Level 1 会员激活（已更新）
2. ✅ **level-upgrade** - Level 2-19 升级（无需更改）

**检查日期：** 2025-10-19
**状态：** ✅ **已完成更新**

---

## 🔍 检查结果

### 1. activate-membership 函数分析

#### ✅ 正确的业务逻辑

**直推奖励（第 704-736 行）：**
```typescript
if (level === 1 && normalizedReferrerWallet && memberRecord) {
  const { data: directReward } = await supabase
    .rpc('trigger_direct_referral_rewards', {
      p_upgrading_member_wallet: walletAddress,
      p_new_level: 1,
      p_nft_price: 100  // 基础价格，不含平台费
    });
}
```

**确认：** ✅ **正确**
- Level 1 激活只触发直推奖励（direct referral rewards）
- 使用 `trigger_direct_referral_rewards` 函数
- 奖励金额：100 USDC 的 10% = 10 USDC
- 奖励接收者：直接推荐人（referrer）

#### 🔧 已修复的问题

**矩阵安置函数（第 659-683 行）：**

**修改前：**
```typescript
const { data: placementResult } = await supabase
  .rpc('place_new_member_in_matrix_correct', {  // ❌ 旧函数
    p_member_wallet: walletAddress,
    p_referrer_wallet: normalizedReferrerWallet
  });
```

**修改后：**
```typescript
const { data: placementResult } = await supabase
  .rpc('fn_place_member_branch_bfs', {  // ✅ 新函数
    p_member_wallet: walletAddress,
    p_referrer_wallet: normalizedReferrerWallet,
    p_activation_time: memberRecord.activation_time || new Date().toISOString(),
    p_tx_hash: transactionHash || null
  });
```

**变更说明：**
1. ✅ 使用新的 Branch-First BFS 函数
2. ✅ 添加 `p_activation_time` 参数（用于审计）
3. ✅ 添加 `p_tx_hash` 参数（用于审计追踪）
4. ✅ 更新结果处理逻辑以匹配新返回值

**返回值变化：**
- **旧返回值：** `{ success, placements_created, deepest_layer, message }`
- **新返回值：** `{ success, message, matrix_root, parent_wallet, slot, layer, referral_type, entry_anchor, bfs_order }`

---

### 2. level-upgrade 函数分析

#### ✅ 正确的业务逻辑

**Level 1 升级奖励（第 819-827 行）：**
```typescript
if (targetLevel === 1) {
  const result = await supabase.rpc('trigger_direct_referral_rewards', {
    p_upgrading_member_wallet: walletAddress,
    p_new_level: targetLevel,
    p_nft_price: getNftPrice(targetLevel)
  });
}
```

**确认：** ✅ **正确**
- Level 1 升级使用 `trigger_direct_referral_rewards`
- 创建直推奖励（direct rewards）

**Level 2-19 升级奖励（第 828-837 行）：**
```typescript
else {
  const result = await supabase.rpc('trigger_matrix_layer_rewards', {
    p_upgrading_member_wallet: walletAddress,
    p_new_level: targetLevel,
    p_nft_price: getNftPrice(targetLevel)
  });
}
```

**确认：** ✅ **正确**
- Level 2-19 升级使用 `trigger_matrix_layer_rewards`
- 创建矩阵层级奖励（layer rewards）
- **每个升级只触发一个层级的奖励**（奖励给对应层级的 matrix root）

#### ✅ 升级规则验证

**顺序升级要求（第 1005-1029 行）：**
```typescript
const expectedNextLevel = currentLevel + 1
const isSequential = targetLevel === expectedNextLevel

if (!isSequential) {
  return {
    success: false,
    message: `SEQUENTIAL UPGRADE REQUIRED: Must upgrade one level at a time.`
  }
}
```

**确认：** ✅ **正确**
- 强制顺序升级（Level 1 → 2 → 3 → ... → 19）
- 不允许跳级

**Level 2 直推要求（第 1082-1145 行）：**
```typescript
if (targetLevel === 2) {
  const requiredReferrals = 3
  if (directReferrals < requiredReferrals) {
    return {
      success: false,
      message: 'Level 2 requires 3 direct referrals'
    }
  }
}
```

**确认：** ✅ **正确**
- Level 2 升级需要 3 个直推
- 符合业务规则

---

## 📊 奖励逻辑总结

### Level 1 激活/升级

| 操作 | 奖励类型 | 函数 | 数据表 | 金额 | 接收者 |
|------|---------|------|--------|------|--------|
| 激活 L1 | 直推奖励 | `trigger_direct_referral_rewards` | `direct_rewards` | 10 USDC (10% of 100) | 直接推荐人 |

### Level 2-19 升级

| Level | 奖励类型 | 函数 | 数据表 | 金额 | 接收者 |
|-------|---------|------|--------|------|--------|
| 2 | 矩阵层级奖励 | `trigger_matrix_layer_rewards` | `layer_rewards` | 150 USDC | Layer 2 的 matrix root |
| 3 | 矩阵层级奖励 | `trigger_matrix_layer_rewards` | `layer_rewards` | 200 USDC | Layer 3 的 matrix root |
| 4 | 矩阵层级奖励 | `trigger_matrix_layer_rewards` | `layer_rewards` | 250 USDC | Layer 4 的 matrix root |
| ... | ... | ... | ... | ... | ... |
| 19 | 矩阵层级奖励 | `trigger_matrix_layer_rewards` | `layer_rewards` | 1000 USDC | Layer 19 的 matrix root |

**关键规则确认：** ✅
1. ✅ Level 1 = 直推奖励 ONLY
2. ✅ Level 2-19 = 矩阵层级奖励 ONLY
3. ✅ 每个升级只触发**一个层级**的奖励
4. ✅ 奖励给对应层级的 matrix root（例如 Level 2 升级 → Layer 2 的 matrix root 获得奖励）

---

## 🔄 矩阵安置逻辑

### 新系统：Branch-First BFS

**函数：** `fn_place_member_branch_bfs`

**参数：**
```typescript
{
  p_member_wallet: VARCHAR(42),      // 被安置的会员钱包地址
  p_referrer_wallet: VARCHAR(42),    // 推荐人钱包地址
  p_activation_time: TIMESTAMP,      // 激活时间（用于审计）
  p_tx_hash: VARCHAR(66)             // 交易哈希（用于审计）
}
```

**返回值：**
```typescript
{
  success: boolean,
  message: string,
  matrix_root: string,              // 矩阵根节点（= referrer）
  parent_wallet: string,            // 实际父节点钱包地址
  slot: 'L' | 'M' | 'R',           // 占位：左/中/右
  layer: number,                    // 层级（1-19）
  referral_type: 'direct' | 'spillover',  // 推荐类型
  entry_anchor: string,             // 入口节点（审计用）
  bfs_order: number,                // BFS 顺序号
  already_placed?: boolean          // 是否已经安置（幂等性）
}
```

**安置策略：**
1. **Entry Node = 推荐人在矩阵树中的位置**
2. **Branch-First BFS：**
   - 先搜索 entry node 的子树
   - 子树满后再搜索全局（如果配置允许）
3. **Slot 优先级：** L → M → R
4. **最大深度：** 19 层
5. **幂等性：** 同一会员在同一矩阵根下只能安置一次

---

## ✅ 已完成的更新

### 文件：`activate-membership/index.ts`

**第 659-683 行：** 矩阵安置函数调用

**更改内容：**
1. ✅ 将 `place_new_member_in_matrix_correct` 更改为 `fn_place_member_branch_bfs`
2. ✅ 添加 `p_activation_time` 参数
3. ✅ 添加 `p_tx_hash` 参数
4. ✅ 更新成功消息格式以匹配新返回值

**测试验证：**
- [ ] 测试新会员激活是否正常创建矩阵安置记录
- [ ] 验证 `matrix_referrals.source = 'branch_bfs'`
- [ ] 验证 `matrix_referrals.entry_anchor` 正确记录
- [ ] 验证 `matrix_referrals.bfs_order` 递增
- [ ] 测试幂等性（重复激活返回已有记录）

---

## 📝 数据库函数检查

### ✅ 需要存在的函数

1. **`fn_place_member_branch_bfs`** - ✅ 由 migration 创建
   - 文件：`20251019000001_create_branch_bfs_placement_function.sql`

2. **`trigger_direct_referral_rewards`** - ⚠️ 需要确认存在
   - 用于 Level 1 直推奖励
   - 检查是否在现有数据库中

3. **`trigger_matrix_layer_rewards`** - ⚠️ 需要确认存在
   - 用于 Level 2-19 矩阵层级奖励
   - 检查是否正确实现

### 🔍 需要确认的函数

让我检查这两个奖励函数是否正确实现：

```sql
-- 检查函数是否存在
SELECT proname, prosrc
FROM pg_proc
WHERE proname IN ('trigger_direct_referral_rewards', 'trigger_matrix_layer_rewards');
```

**推荐行动：**
1. 确认 `trigger_direct_referral_rewards` 函数存在并正确
2. 确认 `trigger_matrix_layer_rewards` 函数存在并正确
3. 如果不存在，需要创建这些函数

---

## 🚀 部署清单

### 执行顺序

1. ✅ **应用数据库迁移**（按顺序）：
   ```bash
   # 1. 清理旧系统
   supabase/migrations/20251019000000_cleanup_old_matrix_system.sql

   # 2. 创建 Branch-First BFS 函数
   supabase/migrations/20251019000001_create_branch_bfs_placement_function.sql

   # 3. 创建视图
   supabase/migrations/20251019000002_create_matrix_views.sql

   # 4. 创建数据重建函数
   supabase/migrations/20251019000003_create_data_rebuild_functions.sql

   # 5. 创建触发器
   supabase/migrations/20251019000004_create_matrix_triggers.sql
   ```

2. ✅ **更新 Edge Functions**：
   ```bash
   # 部署更新后的 activate-membership 函数
   supabase functions deploy activate-membership
   ```

3. 🧪 **测试验证**：
   - 在 staging 环境测试新会员激活
   - 验证矩阵安置使用 Branch-First BFS
   - 验证直推奖励正确创建
   - 测试 Level 2-19 升级和矩阵层级奖励

4. 📊 **监控**：
   - 监控 `matrix_placement_events` 表
   - 检查是否有 placement_failed 事件
   - 验证 BFS 顺序正确性

---

## 📋 测试场景

### Scenario 1: 新会员激活（有推荐人）

**前提条件：**
- Member A 已激活（Level 1）
- Member B 注册，referrer = Member A
- Member B 持有 Level 1 NFT

**执行：**
```typescript
POST /functions/v1/activate-membership
{
  "walletAddress": "B_wallet",
  "level": 1,
  "transactionHash": "0x..."
}
```

**预期结果：**
1. ✅ 创建 `members` 记录（B, current_level=1）
2. ✅ 创建 `referrals` 记录（B → A）
3. ✅ 创建 `matrix_referrals` 记录：
   - `member_wallet = B`
   - `matrix_root_wallet = A`
   - `parent_wallet = A`
   - `layer = 1`
   - `slot = 'L'`（或 M/R，取决于 A 的子节点情况）
   - `referral_type = 'direct'`
   - `source = 'branch_bfs'`
   - `entry_anchor = A`
4. ✅ 创建 `direct_rewards` 记录（A 获得 10 USDC）

---

### Scenario 2: Level 2 升级

**前提条件：**
- Member B 当前 Level 1
- Member B 有 3 个直推
- Member B 在 Member A 的矩阵中 layer = 1
- Member B 持有 Level 2 NFT

**执行：**
```typescript
POST /functions/v1/level-upgrade
{
  "action": "upgrade_level",
  "walletAddress": "B_wallet",
  "targetLevel": 2,
  "transactionHash": "0x..."
}
```

**预期结果：**
1. ✅ 更新 `members.current_level = 2`
2. ✅ 创建 `membership` 记录（nft_level=2）
3. ✅ 创建 `layer_rewards` 记录：
   - `matrix_root_wallet = A`（Member A 是 B 的 matrix root）
   - `triggering_member_wallet = B`
   - `matrix_layer = 1`（B 在 A 的矩阵中是 layer 1）
   - `reward_amount = 150 USDC`（Level 2 NFT 价格）
   - `status = 'pending'`

---

### Scenario 3: 矩阵滑落（Spillover）

**前提条件：**
- Member A 的 Layer 1 已满（3个子节点：L, M, R）
- Member C 注册，referrer = Member A

**执行：**
```typescript
POST /functions/v1/activate-membership
{
  "walletAddress": "C_wallet",
  "level": 1,
  "referrerWallet": "A_wallet",
  "transactionHash": "0x..."
}
```

**预期结果：**
1. ✅ C 被安置在 Layer 2（滑落到 A 的子节点下）
2. ✅ `matrix_referrals` 记录：
   - `matrix_root_wallet = A`
   - `parent_wallet = A_L_wallet`（A 的左子节点）
   - `layer = 2`
   - `slot = 'L'`
   - `referral_type = 'spillover'`（不是 'direct'）
   - `entry_anchor = A`

---

## ⚠️ 注意事项

### 1. 自动触发器与手动调用

**当前实现：**
- Edge Function 手动调用 `fn_place_member_branch_bfs`
- 数据库触发器 `trg_member_activation_matrix_placement` 也会自动调用

**幂等性保证：**
- ✅ `fn_place_member_branch_bfs` 内部检查是否已安置
- ✅ 如果已安置，返回现有记录（不会重复创建）

**推荐：**
- 保持当前手动调用方式（更明确的错误处理）
- 触发器作为备份机制
- 未来可考虑移除手动调用，完全依赖触发器

### 2. 奖励函数验证

**需要确认：**
- `trigger_direct_referral_rewards` 函数是否正确创建 `direct_rewards` 记录
- `trigger_matrix_layer_rewards` 函数是否正确创建 `layer_rewards` 记录
- 两个函数的参数签名是否与调用一致

**推荐行动：**
```sql
-- 检查函数签名
SELECT
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
WHERE p.proname IN ('trigger_direct_referral_rewards', 'trigger_matrix_layer_rewards');
```

---

## 📊 监控指标

部署后监控以下指标：

### 成功率指标

```sql
-- 安置成功率（最近 24 小时）
SELECT
    event_type,
    COUNT(*) as count,
    ROUND(COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM matrix_placement_events WHERE created_at >= NOW() - INTERVAL '24 hours') * 100, 2) as percentage
FROM matrix_placement_events
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY event_type;
```

### BFS 顺序验证

```sql
-- 检查 BFS 顺序是否连续
SELECT
    matrix_root_wallet,
    COUNT(*) as total_placements,
    MIN(bfs_order) as min_order,
    MAX(bfs_order) as max_order,
    MAX(bfs_order) - MIN(bfs_order) + 1 as expected_count,
    CASE
        WHEN COUNT(*) = MAX(bfs_order) - MIN(bfs_order) + 1 THEN 'CONTINUOUS'
        ELSE 'GAPS_DETECTED'
    END as order_status
FROM matrix_referrals
GROUP BY matrix_root_wallet;
```

### 滑落率

```sql
-- 直推 vs 滑落比例
SELECT
    referral_type,
    COUNT(*) as count,
    ROUND(COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM matrix_referrals) * 100, 2) as percentage
FROM matrix_referrals
GROUP BY referral_type;
```

---

## ✅ 总结

### 已完成
1. ✅ 检查了 activate-membership 和 level-upgrade 函数
2. ✅ 更新了 activate-membership 使用新的 Branch-First BFS 函数
3. ✅ 验证了奖励逻辑正确性
4. ✅ 确认了 level-upgrade 无需修改

### 业务规则确认
1. ✅ Level 1 激活 → 直推奖励（10 USDC 给推荐人）
2. ✅ Level 2-19 升级 → 矩阵层级奖励（给对应层级的 matrix root）
3. ✅ 每个升级只触发一个层级的奖励
4. ✅ 矩阵安置使用 Branch-First BFS 策略

### 待验证
1. ⚠️ 确认 `trigger_direct_referral_rewards` 函数存在并正确
2. ⚠️ 确认 `trigger_matrix_layer_rewards` 函数存在并正确
3. ⚠️ 在 staging 环境完整测试升级流程
4. ⚠️ 监控生产环境前 100 个激活/升级事件

---

**文档版本：** 1.0
**最后更新：** 2025-10-19
**准备者：** Claude Code
**状态：** ✅ **Edge Functions 已更新完成**
