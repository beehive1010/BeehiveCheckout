# BCC释放机制完整分析报告

**检查时间**: 2025-10-16
**问题**: 为什么Level 2-19升级时BCC没有正确释放？

---

## 📋 BCC释放机制概览

### 1. 数据库触发器（主要机制）✅

**触发器名称**: `trigger_unlock_bcc_on_upgrade`
**挂钩位置**: membership表 AFTER INSERT (执行顺序3)
**函数**: `unlock_bcc_on_membership_upgrade()`

**触发器执行顺序**:
```
membership INSERT →
  1. BEFORE trigger_calculate_nft_costs
  2. BEFORE trigger_set_unlock_membership_level
  3. AFTER  membership_after_insert_trigger
  4. AFTER  trigger_auto_layer_rewards (order 2)
  5. AFTER  trigger_unlock_bcc_on_upgrade (order 3) ← BCC释放
  6. AFTER  trigger_update_nft_count (order 4)
```

**关键逻辑**:
```sql
-- unlock_bcc_on_membership_upgrade()函数
IF TG_OP = 'INSERT' AND NEW.claimed_at IS NOT NULL THEN
    IF NEW.is_upgrade AND NEW.previous_level IS NOT NULL THEN
        -- ✅ 释放前一个等级的BCC
        v_unlock_amount := calculate_level_bcc_unlock(NEW.previous_level, v_activation_sequence);
    ELSIF NOT NEW.is_upgrade AND NEW.nft_level = 1 THEN
        -- Level 1首次激活：不释放BCC
        v_unlock_amount := 0;
    ELSE
        -- 其他情况：不释放
        v_unlock_amount := 0;
    END IF;
END IF;
```

**关键条件**（必须同时满足）:
1. ✅ `TG_OP = 'INSERT'` (必须是INSERT，UPDATE不触发)
2. ✅ `NEW.claimed_at IS NOT NULL`
3. ✅ `NEW.is_upgrade = true`
4. ✅ `NEW.previous_level IS NOT NULL`

---

## 🔧 Edge Function实现

### Level-upgrade Edge Function (processLevelUpgrade)

**Line 712-727**: 插入membership记录

```typescript
const { data: membershipData, error: membershipError } = await supabase
  .from('membership')
  .upsert({
    wallet_address: walletAddress,
    nft_level: targetLevel,
    claim_price: LEVEL_CONFIG.PRICING[targetLevel] || 0,
    claimed_at: new Date().toISOString(),
    is_member: true,
    unlock_membership_level: targetLevel + 1,
    platform_activation_fee: targetLevel === 1 ? 30 : 0,
    total_cost: LEVEL_CONFIG.PRICING[targetLevel] || 0
    // ❌ 问题: 缺少 is_upgrade 和 previous_level 字段！
  }, {
    onConflict: 'wallet_address,nft_level'
  })
```

**⚠️ 发现问题**:
- ❌ Edge function插入membership时**没有设置 `is_upgrade`**
- ❌ Edge function插入membership时**没有设置 `previous_level`**
- 导致BCC释放触发器条件不满足，**不会执行BCC释放**

### processLevelUpgradeWithRewards Function

**Line 438-452**: 同样问题

```typescript
const { error: membershipError } = await supabase
  .from('membership')
  .upsert({
    wallet_address: walletAddress,
    nft_level: targetLevel,
    transaction_hash: mintTxHash,
    is_member: true,
    claimed_at: new Date().toISOString(),
    network: 'mainnet',
    claim_price: nftPrice,
    total_cost: nftPrice,
    unlock_membership_level: targetLevel + 1
    // ❌ 同样缺少 is_upgrade 和 previous_level
  }, {
    onConflict: 'wallet_address,nft_level'
  });
```

---

## 🐛 问题根因

### 为什么BCC没有释放？

**触发器检查失败**:
```sql
-- 触发器检查
IF NEW.is_upgrade AND NEW.previous_level IS NOT NULL THEN
    -- 释放BCC
ELSE
    -- ❌ 跳过释放（因为is_upgrade=false或NULL，previous_level=NULL）
END IF;
```

**实际插入的数据**（Edge Function）:
```json
{
  "nft_level": 2,
  "is_upgrade": null,        // ❌ 应该是 true
  "previous_level": null,    // ❌ 应该是 1
  "unlock_membership_level": 3
}
```

**触发器看到的数据**:
- `NEW.is_upgrade` = NULL (falsy) ❌
- `NEW.previous_level` = NULL ❌
- **条件不满足** → 不执行BCC释放 ❌

---

## ✅ 解决方案

### 修复Edge Function

需要在两处添加 `is_upgrade` 和 `previous_level` 字段：

#### 1. processLevelUpgrade (Line 712)

```typescript
// ✅ 修复后
const { data: membershipData, error: membershipError } = await supabase
  .from('membership')
  .upsert({
    wallet_address: walletAddress,
    nft_level: targetLevel,
    claim_price: LEVEL_CONFIG.PRICING[targetLevel] || 0,
    claimed_at: new Date().toISOString(),
    is_member: true,
    unlock_membership_level: targetLevel + 1,
    platform_activation_fee: targetLevel === 1 ? 30 : 0,
    total_cost: LEVEL_CONFIG.PRICING[targetLevel] || 0,
    // ✅ 添加关键字段
    is_upgrade: targetLevel > 1,           // Level 2+是升级
    previous_level: currentLevel           // 当前等级（升级前）
  }, {
    onConflict: 'wallet_address,nft_level'
  })
```

#### 2. processLevelUpgradeWithRewards (Line 438)

```typescript
// ✅ 修复后
const { error: membershipError } = await supabase
  .from('membership')
  .upsert({
    wallet_address: walletAddress,
    nft_level: targetLevel,
    transaction_hash: mintTxHash,
    is_member: true,
    claimed_at: new Date().toISOString(),
    network: 'mainnet',
    claim_price: nftPrice,
    total_cost: nftPrice,
    unlock_membership_level: targetLevel + 1,
    // ✅ 添加关键字段
    is_upgrade: targetLevel > 1,
    previous_level: targetLevel - 1       // 假设顺序升级
  }, {
    onConflict: 'wallet_address,nft_level'
  });
```

---

## 📊 影响分析

### 受影响的用户

**最近一周**:
- 缺少100 BCC的用户: 3个
- 多释放100 BCC的用户: 1个（可能是手动修复导致）

**历史数据**:
- 总升级用户（is_upgrade=true）: 697个 ✅
- is_upgrade=false但nft_level>=2: 145个 ❌
- **约20%的升级用户受影响** (145/842)

### 为什么有些用户的BCC是正确的？

观察到有些用户虽然is_upgrade=false，但BCC余额是正确的：
- 这些用户可能使用了**老版本的BCC释放机制** (`bcc_level_unlock` action)
- 或者在2025-10-08之前通过其他方式手动修复

---

## 🎯 修复计划

### 短期修复（立即执行）

1. ✅ **手动修复4个用户的BCC余额** (脚本已准备)
   - 3个用户: +100 BCC
   - 1个用户: -100 BCC

2. ✅ **修改Edge Function代码**
   - 在两处membership upsert添加 `is_upgrade` 和 `previous_level`
   - 部署到production

### 中期修复（1周内）

3. **批量修复历史数据**
   - 更新145个用户的membership记录（添加is_upgrade和previous_level）
   - 对于BCC余额不正确的用户，手动调整

4. **添加数据验证**
   - 创建定期检查脚本
   - 对比membership vs user_balances一致性

### 长期改进（1个月内）

5. **改进触发器**
   - 增加容错性：即使is_upgrade=false，也根据nft_level计算应释放的BCC
   - 添加更详细的日志

6. **添加监控告警**
   - 监控BCC释放失败的情况
   - 自动发送告警

---

## ✅ 验证清单

修复后需要验证：

- [ ] Edge function代码已更新（添加is_upgrade和previous_level）
- [ ] 新升级用户的membership记录包含正确字段
- [ ] BCC正确释放（audit_logs有bcc_unlock_on_upgrade记录）
- [ ] user_balances余额正确
- [ ] 没有新的BCC不一致用户

---

## 📝 总结

**根本原因**: Edge Function插入membership记录时缺少 `is_upgrade` 和 `previous_level` 字段

**影响范围**: 约20%的升级用户（145/842）

**修复难度**: ⭐⭐ (中等) - 需要修改Edge Function代码

**紧急程度**: 🔴 高 - 影响用户BCC余额，需要立即修复

**已完成**:
- ✅ 问题诊断
- ✅ 影响范围评估
- ✅ 手动修复脚本准备

**待执行**:
- ⏳ 修改Edge Function代码
- ⏳ 批量修复历史数据
- ⏳ 部署和验证
