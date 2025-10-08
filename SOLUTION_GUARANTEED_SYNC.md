# 🔒 保证链上 Claim 与数据库同步的完整方案

## 📋 目标
**确保链上 NFT claim 确认后,数据库 100% 有 users/members/membership 记录**

---

## 🏗️ 多层保障架构

```
Layer 1: 前端直接调用     ──┐
Layer 2: Webhook 监听      ──┼──→ 数据库同步队列 → 重试机制 → 成功
Layer 3: 定时扫描补偿     ──┘
Layer 4: 手动恢复工具     ──→ 最后兜底
```

---

## 📦 Layer 1: 前端直接调用 (主要路径)

### 1.1 统一 Claim 流程

**创建文件**: `src/hooks/useGuaranteedClaimSync.ts`

```typescript
/**
 * 保证同步的 NFT Claim Hook
 *
 * 特点:
 * 1. 链上 claim 成功后立即调用激活 API
 * 2. 支持重试机制 (最多 5 次)
 * 3. 失败时写入本地队列,后续补偿
 */

import { useState } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { waitForReceipt } from 'thirdweb';
import { arbitrum } from 'thirdweb/chains';
import { client } from '../lib/thirdwebClient';
import { supabase } from '../lib/supabaseClient';

interface ClaimSyncConfig {
  level: number;
  txHash: string;
  referrerWallet?: string;
}

export function useGuaranteedClaimSync() {
  const account = useActiveAccount();
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * 保证同步的核心函数
   */
  const syncClaimToDatabase = async (
    config: ClaimSyncConfig,
    retryCount = 0
  ): Promise<{ success: boolean; error?: string }> => {
    const MAX_RETRIES = 5;
    const { level, txHash, referrerWallet } = config;

    try {
      console.log(`🔄 Syncing claim to database (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      console.log('Config:', { level, txHash, referrerWallet, wallet: account?.address });

      if (!account?.address) {
        throw new Error('No wallet connected');
      }

      // Step 1: 先记录到本地队列 (防止丢失)
      await recordPendingClaim(account.address, level, txHash);

      // Step 2: 调用激活 API
      const API_BASE = import.meta.env.VITE_API_BASE_URL ||
        'https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1';

      const activationEndpoint = level === 1 ? 'activate-membership' : 'level-upgrade';

      const response = await fetch(`${API_BASE}/${activationEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'x-wallet-address': account.address,
        },
        body: JSON.stringify({
          walletAddress: account.address,
          level,
          transactionHash: txHash,
          referrerWallet,
          source: 'frontend_guaranteed_sync', // 标记来源
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API call failed: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Activation API success:', result);

      // Step 3: 验证数据库记录
      const verified = await verifyDatabaseRecords(account.address, level);

      if (!verified) {
        throw new Error('Database verification failed - records not found');
      }

      // Step 4: 移除待处理队列记录
      await removePendingClaim(txHash);

      console.log('✅ Claim sync completed and verified');
      return { success: true };

    } catch (error: any) {
      console.error(`❌ Sync attempt ${retryCount + 1} failed:`, error);

      // 重试逻辑
      if (retryCount < MAX_RETRIES - 1) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // 指数退避
        console.log(`⏳ Retrying in ${delay}ms...`);

        await new Promise(resolve => setTimeout(resolve, delay));
        return syncClaimToDatabase(config, retryCount + 1);
      }

      // 最大重试后仍失败,记录到持久化队列
      await recordFailedClaim(account!.address, level, txHash, error.message);

      return {
        success: false,
        error: `Failed after ${MAX_RETRIES} attempts: ${error.message}`
      };
    }
  };

  /**
   * 完整的 Claim + 同步流程
   */
  const claimWithGuaranteedSync = async (
    claimTxPromise: Promise<{ transactionHash: string }>,
    level: number,
    referrerWallet?: string
  ) => {
    setIsProcessing(true);

    try {
      // 1. 执行链上 claim
      console.log('🎯 Starting claim transaction...');
      const claimTx = await claimTxPromise;

      console.log('⏳ Waiting for transaction confirmation...');

      // 2. 等待交易确认
      await waitForReceipt({
        client,
        chain: arbitrum,
        transactionHash: claimTx.transactionHash,
        maxBlocksWaitTime: 50,
      });

      console.log('✅ Transaction confirmed:', claimTx.transactionHash);

      // 3. 立即同步到数据库 (带重试)
      const syncResult = await syncClaimToDatabase({
        level,
        txHash: claimTx.transactionHash,
        referrerWallet,
      });

      return {
        success: syncResult.success,
        txHash: claimTx.transactionHash,
        error: syncResult.error,
      };

    } catch (error: any) {
      console.error('❌ Claim with sync failed:', error);
      return {
        success: false,
        error: error.message,
      };
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    claimWithGuaranteedSync,
    syncClaimToDatabase,
    isProcessing,
  };
}

/**
 * 记录待处理的 claim (LocalStorage + Supabase)
 */
async function recordPendingClaim(walletAddress: string, level: number, txHash: string) {
  const pendingClaim = {
    wallet_address: walletAddress,
    level,
    tx_hash: txHash,
    status: 'pending',
    created_at: new Date().toISOString(),
    retry_count: 0,
  };

  // 1. 保存到 localStorage (即使 API 失败也能恢复)
  const localQueue = JSON.parse(localStorage.getItem('pending_claims') || '[]');
  localQueue.push(pendingClaim);
  localStorage.setItem('pending_claims', JSON.stringify(localQueue));

  // 2. 保存到 Supabase
  try {
    await supabase.from('claim_sync_queue').insert(pendingClaim);
  } catch (error) {
    console.error('Failed to save to claim_sync_queue:', error);
  }
}

/**
 * 验证数据库记录是否存在
 */
async function verifyDatabaseRecords(walletAddress: string, level: number): Promise<boolean> {
  try {
    // 检查 members 表
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('wallet_address, current_level')
      .eq('wallet_address', walletAddress)
      .single();

    if (memberError || !member) {
      console.error('❌ Member record not found:', memberError);
      return false;
    }

    // 检查 membership 表
    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select('wallet_address, nft_level')
      .eq('wallet_address', walletAddress)
      .eq('nft_level', level)
      .single();

    if (membershipError || !membership) {
      console.error('❌ Membership record not found:', membershipError);
      return false;
    }

    console.log('✅ Database records verified:', { member, membership });
    return true;

  } catch (error) {
    console.error('❌ Verification error:', error);
    return false;
  }
}

/**
 * 移除已完成的待处理记录
 */
async function removePendingClaim(txHash: string) {
  // 1. 从 localStorage 移除
  const localQueue = JSON.parse(localStorage.getItem('pending_claims') || '[]');
  const filtered = localQueue.filter((claim: any) => claim.tx_hash !== txHash);
  localStorage.setItem('pending_claims', JSON.stringify(filtered));

  // 2. 从 Supabase 更新状态
  try {
    await supabase
      .from('claim_sync_queue')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('tx_hash', txHash);
  } catch (error) {
    console.error('Failed to update claim_sync_queue:', error);
  }
}

/**
 * 记录失败的 claim (需要手动处理)
 */
async function recordFailedClaim(
  walletAddress: string,
  level: number,
  txHash: string,
  errorMessage: string
) {
  try {
    await supabase.from('claim_sync_queue').update({
      status: 'failed',
      error_message: errorMessage,
      failed_at: new Date().toISOString(),
    }).eq('tx_hash', txHash);

    // 发送告警 (可选)
    console.error('🚨 ALERT: Claim sync failed permanently:', {
      walletAddress,
      level,
      txHash,
      error: errorMessage,
    });

  } catch (error) {
    console.error('Failed to record failed claim:', error);
  }
}
```

---

## 📊 Layer 2: 数据库同步队列表

### 2.1 创建同步队列表

**文件**: `sql/create_claim_sync_queue.sql`

```sql
-- =====================================================
-- Claim 同步队列表
-- =====================================================
-- 用途: 记录所有 NFT claim 事件,支持重试和失败恢复

CREATE TABLE IF NOT EXISTS claim_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Claim 信息
  wallet_address VARCHAR(42) NOT NULL,
  level INTEGER NOT NULL,
  tx_hash VARCHAR(66) NOT NULL UNIQUE,

  -- 状态追踪
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 5,

  -- 错误信息
  error_message TEXT,
  last_error_at TIMESTAMP,

  -- 来源追踪
  source VARCHAR(50), -- frontend, webhook, manual, recovery_script

  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  failed_at TIMESTAMP,

  -- 元数据
  metadata JSONB DEFAULT '{}'::jsonb,

  -- 约束
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying'))
);

-- 索引
CREATE INDEX idx_claim_sync_queue_status ON claim_sync_queue(status)
WHERE status IN ('pending', 'retrying', 'failed');

CREATE INDEX idx_claim_sync_queue_wallet ON claim_sync_queue(wallet_address);
CREATE INDEX idx_claim_sync_queue_created_at ON claim_sync_queue(created_at DESC);
CREATE INDEX idx_claim_sync_queue_tx_hash ON claim_sync_queue(tx_hash);

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_claim_sync_queue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_claim_sync_queue_timestamp
BEFORE UPDATE ON claim_sync_queue
FOR EACH ROW
EXECUTE FUNCTION update_claim_sync_queue_timestamp();

-- RLS 策略
ALTER TABLE claim_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to claim_sync_queue"
ON claim_sync_queue
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can read own claim sync records"
ON claim_sync_queue
FOR SELECT
USING (LOWER(wallet_address) = LOWER(get_current_wallet_address()));

-- 视图: 待处理和失败的 claims
CREATE OR REPLACE VIEW v_pending_claim_syncs AS
SELECT
  csq.*,
  u.username,
  CASE
    WHEN m.wallet_address IS NOT NULL THEN true
    ELSE false
  END as has_member_record,
  CASE
    WHEN ms.wallet_address IS NOT NULL THEN true
    ELSE false
  END as has_membership_record
FROM claim_sync_queue csq
LEFT JOIN users u ON LOWER(csq.wallet_address) = LOWER(u.wallet_address)
LEFT JOIN members m ON LOWER(csq.wallet_address) = LOWER(m.wallet_address)
LEFT JOIN membership ms ON LOWER(csq.wallet_address) = LOWER(ms.wallet_address)
  AND ms.nft_level = csq.level
WHERE csq.status IN ('pending', 'retrying', 'failed')
ORDER BY csq.created_at ASC;

COMMENT ON TABLE claim_sync_queue IS 'NFT claim 同步队列,确保链上 claim 100% 同步到数据库';
```

---

## 🔄 Layer 3: 后台重试处理器

### 3.1 Supabase Edge Function: claim-sync-processor

**文件**: `supabase/functions/claim-sync-processor/index.ts`

```typescript
/**
 * Claim 同步处理器 - 定时任务
 *
 * 功能:
 * 1. 处理队列中 pending/retrying 状态的 claims
 * 2. 重试失败的 claims (指数退避)
 * 3. 验证数据库记录
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    console.log('🔄 Starting claim sync processor...');

    // 1. 获取待处理的 claims
    const { data: pendingClaims, error: fetchError } = await supabase
      .from('claim_sync_queue')
      .select('*')
      .in('status', ['pending', 'retrying'])
      .lt('retry_count', 5) // 最多重试 5 次
      .order('created_at', { ascending: true })
      .limit(50); // 每次处理 50 条

    if (fetchError) {
      throw new Error(`Failed to fetch pending claims: ${fetchError.message}`);
    }

    console.log(`📊 Found ${pendingClaims?.length || 0} pending claims to process`);

    if (!pendingClaims || pendingClaims.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No pending claims to process',
        processed: 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. 逐个处理
    let successCount = 0;
    let failedCount = 0;

    for (const claim of pendingClaims) {
      console.log(`\n🔄 Processing claim: ${claim.tx_hash} (Level ${claim.level})`);

      // 2.1 更新状态为 processing
      await supabase
        .from('claim_sync_queue')
        .update({ status: 'processing' })
        .eq('id', claim.id);

      try {
        // 2.2 调用激活 API
        const activationEndpoint = claim.level === 1 ? 'activate-membership' : 'level-upgrade';
        const API_BASE = Deno.env.get('SUPABASE_URL');

        const response = await fetch(`${API_BASE}/functions/v1/${activationEndpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'x-wallet-address': claim.wallet_address,
          },
          body: JSON.stringify({
            walletAddress: claim.wallet_address,
            level: claim.level,
            transactionHash: claim.tx_hash,
            source: 'claim_sync_processor',
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Activation API failed: ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Activation successful:', result);

        // 2.3 验证数据库记录
        const { data: member } = await supabase
          .from('members')
          .select('wallet_address')
          .eq('wallet_address', claim.wallet_address)
          .single();

        const { data: membership } = await supabase
          .from('membership')
          .select('wallet_address')
          .eq('wallet_address', claim.wallet_address)
          .eq('nft_level', claim.level)
          .single();

        if (!member || !membership) {
          throw new Error('Database verification failed - records not created');
        }

        // 2.4 标记为完成
        await supabase
          .from('claim_sync_queue')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', claim.id);

        successCount++;
        console.log(`✅ Claim ${claim.tx_hash} completed successfully`);

      } catch (error: any) {
        console.error(`❌ Failed to process claim ${claim.tx_hash}:`, error.message);

        // 2.5 增加重试次数
        const newRetryCount = claim.retry_count + 1;
        const isFinalFailure = newRetryCount >= claim.max_retries;

        await supabase
          .from('claim_sync_queue')
          .update({
            status: isFinalFailure ? 'failed' : 'retrying',
            retry_count: newRetryCount,
            error_message: error.message,
            last_error_at: new Date().toISOString(),
            failed_at: isFinalFailure ? new Date().toISOString() : null,
          })
          .eq('id', claim.id);

        failedCount++;

        if (isFinalFailure) {
          console.error(`🚨 ALERT: Claim ${claim.tx_hash} failed permanently after ${newRetryCount} attempts`);

          // TODO: 发送告警 (Email/Slack/Discord)
        }
      }

      // 添加延迟,避免 API rate limit
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n📊 Processing completed: ${successCount} success, ${failedCount} failed`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Claim sync processing completed',
      processed: pendingClaims.length,
      successful: successCount,
      failed: failedCount,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Claim sync processor error:', error);

    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
```

### 3.2 设置 Cron Job

```sql
-- 每 5 分钟运行一次同步处理器
SELECT cron.schedule(
  'process-claim-sync-queue',
  '*/5 * * * *', -- 每 5 分钟
  $$
  SELECT
    net.http_post(
      url:='https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/claim-sync-processor',
      headers:=jsonb_build_object(
        'Content-Type','application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body:=jsonb_build_object('source', 'cron_job'),
      timeout_milliseconds:=300000
    ) as request_id;
  $$
);
```

---

## 🔍 Layer 4: Webhook 自动监听

### 4.1 更新 Thirdweb Webhook Handler

**文件**: `supabase/functions/thirdweb-webhook/index.ts`

在现有文件中添加:

```typescript
async function handleTransferSingle(supabase: any, data: any) {
  const { operator, from, to, id: tokenId, value, transactionHash } = data;

  console.log(`📦 TransferSingle event:`, {
    from,
    to,
    tokenId,
    transactionHash,
  });

  // 只处理 mint (from = 0x0)
  const isMint = from?.toLowerCase() === '0x0000000000000000000000000000000000000000';

  if (!isMint) {
    console.log('⏭️ Not a mint event, skipping');
    return;
  }

  console.log(`🎁 NFT Minted: Level ${tokenId} to ${to}`);

  // 1. 检查是否已在队列中
  const { data: existingQueue } = await supabase
    .from('claim_sync_queue')
    .select('*')
    .eq('tx_hash', transactionHash)
    .single();

  if (existingQueue) {
    console.log('✅ Claim already in sync queue:', existingQueue.status);
    return;
  }

  // 2. 添加到同步队列
  const { error: queueError } = await supabase
    .from('claim_sync_queue')
    .insert({
      wallet_address: to,
      level: parseInt(tokenId),
      tx_hash: transactionHash,
      status: 'pending',
      source: 'webhook',
      metadata: {
        operator,
        value: value?.toString(),
        event_type: 'TransferSingle',
      },
    });

  if (queueError) {
    console.error('❌ Failed to add to sync queue:', queueError);
    return;
  }

  console.log('✅ Added to claim sync queue, will be processed by processor');

  // 3. 立即尝试同步 (不等待 cron)
  try {
    const API_BASE = Deno.env.get('SUPABASE_URL');
    const activationEndpoint = parseInt(tokenId) === 1 ? 'activate-membership' : 'level-upgrade';

    const response = await fetch(`${API_BASE}/functions/v1/${activationEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'x-wallet-address': to,
      },
      body: JSON.stringify({
        walletAddress: to,
        level: parseInt(tokenId),
        transactionHash,
        source: 'webhook_immediate',
      }),
    });

    if (response.ok) {
      console.log('✅ Immediate sync successful');

      // 更新队列状态
      await supabase
        .from('claim_sync_queue')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('tx_hash', transactionHash);
    } else {
      console.log('⚠️ Immediate sync failed, will retry via processor');
    }

  } catch (error) {
    console.error('⚠️ Immediate sync error (will retry):', error);
  }
}
```

---

## 🔧 Layer 5: 链上扫描恢复脚本

### 5.1 创建恢复脚本

**文件**: `supabase/functions/claim-recovery-scanner/index.ts`

```typescript
/**
 * Claim 恢复扫描器
 *
 * 功能: 扫描链上 NFT 余额,对比数据库记录,自动恢复遗漏的 claims
 *
 * 使用场景:
 * 1. 定时任务 (每小时)
 * 2. 手动触发
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createThirdwebClient, getContract, readContract } from 'https://esm.sh/thirdweb@5';
import { arbitrum } from 'https://esm.sh/thirdweb@5/chains';

const NFT_CONTRACT = '0x018F516B0d1E77Cc5947226Abc2E864B167C7E29';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    console.log('🔍 Starting claim recovery scanner...');

    // 1. 获取所有已注册用户
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('wallet_address');

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    console.log(`📊 Scanning ${users?.length || 0} users...`);

    const client = createThirdwebClient({
      clientId: Deno.env.get('VITE_THIRDWEB_CLIENT_ID')!,
      secretKey: Deno.env.get('VITE_THIRDWEB_SECRET_KEY'),
    });

    const nftContract = getContract({
      client,
      chain: arbitrum,
      address: NFT_CONTRACT,
    });

    let recoveredCount = 0;

    // 2. 逐个检查用户的 NFT 余额
    for (const user of users || []) {
      try {
        // 2.1 检查 Level 1-19 的 NFT 余额
        for (let level = 1; level <= 19; level++) {
          const balance = await readContract({
            contract: nftContract,
            method: "function balanceOf(address account, uint256 id) view returns (uint256)",
            params: [user.wallet_address, BigInt(level)],
          });

          if (Number(balance) > 0) {
            // 用户在链上有这个 level 的 NFT

            // 2.2 检查数据库是否有记录
            const { data: membership } = await supabase
              .from('membership')
              .select('*')
              .eq('wallet_address', user.wallet_address)
              .eq('nft_level', level)
              .single();

            if (!membership) {
              // 链上有 NFT,但数据库没有记录!
              console.log(`🚨 MISMATCH FOUND: ${user.wallet_address} has Level ${level} NFT but no DB record`);

              // 2.3 添加到恢复队列
              const { error: queueError } = await supabase
                .from('claim_sync_queue')
                .insert({
                  wallet_address: user.wallet_address,
                  level,
                  tx_hash: `recovery_${Date.now()}_${user.wallet_address}_${level}`,
                  status: 'pending',
                  source: 'recovery_scanner',
                  metadata: {
                    on_chain_balance: balance.toString(),
                    discovered_at: new Date().toISOString(),
                  },
                });

              if (!queueError) {
                recoveredCount++;
                console.log(`✅ Added to recovery queue: ${user.wallet_address} Level ${level}`);
              }
            }
          }
        }

      } catch (error) {
        console.error(`❌ Error scanning ${user.wallet_address}:`, error);
      }

      // 避免 rate limit
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n📊 Recovery scan completed: ${recoveredCount} mismatches found`);

    return new Response(JSON.stringify({
      success: true,
      scanned: users?.length || 0,
      recovered: recoveredCount,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Recovery scanner error:', error);

    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
```

### 5.2 设置恢复扫描 Cron

```sql
-- 每小时运行一次恢复扫描
SELECT cron.schedule(
  'claim-recovery-scanner',
  '0 * * * *', -- 每小时整点
  $$
  SELECT
    net.http_post(
      url:='https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/claim-recovery-scanner',
      headers:=jsonb_build_object(
        'Content-Type','application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      timeout_milliseconds:=600000
    ) as request_id;
  $$
);
```

---

## 📊 监控和告警系统

### 6.1 创建监控视图

```sql
-- 查看同步队列健康状态
CREATE OR REPLACE VIEW v_claim_sync_health AS
SELECT
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE status = 'retrying') as retrying_count,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
  COUNT(*) FILTER (
    WHERE status = 'pending'
    AND created_at < NOW() - INTERVAL '30 minutes'
  ) as stuck_pending_count,
  AVG(
    CASE WHEN status = 'completed'
    THEN EXTRACT(EPOCH FROM (completed_at - created_at))
    END
  ) as avg_completion_time_seconds,
  MAX(created_at) as last_claim_at,
  MIN(created_at) FILTER (WHERE status IN ('pending', 'retrying')) as oldest_pending_at
FROM claim_sync_queue
WHERE created_at > NOW() - INTERVAL '24 hours';

-- 查看失败的 claims (需要人工介入)
CREATE OR REPLACE VIEW v_failed_claims AS
SELECT
  csq.*,
  u.username,
  m.current_level as db_level,
  ms.nft_level as db_nft_level
FROM claim_sync_queue csq
LEFT JOIN users u ON LOWER(csq.wallet_address) = LOWER(u.wallet_address)
LEFT JOIN members m ON LOWER(csq.wallet_address) = LOWER(m.wallet_address)
LEFT JOIN membership ms ON LOWER(csq.wallet_address) = LOWER(ms.wallet_address)
WHERE csq.status = 'failed'
ORDER BY csq.created_at DESC;
```

### 6.2 告警函数

```sql
-- 每小时检查并发送告警
CREATE OR REPLACE FUNCTION alert_claim_sync_issues()
RETURNS void AS $$
DECLARE
  v_failed_count INTEGER;
  v_stuck_count INTEGER;
BEGIN
  -- 检查失败的 claims
  SELECT failed_count, stuck_pending_count
  INTO v_failed_count, v_stuck_count
  FROM v_claim_sync_health;

  IF v_failed_count > 0 THEN
    RAISE NOTICE '🚨 ALERT: % failed claim syncs detected', v_failed_count;
    -- TODO: 调用 Discord/Slack webhook
  END IF;

  IF v_stuck_count > 0 THEN
    RAISE NOTICE '⚠️ WARNING: % claims stuck in pending for >30 minutes', v_stuck_count;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Cron: 每小时检查
SELECT cron.schedule(
  'alert-claim-sync-issues',
  '15 * * * *',
  'SELECT alert_claim_sync_issues();'
);
```

---

## 🎯 实施步骤

### 第1步: 创建基础设施 (今天)
```bash
# 1. 创建同步队列表
psql $DATABASE_URL < sql/create_claim_sync_queue.sql

# 2. 部署 claim-sync-processor
cd supabase
supabase functions deploy claim-sync-processor

# 3. 部署 claim-recovery-scanner
supabase functions deploy claim-recovery-scanner

# 4. 设置 Cron jobs
psql $DATABASE_URL < sql/setup_claim_sync_cron.sql
```

### 第2步: 更新前端代码 (明天)
```bash
# 1. 创建 useGuaranteedClaimSync hook
# 2. 更新所有 claim 按钮使用新 hook
# 3. 测试完整流程
```

### 第3步: 配置 Webhook (后天)
```bash
# 1. 在 Thirdweb Dashboard 配置 webhook
# 2. 更新 thirdweb-webhook handler
# 3. 测试 webhook 触发
```

### 第4步: 验证和监控 (持续)
```bash
# 1. 监控 v_claim_sync_health
# 2. 检查 v_failed_claims
# 3. 手动处理失败的 claims
```

---

## ✅ 验证清单

- [ ] 同步队列表创建成功
- [ ] claim-sync-processor 部署并运行
- [ ] claim-recovery-scanner 部署并运行
- [ ] Cron jobs 配置成功
- [ ] 前端使用 useGuaranteedClaimSync
- [ ] Webhook 接收 TransferSingle 事件
- [ ] 监控视图正常显示
- [ ] 告警系统正常工作
- [ ] 端到端测试通过

---

## 🔒 保证机制总结

1. **前端立即调用** + 5次重试
2. **本地队列缓存** (LocalStorage)
3. **数据库队列** (claim_sync_queue)
4. **后台处理器** (每5分钟)
5. **Webhook 监听** (实时)
6. **恢复扫描器** (每小时)
7. **手动恢复工具** (兜底)

**保证**: 即使前 6 层全部失败,第 7 层手动恢复也能补救!
