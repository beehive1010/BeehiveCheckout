# 🔍 Level-Upgrade 函数数据同步分析

## 📋 当前流程分析

### ✅ 现有的保证机制

**文件**: `supabase/functions/level-upgrade/index.ts`

#### 流程概览

```
前端 Claim NFT 成功
    ↓
调用 level-upgrade API (action: 'upgrade_level')
    ↓
processLevelUpgrade() (Line 507-818)
    ↓
1. 获取 member 数据 (Line 518-541)
2. 验证升级要求 (Line 557-566)
3. 验证链上交易 (Line 569-579) ⚠️ 可选
4. 验证 referrals 记录 (Line 582-594)
5. ✅ Upsert membership 记录 (Line 597-626)
6. ✅ Update members.current_level (Line 631-648)
7. ✅ 触发奖励 RPC (Line 665-737)
8. 验证数据 (Line 757-771)
```

---

## ⚠️ 发现的问题

### 问题1: 链上交易验证是可选的

**代码位置**: `index.ts:569-579`

```typescript
// 3. Verify blockchain transaction (if not simulation)
if (transactionHash && transactionHash !== 'simulation') {
  const transactionResult = await verifyUpgradeTransaction(
    transactionHash,
    walletAddress,
    targetLevel,
    network
  )
  if (!transactionResult.success) {
    return {
      success: false,
      action: 'upgrade_level',
      message: 'Blockchain transaction verification failed',
      error: transactionResult.error
    }
  }
}
```

**问题**:
- ❌ 如果 `transactionHash` 未传入或为空,跳过验证
- ❌ 可能在没有链上 claim 的情况下更新数据库
- ⚠️ 存在前端伪造请求的风险

**影响**:
- 用户可能在未真正 claim NFT 的情况下升级会员等级
- 数据库记录与链上状态不一致

---

### 问题2: membership 记录可能创建失败但继续执行

**代码位置**: `index.ts:600-626`

```typescript
const { data: membershipData, error: membershipError } = await supabase
  .from('membership')
  .upsert({
    wallet_address: walletAddress,
    nft_level: targetLevel,
    // ...
  }, {
    onConflict: 'wallet_address,nft_level'
  })
  .select()
  .single()

if (membershipError) {
  console.error('Membership record creation failed:', membershipError)
  return {
    success: false,
    action: 'upgrade_level',
    message: 'Failed to create membership record',
    error: membershipError.message
  }
}
```

**问题**:
- ✅ 有错误检查,会中断执行
- ✅ 使用 `upsert` 避免重复插入
- ⚠️ 但如果 upsert 成功但 `select().single()` 失败,仍然可能继续

---

### 问题3: members 更新失败但 membership 已创建

**代码位置**: `index.ts:631-648`

```typescript
const { data: memberUpdateResult, error: memberUpdateError } = await supabase
  .from('members')
  .update({
    current_level: targetLevel
  })
  .ilike('wallet_address', walletAddress)
  .select()
  .single()

if (memberUpdateError) {
  console.error('Member level update failed:', memberUpdateError)
  return {
    success: false,
    action: 'upgrade_level',
    message: 'Failed to update member level',
    error: memberUpdateError.message
  }
}
```

**问题**:
- ⚠️ 如果 membership 创建成功,但 members 更新失败
- ❌ 数据不一致: `membership` 表有 Level 2 记录,但 `members.current_level` 仍是 1
- ❌ 没有事务回滚机制

---

### 问题4: 奖励触发失败时只是警告,不中断

**代码位置**: `index.ts:710-714`

```typescript
if (layerRewardError) {
  console.warn('⚠️ Layer reward creation failed:', layerRewardError);
} else {
  console.log(`✅ Layer rewards triggered for Level ${targetLevel} upgrade:`, layerRewardData);
  layerRewardResult = layerRewardData;
}
```

**问题**:
- ⚠️ 奖励创建失败,但 API 仍返回 `success: true`
- ❌ 用户升级成功,但上线没有收到奖励
- ❌ 没有重试机制

---

### 问题5: 没有最终验证

**代码位置**: `index.ts:757-771`

```typescript
// 7. Get final results from triggered functions
await new Promise(resolve => setTimeout(resolve, 2000)) // Wait for triggers to complete

// Check user balance changes
const { data: balanceData } = await supabase
  .from('user_balances')
  .select('bcc_balance, pending_bcc_rewards')
  .ilike('wallet_address', walletAddress)
  .maybeSingle()

// Check layer rewards created
const { count: layerRewardsCount } = await supabase
  .from('layer_rewards')
  .select('*', { count: 'exact' })
  .eq('triggering_member_wallet', walletAddress)
  .eq('level', targetLevel)
```

**问题**:
- ⚠️ 验证数据,但**不检查结果**
- ❌ 即使验证发现问题,也不影响返回结果
- ❌ 没有补偿机制

---

## 🔒 推荐的改进方案

### 方案1: 强制链上验证 (必须)

```typescript
// ❌ 旧代码
if (transactionHash && transactionHash !== 'simulation') {
  const transactionResult = await verifyUpgradeTransaction(...);
}

// ✅ 新代码
if (!transactionHash || transactionHash === 'simulation') {
  return {
    success: false,
    action: 'upgrade_level',
    message: 'Transaction hash required for upgrade',
    error: 'Missing transaction hash'
  };
}

const transactionResult = await verifyUpgradeTransaction(
  transactionHash,
  walletAddress,
  targetLevel,
  network || 'mainnet'
);

if (!transactionResult.success) {
  // 记录到同步队列用于后续验证
  await supabase.from('claim_sync_queue').insert({
    wallet_address: walletAddress,
    level: targetLevel,
    tx_hash: transactionHash,
    status: 'failed',
    source: 'level_upgrade_verification_failed',
    error_message: transactionResult.error,
  });

  return {
    success: false,
    action: 'upgrade_level',
    message: 'Blockchain transaction verification failed',
    error: transactionResult.error
  };
}
```

---

### 方案2: 添加事务完整性检查

```typescript
async function processLevelUpgradeWithTransaction(
  supabase: any,
  walletAddress: string,
  targetLevel: number,
  transactionHash: string
): Promise<LevelUpgradeResponse> {

  try {
    // Step 1: 开始记录到同步队列
    const { data: queueRecord, error: queueError } = await supabase
      .from('claim_sync_queue')
      .insert({
        wallet_address: walletAddress,
        level: targetLevel,
        tx_hash: transactionHash,
        status: 'processing',
        source: 'level_upgrade',
      })
      .select()
      .single();

    if (queueError) {
      console.error('Failed to create queue record:', queueError);
      // 继续,但记录警告
    }

    // Step 2: 创建 membership 记录
    const { error: membershipError } = await supabase
      .from('membership')
      .upsert({
        wallet_address: walletAddress,
        nft_level: targetLevel,
        claim_price: LEVEL_CONFIG.PRICING[targetLevel],
        claimed_at: new Date().toISOString(),
        // ...
      }, {
        onConflict: 'wallet_address,nft_level'
      });

    if (membershipError) {
      // 更新队列状态
      await updateQueueStatus(supabase, transactionHash, 'failed', membershipError.message);
      throw new Error(`Membership creation failed: ${membershipError.message}`);
    }

    // Step 3: 更新 members.current_level
    const { error: memberUpdateError } = await supabase
      .from('members')
      .update({ current_level: targetLevel })
      .eq('wallet_address', walletAddress);

    if (memberUpdateError) {
      // ⚠️ 严重问题: membership 已创建但 members 更新失败
      await updateQueueStatus(supabase, transactionHash, 'failed',
        `Members update failed: ${memberUpdateError.message}`);

      // 记录到人工审核队列
      await supabase.from('manual_review_queue').insert({
        wallet_address: walletAddress,
        issue_type: 'partial_upgrade',
        details: {
          targetLevel,
          membershipCreated: true,
          membersUpdated: false,
          error: memberUpdateError.message
        }
      });

      throw new Error(`Member level update failed: ${memberUpdateError.message}`);
    }

    // Step 4: 触发奖励
    const rewardResult = await triggerUpgradeRewards(supabase, walletAddress, targetLevel);

    if (!rewardResult.success) {
      // ⚠️ 奖励失败,但不中断升级
      console.error('Reward trigger failed:', rewardResult.error);

      // 记录到重试队列
      await supabase.from('reward_retry_queue').insert({
        wallet_address: walletAddress,
        level: targetLevel,
        tx_hash: transactionHash,
        error_message: rewardResult.error,
      });
    }

    // Step 5: 验证最终状态
    const verification = await verifyUpgradeComplete(supabase, walletAddress, targetLevel);

    if (!verification.success) {
      // 验证失败,更新队列
      await updateQueueStatus(supabase, transactionHash, 'verification_failed',
        verification.error);

      return {
        success: false,
        action: 'upgrade_level',
        message: 'Upgrade verification failed',
        error: verification.error
      };
    }

    // Step 6: 更新队列为完成
    await updateQueueStatus(supabase, transactionHash, 'completed');

    return {
      success: true,
      action: 'upgrade_level',
      currentLevel: verification.currentLevel,
      targetLevel: targetLevel,
      message: 'Upgrade completed and verified'
    };

  } catch (error: any) {
    console.error('Upgrade transaction error:', error);

    // 确保队列状态更新
    if (transactionHash) {
      await updateQueueStatus(supabase, transactionHash, 'failed', error.message);
    }

    return {
      success: false,
      action: 'upgrade_level',
      message: 'Upgrade failed',
      error: error.message
    };
  }
}

// 辅助函数: 更新队列状态
async function updateQueueStatus(
  supabase: any,
  txHash: string,
  status: string,
  errorMessage?: string
) {
  const updateData: any = { status };

  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  } else if (status === 'failed') {
    updateData.error_message = errorMessage;
    updateData.failed_at = new Date().toISOString();
  }

  await supabase
    .from('claim_sync_queue')
    .update(updateData)
    .eq('tx_hash', txHash);
}

// 辅助函数: 验证升级完成
async function verifyUpgradeComplete(
  supabase: any,
  walletAddress: string,
  targetLevel: number
): Promise<{ success: boolean; currentLevel?: number; error?: string }> {

  // 1. 检查 members 记录
  const { data: member } = await supabase
    .from('members')
    .select('current_level')
    .eq('wallet_address', walletAddress)
    .single();

  if (!member || member.current_level !== targetLevel) {
    return {
      success: false,
      error: `Member level mismatch. Expected: ${targetLevel}, Found: ${member?.current_level || 'null'}`
    };
  }

  // 2. 检查 membership 记录
  const { data: membership } = await supabase
    .from('membership')
    .select('nft_level')
    .eq('wallet_address', walletAddress)
    .eq('nft_level', targetLevel)
    .single();

  if (!membership) {
    return {
      success: false,
      error: `Membership record not found for Level ${targetLevel}`
    };
  }

  // 3. 检查奖励 (可选,不强制)
  const { count: rewardCount } = await supabase
    .from('layer_rewards')
    .select('*', { count: 'exact', head: true })
    .eq('triggering_member_wallet', walletAddress)
    .eq('triggering_nft_level', targetLevel);

  console.log(`✅ Verification passed: Level ${targetLevel}, Rewards: ${rewardCount || 0}`);

  return {
    success: true,
    currentLevel: targetLevel
  };
}
```

---

### 方案3: 添加重试队列表

```sql
-- 奖励重试队列
CREATE TABLE IF NOT EXISTS reward_retry_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(42) NOT NULL,
  level INTEGER NOT NULL,
  tx_hash VARCHAR(66),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  last_retry_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- 人工审核队列
CREATE TABLE IF NOT EXISTS manual_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(42) NOT NULL,
  issue_type VARCHAR(50) NOT NULL,
  details JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  assigned_to VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);
```

---

## 📊 推荐实施步骤

### 第1步: 立即实施 (今天)

1. **强制交易验证**
   - 修改 `processLevelUpgrade` 函数
   - 要求必须提供 `transactionHash`
   - 验证链上交易

2. **添加同步队列记录**
   - 每次升级开始时记录到 `claim_sync_queue`
   - 升级完成后更新状态

### 第2步: 中期实施 (本周)

1. **实现事务完整性检查**
   - 使用 `processLevelUpgradeWithTransaction` 替代现有函数
   - 添加最终验证步骤

2. **创建重试队列**
   - 奖励创建失败时记录到 `reward_retry_queue`
   - 部分升级失败时记录到 `manual_review_queue`

### 第3步: 长期实施 (下周)

1. **定时重试处理器**
   - 每10分钟处理 `reward_retry_queue`
   - 自动重试失败的奖励创建

2. **人工审核系统**
   - Dashboard 显示 `manual_review_queue`
   - 提供手动修复工具

---

## ✅ 完整性保证检查清单

- [ ] 链上交易必须验证 (不可跳过)
- [ ] membership 创建失败必须中断
- [ ] members 更新失败必须中断
- [ ] 所有操作记录到 claim_sync_queue
- [ ] 最终验证 members + membership + rewards
- [ ] 失败时回滚或记录到人工队列
- [ ] 奖励失败时记录到重试队列
- [ ] 提供监控视图查看失败记录

---

## 🎯 当前风险评估

| 风险 | 严重性 | 发生概率 | 当前状态 | 推荐方案 |
|------|--------|----------|----------|----------|
| 跳过链上验证 | 🔴 高 | 中 | ⚠️ 可跳过 | 方案1: 强制验证 |
| membership 创建失败 | 🟡 中 | 低 | ✅ 有检查 | 保持现状 |
| members 更新失败 | 🔴 高 | 低 | ⚠️ 数据不一致 | 方案2: 事务检查 |
| 奖励创建失败 | 🟡 中 | 中 | ❌ 只警告 | 方案3: 重试队列 |
| 无最终验证 | 🟡 中 | 中 | ❌ 不检查结果 | 方案2: 验证函数 |

---

## 📝 结论

**当前 level-upgrade 函数的数据插入可靠性: 70/100**

**主要问题**:
1. ❌ 链上验证可跳过
2. ⚠️ 部分失败无回滚
3. ❌ 奖励失败只警告
4. ❌ 无最终完整性验证

**立即需要**:
- 强制链上交易验证
- 添加同步队列记录
- 实现最终验证步骤

**推荐优先级**:
1. **P0 (今天)**: 方案1 - 强制链上验证 + 同步队列
2. **P1 (本周)**: 方案2 - 事务完整性检查
3. **P2 (下周)**: 方案3 - 重试队列和监控
