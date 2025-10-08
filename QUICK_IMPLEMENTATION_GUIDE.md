# ⚡ 快速实施指南 - 保证链上 Claim 同步

## ✅ 已完成

1. **数据库同步队列表** ✅
   - `claim_sync_queue` 表已创建
   - 监控视图 `v_claim_sync_health` 已创建
   - 待处理视图 `v_pending_claim_syncs` 已创建

## 🚀 立即可用的解决方案

### 方案1: 最小实施 (30分钟)

**只需修改前端 claim 按钮,添加数据库记录验证**

#### 步骤1: 更新 `MembershipActivationButton.tsx`

在文件 `src/components/membership/ActiveMember/MembershipActivationButton.tsx` 的 `handleActivate` 函数中添加:

```typescript
const handleActivate = async () => {
  // ... 现有代码 ...

  try {
    // 1. 执行 claim (现有代码)
    const result = await claimNFT({
      level: 1,
      priceUSDT: LEVEL_1_PRICE,
      activationEndpoint: 'activate-membership',
      activationPayload: { referrerWallet },
      onSuccess: async () => {
        // 2. 添加验证逻辑
        console.log('✅ Claim success, verifying database...');

        // 重试验证最多5次
        let verified = false;
        for (let i = 0; i < 5; i++) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒

          // 检查数据库记录
          const { data: member } = await supabase
            .from('members')
            .select('*')
            .eq('wallet_address', account.address)
            .single();

          if (member) {
            verified = true;
            console.log('✅ Database record verified');
            break;
          }

          console.log(`⏳ Verification attempt ${i + 1}/5...`);
        }

        if (!verified) {
          // 如果验证失败,记录到队列
          console.error('⚠️ Database verification failed, adding to sync queue');

          await supabase.from('claim_sync_queue').insert({
            wallet_address: account.address,
            level: 1,
            tx_hash: result.txHash || `manual_${Date.now()}`,
            status: 'pending',
            source: 'frontend_verification_failed',
          });

          toast({
            title: '⚠️ 激活可能延迟',
            description: '您的 NFT 已 claim,但数据同步可能需要几分钟。如果长时间未更新,请联系客服。',
            variant: 'default',
            duration: 10000,
          });
        }

        // 继续现有逻辑
        if (onSuccess) onSuccess();
        setTimeout(() => window.location.href = '/dashboard', 1500);
      },
    });

  } catch (error) {
    console.error('❌ Activation error:', error);
  }
};
```

**效果**: 即使激活 API 失败,也会记录到 `claim_sync_queue`,后续自动处理

---

### 方案2: 标准实施 (2小时)

#### 步骤1: 部署后台处理器

**创建文件**: `supabase/functions/claim-sync-processor/index.ts`

<details>
<summary>点击查看完整代码</summary>

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    // 获取待处理的 claims
    const { data: pendingClaims } = await supabase
      .from('claim_sync_queue')
      .select('*')
      .in('status', ['pending', 'retrying'])
      .lt('retry_count', 5)
      .order('created_at')
      .limit(50);

    let successCount = 0;

    for (const claim of pendingClaims || []) {
      try {
        // 调用激活 API
        const endpoint = claim.level === 1 ? 'activate-membership' : 'level-upgrade';
        const API_BASE = Deno.env.get('SUPABASE_URL');

        const response = await fetch(`${API_BASE}/functions/v1/${endpoint}`, {
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
          }),
        });

        if (response.ok) {
          await supabase
            .from('claim_sync_queue')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('id', claim.id);
          successCount++;
        } else {
          throw new Error(await response.text());
        }

      } catch (error: any) {
        const newRetryCount = claim.retry_count + 1;
        await supabase
          .from('claim_sync_queue')
          .update({
            status: newRetryCount >= 5 ? 'failed' : 'retrying',
            retry_count: newRetryCount,
            error_message: error.message,
          })
          .eq('id', claim.id);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return new Response(JSON.stringify({
      success: true,
      processed: pendingClaims?.length || 0,
      successful: successCount,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```
</details>

**部署**:
```bash
cd /home/ubuntu/WebstormProjects/BeehiveCheckout
npx supabase functions deploy claim-sync-processor --project-ref cvqibjcbfrwsgkvthccp
```

#### 步骤2: 设置定时任务 (Cron)

在 Supabase Dashboard → Database → Cron Jobs 或运行 SQL:

```sql
SELECT cron.schedule(
  'process-claim-sync-queue',
  '*/5 * * * *', -- 每5分钟
  $$
  SELECT net.http_post(
    url:='https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/claim-sync-processor',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNzY5MjQ4OCwiZXhwIjoyMDQzMjY4NDg4fQ.T5VjmF6L3f3cEWZ7cEBNsJqAJ0Tz9R8xPJHEJQYMXZ0'
    ),
    timeout_milliseconds:=300000
  );
  $$
);
```

**验证**:
```sql
-- 查看 Cron job 状态
SELECT * FROM cron.job WHERE jobname = 'process-claim-sync-queue';
```

---

### 方案3: 完整实施 (1天)

**包含方案1 + 方案2 + Webhook + 恢复扫描器**

详见 `SOLUTION_GUARANTEED_SYNC.md`

---

## 📊 监控命令

### 查看队列健康状态

```sql
SELECT * FROM v_claim_sync_health;
```

**输出示例**:
```
pending_count | retrying_count | failed_count | completed_count
--------------+----------------+--------------+-----------------
      2       |       1        |      0       |      156
```

### 查看待处理的 claims

```sql
SELECT
  wallet_address,
  level,
  status,
  retry_count,
  created_at,
  error_message
FROM v_pending_claim_syncs
ORDER BY created_at;
```

### 查看失败的 claims

```sql
SELECT * FROM v_failed_claims;
```

### 手动重试失败的 claim

```sql
UPDATE claim_sync_queue
SET status = 'pending', retry_count = 0
WHERE id = 'xxx-failed-claim-id';
```

---

## 🔧 手动触发处理器

如果不想等 Cron,可以手动触发:

```bash
curl -X POST "https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/claim-sync-processor" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

---

## ⚠️ 紧急恢复步骤

### 如果发现用户链上有 NFT 但数据库无记录:

**步骤1**: 添加到同步队列

```sql
INSERT INTO claim_sync_queue (
  wallet_address,
  level,
  tx_hash,
  status,
  source
) VALUES (
  '0xE38d25F180D17EbA3e5ebB65e8D310B5E9702a37',
  1,
  'manual_recovery_' || extract(epoch from now())::text,
  'pending',
  'manual_admin'
);
```

**步骤2**: 立即触发处理器

```bash
curl -X POST "https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/claim-sync-processor" \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]"
```

**步骤3**: 验证

```sql
SELECT * FROM members WHERE wallet_address = '0xE38d25F180D17EbA3e5ebB65e8D310B5E9702a37';
SELECT * FROM membership WHERE wallet_address = '0xE38d25F180D17EbA3e5ebB65e8D310B5E9702a37';
```

---

## 📈 预期效果

**实施方案1后**:
- ✅ 前端 claim 失败时自动记录到队列
- ✅ 用户看到友好提示
- ⏳ 需要手动处理队列

**实施方案2后**:
- ✅ 每5分钟自动处理队列
- ✅ 失败自动重试(最多5次)
- ✅ 无需人工干预

**实施方案3后**:
- ✅ Webhook 实时监听链上事件
- ✅ 每小时扫描恢复遗漏的 claims
- ✅ 完整的监控告警系统

---

## 🎯 推荐实施顺序

1. **今天**: 实施方案1 (30分钟)
2. **明天**: 实施方案2 (2小时)
3. **本周**: 实施方案3 (1天)

---

## 📞 需要帮助?

查看详细文档:
- `SOLUTION_GUARANTEED_SYNC.md` - 完整解决方案
- `ANALYSIS_CLAIM_SYNC_ISSUE.md` - 问题分析报告

检查数据库:
```sql
-- 查看队列状态
SELECT * FROM v_claim_sync_health;

-- 查看待处理
SELECT * FROM v_pending_claim_syncs;

-- 查看失败
SELECT * FROM v_failed_claims;
```
