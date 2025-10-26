# 数据库清理报告
**Date**: 2025-10-27
**Task**: Matrix Branch-First BFS修复完成后的清理工作

---

## ✅ 已完成的工作总结

### 1. 数据修复
- ✅ 诊断发现14,167条违反Branch-First BFS规则的记录
- ✅ 成功修复全部14,167条记录
- ✅ 验证修复后0违规
- ✅ 测试新函数：20个随机占位，0违规

### 2. 函数修复
- ✅ 创建并部署 `fn_place_member_branch_bfs_fixed`
- ✅ 替换旧的 `fn_place_member_branch_bfs` 为修复版
- ✅ 旧版本重命名为 `fn_place_member_branch_bfs_old` (已备份)

### 3. 视图创建
- ✅ `v_matrix_layer_statistics` - 每层L/M/R slot统计
- ✅ `v_referral_statistics` - 推荐统计（直推、滑落、团队）
- ✅ `v_matrix_tree_19_layers` - 19层矩阵树视图（供前端使用）

### 4. 文件归档
- ✅ 已归档105个文件到 `archive/2025-10-27-matrix-fix/`
  - 52个SQL脚本
  - 53个Markdown文档

---

## 🗑️ 需要清理的数据库对象

### 临时表（可安全删除）
这些临时表在事务中创建，应该已经自动删除，但可以检查确认：
```sql
-- 检查是否还有临时表残留
SELECT tablename
FROM pg_tables
WHERE schemaname = 'pg_temp%'
AND tablename LIKE 'temp_%';

-- 如果有残留，可以删除（通常不需要，临时表在会话结束后自动删除）
```

### 旧的/弃用的函数（建议保留备份，然后删除）

#### 矩阵占位相关函数（有大量重复和废弃函数）
**待确认是否还在使用，然后考虑删除：**
```sql
-- 查看所有placement相关函数
\df *place*

-- 建议删除的函数（与新的Branch-First BFS重复）：
DROP FUNCTION IF EXISTS fn_place_member_branch_bfs_old(VARCHAR, VARCHAR, TIMESTAMP, VARCHAR);
DROP FUNCTION IF EXISTS place_member_in_matrix_recursive(TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS place_member_in_matrix_recursive_v2(TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS place_member_in_recursive_matrix(VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS place_member_in_single_matrix(VARCHAR, VARCHAR, INTEGER);
DROP FUNCTION IF EXISTS place_member_in_single_matrix_bfs(VARCHAR, VARCHAR, INTEGER);
DROP FUNCTION IF EXISTS place_member_in_single_matrix_fixed_layer(VARCHAR, VARCHAR, INTEGER);
DROP FUNCTION IF EXISTS place_member_in_single_matrix_gen_v3(VARCHAR, VARCHAR, INTEGER);
DROP FUNCTION IF EXISTS place_member_in_single_matrix_generation(VARCHAR, VARCHAR, INTEGER);
DROP FUNCTION IF EXISTS place_member_matrix_complete(VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS place_member_recursive_generation_based(VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS place_member_referrer_depth_logic(TEXT, TEXT);
DROP FUNCTION IF EXISTS place_member_spillover(VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS place_member_spillover_safe(VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS place_member_with_spillover(VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS place_new_member_in_matrix_correct(TEXT, TEXT);
DROP FUNCTION IF EXISTS simple_matrix_placement(VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS simple_place_orphaned_members();
DROP FUNCTION IF EXISTS fn_simple_spillover_place(VARCHAR, VARCHAR);
```

#### 保留的核心函数（正在使用）：
```sql
-- 这些函数应该保留：
-- ✅ fn_place_member_branch_bfs (新修复的版本)
-- ✅ batch_place_member_in_matrices
-- ✅ resume_placement_for_member
-- ✅ fn_manual_place_member
-- ✅ recursive_matrix_placement
-- ✅ unified_matrix_placement
```

### 触发器（需要检查是否正确配置）
```sql
-- 检查触发器
\dft

-- 应该存在的触发器：
-- ✅ trg_validate_matrix_placement (已重新启用)
-- ✅ fn_trigger_auto_place_in_matrix
-- ✅ trigger_recursive_matrix_placement (如果还在使用)
```

### 旧的/弃用的视图
```sql
-- 查看所有视图
\dv

-- 检查这些视图是否还在使用，如果不用则删除：
-- (需要您确认哪些视图已经废弃)
```

---

## 📊 数据库健康检查

### 1. Matrix Referrals表健康检查
```sql
-- 总记录数
SELECT COUNT(*) AS total_records FROM matrix_referrals;

-- 按层级统计
SELECT layer, COUNT(*) AS count
FROM matrix_referrals
GROUP BY layer
ORDER BY layer;

-- 检查是否还有违规（应该是0）
-- (使用diagnose_all_matrix_placements_v2.sql中的查询)
```

### 2. 索引健康检查
```sql
-- 检查matrix_referrals表的索引
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'matrix_referrals';

-- 应该存在的关键索引：
-- ✅ idx_matrix_parent_slot (UNIQUE)
-- ✅ idx_matrix_referrals_root_layer
-- ✅ idx_matrix_referrals_member
-- ✅ idx_matrix_unique_placement
```

### 3. 视图使用情况检查
```sql
-- 检查新创建的视图是否可以正常查询
SELECT COUNT(*) FROM v_matrix_layer_statistics;
SELECT COUNT(*) FROM v_referral_statistics;
SELECT COUNT(*) FROM v_matrix_tree_19_layers;
```

---

## 🔧 建议的清理步骤

### Step 1: 备份数据库
```bash
pg_dump -h db.cvqibjcbfrwsgkvthccp.supabase.co -U postgres -d postgres > backup_before_cleanup_$(date +%Y%m%d).sql
```

### Step 2: 删除废弃函数
在确认不再使用后，执行：
```sql
-- 创建清理脚本
-- (见下面的cleanup_deprecated_functions.sql)
```

### Step 3: 清理旧视图
```sql
-- 确认后删除不再使用的视图
```

### Step 4: 验证清理结果
```sql
-- 确保核心功能正常
SELECT fn_place_member_branch_bfs(
    'test_wallet_1',
    'test_wallet_root',
    NOW(),
    'test_tx'
);

-- 确保视图正常
SELECT * FROM v_matrix_tree_19_layers LIMIT 10;
```

---

## 📦 归档文件清单

### SQL Scripts (52 files)
- fix_all_matrix_placements.sql
- fix_all_matrix_placements_optimized.sql
- fix_fftt4_matrix_placement.sql
- diagnose_all_matrix_placements.sql
- diagnose_all_matrix_placements_v2.sql
- test_branch_bfs_20_placements.sql
- create_matrix_views.sql
- fn_place_member_branch_bfs_current.sql
- fn_place_member_branch_bfs_fixed.sql
- ... (及其他48个文件)

### Documentation (53 files)
- MATRIX_PLACEMENT_VERIFICATION_REPORT.md
- FFTT4_MATRIX_PLACEMENT_ANALYSIS.md
- ADMIN_MATRIX_TREE_COMPONENT.md
- ALL_LEVELS_UPGRADE_FIX_COMPLETE_REPORT.md
- BCC_RELEASE_FIX_COMPLETE_SUMMARY.md
- ... (及其他48个文件)

---

## 🎯 下一步行动

1. **Review** - 检查归档的文件是否都已备份
2. **Test** - 在staging环境测试新的函数和视图
3. **Deploy** - 确认无误后，可以开始清理废弃对象
4. **Monitor** - 监控清理后的性能和数据完整性

---

## ⚠️ 注意事项

1. **不要删除 `matrix_referrals` 表** - 这是核心数据表，已经修复
2. **保留 `fn_place_member_branch_bfs_old`** - 作为备份，至少保留1周
3. **逐步清理** - 先删除明显废弃的函数，观察1-2天后再继续
4. **保持归档** - archive目录应该永久保留作为历史记录

---

**Report Generated**: 2025-10-27
**Status**: Ready for Review and Cleanup
