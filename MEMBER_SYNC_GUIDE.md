# 会员数据同步指南

## 概述

会员同步系统用于将 `members` 表中的数据同步到 `referrals` 矩阵系统，确保所有会员都正确地放置在 3x3 矩阵结构中。

## 数据库连接

```bash
# PostgreSQL 连接字符串
postgresql://postgres:bee8881941@db.cvqibjcbfrwsgkvthccp.supabase.co:5432/postgres
```

## 核心功能

### 1. Edge Function: `sync-members`

位置: `/supabase/functions/sync-members/index.ts`

支持的操作:

#### a. 验证同步状态
```typescript
{
  "action": "verify-sync"
}
```

返回:
```json
{
  "success": true,
  "stats": {
    "totalMembers": 100,
    "totalReferrals": 95,
    "missingInReferrals": 5,
    "syncPercentage": "95.0"
  }
}
```

#### b. 同步单个会员
```typescript
{
  "action": "sync-single-member",
  "walletAddress": "0x..."
}
```

#### c. 同步缺失的会员
```typescript
{
  "action": "sync-missing-members"
}
```

#### d. 全量同步所有会员
```typescript
{
  "action": "sync-all-members"
}
```

### 2. SQL 辅助函数

#### a. 获取未同步的会员
```sql
SELECT * FROM get_members_not_in_referrals();
```

#### b. 检查会员是否在矩阵中
```sql
SELECT is_member_in_matrix('0x...');
```

#### c. 获取同步统计
```sql
SELECT * FROM get_sync_stats();
```

#### d. 查找矩阵位置
```sql
SELECT * FROM find_available_matrix_position('0x_referrer_wallet');
-- 返回: parent_wallet, position (L/M/R), layer
```

#### e. 批量同步
```sql
SELECT * FROM batch_sync_members_to_matrix(100); -- 限制100条
```

### 3. 前端组件: `MemberSyncPanel`

位置: `/src/components/admin/MemberSyncPanel.tsx`

功能:
- 显示同步状态统计
- 一键同步缺失会员
- 全量同步所有会员
- 实时显示同步结果和错误

## 使用步骤

### 方式一: 使用前端面板（推荐）

1. 导入组件到管理页面:
```tsx
import { MemberSyncPanel } from '@/components/admin/MemberSyncPanel';

// 在管理页面中使用
<MemberSyncPanel />
```

2. 操作流程:
   - 点击"验证状态"查看当前同步情况
   - 点击"同步缺失的会员"同步未在矩阵中的会员
   - 如需全量重新同步，点击"全量同步所有会员"

### 方式二: 使用 SQL 命令

1. 连接到数据库:
```bash
psql "postgresql://postgres:bee8881941@db.cvqibjcbfrwsgkvthccp.supabase.co:5432/postgres"
```

2. 检查同步状态:
```sql
SELECT * FROM get_sync_stats();
```

3. 查看需要同步的会员:
```sql
SELECT * FROM get_members_not_in_referrals();
```

4. 执行批量同步:
```sql
SELECT * FROM batch_sync_members_to_matrix(100);
```

### 方式三: 使用 Edge Function API

```typescript
import { supabase } from './lib/supabase';

// 验证状态
const { data } = await supabase.functions.invoke('sync-members', {
  body: { action: 'verify-sync' }
});

// 同步缺失会员
const { data } = await supabase.functions.invoke('sync-members', {
  body: { action: 'sync-missing-members' }
});
```

## 矩阵放置规则

系统使用 **BFS (广度优先搜索) + L/M/R 溢出规则** 进行矩阵放置:

1. **优先级**: 从推荐人（referrer）开始
2. **位置顺序**: L (左) → M (中) → R (右)
3. **溢出处理**: 当推荐人位置已满（3个子节点），使用 BFS 找到第一个有空位的节点
4. **层级计算**: 自动计算正确的层级（matrix_layer）

### 示例流程:

```
推荐人 (Referrer)
├── L (第一个会员)
├── M (第二个会员)
└── R (第三个会员)
    ├── L (第四个会员 - 溢出到 R 的子节点)
    └── ...
```

## 数据验证

同步后验证数据完整性:

```sql
-- 检查矩阵结构
SELECT
  r.member_wallet,
  u.username,
  r.matrix_parent,
  r.matrix_position,
  r.matrix_layer
FROM referrals r
JOIN users u ON r.member_wallet = u.wallet_address
ORDER BY r.matrix_layer, r.placed_at;

-- 验证推荐关系
SELECT
  m.wallet_address as member,
  m.referrer_wallet,
  r.matrix_parent,
  CASE
    WHEN m.referrer_wallet = r.matrix_parent THEN '✓ 直接父节点'
    ELSE '↓ 溢出节点'
  END as placement_type
FROM members m
JOIN referrals r ON m.wallet_address = r.member_wallet
WHERE m.referrer_wallet != '0x0000000000000000000000000000000000000001';
```

## 故障排查

### 问题 1: 同步失败
检查错误日志:
```sql
-- 查看最近的错误
SELECT * FROM batch_sync_members_to_matrix(10);
```

### 问题 2: 矩阵位置冲突
手动检查冲突:
```sql
SELECT
  matrix_parent,
  matrix_position,
  COUNT(*) as count
FROM referrals
GROUP BY matrix_parent, matrix_position
HAVING COUNT(*) > 1;
```

### 问题 3: 层级不正确
重新计算层级:
```sql
-- 这需要自定义 SQL 或通过 Edge Function 处理
```

## 安全注意事项

1. **权限控制**: 只有 `service_role` 可以执行批量同步
2. **数据备份**: 同步前建议备份数据
3. **测试环境**: 先在测试环境验证
4. **批量限制**: 使用 `batch_sync_members_to_matrix()` 时限制批次大小

## 监控和日志

- Edge Function 日志位于 Supabase Dashboard → Edge Functions → sync-members
- SQL 函数使用 `RAISE NOTICE` 输出日志
- 前端组件显示实时同步结果

## 相关文件

- Edge Function: `/supabase/functions/sync-members/index.ts`
- SQL Migration: `/supabase/migrations/20250104_create_member_sync_helpers.sql`
- 前端组件: `/src/components/admin/MemberSyncPanel.tsx`
- Edge Function 配置: `/src/lib/edgeFunctions.ts`
- 原始 SQL 脚本: `/sql/sync_referrals_with_members.sql`

## 更新日志

- **2025-01-04**: 创建会员同步系统
  - 添加 Edge Function `sync-members`
  - 创建 SQL 辅助函数
  - 实现前端同步面板
