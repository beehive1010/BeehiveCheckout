# Reward Timer 和 Reward History 显示问题修复

**修复日期**: 2025-10-08
**问题**: Pending 奖励没有创建 reward_timer，Rewards 页面 history 不显示

---

## 🐛 问题描述

### 用户反馈

1. **Pending 奖励没有显示在 reward_timers 表** - 72小时倒计时逻辑未触发
2. **Rewards 页面的 reward history 不显示** - 查询返回空

### 具体场景

- 用户钱包: `0x781665DaeD20238fFA341085aA77d31b8c0Cf68C` (triggering member)
- 推荐人钱包: `0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0` (reward recipient)
- 奖励金额: 100 USDT
- 状态: `pending`
- 创建时间: 2025-10-07 23:59:33

**实际情况**:
```sql
SELECT * FROM layer_rewards WHERE triggering_member_wallet = '0x781665...';
-- ✅ 找到 1 条 pending 奖励记录

SELECT * FROM reward_timers;
-- ❌ 表是空的！没有任何 timer 记录
```

---

## 🔍 根本原因分析

### 问题 1: reward_timers 表为空

**原因**: 缺少自动创建 timer 的触发器

#### 现有机制回顾

1. **20240924_create_pending_rewards_timer_system.sql** 创建了:
   - ✅ `reward_timers` 表
   - ✅ `create_reward_timer()` 函数
   - ✅ `get_user_pending_rewards()` 查询函数
   - ✅ 一次性 DO 块为**现有** pending 奖励创建 timers

2. **问题**: 没有触发器为**新的** layer_rewards 自动创建 timer

#### 触发流程

```
用户激活 → INSERT INTO members
    ↓
trigger_member_initial_level1_rewards 触发
    ↓
INSERT INTO layer_rewards (status = 'pending')
    ↓
❌ 没有触发器创建 reward_timer
    ↓
reward_timers 表保持为空
```

### 问题 2: Reward History 不显示

**文件**: `src/components/rewards/RewardHistory.tsx:97`

**原因**: 使用 `.eq()` 进行大小写敏感查询

```typescript
// ❌ 错误 - 大小写敏感
.eq('reward_recipient_wallet', activeWallet.toLowerCase())

// 数据库存储: 0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0 (混合大小写)
// 前端传递: 0x380fd6a57fc2df6f10b8920002e4acc7d57d61c0 (小写)
// 结果: 不匹配 ❌
```

---

## ✅ 解决方案

### 修复 1: 创建自动 reward_timer 触发器

**文件**: `supabase/migrations/20251008_auto_create_reward_timers_trigger.sql`

#### 触发器函数

```sql
CREATE OR REPLACE FUNCTION trigger_auto_create_reward_timer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    recipient_activation_seq INTEGER;
    timer_type_to_use VARCHAR(20);
    duration_hours INTEGER;
    timer_result JSON;
BEGIN
    -- 只处理 pending 状态的新奖励
    IF NEW.status = 'pending' THEN

        -- 获取接收者的 activation_sequence
        SELECT activation_sequence INTO recipient_activation_seq
        FROM members
        WHERE wallet_address = NEW.reward_recipient_wallet;

        -- 确定 timer 类型和持续时间
        IF recipient_activation_seq = 0 THEN
            -- Super Root: 72小时等待升级
            timer_type_to_use := 'super_root_upgrade';
            duration_hours := 72;
        ELSE
            -- 其他用户: 72小时资格等待
            timer_type_to_use := 'qualification_wait';
            duration_hours := 72;
        END IF;

        -- 创建 reward_timer
        SELECT create_reward_timer(
            NEW.id,
            NEW.reward_recipient_wallet,
            timer_type_to_use,
            duration_hours
        ) INTO timer_result;

    END IF;

    RETURN NEW;
END;
$$;
```

#### 创建触发器

```sql
CREATE TRIGGER trigger_auto_create_reward_timer
    AFTER INSERT ON layer_rewards
    FOR EACH ROW
    EXECUTE FUNCTION trigger_auto_create_reward_timer();
```

**效果**:
- ✅ 每次 INSERT layer_rewards (status = 'pending') 时自动创建对应的 reward_timer
- ✅ Super Root (activation_sequence = 0): 72小时 'super_root_upgrade'
- ✅ 其他用户: 72小时 'qualification_wait'

### 修复 2: 为现有 pending 奖励手动创建 timer

**问题**: 用户 `0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0` 已有 pending 奖励但没有 timer

**解决**:

```sql
-- 手动为现有 pending 奖励创建 timer
SELECT create_reward_timer(
  'dfc61df0-477b-4973-aac0-9099c4b6f26f'::UUID,  -- reward_id
  '0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0',  -- recipient_wallet
  'qualification_wait',                           -- timer_type
  72                                              -- 72 hours
);
```

**结果**:
```json
{
  "success": true,
  "timer_id": "4b935eb5-715c-46b9-8808-a146a9f580b7",
  "expires_at": "2025-10-11T00:07:25.698382+00:00",
  "duration_hours": 72
}
```

**验证**:
```sql
SELECT
  recipient_wallet,
  timer_type,
  time_remaining_seconds,  -- 259200 秒 = 72 小时 ✅
  expires_at,
  is_active,
  lr.reward_amount,
  lr.status
FROM reward_timers rt
JOIN layer_rewards lr ON rt.reward_id = lr.id
WHERE rt.recipient_wallet ILIKE '0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0';
```

### 修复 3: RewardHistory 组件改用大小写不敏感查询

**文件**: `src/components/rewards/RewardHistory.tsx:97`

**修改前**:
```typescript
.eq('reward_recipient_wallet', activeWallet.toLowerCase())
```

**修改后**:
```typescript
.ilike('reward_recipient_wallet', activeWallet)
```

**效果**:
- ✅ 无论前端传递的地址是什么大小写格式，都能正确匹配数据库记录
- ✅ 与 CASE_SENSITIVITY_AND_TIMEOUT_FIXES.md 中的修复保持一致

---

## 🔄 修复后的完整流程

### 场景 1: 新用户激活

```
用户 Claim NFT Level 1
    ↓
INSERT INTO members (trigger_member_initial_level1_rewards)
    ↓
INSERT INTO layer_rewards (status = 'pending', reward_amount = 100)
    ↓
✅ trigger_auto_create_reward_timer 触发
    ↓
INSERT INTO reward_timers (
    timer_type = 'qualification_wait',
    duration_hours = 72,
    expires_at = NOW() + 72 hours
)
    ↓
用户访问 Rewards 页面
    ↓
✅ RewardHistory 组件使用 .ilike() 查询
    ↓
✅ 显示 pending 奖励和 72 小时倒计时 ✅
```

### 场景 2: 查看 Reward History

```
用户访问 /rewards 页面
    ↓
RewardHistory 组件加载
    ↓
loadLayerRewards() 执行
    ↓
supabase.from('layer_rewards')
  .select('*')
  .ilike('reward_recipient_wallet', activeWallet)  // ✅ 大小写不敏感
    ↓
✅ 返回所有 pending/claimable/claimed/rolled_up 奖励
    ↓
✅ 显示完整的 reward history 列表 ✅
```

---

## 📊 部署状态

### ✅ 已完成

1. **数据库触发器** ✅
   - 文件: `supabase/migrations/20251008_auto_create_reward_timers_trigger.sql`
   - 部署: 2025-10-08
   - 触发器: `trigger_auto_create_reward_timer`
   - 状态: ✅ 已应用到数据库

2. **手动补充 timer** ✅
   - 用户: `0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0`
   - Timer ID: `4b935eb5-715c-46b9-8808-a146a9f580b7`
   - 倒计时: 72 小时 (259200 秒)
   - 状态: ✅ 已创建

3. **前端组件修复** ✅
   - 文件: `src/components/rewards/RewardHistory.tsx:97`
   - 修改: `.eq()` → `.ilike()`
   - 状态: ⚠️ 需要前端构建部署

---

## 🧪 测试验证

### 测试场景 1: 新用户激活自动创建 timer

1. 让新用户 Claim NFT Level 1
2. 检查 layer_rewards 表是否创建 pending 记录
3. **验证**: reward_timers 表是否自动创建对应记录

**预期结果**:
```sql
SELECT
  rt.recipient_wallet,
  rt.timer_type,
  rt.time_remaining_seconds,
  lr.reward_amount,
  lr.status
FROM reward_timers rt
JOIN layer_rewards lr ON rt.reward_id = lr.id
WHERE lr.triggering_member_wallet = '[新用户钱包]';

-- 应该返回 1 条记录:
-- timer_type = 'qualification_wait'
-- time_remaining_seconds ≈ 259200 (72小时)
-- is_active = true
```

### 测试场景 2: Rewards 页面显示 history

1. 用户访问 `/rewards` 页面
2. 切换到 "Reward History" 标签
3. **验证**: 是否显示所有 pending/claimed 奖励

**预期结果**:
- ✅ 显示推荐人的 pending 奖励 (100 USDT)
- ✅ 显示倒计时 (72 hours / 3 days)
- ✅ 状态显示为 "Pending"
- ✅ Layer 1 奖励正确显示

### 测试场景 3: 大小写不敏感查询

1. 数据库地址: `0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0` (混合)
2. 前端传递: `0x380fd6a57fc2df6f10b8920002e4acc7d57d61c0` (小写)
3. **验证**: 查询是否仍然返回正确结果

**预期结果**:
- ✅ `.ilike()` 查询成功匹配
- ✅ 返回完整的 layer_rewards 列表

---

## ⚠️ 注意事项

### 1. Timer 过期处理

现有系统已有 `process_expired_timers()` 函数来处理过期的 timer，需要定期调用（通过 cron job 或 edge function）:

```sql
SELECT process_expired_timers();
```

该函数会:
- 检查所有 `is_expired = true` 的 timers
- 验证用户是否满足领取条件（升级、直推等）
- 如果满足 → 更新 layer_rewards.status = 'claimable'
- 标记 timer 为 `is_active = false`

### 2. 前端部署

修改了 `src/components/rewards/RewardHistory.tsx`，需要:
```bash
npm run build
# 部署到生产环境
```

### 3. 现有 pending 奖励

如果还有其他现有的 pending 奖励没有 timer，可以运行:

```sql
-- 为所有缺失 timer 的 pending 奖励创建倒计时
DO $$
DECLARE
    pending_reward RECORD;
    timer_result JSON;
BEGIN
    FOR pending_reward IN
        SELECT
            lr.id as reward_id,
            lr.reward_recipient_wallet,
            m.activation_sequence
        FROM layer_rewards lr
        JOIN members m ON lr.reward_recipient_wallet = m.wallet_address
        WHERE lr.status = 'pending'
        AND NOT EXISTS (
            SELECT 1 FROM reward_timers rt
            WHERE rt.reward_id = lr.id AND rt.is_active = true
        )
    LOOP
        SELECT create_reward_timer(
            pending_reward.reward_id,
            pending_reward.reward_recipient_wallet,
            CASE WHEN pending_reward.activation_sequence = 0
                 THEN 'super_root_upgrade'
                 ELSE 'qualification_wait' END,
            72
        ) INTO timer_result;

        RAISE NOTICE 'Created timer for reward %', pending_reward.reward_id;
    END LOOP;
END $$;
```

---

## 🎯 预期效果

修复后的用户体验:

### 1. 自动 Timer 创建 ✅
- 新用户激活 → pending 奖励 + timer 自动创建
- 无需手动干预

### 2. Rewards 页面完整显示 ✅
- Pending rewards 显示倒计时
- Claimable rewards 显示可领取状态
- Claimed rewards 显示历史记录
- Rolled up rewards 显示上卷信息

### 3. 倒计时逻辑 ✅
- 72 小时倒计时自动开始
- 过期后检查资格条件
- 满足条件 → status = 'claimable'
- 不满足 → 继续 pending 或 roll up

---

## 🔗 相关文档

- [CASE_SENSITIVITY_AND_TIMEOUT_FIXES.md](./CASE_SENSITIVITY_AND_TIMEOUT_FIXES.md) - 大小写敏感性修复
- [WELCOME_PAGE_LOOP_FIX.md](./WELCOME_PAGE_LOOP_FIX.md) - Welcome 页面循环问题
- [ACTIVATION_FIXES_COMPLETE.md](./ACTIVATION_FIXES_COMPLETE.md) - 激活流程完整修复

---

## 📝 技术细节

### reward_timers 表结构

```sql
CREATE TABLE reward_timers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reward_id UUID NOT NULL REFERENCES layer_rewards(id) ON DELETE CASCADE,
    recipient_wallet VARCHAR(42) NOT NULL,
    timer_type VARCHAR(20) NOT NULL,  -- 'super_root_upgrade', 'qualification_wait'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    time_remaining_seconds INTEGER GENERATED ALWAYS AS (
        GREATEST(0, EXTRACT(EPOCH FROM (expires_at - NOW()))::INTEGER)
    ) STORED,
    is_active BOOLEAN DEFAULT true,
    is_expired BOOLEAN GENERATED ALWAYS AS (NOW() > expires_at) STORED,
    notification_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Timer 类型说明

1. **super_root_upgrade** (Super Root 专用)
   - activation_sequence = 0
   - 72 小时等待升级到 Level 2
   - 升级后 → status = 'claimable'

2. **qualification_wait** (普通用户)
   - activation_sequence > 0
   - 72 小时资格等待
   - 满足条件（直推、升级等） → status = 'claimable'

---

## ✅ 修复总结

### 已完成

- ✅ 创建 `trigger_auto_create_reward_timer` 触发器
- ✅ 为现有 pending 奖励手动创建 timer (用户 0x380Fd6...)
- ✅ 修复 RewardHistory 组件大小写敏感查询
- ✅ 部署触发器到数据库

### 影响范围

- **数据库**: 1 个新触发器，1 个新函数
- **前端组件**: 1 个文件修改 (RewardHistory.tsx)
- **现有数据**: 1 个 timer 手动创建

### 预期效果

- ✅ 所有新的 pending 奖励自动创建 72 小时 timer
- ✅ Rewards 页面正确显示所有奖励历史
- ✅ 倒计时逻辑正常运行
- ✅ 大小写不敏感查询避免 406 错误
