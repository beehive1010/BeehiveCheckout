# Webhook Members 记录创建问题

**问题发现时间**: 2025-10-08
**用户**: 0xc26EC29A4b08bC9B8E292574F893606930E66E1C

---

## 🐛 问题描述

Webhook 自动激活流程中，`activate-membership` Edge Function 被正确调用，但是 **members 记录创建失败**，导致后续的 referrals、user_balances、matrix_referrals 等记录都没有被创建。

---

## 📊 问题表现

### Webhook 调用成功
```json
{
  "action": "webhook_auto_activation",
  "user_wallet": "0xc26EC29A4b08bC9B8E292574F893606930E66E1C",
  "new_values": {
    "activation_result": {
      "success": true,
      "message": "Level 1 membership activation completed with all related records",
      "result": {
        "completedSteps": {
          "membershipCreated": true,          // ✅ 成功
          "memberRecordCreated": false,       // ❌ 失败 - 问题所在！
          "referralRecorded": false,          // ❌ 因为 members 没创建
          "matrixPlaced": false,              // ❌ 因为 members 没创建
          "layerRewardProcessed": true,
          "usdcTransferInitiated": false
        },
        "member": null,                       // ❌ 应该有值
        "referral": null,                     // ❌ 应该有值
        "membership": { ... }                 // ✅ 已创建
      }
    }
  }
}
```

### 数据库记录状态（问题发生时）
| 表名 | 记录数 | 状态 |
|------|--------|------|
| users | 1 | ✅ 已存在 |
| membership | 1 | ✅ webhook 创建成功 |
| members | 0 | ❌ **创建失败** |
| referrals | 0 | ❌ 触发器未执行 |
| user_balances | 0 | ❌ 触发器未执行 |
| matrix_referrals | 0 | ❌ 触发器未执行 |

---

## 🔍 根本原因分析

### 1. activate-membership Edge Function 的 members 创建逻辑

**代码位置**: `supabase/functions/activate-membership/index.ts:417-456`

```typescript
// Step 4: Now that membership is created, create members record
let memberRecord = null;
try {
  console.log(`👥 Creating members record for: ${walletAddress}`);

  // Get the next activation sequence number
  const { data: nextSequence, error: seqError } = await supabase
    .rpc('get_next_activation_sequence');

  if (seqError) {
    console.error('❌ Failed to get activation sequence:', seqError);
    throw new Error(`Failed to get activation sequence: ${seqError.message}`);
  }

  console.log(`🔢 Assigned activation_sequence: ${nextSequence}`);

  const memberData = {
    wallet_address: walletAddress,
    referrer_wallet: normalizedReferrerWallet,
    current_level: level,
    activation_sequence: nextSequence,
    activation_time: new Date().toISOString(),
    total_nft_claimed: 1
  };

  const { data: newMember, error: memberError } = await supabase
    .from('members')
    .insert(memberData)
    .select()
    .single();

  if (memberError) {
    console.warn('⚠️ Failed to create members record:', memberError);  // ⚠️ 只警告不抛出
  } else {
    memberRecord = newMember;
    console.log(`✅ Members record created: ${memberRecord.wallet_address}`);
  }
} catch (memberErr) {
  console.warn('⚠️ Members record creation error (non-critical):', memberErr);  // ⚠️ 捕获但不阻止
}
```

**问题点**:
1. ❌ Line 448-450: 如果 `memberError` 存在，只打印警告，不抛出错误
2. ❌ Line 454-456: catch 块捕获错误但标记为 "non-critical"，不阻止流程继续
3. ❌ 导致 `memberRecord = null`，后续依赖 memberRecord 的步骤都被跳过

### 2. 手动测试成功

使用相同的参数手动插入 members 记录**成功**：

```sql
INSERT INTO members (
  wallet_address,
  referrer_wallet,
  current_level,
  activation_sequence,
  activation_time,
  total_nft_claimed
)
VALUES (
  '0xc26EC29A4b08bC9B8E292574F893606930E66E1C',
  '0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0',
  1,
  3959,
  NOW(),
  1
);

-- 结果：
-- ✅ INSERT 成功
-- ✅ 触发器自动执行
-- ✅ 所有相关记录（referrals, user_balances, matrix_referrals）都创建成功
```

这证明：
- ✅ RLS 策略允许插入
- ✅ `get_next_activation_sequence()` 函数工作正常
- ✅ 数据格式正确
- ✅ 触发器正常工作

### 3. 可能的原因

由于手动插入成功，但 Edge Function 插入失败，可能的原因：

1. **Supabase Client 配置问题**
   - Edge Function 可能使用了 anon key 而不是 service_role key
   - 或者 supabase client 初始化时有问题

2. **环境变量问题**
   - `SUPABASE_SERVICE_ROLE_KEY` 可能未设置或过期
   - Edge Function 运行时环境与本地不同

3. **并发问题**
   - webhook 可能在很短时间内被多次调用
   - `get_next_activation_sequence()` 的 advisory lock 可能有问题

4. **数据类型问题**
   - `activation_time` 使用 `new Date().toISOString()` 可能格式不兼容
   - `nextSequence` 类型转换问题

---

## ✅ 解决方案

### 临时解决方案（已执行）

手动创建 members 记录来补充缺失的数据：

```sql
INSERT INTO members (
  wallet_address,
  referrer_wallet,
  current_level,
  activation_sequence,
  activation_time,
  total_nft_claimed
)
VALUES (
  '0xc26EC29A4b08bC9B8E292574F893606930E66E1C',
  '0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0',
  1,
  3959,
  NOW(),
  1
);
```

**结果**: ✅ 所有记录成功创建

### 长期解决方案

#### 1. 改进 activate-membership 错误处理

修改 `supabase/functions/activate-membership/index.ts`:

```typescript
// Step 4: Create members record (CRITICAL - must succeed)
let memberRecord = null;
console.log(`👥 Creating members record for: ${walletAddress}`);

// Get the next activation sequence number
const { data: nextSequence, error: seqError } = await supabase
  .rpc('get_next_activation_sequence');

if (seqError) {
  console.error('❌ Failed to get activation sequence:', seqError);
  return new Response(JSON.stringify({
    success: false,
    error: 'ACTIVATION_SEQUENCE_FAILED',
    message: `Failed to get activation sequence: ${seqError.message}`,
    details: seqError
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 500
  });
}

console.log(`🔢 Assigned activation_sequence: ${nextSequence}`);

const memberData = {
  wallet_address: walletAddress,
  referrer_wallet: normalizedReferrerWallet,
  current_level: level,
  activation_sequence: nextSequence,
  activation_time: new Date().toISOString(),
  total_nft_claimed: 1
};

const { data: newMember, error: memberError } = await supabase
  .from('members')
  .insert(memberData)
  .select()
  .single();

if (memberError) {
  console.error('❌ CRITICAL: Failed to create members record:', memberError);
  return new Response(JSON.stringify({
    success: false,
    error: 'MEMBER_CREATION_FAILED',
    message: `Failed to create members record: ${memberError.message}`,
    details: memberError,
    memberData: memberData  // 返回尝试插入的数据用于调试
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 500
  });
}

memberRecord = newMember;
console.log(`✅ Members record created: ${memberRecord.wallet_address}`);
```

**关键改进**:
- ✅ members 创建失败时立即返回错误响应
- ✅ 不再使用 try-catch 捕获错误
- ✅ 返回详细的错误信息用于调试
- ✅ 确保 members 记录创建成功才继续后续步骤

#### 2. 验证 Supabase Client 配置

检查 Edge Function 是否使用 SERVICE_ROLE_KEY:

```typescript
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',  // ✅ 确保使用 SERVICE_ROLE_KEY
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

#### 3. 添加详细日志

在 members 创建前后添加详细日志：

```typescript
console.log('📝 Member data to insert:', JSON.stringify(memberData, null, 2));
console.log('📝 Supabase client auth:', supabase.auth ? 'initialized' : 'not initialized');
console.log('📝 Current user:', await supabase.auth.getUser());

const { data: newMember, error: memberError } = await supabase
  .from('members')
  .insert(memberData)
  .select()
  .single();

console.log('📝 Insert result:', { data: newMember, error: memberError });
```

#### 4. 添加重试机制

对于临时性失败，添加重试：

```typescript
async function createMemberWithRetry(supabase, memberData, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const { data, error } = await supabase
      .from('members')
      .insert(memberData)
      .select()
      .single();

    if (!error) return { data, error: null };

    console.warn(`⚠️ Attempt ${i + 1}/${maxRetries} failed:`, error);

    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }

  return { data: null, error: new Error('Max retries exceeded') };
}
```

---

## 🧪 测试步骤

### 1. 测试 activate-membership 直接调用

```bash
curl -X POST "https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/activate-membership" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  -H "x-wallet-address: 0xTEST..." \
  -d '{
    "walletAddress": "0xTEST...",
    "level": 1,
    "transactionHash": "0xtest123",
    "referrerWallet": "0xREFERRER..."
  }'
```

### 2. 检查返回结果

确认 `completedSteps.memberRecordCreated` 为 `true`

### 3. 验证数据库记录

```sql
SELECT * FROM members WHERE wallet_address ILIKE '0xTEST...';
SELECT * FROM referrals WHERE member_wallet ILIKE '0xTEST...';
SELECT * FROM user_balances WHERE wallet_address ILIKE '0xTEST...';
SELECT * FROM matrix_referrals WHERE member_wallet ILIKE '0xTEST...';
```

---

## 📝 总结

**问题**: activate-membership Edge Function 创建 members 记录失败，但只打印警告不抛出错误

**影响**:
- membership 记录创建成功 ✅
- members 记录创建失败 ❌
- 所有依赖 members 的记录都未创建 ❌

**临时修复**:
- 手动插入 members 记录 ✅
- 触发器自动创建所有相关记录 ✅

**需要修复**:
1. 改进 activate-membership 错误处理（立即返回错误）
2. 添加详细日志用于调试
3. 验证 Supabase Client 配置
4. 添加重试机制

**测试用户**: 0xc26EC29A4b08bC9B8E292574F893606930E66E1C - ✅ 已修复
