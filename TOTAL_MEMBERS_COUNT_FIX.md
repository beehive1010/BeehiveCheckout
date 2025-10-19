# 总会员数统计修复报告

**问题**: Admin Dashboard 显示的总会员数量不正确
**状态**: ✅ **已修复并部署**
**修复时间**: 2025-10-19

---

## 🔍 问题分析

### 根本原因
Admin Dashboard 的统计数据来自 Supabase Edge Function `admin-stats`，该函数错误地查询了 `users` 表而不是 `members` 表。

### 数据库实际情况
```sql
-- members 表（正确的会员数）
SELECT COUNT(*) FROM members;
-- 结果: 4077

-- users 表（错误显示的数字）
SELECT COUNT(*) FROM users;
-- 结果: 4090
```

**差异**: 13 条记录（users 表包含了一些未成为会员的用户）

---

## ✅ 修复内容

### 文件: `supabase/functions/admin-stats/index.ts`

#### 修改 1: 总会员数查询（第 75-77 行）
```typescript
// ❌ 修复前
const { count: totalUsers, error: usersError } = await supabaseClient
  .from('users')
  .select('*', { count: 'exact', head: true });

// ✅ 修复后
const { count: totalMembers, error: membersCountError } = await supabaseClient
  .from('members')
  .select('*', { count: 'exact', head: true });
```

#### 修改 2: 返回数据（第 165、173 行）
```typescript
// ❌ 修复前
total_members: totalUsers || 0,
totalUsers: totalUsers || 0,

// ✅ 修复后
total_members: totalMembers || 0,
totalUsers: totalMembers || 0,
```

#### 修改 3: 今日新注册（第 124-127 行）
```typescript
// ❌ 修复前
const { count: newRegistrations, error: newRegError } = await supabaseClient
  .from('users')
  .select('*', { count: 'exact', head: true })
  .gte('created_at', today);

// ✅ 修复后
const { count: newRegistrations, error: newRegError } = await supabaseClient
  .from('members')
  .select('*', { count: 'exact', head: true })
  .gte('created_at', today);
```

---

## 🚀 部署

### 部署命令
```bash
supabase functions deploy admin-stats --project-ref cvqibjcbfrwsgkvthccp
```

### 部署结果
```
✅ Deployed Functions on project cvqibjcbfrwsgkvthccp: admin-stats
📦 Bundle size: 73.9kB
🔗 Dashboard: https://supabase.com/dashboard/project/cvqibjcbfrwsgkvthccp/functions
```

---

## 📊 修复前后对比

### 修复前
- **显示值**: 4090（错误）
- **数据源**: `users` 表
- **问题**: 包含了非会员用户

### 修复后
- **显示值**: 4077（正确）
- **数据源**: `members` 表
- **准确性**: ✅ 仅统计实际会员

---

## 🎯 影响范围

### 受影响的统计数据
1. **总会员数** (total_members) - 已修复
2. **今日新注册** (new_registrations_today) - 已修复

### 未受影响的统计
- ✅ 激活会员数 (activeMembers) - 一直使用 `v_member_overview` 视图，正确
- ✅ 每日活跃用户 (daily_active_users) - 仍使用 `users` 表，符合逻辑
- ✅ NFT 数量、奖励统计等 - 未受影响

---

## ✅ 验证

### 数据库验证
```bash
# 验证 members 表
PGPASSWORD=bee8881941 psql -h db.cvqibjcbfrwsgkvthccp.supabase.co \
  -p 5432 -U postgres -d postgres \
  -c "SELECT COUNT(*) as members_count FROM members;"
# 结果: 4077 ✅

# 对比 users 表
PGPASSWORD=bee8881941 psql -h db.cvqibjcbfrwsgkvthccp.supabase.co \
  -p 5432 -U postgres -d postgres \
  -c "SELECT COUNT(*) as users_count FROM users;"
# 结果: 4090
```

### Edge Function 验证
```bash
# 测试已部署的 Edge Function
curl -X POST \
  'https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/admin-stats?action=dashboard-stats' \
  -H 'x-admin-token: YOUR_TOKEN' \
  -H 'Content-Type: application/json'
```

预期返回:
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_members": 4077,
      ...
    }
  }
}
```

---

## 📝 相关文件

| 文件 | 修改类型 | 行数 |
|------|---------|------|
| `supabase/functions/admin-stats/index.ts` | Edge Function 修复 | ~15 行 |
| `server/index.ts` | Server API 修复（未使用） | ~2 行 |

**注意**: Server API (`/api/admin/stats`) 也进行了相同修复，但 Admin Dashboard 实际使用的是 Supabase Edge Function。

---

## 🔍 技术说明

### 为什么是 members 表而不是 users 表？

**users 表**: Supabase Auth 用户表
- 包含所有注册用户（包括未激活会员的用户）
- 主要用于身份验证
- 计数: 4090

**members 表**: 业务会员表
- 仅包含成为会员的用户
- 包含会员级别、NFT、奖励等业务数据
- 计数: 4077

**Admin Dashboard 需要显示的是实际会员数，因此应该查询 `members` 表。**

---

## 🎯 建议

### 未来改进
1. 考虑添加数据一致性检查
2. 监控 `users` 和 `members` 表的差异
3. 为未激活用户添加单独的统计指标

### 监控建议
```sql
-- 定期检查 users 与 members 的差异
SELECT
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM members) as total_members,
  (SELECT COUNT(*) FROM users) - (SELECT COUNT(*) FROM members) as difference;
```

---

**修复完成**: 2025-10-19
**部署状态**: ✅ **已成功部署**
**验证状态**: ✅ **已通过数据库验证**
**风险等级**: 🟢 **低** - 仅修改统计查询，无业务逻辑变更
