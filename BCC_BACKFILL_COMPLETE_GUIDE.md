# BCC补发完整指南 - 修复历史升级缺失的BCC

**创建日期**: 2025-10-17
**目的**: 为所有在旧逻辑下升级的用户补发缺失的当前等级BCC

---

## 问题背景

### 旧逻辑的问题
在修复之前，`unlock_bcc_on_level_upgrade` 触发器只释放**前一个等级的BCC**，导致用户缺少**当前等级的BCC**。

**示例影响**：
| 用户当前等级 | 旧逻辑已释放 | 应该释放 | 缺失金额 |
|-------------|-------------|---------|---------|
| Level 2 | 100 BCC (Level 1) | 100 + 150 = 250 BCC | **缺150 BCC** |
| Level 3 | 100 + 150 = 250 BCC | 100 + 150 + 200 = 450 BCC | **缺200 BCC** |
| Level 18 | ... | ... | **缺950 BCC** |
| Level 19 | ... | ... | **缺1000 BCC** |

### 影响范围
- **受影响用户**: 所有当前等级为 Level 2-19 的用户
- **不受影响**: Level 1 用户（首次激活逻辑是正确的）
- **缺失金额**: 等于用户当前等级的BCC金额

---

## 修复方案概览

### 两步修复策略

#### 第一步：修复触发器逻辑
**文件**: `20251017000000_fix_bcc_release_both_levels.sql`
**作用**: 修复未来升级的BCC释放逻辑
**效果**: 新升级的用户将正确获得双倍BCC释放

#### 第二步：补发历史缺失BCC
**文件**: `20251017000001_backfill_missing_bcc_releases.sql`
**作用**: 为已升级用户补发缺失的BCC
**效果**: 所有Level 2-19用户获得应得的BCC

---

## 补发BCC金额表

### 按等级的补发金额

| 当前等级 | 缺失的BCC金额 | 说明 |
|---------|--------------|------|
| Level 1 | 0 | 无需补发（激活逻辑正确） |
| Level 2 | **150** | Level 2的BCC |
| Level 3 | **200** | Level 3的BCC |
| Level 4 | **250** | Level 4的BCC |
| Level 5 | **300** | Level 5的BCC |
| Level 6 | **350** | Level 6的BCC |
| Level 7 | **400** | Level 7的BCC |
| Level 8 | **450** | Level 8的BCC |
| Level 9 | **500** | Level 9的BCC |
| Level 10 | **550** | Level 10的BCC |
| Level 11 | **600** | Level 11的BCC |
| Level 12 | **650** | Level 12的BCC |
| Level 13 | **700** | Level 13的BCC |
| Level 14 | **750** | Level 14的BCC |
| Level 15 | **800** | Level 15的BCC |
| Level 16 | **850** | Level 16的BCC |
| Level 17 | **900** | Level 17的BCC |
| Level 18 | **950** | Level 18的BCC |
| Level 19 | **1000** | Level 19的BCC |

### 补发金额计算公式
```
补发金额 = (当前等级 - 1) × 50 + 100
```

**示例**：
- Level 2: (2-1) × 50 + 100 = **150 BCC**
- Level 19: (19-1) × 50 + 100 = **1000 BCC**

---

## 实施步骤

### 步骤1: 应用触发器修复（必须先执行）

```bash
# 使用Supabase CLI
supabase db push

# 或直接执行迁移
psql "$DATABASE_URL" -f supabase/migrations/20251017000000_fix_bcc_release_both_levels.sql
```

**验证触发器修复**：
```sql
-- 检查触发器是否存在
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'trigger_unlock_bcc_on_level_upgrade';
```

### 步骤2: 执行BCC补发

```bash
# 执行补发迁移
psql "$DATABASE_URL" -f supabase/migrations/20251017000001_backfill_missing_bcc_releases.sql
```

**迁移执行时会显示**：
```
==============================================
  BCC Backfill Summary
==============================================

Total users to backfill: XXX
Total missing BCC to release: XXXXX BCC

Users by level:
  Level 2 users: XX (150 BCC each)
  Level 19 users: XX (1000 BCC each)
```

### 步骤3: 验证补发结果

```bash
# 运行验证脚本
psql "$DATABASE_URL" -f verify_bcc_backfill.sql
```

**验证检查点**：
- ✅ 所有Level 2用户收到150 BCC
- ✅ 所有Level 19用户收到1000 BCC
- ✅ 用户余额正确更新
- ✅ audit_logs记录完整
- ✅ 无重复补发

---

## 补发逻辑详解

### SQL逻辑流程

```sql
-- 1. 识别需要补发的用户
SELECT wallet_address, current_level
FROM members
WHERE current_level >= 2 AND current_level <= 19

-- 2. 计算每个用户的缺失BCC
-- 缺失金额 = 当前等级的BCC金额
missing_bcc = (current_level - 1) * 50 + 100

-- 3. 更新用户余额
UPDATE user_balances
SET
  bcc_balance = bcc_balance + missing_bcc,
  bcc_locked = bcc_locked - missing_bcc,
  bcc_total_unlocked = bcc_total_unlocked + missing_bcc
```

### 示例：Level 19用户

**补发前状态**（假设）：
```
current_level: 19
bcc_balance: 9450
bcc_locked: 1000
bcc_total_unlocked: 9450
```

**缺失金额计算**：
```
Level 19 BCC = (19 - 1) × 50 + 100 = 1000 BCC
```

**补发后状态**：
```
current_level: 19
bcc_balance: 10450 (+1000)
bcc_locked: 0 (-1000)
bcc_total_unlocked: 10450 (+1000)
```

---

## 审计日志

### 补发记录格式

每次补发都会在 `audit_logs` 表中创建记录：

```json
{
  "action": "bcc_backfill_missing_level_release",
  "user_wallet": "0x...",
  "old_values": {
    "current_level": 19,
    "old_bcc_balance": 9450,
    "old_bcc_locked": 1000,
    "old_total_unlocked": 9450,
    "reason": "Missing current level BCC from old release logic"
  },
  "new_values": {
    "missing_bcc_amount": 1000,
    "new_bcc_balance": 10450,
    "new_bcc_locked": 0,
    "new_total_unlocked": 10450,
    "backfill_date": "2025-10-17T...",
    "note": "Backfilling Level 19 BCC (1000) - was missing from upgrade"
  }
}
```

### 查询补发记录

```sql
-- 查看所有补发记录
SELECT
    user_wallet,
    (old_values->>'current_level')::INTEGER as level,
    (new_values->>'missing_bcc_amount')::INTEGER as bcc_added,
    created_at
FROM audit_logs
WHERE action = 'bcc_backfill_missing_level_release'
ORDER BY created_at DESC;

-- 按等级统计
SELECT
    (old_values->>'current_level')::INTEGER as level,
    COUNT(*) as user_count,
    SUM((new_values->>'missing_bcc_amount')::INTEGER) as total_bcc
FROM audit_logs
WHERE action = 'bcc_backfill_missing_level_release'
GROUP BY (old_values->>'current_level')::INTEGER
ORDER BY level;
```

---

## 验证清单

执行补发后，请验证以下项目：

### 数据库层面
- [ ] 迁移文件成功执行无错误
- [ ] audit_logs中包含所有补发记录
- [ ] 无用户被重复补发
- [ ] user_balances表中的余额正确更新

### 功能层面
- [ ] Level 2用户余额增加150 BCC
- [ ] Level 19用户余额增加1000 BCC
- [ ] bcc_locked正确减少
- [ ] bcc_total_unlocked正确增加

### 前端显示
- [ ] 用户BCC余额在前端正确显示
- [ ] 余额变动历史可查询
- [ ] 无异常报错

---

## 补发统计示例

### 预期统计数据

假设有以下用户分布：
```
Level 2:  50 users × 150 BCC  = 7,500 BCC
Level 3:  40 users × 200 BCC  = 8,000 BCC
Level 4:  30 users × 250 BCC  = 7,500 BCC
...
Level 18: 5 users × 950 BCC   = 4,750 BCC
Level 19: 3 users × 1000 BCC  = 3,000 BCC
----------------------------------------
Total:    XXX users           XX,XXX BCC
```

### 验证查询

```sql
-- 总补发统计
SELECT
    COUNT(*) as total_users,
    SUM((new_values->>'missing_bcc_amount')::INTEGER) as total_bcc_released
FROM audit_logs
WHERE action = 'bcc_backfill_missing_level_release';
```

---

## 常见问题 (FAQ)

### Q1: 为什么Level 1用户不需要补发？
**A**: Level 1激活时的BCC释放逻辑是正确的（只释放Level 1的100 BCC），因此无需补发。

### Q2: 如果用户在补发期间升级会怎样？
**A**: 补发迁移会基于执行时的 `current_level` 进行补发。如果用户在补发后升级，新的触发器逻辑会正确释放BCC。

### Q3: 补发会影响 bcc_locked 吗？
**A**: 是的，补发的BCC从 `bcc_locked` 转移到 `bcc_balance`，就像正常的BCC释放一样。

### Q4: 如何确认某个用户是否已补发？
**A**: 查询 audit_logs:
```sql
SELECT *
FROM audit_logs
WHERE user_wallet = '0x...'
  AND action = 'bcc_backfill_missing_level_release';
```

### Q5: 补发可以重复执行吗？
**A**: 理论上可以，但会导致重复补发。建议只执行一次，并通过 audit_logs 验证。

---

## 回滚方案（如需要）

如果需要回滚补发操作：

```sql
-- 创建回滚脚本
WITH backfill_records AS (
    SELECT
        user_wallet,
        (new_values->>'missing_bcc_amount')::INTEGER as amount_to_remove
    FROM audit_logs
    WHERE action = 'bcc_backfill_missing_level_release'
)
UPDATE user_balances ub
SET
    bcc_balance = ub.bcc_balance - br.amount_to_remove,
    bcc_locked = ub.bcc_locked + br.amount_to_remove,
    bcc_total_unlocked = ub.bcc_total_unlocked - br.amount_to_remove,
    last_updated = NOW()
FROM backfill_records br
WHERE ub.wallet_address = br.user_wallet;

-- 记录回滚操作
INSERT INTO audit_logs (user_wallet, action, new_values)
SELECT
    user_wallet,
    'bcc_backfill_rollback',
    json_build_object(
        'rolled_back_amount', (new_values->>'missing_bcc_amount')::INTEGER,
        'rollback_date', NOW()
    )
FROM audit_logs
WHERE action = 'bcc_backfill_missing_level_release';
```

---

## 相关文件

### 迁移文件
1. **`20251017000000_fix_bcc_release_both_levels.sql`**
   - 修复触发器逻辑（必须先执行）

2. **`20251017000001_backfill_missing_bcc_releases.sql`**
   - 补发历史缺失的BCC

### 验证和测试
3. **`verify_bcc_backfill.sql`**
   - 验证补发结果

4. **`test_bcc_release_fix.sql`**
   - 测试修复后的BCC释放逻辑

### 文档
5. **`BCC_RELEASE_BOTH_LEVELS_FIX_SUMMARY.md`**
   - 触发器修复总结

6. **`BCC_BACKFILL_COMPLETE_GUIDE.md`** (本文档)
   - 补发完整指南

---

## 执行时间线

### 建议执行顺序

1. **T+0分钟**: 应用触发器修复
   ```bash
   psql "$DATABASE_URL" -f 20251017000000_fix_bcc_release_both_levels.sql
   ```

2. **T+5分钟**: 验证触发器正常工作
   ```bash
   psql "$DATABASE_URL" -f test_bcc_release_fix.sql
   ```

3. **T+10分钟**: 执行BCC补发
   ```bash
   psql "$DATABASE_URL" -f 20251017000001_backfill_missing_bcc_releases.sql
   ```

4. **T+15分钟**: 验证补发结果
   ```bash
   psql "$DATABASE_URL" -f verify_bcc_backfill.sql
   ```

5. **T+20分钟**: 前端测试验证

---

## 监控和告警

### 补发后监控指标

1. **用户余额异常检测**
   ```sql
   -- 检查是否有负余额
   SELECT wallet_address, bcc_balance, bcc_locked
   FROM user_balances
   WHERE bcc_balance < 0 OR bcc_locked < 0;
   ```

2. **补发完整性检查**
   ```sql
   -- 确认所有Level 2-19用户都已补发
   SELECT m.current_level, COUNT(*) as users_without_backfill
   FROM members m
   LEFT JOIN audit_logs al
       ON m.wallet_address = al.user_wallet
       AND al.action = 'bcc_backfill_missing_level_release'
   WHERE m.current_level BETWEEN 2 AND 19
     AND al.user_wallet IS NULL
   GROUP BY m.current_level;
   ```

---

## 总结

### 修复成果

✅ **触发器修复**: 未来升级正确释放双倍BCC
✅ **历史补发**: 所有Level 2-19用户获得缺失的BCC
✅ **审计完整**: 所有操作记录在audit_logs
✅ **可追溯**: 每个用户的补发金额可查询验证

### 影响范围

- **用户层面**: 所有Level 2-19用户余额增加
- **系统层面**: BCC总量释放增加
- **前端显示**: 用户看到正确的BCC余额

### 长期保障

新的双等级释放机制确保：
- 所有未来升级正确释放BCC
- 用户获得完整的BCC奖励
- 系统逻辑符合设计预期

---

**文档版本**: 1.0
**最后更新**: 2025-10-17
**维护者**: BeehiveCheckout 开发团队
