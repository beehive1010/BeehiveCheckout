# 完整系统同步指南

## 📋 概述

完整的数据同步系统，确保以下数据流的完整性和一致性：

```
users → members/memberships → referrals (matrix) → rewards (direct + layer)
```

## 🎯 同步目标

1. **Users → Members/Memberships**: 确保每个 user 都有对应的 member 和 membership 记录
2. **Members → Referrals (Matrix)**: 将所有 members 正确放入 3x3 矩阵结构
3. **Direct Rewards**: 直推奖励数量 = members 数量（每个被推荐人生成一个直推奖励）
4. **Total Rewards**: Membership 总奖励 = 直推奖励 + 层级奖励

## 📁 文件结构

### Edge Function
- `/supabase/functions/complete-system-sync/index.ts` - 完整系统同步 API

### SQL Functions
- `/supabase/migrations/20250104_complete_system_sync.sql` - 所有 SQL 辅助函数

### Frontend Component
- `/src/components/admin/CompleteSystemSyncPanel.tsx` - 管理面板

## 🔧 核心功能

### 1. SQL Functions

#### a. 同步 Users 到 Members/Memberships
```sql
SELECT * FROM sync_users_to_members();
```

返回:
```sql
synced_members: INTEGER
synced_memberships: INTEGER
errors: TEXT[]
```

#### b. 重建矩阵结构
```sql
SELECT * FROM rebuild_matrix_from_members();
```

返回:
```sql
total_members: INTEGER
placed_in_matrix: INTEGER
errors: TEXT[]
```

#### c. 重新计算直推奖励
```sql
SELECT * FROM recalculate_direct_rewards();
```

返回:
```sql
total_members: INTEGER
direct_rewards_created: INTEGER
mismatches: INTEGER
details: JSONB
```

#### d. 验证奖励总数
```sql
SELECT * FROM validate_reward_totals();
```

返回每个钱包的奖励明细和验证状态。

#### e. 系统状态摘要
```sql
SELECT * FROM get_system_sync_status();
```

返回完整的系统同步状态 JSON。

### 2. Edge Function Actions

#### 完整同步
```typescript
{
  "action": "full-system-sync"
}
```

按顺序执行所有 4 个步骤。

#### 单独步骤

**Step 1: Users 同步**
```typescript
{
  "action": "sync-users-to-members"
}
```

**Step 2: 矩阵重建**
```typescript
{
  "action": "rebuild-matrix"
}
```

**Step 3: 直推奖励重算**
```typescript
{
  "action": "recalculate-direct-rewards"
}
```

**Step 4: 奖励验证**
```typescript
{
  "action": "validate-reward-totals"
}
```

## 🚀 使用方法

### 方式一: 前端管理面板（推荐）

1. **导入组件**:
```tsx
import { CompleteSystemSyncPanel } from '@/components/admin/CompleteSystemSyncPanel';

// 在管理页面使用
<CompleteSystemSyncPanel />
```

2. **操作流程**:
   - 查看系统状态（自动加载）
   - 如有数据缺口，点击"完整系统同步"
   - 或者分步执行各个步骤

### 方式二: 直接使用 SQL

```bash
# 连接数据库
psql "postgresql://postgres:bee8881941@db.cvqibjcbfrwsgkvthccp.supabase.co:5432/postgres"
```

```sql
-- 1. 检查当前状态
SELECT * FROM get_system_sync_status();

-- 2. 执行各个步骤
SELECT * FROM sync_users_to_members();
SELECT * FROM rebuild_matrix_from_members();
SELECT * FROM recalculate_direct_rewards();
SELECT * FROM validate_reward_totals();
```

### 方式三: Edge Function API

```typescript
import { supabase } from './lib/supabase';

// 完整同步
const { data, error } = await supabase.functions.invoke('complete-system-sync', {
  body: { action: 'full-system-sync' }
});

// 单步执行
const { data } = await supabase.functions.invoke('complete-system-sync', {
  body: { action: 'sync-users-to-members' }
});
```

## 📊 数据验证

### 验证 Users → Members 同步
```sql
SELECT
  COUNT(*) as users_count,
  (SELECT COUNT(*) FROM members) as members_count,
  COUNT(*) - (SELECT COUNT(*) FROM members) as gap
FROM users;
```

### 验证 Members → Matrix 同步
```sql
SELECT
  COUNT(*) as members_count,
  (SELECT COUNT(*) FROM referrals) as matrix_count,
  COUNT(*) - (SELECT COUNT(*) FROM referrals) as gap
FROM members
WHERE wallet_address != '0x0000000000000000000000000000000000000001';
```

### 验证直推奖励数量
```sql
SELECT
  m.wallet_address,
  COUNT(m2.wallet_address) as direct_referrals,
  (
    SELECT COUNT(*)
    FROM layer_rewards lr
    WHERE lr.reward_recipient_wallet = m.wallet_address
      AND lr.reward_type = 'direct'
      AND lr.status = 'completed'
  ) as direct_rewards,
  COUNT(m2.wallet_address) - (
    SELECT COUNT(*)
    FROM layer_rewards lr
    WHERE lr.reward_recipient_wallet = m.wallet_address
      AND lr.reward_type = 'direct'
      AND lr.status = 'completed'
  ) as mismatch
FROM members m
LEFT JOIN members m2 ON m2.referrer_wallet = m.wallet_address
GROUP BY m.wallet_address
HAVING COUNT(m2.wallet_address) != (
  SELECT COUNT(*)
  FROM layer_rewards lr
  WHERE lr.reward_recipient_wallet = m.wallet_address
    AND lr.reward_type = 'direct'
    AND lr.status = 'completed'
);
```

### 验证总奖励计算
```sql
SELECT * FROM validate_reward_totals()
WHERE NOT is_valid;
```

## 🔄 同步流程详解

### Step 1: Users → Members/Memberships

**目的**: 确保每个 user 都有对应的业务记录

**处理逻辑**:
1. 遍历所有 users
2. 检查是否存在对应的 member 记录，不存在则创建
3. 检查是否存在对应的 membership 记录，不存在则创建
4. 设置默认值：
   - `current_level`: 1
   - `nft_level`: 1
   - `activation_tier`: 1
   - `referrer_wallet`: 从 `pre_referrer` 获取，如果为空则使用 root wallet

### Step 2: Members → Referrals (Matrix)

**目的**: 将所有 members 放入 3x3 矩阵结构

**处理逻辑**:
1. 按 `activation_sequence` 顺序处理 members
2. 使用 BFS 算法查找可用位置：
   - 从 `referrer_wallet` 开始
   - 如果推荐人位置已满（3个子节点），向下溢出
   - 按 L → M → R 顺序填充
3. 计算正确的 `matrix_layer`
4. 插入到 `referrals` 表

### Step 3: 重新计算直推奖励

**目的**: 确保直推奖励数量与实际推荐人数一致

**处理逻辑**:
1. 统计每个 member 的直接推荐人数
2. 统计现有的直推奖励数量
3. 识别不匹配的情况
4. 报告差异（创建缺失奖励的逻辑需要根据业务规则实现）

**关键规则**:
- 直推奖励数量 = 直接推荐的 members 数量
- 每推荐一个人，推荐人获得一个直推奖励

### Step 4: 验证奖励总数

**目的**: 确保 membership 记录的总奖励等于实际奖励

**验证公式**:
```
总奖励 = 直推奖励 + 层级奖励
```

**处理逻辑**:
1. 统计每个钱包的直推奖励数量
2. 统计每个钱包的层级奖励数量
3. 计算总数
4. 与 membership 表中记录的总数对比
5. 报告不匹配的记录

## ⚠️ 注意事项

### 1. 数据备份
在执行同步前，建议备份以下表：
- `members`
- `memberships`
- `referrals`
- `layer_rewards`

```sql
-- 备份示例
CREATE TABLE members_backup AS SELECT * FROM members;
CREATE TABLE referrals_backup AS SELECT * FROM referrals;
```

### 2. 权限要求
- 大部分函数需要 `service_role` 权限
- 前端调用通过 Edge Function，使用 service role key

### 3. 性能考虑
- 大量数据时建议分批处理
- 矩阵重建可能需要较长时间
- 建议在低峰期执行

### 4. 幂等性
- `sync_users_to_members()` 使用 `ON CONFLICT DO NOTHING`，可重复执行
- `rebuild_matrix_from_members()` 会跳过已存在的记录
- 可以安全地多次执行

## 🐛 故障排查

### 问题 1: Users 同步失败
```sql
-- 检查缺失的 members
SELECT u.wallet_address, u.username
FROM users u
LEFT JOIN members m ON u.wallet_address = m.wallet_address
WHERE m.wallet_address IS NULL;
```

### 问题 2: 矩阵位置冲突
```sql
-- 检查重复位置
SELECT matrix_parent, matrix_position, COUNT(*)
FROM referrals
GROUP BY matrix_parent, matrix_position
HAVING COUNT(*) > 1;
```

### 问题 3: 奖励不匹配
```sql
-- 查看详细不匹配情况
SELECT * FROM recalculate_direct_rewards();
```

### 问题 4: 层级计算错误
```sql
-- 检查层级分布
SELECT matrix_layer, COUNT(*)
FROM referrals
GROUP BY matrix_layer
ORDER BY matrix_layer;
```

## 📈 监控指标

### 关键指标
```sql
SELECT
  'Users' as metric, COUNT(*) as count FROM users
UNION ALL
SELECT 'Members', COUNT(*) FROM members
UNION ALL
SELECT 'Memberships', COUNT(*) FROM memberships
UNION ALL
SELECT 'Referrals', COUNT(*) FROM referrals
UNION ALL
SELECT 'Direct Rewards', COUNT(*) FROM layer_rewards
WHERE reward_type = 'direct' AND status = 'completed'
UNION ALL
SELECT 'Layer Rewards', COUNT(*) FROM layer_rewards
WHERE reward_type = 'layer' AND status = 'completed';
```

### 健康检查
```sql
SELECT * FROM get_system_sync_status();
```

期望结果:
- `sync_gaps.users_without_members = 0`
- `sync_gaps.members_without_referrals = 0`
- `sync_gaps.reward_mismatches = 0`

## 🔐 安全性

1. **权限控制**: 只有管理员可以执行同步操作
2. **审计日志**: 所有操作都有 `RAISE NOTICE` 日志
3. **事务安全**: 使用 PostgreSQL 事务确保原子性
4. **错误处理**: 单个记录失败不影响其他记录

## 📚 相关文档

- [会员同步指南](./MEMBER_SYNC_GUIDE.md)
- [矩阵系统文档](./MATRIX_SYSTEM.md)
- [奖励系统文档](./REWARD_SYSTEM.md)

## 🔄 更新日志

### 2025-01-04
- ✅ 创建完整系统同步 Edge Function
- ✅ 实现 4 步同步流程
- ✅ 添加数据验证功能
- ✅ 创建管理面板
- ✅ 完善文档

## 🆘 支持

如有问题，请查看：
1. Edge Function 日志: Supabase Dashboard → Edge Functions → complete-system-sync
2. 数据库日志: 查看 PostgreSQL 日志
3. 前端控制台: 浏览器开发者工具

---

**重要提醒**: 首次执行前，请务必在测试环境验证！
