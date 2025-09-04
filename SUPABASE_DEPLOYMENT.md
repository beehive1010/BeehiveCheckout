# Supabase 矩阵系统部署指南

## 📋 部署概述

此文档提供了将3×3强制矩阵系统部署到Supabase的完整指南。

## 🔧 部署步骤

### 1. 准备工作

确保您有：
- Supabase项目访问权限
- 数据库管理员权限
- 现有的基础表结构（users, members, referrals等）

### 2. 执行数据库迁移

按以下顺序执行SQL文件：

#### 步骤 2.1: 基础矩阵系统修复
```bash
# 在Supabase SQL编辑器中执行
cat supabase/migrations/20240904_matrix_system_fixes.sql
```

#### 步骤 2.2: 矩阵触发器和函数
```bash
# 在Supabase SQL编辑器中执行
cat supabase/migrations/20240904_matrix_triggers.sql
```

#### 步骤 2.3: 字段名修正（重要！）
```bash
# 修正PostgreSQL保留字和字段名问题
cat supabase/migrations/20240904_matrix_fixes_corrected.sql
```

### 3. 验证部署

执行以下查询验证部署成功：

```sql
-- 1. 检查函数是否创建成功
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%matrix%';

-- 2. 检查触发器是否激活
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- 3. 检查视图是否可用
SELECT * FROM matrix_overview LIMIT 5;

-- 4. 测试矩阵放置函数
SELECT * FROM auto_place_user('0x1234...', '0x5678...') LIMIT 1;
```

## 🎯 核心功能

### 自动矩阵放置
```sql
-- 自动将用户放置到推荐者矩阵中
SELECT * FROM auto_place_user(
    '用户钱包地址', 
    '推荐者钱包地址'
);
```

### 获取团队统计
```sql
-- 获取推荐者的团队统计信息
SELECT * FROM get_team_statistics('推荐者钱包地址');
```

### 获取矩阵树结构
```sql
-- 获取矩阵树结构（最多5层）
SELECT * FROM get_matrix_tree('推荐者钱包地址', 5);
```

### 获取层级成员详情
```sql
-- 获取特定层级的成员详细信息
SELECT * FROM get_layer_members_detailed('推荐者钱包地址', 1);
```

## 🔄 矩阵逻辑说明

### 放置优先级
1. **Layer 1 直接推荐**: 优先放置到推荐者的第一层
2. **L → M → R 顺序**: 每层按左、中、右的顺序填充
3. **自动滑落**: Layer 1满员后自动滑落到下层空位

### 触发器自动化
- **团队统计更新**: 新成员加入时自动更新team_size和direct_referrals
- **层级限制验证**: 防止跳层放置和重复位置
- **活动日志记录**: 所有矩阵操作都会记录到activity_log

## ⚠️ 重要注意事项

### 字段名映射
- `users.current_level` → 用户当前级别（基础信息）
- `members.is_activated` → 会员激活状态
- `members.current_level` → 会员级别（权威数据）
- `referrals."position"` → 矩阵位置（PostgreSQL保留字，需要引号）

### 数据完整性
- 所有矩阵操作通过函数执行，确保数据一致性
- 触发器自动维护统计数据
- 行级安全策略控制数据访问权限

## 🧪 测试用例

### 测试矩阵放置
```sql
-- 测试案例1：直接推荐
SELECT * FROM auto_place_user('0xmember1', '0xroot1');

-- 测试案例2：滑落放置
-- 先填满Layer 1
SELECT * FROM auto_place_user('0xmember1', '0xroot1'); -- L位置
SELECT * FROM auto_place_user('0xmember2', '0xroot1'); -- M位置  
SELECT * FROM auto_place_user('0xmember3', '0xroot1'); -- R位置
-- 下一个用户应该滑落到Layer 2
SELECT * FROM auto_place_user('0xmember4', '0xroot1'); -- 滑落到Layer 2
```

### 验证统计准确性
```sql
-- 验证团队统计
SELECT 
    root_wallet,
    (SELECT COUNT(*) FROM referrals WHERE root_wallet = '0xroot1' AND is_active = true) as expected_total,
    (SELECT COUNT(*) FROM referrals WHERE root_wallet = '0xroot1' AND layer = 1 AND is_active = true) as expected_direct
FROM get_team_statistics('0xroot1');
```

## 🚀 性能优化

已创建的索引：
- `idx_referrals_root_layer`: 加速根据root_wallet和layer查询
- `idx_referrals_member`: 加速成员查询
- `idx_referrals_parent`: 加速父级查询
- `idx_referrals_active`: 加速活跃成员查询

## 📊 监控和维护

### 活动日志查询
```sql
-- 查看最近的矩阵活动
SELECT * FROM matrix_activity_log 
WHERE root_wallet = '推荐者钱包地址' 
ORDER BY created_at DESC 
LIMIT 20;
```

### 完整性检查
```sql
-- 检查矩阵完整性
SELECT 
    layer,
    COUNT(*) as member_count,
    power(3, layer) as max_capacity,
    (COUNT(*) <= power(3, layer)) as within_capacity
FROM referrals 
WHERE root_wallet = '推荐者钱包地址' 
AND is_active = true
GROUP BY layer
ORDER BY layer;
```

## 🔐 安全配置

### 行级安全策略（RLS）
```sql
-- 为matrix_activity_log启用RLS
ALTER TABLE matrix_activity_log ENABLE ROW LEVEL SECURITY;

-- 创建访问策略
CREATE POLICY "Users can view their matrix logs" ON matrix_activity_log
FOR SELECT USING (
    auth.uid() IN (
        SELECT id FROM auth.users 
        WHERE raw_user_meta_data->>'wallet_address' IN (root_wallet, member_wallet)
    )
);
```

## 📞 故障排除

### 常见错误

1. **"column does not exist"**
   - 确保执行了字段名修正脚本
   - 检查字段映射是否正确

2. **"syntax error at or near 'position'"**
   - PostgreSQL保留字问题
   - 确保使用引号: `"position"`

3. **"function does not exist"**
   - 检查函数权限：`GRANT EXECUTE TO authenticated`
   - 验证函数创建成功

### 回滚程序
```sql
-- 如需回滚，删除创建的函数和触发器
DROP FUNCTION IF EXISTS auto_place_user CASCADE;
DROP FUNCTION IF EXISTS get_team_statistics CASCADE;
DROP FUNCTION IF EXISTS get_matrix_tree CASCADE;
DROP FUNCTION IF EXISTS find_next_matrix_position CASCADE;
DROP TRIGGER IF EXISTS trigger_update_team_stats ON referrals;
DROP VIEW IF EXISTS matrix_overview CASCADE;
```

## ✅ 部署检查清单

- [ ] 执行基础矩阵系统修复脚本
- [ ] 执行矩阵触发器脚本  
- [ ] 执行字段名修正脚本
- [ ] 验证所有函数创建成功
- [ ] 验证触发器激活
- [ ] 测试矩阵放置功能
- [ ] 验证统计数据准确性
- [ ] 配置访问权限
- [ ] 设置行级安全策略
- [ ] 执行性能测试

完成所有步骤后，您的3×3强制矩阵系统就可以在Supabase中正常运行了！