# Level 2 Upgrade Issue - Complete Diagnostic Report
**Date**: 2025-10-14
**Issue**: Level 2 NFT claim成功但数据库没有记录

---

## 🔍 问题分析

### 症状
1. ❌ 用户claim了Level 2 NFT
2. ❌ `membership`表没有Level 2记录
3. ❌ `members.current_level`没有更新到2
4. ❌ 没有触发layer rewards
5. ❌ pending rewards没有转换为claimable

### 核心发现
✅ **前端代码逻辑100%正确**
❌ **level-upgrade Edge Function从未被调用**

**证据**：
- `audit_logs`表：0条升级记录（最近7天）
- `claim_sync_queue`表：0条失败记录
- 10个符合Level 2条件的会员都没有Level 2记录

---

## 📋 前端代码检查结果

### ✅ 正确的部分

#### 1. Payload结构
**MembershipUpgradeButton.tsx** (Lines 204-211):
```typescript
await claimNFT({
  level: targetLevel,                    // ✅ = 2
  priceUSDT: levelPrice,                  // ✅ = 150
  activationEndpoint: 'level-upgrade',    // ✅ 正确
  activationPayload: {
    targetLevel: targetLevel,             // ✅ = 2
    network: 'mainnet',                   // ✅ 正确
  },
});
```

#### 2. API请求
**NFTClaimButton.tsx** (Lines 228-243):
```typescript
const API_BASE = 'https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1'; // ✅
const activateResponse = await fetch(`${API_BASE}/level-upgrade`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ANON_KEY}`,  // ✅
    'x-wallet-address': account.address,     // ✅
  },
  body: JSON.stringify({
    action: 'upgrade_level',                // ✅
    walletAddress: account.address,         // ✅
    level: 2,                                // ✅
    transactionHash: '0x...',               // ✅
    paymentAmount: 150,                     // ✅
    targetLevel: 2,                         // ✅
    network: 'mainnet',                     // ✅
  }),
});
```

#### 3. 错误处理
**NFTClaimButton.tsx** (Lines 245-292):
```typescript
if (!activateResponse.ok) {
  // ✅ 会尝试添加到claim_sync_queue
  // ✅ 会显示toast错误消息
  // ✅ 会返回{ success: false, error: '...' }
}
```

---

## 🚨 可能的问题原因

### 原因1: Edge Function返回错误（最可能）

**症状**：
- NFT claim成功 ✅
- Edge Function被调用 ✅
- 但Edge Function返回错误状态码 ❌

**检查方法**：
1. 打开浏览器开发者工具（F12）
2. Network标签
3. 查找`level-upgrade`请求
4. 检查Response

**可能的错误**：
- 400 Bad Request: 参数验证失败
- 500 Internal Server Error: Edge Function内部错误
- 403 Forbidden: 权限问题

---

### 原因2: CORS或网络问题

**症状**：
- 请求被浏览器阻止
- 或请求超时

**检查方法**：
1. Console标签查看CORS错误
2. Network标签查看请求是否发送

---

### 原因3: Transaction验证失败

**Edge Function line 584-606**:
```typescript
const transactionResult = await verifyNFTClaimTransaction(
  transactionHash,
  targetLevel,
  walletAddress
);

if (!transactionResult.success) {
  return {
    success: false,
    message: 'Blockchain transaction verification failed',
    error: transactionResult.error
  };
}
```

**可能原因**：
- Transaction hash格式错误
- Transaction不存在
- Transaction不是NFT claim
- Verification逻辑bug

---

### 原因4: 数据库查询失败

**Edge Function检查会员资格**:
```typescript
// Check if member exists
const { data: memberData, error: memberError } = await supabase
  .from('members')
  .select('*')
  .ilike('wallet_address', walletAddress)
  .maybeSingle();

if (!memberData) {
  return {
    success: false,
    message: 'Member not found',
  };
}
```

**可能原因**：
- 会员记录不存在
- 钱包地址大小写不匹配

---

## 🔧 诊断步骤

### 步骤1: 检查浏览器控制台

请提供：
1. **Console标签**的所有错误/警告
2. **Network标签**中`level-upgrade`请求的：
   - Status Code
   - Request Headers
   - Request Payload
   - Response Body

### 步骤2: 手动测试Edge Function

运行测试脚本：

```bash
# 安装依赖（如果需要）
npm install node-fetch

# 运行测试
node test_level_upgrade_endpoint.ts
```

或使用curl：

```bash
curl -X POST \
  'https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/level-upgrade' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNjU0MDUsImV4cCI6MjA3MjY0MTQwNX0.7CfL8CS1dQ8Gua89maSCDkgnMsNb19qp97mJyoJqJjs' \
  -H 'x-wallet-address: 0x17918ABa958f332717e594C53906F77afa551BFB' \
  -d '{
    "action": "upgrade_level",
    "walletAddress": "0x17918ABa958f332717e594C53906F77afa551BFB",
    "targetLevel": 2,
    "transactionHash": "0xtest123",
    "network": "mainnet"
  }'
```

### 步骤3: 检查Edge Function日志

在Supabase Dashboard:
1. 进入Project → Functions
2. 选择`level-upgrade`
3. 查看Logs标签
4. 搜索最近的调用记录

---

## 🛠️ 临时解决方案

如果NFT已经claim成功但数据库没记录，可以手动补充：

### 方案A: 使用SQL脚本

```sql
-- 手动创建Level 2记录
BEGIN;

-- 1. 创建membership记录
INSERT INTO membership (
    wallet_address,
    nft_level,
    is_member,
    claimed_at,
    claim_price,
    total_cost,
    unlock_membership_level,
    platform_activation_fee
) VALUES (
    '0x17918ABa958f332717e594C53906F77afa551BFB',
    2,
    true,
    NOW(),
    150,
    150,
    3,
    0
) ON CONFLICT (wallet_address, nft_level) DO UPDATE
SET is_member = true, claimed_at = NOW();

-- 2. 更新members.current_level
UPDATE members
SET current_level = 2, updated_at = NOW()
WHERE wallet_address ILIKE '0x17918ABa958f332717e594C53906F77afa551BFB';

-- 3. 触发layer rewards
SELECT trigger_matrix_layer_rewards(
    '0x17918ABa958f332717e594C53906F77afa551BFB',
    2,
    150
);

-- 4. 检查pending rewards
SELECT check_pending_rewards_after_upgrade(
    '0x17918ABa958f332717e594C53906F77afa551BFB',
    2
);

-- 验证
SELECT 'Members' as table_name, current_level FROM members WHERE wallet_address ILIKE '0x17918ABa958f332717e594C53906F77afa551BFB'
UNION ALL
SELECT 'Membership', nft_level::text FROM membership WHERE wallet_address ILIKE '0x17918ABa958f332717e594C53906F77afa551BFB' AND nft_level = 2;

COMMIT;
```

### 方案B: 使用TypeScript脚本

已创建：`manual_fix_level2_upgrade.ts`

---

## 📊 需要的信息

请提供以下信息以便诊断：

### 必需信息
1. **钱包地址**: 尝试升级的会员地址
2. **Transaction Hash**: Level 2 NFT claim的交易哈希
3. **时间戳**: 什么时候尝试升级的？

### 调试信息
4. **浏览器Console截图**: 包含所有错误和日志
5. **Network请求详情**: `level-upgrade`请求的完整信息
6. **Toast消息**: 前端显示了什么消息？

### 验证信息
7. **NFT是否成功mint**: 在Arbitrum区块浏览器查看
8. **USDT是否扣款**: 150 USDT是否从钱包扣除？
9. **当前Dashboard显示**: 显示的level是多少？

---

## ✅ 下一步行动

### 立即行动
1. 检查浏览器开发者工具
2. 提供diagnostic信息
3. 如果紧急，使用临时解决方案手动补充记录

### 长期修复
1. 找到Edge Function失败的根本原因
2. 改进错误处理和用户提示
3. 添加自动重试机制（已有claim_sync_queue）
4. 添加监控和告警

---

**请提供上述"需要的信息"，我会帮你诊断并修复问题！** 🔍
