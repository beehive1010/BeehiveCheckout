# Cron Job 倒计时问题分析

## 审计时间
2025-10-10

## 问题描述
用户询问"倒计时cron没有启动是吗"，需要确认 pending rewards 的自动转换机制是否在工作。

---

## ✅ 审计结果

### Cron Job 状态

**pg_cron 扩展**: ✅ 已启用 (v1.6)

**当前 Cron Job**:
```
Job ID: 3
Schedule: */15 * * * * (每 15 分钟)
Command: SELECT process_expired_timers();
Status: ACTIVE ✅
Last Run: 2025-10-10 13:45:00
Result: succeeded
```

**执行历史**: ✅ 正常运行（最近 20 次全部成功）

---

## 🐛 发现的问题

### 问题 1: `process_expired_timers()` 函数逻辑不完整 ⚠️

**当前函数只处理**:
1. ✅ `super_root_upgrade` 类型的 timer
2. ✅ `qualification_wait` 类型的 timer（检查3个直推 + Level 2）

**缺失的处理**:
- ❌ **`direct_referral_third_plus_pending`** 类型 (第3+直推奖励)
- ❌ **`matrix_layer_level_pending`** 类型 (矩阵层级奖励 1st/2nd)
- ❌ **`matrix_layer_third_plus_pending`** 类型 (矩阵层级奖励 3rd+)

### 当前函数代码问题

```sql
-- ❌ 只处理两种 timer 类型
IF expired_timer.timer_type = 'super_root_upgrade' AND ... THEN
    -- 更新奖励
ELSIF expired_timer.timer_type = 'qualification_wait' THEN
    -- 检查直推 + Level 2
END IF;

-- ❌ 缺少处理 direct_referral_third_plus_pending 的逻辑
-- ❌ 缺少处理 matrix_layer_*_pending 的逻辑
```

### 问题 2: 使用了 `is_expired` 字段而不是 `expires_at` ⚠️

```sql
WHERE rt.is_expired = true  -- ❌ 使用计算字段
```

应该使用:
```sql
WHERE rt.expires_at < NOW()  -- ✅ 直接比较过期时间
```

---

## 🔍 具体案例验证

### 受影响的钱包示例

**`0x9aAF0ED38C24A1A51836ec1F67fF13731d7bE7e6`**:
- Timer 类型: `direct_referral_third_plus_pending`
- 会员已升到 Level 2 ✅
- Cron 执行: ❌ **不会处理**（函数中没有这个类型的逻辑）
- 结果: 奖励一直保持 pending，直到手动修复

**`0x3C1FF5B4BE2A1FB8c157aF55aa6450eF66D7E242`**:
- Timer 类型: `direct_referral_third_plus_pending`
- 会员已升到 Level 2 ✅
- Cron 执行: ❌ **不会处理**
- 结果: 奖励一直保持 pending，直到手动修复

---

## 📊 当前 Timer 类型统计

查询所有活跃的 timer 类型:

```sql
SELECT 
    timer_type,
    COUNT(*) as timer_count,
    SUM(CASE WHEN expires_at < NOW() THEN 1 ELSE 0 END) as expired_count
FROM reward_timers
WHERE is_active = true
GROUP BY timer_type
ORDER BY timer_count DESC;
```

**预期结果**: 需要确认有多少 `direct_referral_third_plus_pending` 类型的 timer

---

## 🔧 修复方案

### 方案 1: 更新 `process_expired_timers()` 函数 ⭐ (推荐)

完整的函数应该处理所有 timer 类型：

```sql
CREATE OR REPLACE FUNCTION public.process_expired_timers()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    expired_timer RECORD;
    processed_count INTEGER := 0;
    updated_count INTEGER := 0;
BEGIN
    -- 处理所有过期的 timers
    FOR expired_timer IN
        SELECT
            rt.id as timer_id,
            rt.reward_id,
            rt.recipient_wallet,
            rt.timer_type,
            rt.expires_at,
            lr.status as reward_status,
            lr.recipient_required_level,
            m.current_level as member_current_level
        FROM reward_timers rt
        JOIN layer_rewards lr ON rt.reward_id = lr.id
        JOIN members m ON lr.reward_recipient_wallet = m.wallet_address
        WHERE rt.is_active = true
        AND rt.expires_at < NOW()  -- ✅ 直接比较过期时间
        AND lr.status = 'pending'
    LOOP
        processed_count := processed_count + 1;

        -- ✅ 检查是否符合条件可以变为 claimable
        IF expired_timer.member_current_level >= expired_timer.recipient_required_level THEN
            -- 会员已达到要求等级，奖励变为可领取
            UPDATE layer_rewards
            SET 
                status = 'claimable',
                recipient_current_level = expired_timer.member_current_level,
                expires_at = NULL,
                updated_at = NOW()
            WHERE id = expired_timer.reward_id;

            updated_count := updated_count + 1;

            RAISE NOTICE '✅ Promoted pending reward % to claimable (Level % >= %)',
                expired_timer.reward_id,
                expired_timer.member_current_level,
                expired_timer.recipient_required_level;
        ELSE
            -- 仍未达到要求，奖励过期并 rollup
            -- 调用现有的 rollup 逻辑
            PERFORM process_expired_reward_timers();  -- 使用现有的 rollup 函数
        END IF;

        -- 停用 timer
        UPDATE reward_timers
        SET 
            is_active = false,
            updated_at = NOW()
        WHERE id = expired_timer.timer_id;
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'processed_timers', processed_count,
        'updated_rewards', updated_count,
        'processed_at', NOW()
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'message', 'Timer processing failed: ' || SQLERRM
    );
END;
$function$;
```

### 方案 2: 添加会员升级时的触发器检查 ⭐⭐ (最佳)

在 `trigger_level_upgrade_rewards()` 中添加：

```sql
-- 当会员升级时，立即检查其所有 pending 奖励
UPDATE layer_rewards
SET 
    status = 'claimable',
    recipient_current_level = NEW.current_level,
    expires_at = NULL
WHERE reward_recipient_wallet = NEW.wallet_address
  AND status = 'pending'
  AND expires_at > NOW()
  AND NEW.current_level >= recipient_required_level;

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
```

---

## 🎯 推荐修复策略

### 三层防护机制

1. **第一层 - 实时更新** (触发器):
   - 在会员升级时立即检查 pending rewards
   - 零延迟，最准确

2. **第二层 - 定期检查** (Cron 改进):
   - 完善 `process_expired_timers()` 函数逻辑
   - 每 15 分钟捕获遗漏情况
   - 处理所有 timer 类型

3. **第三层 - Rollup 机制** (过期处理):
   - 72 小时后仍未达标的奖励
   - 使用现有的 `process_expired_reward_timers()` 函数
   - Rollup 到上层

---

## ✅ 总结

| 项目 | 状态 | 说明 |
|------|------|------|
| Cron Job | ✅ 运行中 | 每 15 分钟执行 |
| pg_cron 扩展 | ✅ 已启用 | v1.6 |
| 函数逻辑 | ❌ **不完整** | 只处理 2 种 timer 类型 |
| Direct Referral 3+ | ❌ **缺失** | 函数中没有处理逻辑 |
| Matrix Layer | ❌ **缺失** | 函数中没有处理逻辑 |

**核心问题**: 
- ✅ Cron 正在运行
- ❌ **函数逻辑不完整**，没有处理关键的 timer 类型
- ❌ 导致即使 cron 每 15 分钟运行，pending rewards 也不会自动更新

**推荐立即修复**: 更新 `process_expired_timers()` 函数 + 添加会员升级触发器

---

**报告生成时间**: 2025-10-10
**状态**: ⚠️ 需要修复函数逻辑
