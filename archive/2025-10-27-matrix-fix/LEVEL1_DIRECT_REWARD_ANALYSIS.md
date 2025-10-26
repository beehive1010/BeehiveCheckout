# Level 1 激活直推奖励分析报告

## 审计时间
2025-10-10

## 审计问题
**用户问题**: Level 1 会员激活时触发给 referrer 的直推奖励，是否会在会员升级后自动将 pending 奖励变成 claimable？

---

## ✅ 审计结果

### 关键发现 ⚠️

**当前系统 MISSING 自动更新机制！**

Pending 奖励**不会**在 referrer 升级后自动变成 claimable，需要**手动更新或添加触发器**。

---

## 📋 详细分析

### 1. Level 1 激活时的直推奖励逻辑

**函数**: `trigger_layer_rewards_on_upgrade` 
**文件**: `supabase/migrations/20251008175000_fix_reward_timers_field_names.sql`

#### 奖励规则（Line 71-84）:

```sql
-- 计算奖励序号（这是第几个直推）
SELECT COUNT(*) + 1
INTO reward_sequence
FROM layer_rewards
WHERE reward_recipient_wallet = direct_referrer_wallet
  AND triggering_member_wallet != p_upgrading_member_wallet;

-- 确定奖励金额和状态
IF reward_sequence = 1 THEN
    reward_amount := p_nft_price;     -- 第1个直推：全额
    reward_status := 'claimable';     -- ✅ 立即可领取
    expires_timestamp := NULL;
ELSIF reward_sequence = 2 THEN
    reward_amount := p_nft_price;     -- 第2个直推：全额
    reward_status := 'claimable';     -- ✅ 立即可领取
    expires_timestamp := NULL;
ELSE
    -- 第3个及以后：需要72小时内升级到Level 2
    reward_amount := p_nft_price;
    reward_status := 'pending';        -- ⏳ 等待状态
    expires_timestamp := NOW() + INTERVAL '72 hours';
END IF;
```

#### 验证条件（Line 109）:

```sql
recipient_required_level: CASE WHEN reward_sequence >= 3 THEN 2 ELSE 1 END
```

**规则总结**:
- **第 1-2 个直推**: 立即 `claimable`（无条件）
- **第 3+ 个直推**: `pending`，要求 referrer 升到 Level 2，72小时内

---

### 2. Pending 奖励转 Claimable 的逻辑

#### ❌ 当前状态：**缺少自动更新机制**

检查了所有相关文件，**没有找到**会员升级后自动更新 pending rewards 状态的触发器或函数。

#### 现有的成员升级触发器

**文件**: `supabase/migrations/20251009120003_cleanup_duplicate_bcc_unlock_logic.sql`

```sql
CREATE OR REPLACE FUNCTION trigger_level_upgrade_rewards()
RETURNS TRIGGER
AS $$
BEGIN
    IF NEW.current_level > OLD.current_level THEN
        FOR level_num IN OLD.current_level + 1..NEW.current_level LOOP
            -- ✅ 触发 matrix layer rewards
            SELECT trigger_matrix_layer_rewards(...) INTO matrix_reward_result;
            
            -- ❌ 没有检查或更新 pending 直推奖励！
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$;
```

**结论**: 该触发器只处理新的 matrix layer rewards，**不更新现有的 pending rewards**。

---

### 3. 过期奖励处理机制

**函数**: `process_expired_reward_timers`
**文件**: `supabase/migrations/20251009010000_fix_matrix_rewards_and_rollup.sql`

```sql
-- 检查过期的 pending 奖励
FOR expired_timer_record IN
    SELECT * FROM reward_timers rt
    WHERE rt.is_active = true
      AND rt.expires_at < NOW()  -- 72小时后
LOOP
    -- 如果 referrer 仍未达到要求，过期奖励会 rollup 到上层
    IF original_reward_record.status = 'pending' THEN
        UPDATE layer_rewards
        SET status = 'expired'
        WHERE id = expired_timer_record.reward_id;
        
        -- Rollup 到上层 matrix_root
        -- ...
    END IF;
END LOOP;
```

**问题**: 这个函数只处理**过期**的奖励，不会在 referrer 升级时主动检查并更新状态。

---

## 🔍 当前流程示例

### 场景：Alice 推荐 3 个人激活 Level 1

1. **第 1 个人激活** (Bob):
   - Alice 获得 130 USDT → `claimable` ✅
   - Alice 可以立即提现

2. **第 2 个人激活** (Carol):
   - Alice 获得 130 USDT → `claimable` ✅
   - Alice 可以立即提现

3. **第 3 个人激活** (Dave):
   - Alice 获得 130 USDT → `pending` ⏳
   - 要求：Alice 需要在 72 小时内升到 Level 2
   - 创建 `reward_timer`，expires_at = NOW() + 72 hours

### 问题情况 ❌

**情况 1**: Alice 在 72 小时内升到 Level 2
- ❌ **系统不会自动将 pending 奖励变成 claimable**
- ❌ Alice 仍然看到 pending 状态
- ⏰ 72 小时后，奖励**过期**并 rollup 到上层
- ❌ Alice 即使升级了也没有获得奖励！

**情况 2**: Alice 72 小时后才升到 Level 2
- ⏰ 奖励已经过期
- 🔄 奖励 rollup 给更高层的 matrix_root
- ❌ Alice 失去了这个奖励

---

## 🐛 问题根因

### 缺少的逻辑

系统缺少以下功能：

1. **没有 referrer 升级时检查 pending rewards 的触发器**
2. **没有定期检查符合条件的 pending rewards 的 cron job**
3. **没有在 reward_timers 表中主动检查 recipient 当前等级**

### 预期行为 vs 实际行为

| 事件 | 预期行为 | 实际行为 | 状态 |
|------|---------|---------|------|
| Referrer 升到 Level 2 | Pending → Claimable | 无变化 | ❌ |
| 72 小时内未升级 | Pending → Expired | Expired & Rollup | ✅ |
| 72 小时后升级 | (已过期) | Expired & Rollup | ✅ |

---

## 🔧 推荐修复方案

### 方案 1: 添加成员升级时检查 pending rewards 的触发器 ⭐

**最佳方案**：在 `trigger_level_upgrade_rewards` 中添加逻辑

```sql
CREATE OR REPLACE FUNCTION trigger_level_upgrade_rewards()
RETURNS TRIGGER
AS $$
DECLARE
    updated_rewards_count INTEGER := 0;
BEGIN
    IF NEW.current_level > OLD.current_level THEN
    
        -- ✅ NEW: 检查并更新该会员作为 recipient 的 pending 奖励
        UPDATE layer_rewards
        SET 
            status = 'claimable',
            recipient_current_level = NEW.current_level,
            expires_at = NULL
        WHERE reward_recipient_wallet = NEW.wallet_address
          AND status = 'pending'
          AND (
              -- 第3+个直推奖励: 需要 Level 2
              (recipient_required_level = 2 AND NEW.current_level >= 2)
              OR
              -- 矩阵层级奖励: 各种条件
              (recipient_required_level <= NEW.current_level)
          );
        
        GET DIAGNOSTICS updated_rewards_count = ROW_COUNT;
        
        -- 停用相关的 reward_timers
        UPDATE reward_timers
        SET is_active = false
        WHERE recipient_wallet = NEW.wallet_address
          AND is_active = true
          AND reward_id IN (
              SELECT id FROM layer_rewards
              WHERE reward_recipient_wallet = NEW.wallet_address
                AND status = 'claimable'
          );
        
        RAISE NOTICE '✅ Promoted % pending rewards to claimable for %',
            updated_rewards_count, NEW.wallet_address;
        
        -- 原有的 matrix layer rewards 逻辑
        FOR level_num IN OLD.current_level + 1..NEW.current_level LOOP
            -- ... 现有逻辑 ...
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$;
```

**优点**:
- ✅ 实时更新，无延迟
- ✅ 在升级事务中执行，保证一致性
- ✅ 自动停用相关 timers

**缺点**:
- 需要修改现有触发器

---

### 方案 2: 定期 Cron Job 检查

创建定期执行的函数：

```sql
CREATE OR REPLACE FUNCTION check_and_promote_pending_rewards()
RETURNS JSON
AS $$
DECLARE
    promoted_count INTEGER := 0;
BEGIN
    -- 更新符合条件的 pending 奖励
    UPDATE layer_rewards lr
    SET 
        status = 'claimable',
        expires_at = NULL,
        recipient_current_level = m.current_level
    FROM members m
    WHERE lr.reward_recipient_wallet = m.wallet_address
      AND lr.status = 'pending'
      AND lr.expires_at > NOW()  -- 未过期
      AND (
          -- 第3+个直推: Level >= 2
          (lr.recipient_required_level = 2 AND m.current_level >= 2)
          OR
          -- 矩阵奖励: Level 符合要求
          (lr.recipient_required_level <= m.current_level)
      );
    
    GET DIAGNOSTICS promoted_count = ROW_COUNT;
    
    -- 停用相关 timers
    UPDATE reward_timers rt
    SET is_active = false
    WHERE rt.is_active = true
      AND EXISTS (
          SELECT 1 FROM layer_rewards lr
          WHERE lr.id = rt.reward_id
            AND lr.status = 'claimable'
      );
    
    RETURN json_build_object(
        'promoted_rewards', promoted_count
    );
END;
$$;

-- 使用 pg_cron 每 5 分钟执行一次
SELECT cron.schedule(
    'check-pending-rewards',
    '*/5 * * * *',  -- 每 5 分钟
    'SELECT check_and_promote_pending_rewards();'
);
```

**优点**:
- ✅ 不修改现有触发器
- ✅ 集中处理所有 pending rewards

**缺点**:
- ⏰ 有延迟（最多 5 分钟）
- 需要启用 pg_cron 扩展

---

### 方案 3: 在前端查询时动态检查

在 `v_reward_overview` 视图中添加逻辑：

```sql
CREATE OR REPLACE VIEW v_reward_overview AS
SELECT
    lr.id,
    lr.reward_amount,
    -- 动态计算状态
    CASE
        WHEN lr.status = 'pending' 
             AND m.current_level >= lr.recipient_required_level
             AND lr.expires_at > NOW()
        THEN 'claimable'
        ELSE lr.status
    END as status,
    -- ...
FROM layer_rewards lr
JOIN members m ON m.wallet_address = lr.reward_recipient_wallet;
```

**优点**:
- ✅ 无需修改数据库状态
- ✅ 查询时实时计算

**缺点**:
- ❌ 数据库中状态不一致
- ❌ 提现时需要额外检查

---

## 🎯 最终建议

### 推荐方案：**方案 1 (触发器) + 方案 2 (Cron 补偿)**

1. **立即实施方案 1**: 
   - 在 `trigger_level_upgrade_rewards` 中添加 pending 奖励检查逻辑
   - 确保会员升级时实时更新

2. **作为补偿实施方案 2**:
   - 添加每 5 分钟的 cron job
   - 捕获任何遗漏的情况（如触发器失败）

3. **数据修复**:
   - 运行一次性脚本，修复历史数据中已经符合条件但仍是 pending 的奖励

```sql
-- 一次性修复脚本
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
```

---

## 📊 影响范围

### 受影响的用户

查询当前受影响的 pending 奖励：

```sql
SELECT
    lr.reward_recipient_wallet,
    COUNT(*) as pending_rewards_count,
    SUM(lr.reward_amount) as total_pending_amount,
    m.current_level,
    lr.recipient_required_level
FROM layer_rewards lr
JOIN members m ON m.wallet_address = lr.reward_recipient_wallet
WHERE lr.status = 'pending'
  AND lr.expires_at > NOW()
  AND m.current_level >= lr.recipient_required_level  -- 已经符合条件！
GROUP BY lr.reward_recipient_wallet, m.current_level, lr.recipient_required_level
ORDER BY total_pending_amount DESC;
```

---

## ✅ 总结

| 问题 | 状态 | 说明 |
|------|------|------|
| Level 1 激活触发直推奖励 | ✅ 正常 | 逻辑正确 |
| 第 1-2 个直推立即 claimable | ✅ 正常 | 无条件可领取 |
| 第 3+ 个直推为 pending | ✅ 正常 | 需要 Level 2 |
| **Referrer 升级自动更新 pending** | ❌ **缺失** | **需要添加触发器** |
| 72 小时过期机制 | ✅ 正常 | Rollup 逻辑正确 |

**核心问题**: 当 referrer 升到 Level 2 时，系统**不会自动**将其 pending 的第 3+ 直推奖励变成 claimable。

**推荐修复**: 在 `trigger_level_upgrade_rewards` 触发器中添加 pending rewards 检查和更新逻辑。

---

**报告生成时间**: 2025-10-10  
**需要立即修复**: ⚠️ **是**
