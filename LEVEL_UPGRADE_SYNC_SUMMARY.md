# 🔒 Level-Upgrade 同步保证 - 实施总结

## 📋 当前问题

通过分析 `supabase/functions/level-upgrade/index.ts`,发现以下问题:

### ⚠️ 发现的5个关键问题

| # | 问题 | 严重性 | 位置 | 影响 |
|---|------|--------|------|------|
| 1 | 链上验证可跳过 | 🔴 高 | Line 569-579 | 可能在未真正 claim NFT 时更新数据库 |
| 2 | membership 创建失败后继续 | 🟡 中 | Line 617-625 | ✅ 已有检查,会中断 |
| 3 | members 更新失败但 membership 已创建 | 🔴 高 | Line 640-647 | 数据不一致,没有回滚 |
| 4 | 奖励触发失败只警告 | 🟡 中 | Line 710-714 | 升级成功但上线没收到奖励 |
| 5 | 无最终验证 | 🟡 中 | Line 757-771 | 验证数据但不检查结果 |

---

## ✅ 已创建的解决方案

### 1. 分析文档
**文件**: `ANALYSIS_LEVEL_UPGRADE_SYNC.md`

包含:
- 完整的代码审查
- 风险评估 (当前可靠性: 70/100)
- 推荐改进方案
- 实施步骤

### 2. 保证同步补丁
**文件**: `supabase/functions/level-upgrade/guaranteed-sync-patch.ts`

新增功能:
- ✅ 强制链上交易验证
- ✅ 自动记录到 `claim_sync_queue`
- ✅ 完整性验证 (members + membership + rewards)
- ✅ 奖励失败自动重试 (最多3次)
- ✅ 部分失败记录到 `manual_review_queue`
- ✅ 最终验证步骤

---

## 🚀 立即实施方案

### 方案A: 最小改动 (30分钟)

**仅添加队列记录,不修改核心逻辑**

在 `level-upgrade/index.ts` 的 `processLevelUpgrade` 函数开头添加:

```typescript
// 在 Line 514 添加 (processLevelUpgrade 函数开始)
async function processLevelUpgrade(
  supabase: any,
  walletAddress: string,
  targetLevel: number,
  transactionHash?: string,
  network?: string
): Promise<LevelUpgradeResponse> {

  // ✅ 添加: 记录到同步队列
  if (transactionHash && transactionHash !== 'simulation') {
    await supabase.from('claim_sync_queue').insert({
      wallet_address: walletAddress,
      level: targetLevel,
      tx_hash: transactionHash,
      status: 'processing',
      source: 'level_upgrade'
    }).then(({ error }) => {
      if (error) console.error('Queue insert error:', error);
    });
  }

  // ... 原有代码继续 ...
}

// 在函数成功返回前 (Line 794) 添加:
// 更新队列状态为完成
if (transactionHash && transactionHash !== 'simulation') {
  await supabase.from('claim_sync_queue')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('tx_hash', transactionHash);
}

return {
  success: true,
  // ... 原有返回值 ...
};

// 在函数失败返回时 (Line 810-817) 添加:
} catch (error) {
  // 更新队列状态为失败
  if (transactionHash && transactionHash !== 'simulation') {
    await supabase.from('claim_sync_queue')
      .update({
        status: 'failed',
        error_message: error.message,
        failed_at: new Date().toISOString()
      })
      .eq('tx_hash', transactionHash);
  }

  // ... 原有错误处理 ...
}
```

**效果**:
- ✅ 所有升级记录到队列
- ✅ 可以监控失败的升级
- ⏳ 但仍然存在原有的5个问题

---

### 方案B: 完整替换 (2小时)

**使用增强版函数,全面保证同步**

#### 步骤1: 创建辅助表

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

-- 索引
CREATE INDEX idx_reward_retry_status ON reward_retry_queue(status)
WHERE status = 'pending';

CREATE INDEX idx_manual_review_status ON manual_review_queue(status)
WHERE status = 'pending';
```

#### 步骤2: 复制补丁代码

将 `guaranteed-sync-patch.ts` 的内容复制到 `level-upgrade/index.ts`:

```typescript
// 1. 复制辅助函数 (updateQueueStatus, verifyUpgradeComplete, triggerUpgradeRewardsWithRetry)
// 2. 替换 processLevelUpgrade 为 processLevelUpgradeGuaranteed
// 3. 更新 switch case 调用
```

#### 步骤3: 部署

```bash
cd /home/ubuntu/WebstormProjects/BeehiveCheckout
npx supabase functions deploy level-upgrade --project-ref cvqibjcbfrwsgkvthccp
```

**效果**:
- ✅ 强制链上验证
- ✅ 完整性验证
- ✅ 奖励失败自动重试
- ✅ 部分失败人工审核
- ✅ 最终验证步骤

---

## 📊 方案对比

| 特性 | 现状 | 方案A | 方案B |
|------|------|-------|-------|
| 记录到队列 | ❌ | ✅ | ✅ |
| 强制链上验证 | ❌ | ❌ | ✅ |
| 完整性验证 | ❌ | ❌ | ✅ |
| 奖励重试 | ❌ | ❌ | ✅ |
| 人工审核队列 | ❌ | ❌ | ✅ |
| 实施时间 | - | 30分钟 | 2小时 |
| 可靠性评分 | 70/100 | 75/100 | 95/100 |

---

## 🎯 推荐实施路径

### 今天 (30分钟)
**实施方案A**
- 添加队列记录
- 可以监控失败
- 风险最小

### 本周 (2小时)
**升级到方案B**
- 创建辅助表
- 部署增强版函数
- 全面保证同步

### 监控 (持续)
- 查看 `claim_sync_queue` 失败记录
- 处理 `manual_review_queue` 人工审核
- 检查 `reward_retry_queue` 重试队列

---

## 📈 验证清单

### 升级前检查
- [ ] `claim_sync_queue` 表已创建
- [ ] `reward_retry_queue` 表已创建 (方案B)
- [ ] `manual_review_queue` 表已创建 (方案B)
- [ ] 备份现有 level-upgrade 函数

### 升级后验证
- [ ] 测试 Level 2 升级 (需要3个推荐人)
- [ ] 测试 Level 3+ 升级 (连续升级)
- [ ] 检查 `claim_sync_queue` 记录
- [ ] 验证 membership + members + rewards 都创建
- [ ] 测试失败场景 (无效 txHash)

### 监控指标
```sql
-- 查看队列健康状态
SELECT * FROM v_claim_sync_health;

-- 查看待处理的升级
SELECT * FROM v_pending_claim_syncs WHERE source = 'level_upgrade';

-- 查看失败的升级
SELECT * FROM v_failed_claims WHERE source = 'level_upgrade';

-- 查看需要人工审核的
SELECT * FROM manual_review_queue WHERE status = 'pending';

-- 查看奖励重试队列
SELECT * FROM reward_retry_queue WHERE status = 'pending';
```

---

## 🔧 故障排查

### 问题1: 升级成功但 membership 未创建

**症状**:
- `members.current_level` 已更新
- `membership` 表无记录

**解决**:
```sql
-- 手动补充 membership 记录
INSERT INTO membership (
  wallet_address, nft_level, claim_price, claimed_at,
  is_member, unlock_membership_level, total_cost
)
SELECT
  wallet_address,
  current_level as nft_level,
  CASE current_level
    WHEN 1 THEN 130 WHEN 2 THEN 150 WHEN 3 THEN 200
    ELSE 100 + (current_level - 1) * 50
  END as claim_price,
  NOW() as claimed_at,
  true as is_member,
  current_level + 1 as unlock_membership_level,
  CASE current_level
    WHEN 1 THEN 130 WHEN 2 THEN 150 WHEN 3 THEN 200
    ELSE 100 + (current_level - 1) * 50
  END as total_cost
FROM members
WHERE LOWER(wallet_address) = LOWER('0x...')
ON CONFLICT (wallet_address, nft_level) DO NOTHING;
```

### 问题2: 奖励未创建

**症状**:
- 升级成功
- `layer_rewards` 无记录

**解决**:
```sql
-- 添加到奖励重试队列
INSERT INTO reward_retry_queue (
  wallet_address, level, tx_hash, status
) VALUES (
  '0x...', 2, 'recovery_xxx', 'pending'
);

-- 手动触发奖励 RPC
SELECT trigger_layer_rewards_on_upgrade(
  '0x...'::VARCHAR,
  2::INTEGER,
  150::NUMERIC
);
```

### 问题3: 链上已 claim 但数据库无记录

**症状**:
- 链上有 NFT
- `members.current_level` 未更新
- `membership` 无记录

**解决**:
```sql
-- 添加到同步队列
INSERT INTO claim_sync_queue (
  wallet_address, level, tx_hash, status, source
) VALUES (
  '0x...', 2, 'recovery_manual_xxx', 'pending', 'manual_recovery'
);

-- 等待自动处理器处理,或手动触发
```

---

## 📞 需要帮助?

**查看文档**:
- `ANALYSIS_LEVEL_UPGRADE_SYNC.md` - 完整分析
- `guaranteed-sync-patch.ts` - 补丁代码
- `SOLUTION_GUARANTEED_SYNC.md` - 通用同步方案

**监控命令**:
```sql
-- 健康检查
SELECT * FROM v_claim_sync_health;

-- 失败记录
SELECT * FROM v_failed_claims;

-- 人工审核
SELECT * FROM manual_review_queue WHERE status = 'pending';
```

**紧急联系**:
- 检查 `claim_sync_queue` 表
- 查看 Edge Function 日志
- 验证链上交易状态
