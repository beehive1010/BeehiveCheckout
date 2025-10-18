# BCC释放逻辑修复总结 - 双等级释放机制

**修复日期**: 2025-10-17
**修复目的**: 修复Level升级时BCC释放逻辑，确保释放前一等级和当前等级的BCC

---

## 问题分析

### 当前错误逻辑
当前的 `unlock_bcc_on_level_upgrade` 触发器在升级时**只释放前一个等级的BCC**。

**示例问题**：
- Level 18 → Level 19升级
  - ❌ 当前：只释放 **950 BCC** (Level 18的BCC)
  - ✅ 应该：释放 **950 BCC (Level 18) + 1000 BCC (Level 19) = 1950 BCC**

### 根本原因
`supabase/migrations/20251010000000_fix_bcc_unlock_trigger_logic.sql` 中的逻辑只计算并释放了前一个等级的BCC：

```sql
-- 错误的逻辑
IF OLD.current_level = 0 THEN
    v_unlock_amount := 100;  -- Level 1
ELSE
    v_unlock_amount := (OLD.current_level - 1) * 50 + 100;  -- 只有前一等级
END IF;
```

---

## 修复方案

### 新的双等级释放逻辑
修改触发器，在升级时**同时释放前一等级和当前等级的BCC**。

**修复后的逻辑**：
```sql
-- Level 1激活 (0→1): 只释放Level 1的BCC
IF OLD.current_level = 0 THEN
    v_total_unlock_amount := 100;  -- Level 1 BCC
ELSE
    -- Level 2+ 升级: 释放前一等级BCC + 当前等级BCC
    v_previous_level_bcc := (OLD.current_level - 1) * 50 + 100;
    v_current_level_bcc := (NEW.current_level - 1) * 50 + 100;
    v_total_unlock_amount := v_previous_level_bcc + v_current_level_bcc;
END IF;
```

---

## BCC释放金额表

### 每个等级升级时的BCC释放明细

| 升级场景 | 前一等级BCC | 当前等级BCC | 总释放BCC | 说明 |
|---------|------------|------------|-----------|------|
| **Level 1激活** (0→1) | 0 | 100 | **100** | 首次激活只释放Level 1 |
| **Level 1→2** | 100 | 150 | **250** | 释放Level 1 + Level 2 |
| **Level 2→3** | 150 | 200 | **350** | 释放Level 2 + Level 3 |
| **Level 3→4** | 200 | 250 | **450** | 释放Level 3 + Level 4 |
| **Level 4→5** | 250 | 300 | **550** | 释放Level 4 + Level 5 |
| **Level 5→6** | 300 | 350 | **650** | 释放Level 5 + Level 6 |
| **Level 6→7** | 350 | 400 | **750** | 释放Level 6 + Level 7 |
| **Level 7→8** | 400 | 450 | **850** | 释放Level 7 + Level 8 |
| **Level 8→9** | 450 | 500 | **950** | 释放Level 8 + Level 9 |
| **Level 9→10** | 500 | 550 | **1050** | 释放Level 9 + Level 10 |
| **Level 10→11** | 550 | 600 | **1150** | 释放Level 10 + Level 11 |
| **Level 11→12** | 600 | 650 | **1250** | 释放Level 11 + Level 12 |
| **Level 12→13** | 650 | 700 | **1350** | 释放Level 12 + Level 13 |
| **Level 13→14** | 700 | 750 | **1450** | 释放Level 13 + Level 14 |
| **Level 14→15** | 750 | 800 | **1550** | 释放Level 14 + Level 15 |
| **Level 15→16** | 800 | 850 | **1650** | 释放Level 15 + Level 16 |
| **Level 16→17** | 850 | 900 | **1750** | 释放Level 16 + Level 17 |
| **Level 17→18** | 900 | 950 | **1850** | 释放Level 17 + Level 18 |
| **Level 18→19** | 950 | 1000 | **1950** | 释放Level 18 + Level 19 |

---

## 关键场景验证

### Level 18 → Level 19 升级

**计算过程**：
```
前一等级 (Level 18) BCC = (18 - 1) × 50 + 100 = 950 BCC
当前等级 (Level 19) BCC = (19 - 1) × 50 + 100 = 1000 BCC
总释放 = 950 + 1000 = 1950 BCC ✅
```

**数据库日志示例**：
```
Level 18→19 upgrade: Released Level 18 BCC (950) + Level 19 BCC (1000) = 1950 BCC total
```

---

## 实施步骤

### 1. 应用迁移文件

**文件位置**: `supabase/migrations/20251017000000_fix_bcc_release_both_levels.sql`

**执行命令**：
```bash
# 使用Supabase CLI
supabase db push

# 或直接连接数据库执行
psql "$DATABASE_URL" -f supabase/migrations/20251017000000_fix_bcc_release_both_levels.sql
```

### 2. 运行测试验证

**测试文件**: `test_bcc_release_fix.sql`

**执行测试**：
```bash
psql "$DATABASE_URL" -f test_bcc_release_fix.sql
```

**验证检查点**：
- ✅ Level 1激活释放 100 BCC
- ✅ Level 1→2 释放 250 BCC (100 + 150)
- ✅ Level 18→19 释放 1950 BCC (950 + 1000)
- ✅ Trigger成功重建
- ✅ 日志记录完整（包含previous_level_bcc和current_level_bcc）

---

## 修复影响

### 触发器修改
- **函数**: `unlock_bcc_on_level_upgrade()`
- **触发器**: `trigger_unlock_bcc_on_level_upgrade`
- **触发时机**: `AFTER UPDATE OF current_level ON members`

### 受影响的表
- `user_balances`: 更新 `bcc_balance`, `bcc_locked`, `bcc_total_unlocked`
- `audit_logs`: 记录BCC释放详情

### 审计日志字段
新增日志字段：
```json
{
  "total_unlocked_amount": 1950,
  "previous_level_bcc": 950,
  "current_level_bcc": 1000,
  "old_level": 18,
  "new_level": 19,
  "note": "Level 18→19 upgrade: Released Level 18 BCC (950) + Level 19 BCC (1000) = 1950 BCC total"
}
```

---

## 代码位置

### 修复文件
- **迁移文件**: `/supabase/migrations/20251017000000_fix_bcc_release_both_levels.sql`
- **测试文件**: `/test_bcc_release_fix.sql`

### 相关代码
- **level-upgrade函数**: `supabase/functions/level-upgrade/index.ts:788-790`
  - 注释确认BCC释放由数据库触发器处理
- **旧迁移文件**（已被本次修复替代）:
  - `20251010000000_fix_bcc_unlock_trigger_logic.sql` (错误逻辑)

---

## 数学公式总结

### 单个等级的BCC金额
```
Level N的BCC = (N - 1) × 50 + 100
```

**示例**：
- Level 1: (1-1) × 50 + 100 = 100 BCC
- Level 18: (18-1) × 50 + 100 = 950 BCC
- Level 19: (19-1) × 50 + 100 = 1000 BCC

### 升级时的总释放BCC

**Level 1激活** (0→1):
```
总释放 = 100 BCC
```

**Level N升级** (N-1 → N, 其中 N ≥ 2):
```
总释放 = Level(N-1)的BCC + Level N的BCC
      = [(N-2) × 50 + 100] + [(N-1) × 50 + 100]
      = (N-2) × 50 + (N-1) × 50 + 200
      = (2N - 3) × 50 + 200
```

**Level 18→19示例**：
```
总释放 = (2×19 - 3) × 50 + 200
      = 35 × 50 + 200
      = 1750 + 200
      = 1950 BCC ✅
```

---

## 验证清单

执行修复后，请验证以下项目：

- [ ] 迁移文件已成功应用
- [ ] 触发器 `trigger_unlock_bcc_on_level_upgrade` 已重建
- [ ] 测试SQL执行无错误
- [ ] Level 18→19 升级测试释放 1950 BCC
- [ ] Level 1→2 升级测试释放 250 BCC
- [ ] Audit logs记录包含 `previous_level_bcc` 和 `current_level_bcc`
- [ ] 前端显示的BCC余额正确更新

---

## 后续行动

1. **生产环境部署前**：
   - 在测试环境验证修复
   - 备份当前 `user_balances` 表
   - 记录当前所有用户的 `bcc_total_unlocked` 值

2. **部署后监控**：
   - 监控 `audit_logs` 中的 `bcc_unlocked_level_upgrade` 事件
   - 验证新升级用户的BCC释放金额正确
   - 检查是否有异常的BCC余额变化

3. **历史数据修正**（如需要）：
   - 如果已有用户受旧逻辑影响，需要计算并补发缺失的BCC
   - 创建数据修正迁移文件

---

## 总结

✅ **修复完成**：BCC释放逻辑已修复为双等级释放机制
✅ **Level 18→19**：现在正确释放 950 + 1000 = **1950 BCC**
✅ **所有等级**：升级时释放前一等级和当前等级的BCC
✅ **日志完整**：审计日志记录详细的释放金额明细

**影响范围**: 所有Level 2-19的升级BCC释放金额
**修复文件**: `20251017000000_fix_bcc_release_both_levels.sql`
**测试文件**: `test_bcc_release_fix.sql`
