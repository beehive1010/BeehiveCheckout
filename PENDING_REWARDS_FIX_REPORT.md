# Pending 奖励修复报告

## 修复时间
2025-10-10

## 问题描述
用户 `0x9aAF0ED38C24A1A51836ec1F67fF13731d7bE7e6` 的奖励仍显示为 pending，但该用户已经升到 Level 2，符合领取条件。

---

## 🔍 问题分析

### 发现的问题

**钱包 1**: `0x9aAF0ED38C24A1A51836ec1F67fF13731d7bE7e6`
- **当前等级**: Level 2 ✅
- **Pending 奖励**: 1 个，100 USDT
- **要求等级**: Level 2
- **状态**: 已符合条件但仍显示 pending ❌
- **距离过期**: 71.16 小时

**钱包 2**: `0x3C1FF5B4BE2A1FB8c157aF55aa6450eF66D7E242`
- **当前等级**: Level 2 ✅  
- **Pending 奖励**: 1 个，100 USDT
- **要求等级**: Level 2
- **状态**: 已符合条件但仍显示 pending ❌

### 根本原因

正如之前的分析报告 `LEVEL1_DIRECT_REWARD_ANALYSIS.md` 所述：

**系统缺少自动更新机制**：
- ❌ 没有在会员升级时检查其 pending 奖励的触发器
- ❌ 没有定期检查符合条件的 pending 奖励的 cron job
- ❌ 会员即使升级到符合条件，奖励仍保持 pending 状态
- ⏰ 72 小时后奖励过期并 rollup，导致会员失去应得奖励

---

## ✅ 已执行的修复

### 1. 手动修复受影响的钱包

**执行的 SQL**:
```sql
UPDATE layer_rewards lr
SET 
    status = 'claimable',
    recipient_current_level = m.current_level,
    expires_at = NULL
FROM members m
WHERE lr.reward_recipient_wallet = m.wallet_address
  AND lr.status = 'pending'
  AND lr.expires_at > NOW()
  AND m.current_level >= lr.recipient_required_level;
```

**修复结果**:

| 钱包 | 更新数量 | 金额 |
|------|---------|------|
| `0x9aAF...bE7e6` | 1 | 100 USDT |
| `0x3C1F...7E242` | 1 | 100 USDT |

**总计**: 2 个奖励，200 USDT

### 2. 停用相关的 Reward Timers

```sql
UPDATE reward_timers rt
SET is_active = false
WHERE rt.is_active = true
  AND EXISTS (
      SELECT 1 FROM layer_rewards lr
      WHERE lr.id = rt.reward_id
        AND lr.status = 'claimable'
  );
```

**结果**: 停用了 6 个 timer

### 3. 验证修复结果

**钱包 1** (`0x9aAF0ED38C24A1A51836ec1F67fF13731d7bE7e6`):
- Total rewards: 6
- Claimable: 6 ✅
- Pending: 0 ✅
- Total amount: 600 USDT

**钱包 2** (`0x3C1FF5B4BE2A1FB8c157aF55aa6450eF66D7E242`):
- Total rewards: 148
- Claimable: 4 ✅
- Pending: 0 ✅ (所有符合条件的都已更新)
- Total amount: 24000 USDT

**Balance 自动更新**:
- ✅ `0x9aAF0ED38C24A1A51836ec1F67fF13731d7bE7e6` balance +100 USDT
- ✅ `0x3C1FF5B4BE2A1FB8c157aF55aa6450eF66D7E242` balance +100 USDT

---

## 🔧 永久性修复方案

### 需要实施的改进

为了防止未来出现同样的问题，需要实施以下方案：

#### 方案 1: 添加成员升级触发器 ⭐ (推荐)

在 `trigger_level_upgrade_rewards()` 函数中添加自动检查逻辑：

```sql
CREATE OR REPLACE FUNCTION trigger_level_upgrade_rewards()
RETURNS TRIGGER
AS $$
DECLARE
    updated_rewards_count INTEGER := 0;
BEGIN
    IF NEW.current_level > OLD.current_level THEN
    
        -- ✅ NEW: 自动更新该会员的 pending 奖励
        UPDATE layer_rewards
        SET 
            status = 'claimable',
            recipient_current_level = NEW.current_level,
            expires_at = NULL
        WHERE reward_recipient_wallet = NEW.wallet_address
          AND status = 'pending'
          AND expires_at > NOW()
          AND NEW.current_level >= recipient_required_level;
        
        GET DIAGNOSTICS updated_rewards_count = ROW_COUNT;
        
        -- 停用相关 timers
        UPDATE reward_timers
        SET is_active = false
        WHERE recipient_wallet = NEW.wallet_address
          AND is_active = true
          AND reward_id IN (
              SELECT id FROM layer_rewards
              WHERE reward_recipient_wallet = NEW.wallet_address
                AND status = 'claimable'
          );
        
        IF updated_rewards_count > 0 THEN
            RAISE NOTICE '✅ Auto-promoted % pending rewards to claimable for %',
                updated_rewards_count, NEW.wallet_address;
        END IF;
        
        -- 原有的 matrix layer rewards 逻辑
        FOR level_num IN OLD.current_level + 1..NEW.current_level LOOP
            -- ... 现有逻辑 ...
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$;
```

#### 方案 2: 定期 Cron Job (补偿机制)

创建每 5 分钟运行的检查函数：

```sql
CREATE OR REPLACE FUNCTION check_and_promote_pending_rewards()
RETURNS JSON
AS $$
DECLARE
    promoted_count INTEGER := 0;
BEGIN
    UPDATE layer_rewards lr
    SET 
        status = 'claimable',
        expires_at = NULL,
        recipient_current_level = m.current_level
    FROM members m
    WHERE lr.reward_recipient_wallet = m.wallet_address
      AND lr.status = 'pending'
      AND lr.expires_at > NOW()
      AND m.current_level >= lr.recipient_required_level;
    
    GET DIAGNOSTICS promoted_count = ROW_COUNT;
    
    UPDATE reward_timers rt
    SET is_active = false
    WHERE rt.is_active = true
      AND EXISTS (
          SELECT 1 FROM layer_rewards lr
          WHERE lr.id = rt.reward_id
            AND lr.status = 'claimable'
      );
    
    RETURN json_build_object(
        'promoted_rewards', promoted_count,
        'timestamp', NOW()
    );
END;
$$;

-- 使用 pg_cron 调度
SELECT cron.schedule(
    'check-pending-rewards',
    '*/5 * * * *',
    'SELECT check_and_promote_pending_rewards();'
);
```

---

## 📊 影响范围总结

### 当前受影响用户
- **2 个钱包** 有符合条件但仍 pending 的奖励
- **200 USDT** 总金额
- **已修复** ✅

### 潜在未来影响
- 所有在 72 小时内升级的会员
- 第 3+ 个直推奖励（需要 Level 2）
- 矩阵层级奖励（需要符合层级要求）

---

## ✅ 修复验证

### 测试查询

验证没有遗漏的情况：

```sql
SELECT
    lr.reward_recipient_wallet,
    COUNT(*) as pending_count,
    SUM(lr.reward_amount) as total_amount,
    m.current_level,
    lr.recipient_required_level
FROM layer_rewards lr
JOIN members m ON m.wallet_address = lr.reward_recipient_wallet
WHERE lr.status = 'pending'
  AND lr.expires_at > NOW()
  AND m.current_level >= lr.recipient_required_level
GROUP BY lr.reward_recipient_wallet, m.current_level, lr.recipient_required_level;
```

**当前结果**: 0 rows ✅ (所有符合条件的都已修复)

---

## 📝 下一步行动

### 立即行动
1. ✅ **已完成**: 修复当前受影响的 2 个钱包
2. ⏳ **待实施**: 添加自动更新触发器（方案 1）
3. ⏳ **待实施**: 添加 cron job 补偿机制（方案 2）

### 长期监控
- 每天检查是否有新的符合条件但仍 pending 的奖励
- 监控 reward_timers 表，确保不会有奖励因为触发器失败而过期

---

## 🎯 总结

| 项目 | 状态 |
|------|------|
| 用户问题 | ✅ 已修复 |
| 其他受影响用户 | ✅ 已修复 |
| 数据库状态 | ✅ 一致 |
| Balance 更新 | ✅ 自动完成 |
| 永久性修复 | ⏳ 待实施 |

**当前状态**: 所有受影响用户的奖励已经成功更新为 claimable，可以正常提现。

**推荐下一步**: 立即实施永久性修复方案，防止未来出现同样的问题。

---

**报告生成时间**: 2025-10-10  
**修复执行者**: Claude Code Assistant
