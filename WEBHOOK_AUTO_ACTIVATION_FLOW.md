# ✅ Webhook 自动激活流程

**创建时间**: 2025-10-08
**功能**: 链上 NFT Claim 后自动补充数据库记录

---

## 🎯 问题解决

### 之前的问题
用户 Claim NFT 成功后，如果 activate-membership API 调用失败，数据库记录不会被创建，导致：
- ❌ 前端显示已激活，但数据库没有记录
- ❌ 断开钱包后跳转到 Landing 页面而不是 Dashboard
- ❌ 需要手动补充数据库记录

### 新的解决方案
使用 **Thirdweb Webhook** 监听链上 NFT mint 事件，自动触发数据库记录创建。

---

## 🔄 完整流程

```
用户在前端点击 "Activate Level 1"
    ↓
NFTClaimButton.claimNFT() 执行链上交易
    ├─ 批准 USDT 支出
    └─ Claim NFT (TransferSingle 事件)
    ↓
链上交易成功 ✅
    ↓
┌─────────────────────────────────────────────┐
│ Thirdweb 发送 Webhook 到我们的 Edge Function │
└─────────────────────────────────────────────┘
    ↓
thirdweb-webhook Edge Function 接收事件
    ├─ 事件类型: TransferSingle
    ├─ from: 0x0000...0000 (Zero Address - 表示 mint)
    ├─ to: 用户钱包地址
    ├─ id: NFT Level (1, 2, 或 3)
    └─ transactionHash: 链上交易哈希
    ↓
handleTransferSingle() 处理事件
    ├─ Line 576-591: 记录 transaction_logs
    └─ Line 595-599: 检测到 Level 1-3 mint → 调用 autoActivateMembership()
    ↓
┌─────────────────────────────────────────────┐
│ autoActivateMembership() 自动激活           │
└─────────────────────────────────────────────┘
    ↓
Step 1: 检查是否已激活 (Line 618-628)
    ├─ 查询 membership 表
    └─ 如果已存在 → 跳过激活
    ↓
Step 2: 验证用户注册 (Line 630-641)
    ├─ 查询 users 表
    ├─ 如果未注册 → 跳过激活，等待用户注册
    └─ 获取 referrer_wallet
    ↓
Step 3: 调用 activate-membership Edge Function (Line 649-666)
    ├─ POST to /functions/v1/activate-membership
    ├─ 传递: walletAddress, level, transactionHash, referrerWallet
    └─ 使用 SERVICE_ROLE_KEY (绕过 RLS 限制)
    ↓
┌─────────────────────────────────────────────┐
│ activate-membership Edge Function          │
└─────────────────────────────────────────────┘
    ↓
Step 4: 验证链上 NFT 所有权 ✅
    └─ 调用智能合约 balanceOf()
    ↓
Step 5: 创建 membership 记录 ✅
    └─ INSERT INTO membership (Line 397-401)
    ↓
Step 6: 创建 members 记录 ✅
    └─ INSERT INTO members (Line 442-446)
    ↓
【重要】插入 members 触发数据库触发器！
    ↓
┌─────────────────────────────────────────────┐
│ 数据库触发器自动执行 ✅                      │
└─────────────────────────────────────────────┘
    ↓
触发器 1: sync_member_to_membership_trigger
    └─ 同步 members → membership
    ↓
触发器 2: trg_auto_supplement_new_member
    └─ 创建 referrals 记录 ✅
    ↓
触发器 3: trigger_auto_create_balance_with_initial
    └─ 创建 user_balances 记录 ✅
    └─ 初始余额: 500 BCC + 10,450 BCC (锁定)
    ↓
触发器 4: trigger_recursive_matrix_placement
    └─ 创建 matrix_referrals 记录 ✅
    └─ BFS + L→M→R 矩阵放置
    ↓
触发器 5: trigger_member_initial_level1_rewards
    └─ 分配推荐人奖励 ✅
    └─ 100 USDT → 推荐人
    ↓
┌─────────────────────────────────────────────┐
│ Webhook 记录审计日志 ✅                      │
└─────────────────────────────────────────────┘
    ↓
audit_logs 记录成功或失败信息
    ├─ 成功: webhook_auto_activation
    └─ 失败: webhook_auto_activation_failed
```

---

## 📊 关键代码位置

### 1. Webhook 接收 (thirdweb-webhook/index.ts)

| 行号 | 功能 | 说明 |
|------|------|------|
| 95-98 | 路由 TransferSingle 事件 | 将事件传递给 handleTransferSingle |
| 558-604 | handleTransferSingle() | 处理单个 NFT 转移事件 |
| 595-599 | **NEW**: 自动激活触发 | 检测 Level 1-3 mint 并调用 autoActivateMembership |
| 606-710 | **NEW**: autoActivateMembership() | 自动激活会员逻辑 |

### 2. 自动激活逻辑 (autoActivateMembership)

```typescript
// Line 595-599: 触发条件
if (isMint && to && (id === '1' || id === '2' || id === '3')) {
  console.log(`🎯 NFT Level ${id} minted to ${to} - triggering auto-activation`)
  await autoActivateMembership(supabase, to, id, transactionHash, chainId)
}

// Line 618-628: 防止重复激活
const { data: existingMembership } = await supabase
  .from('membership')
  .select('*')
  .ilike('wallet_address', walletAddress)
  .eq('nft_level', parseInt(tokenId))
  .maybeSingle()

if (existingMembership) {
  console.log(`⚠️ Membership already exists, skipping`)
  return
}

// Line 630-641: 验证用户注册
const { data: userData } = await supabase
  .from('users')
  .select('wallet_address, referrer_wallet')
  .ilike('wallet_address', walletAddress)
  .maybeSingle()

if (!userData) {
  console.log(`⚠️ User not registered, skipping auto-activation`)
  return
}

// Line 649-666: 调用 activate-membership
const activateResponse = await fetch(
  `${supabaseUrl}/functions/v1/activate-membership`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseServiceKey}`, // 使用 SERVICE_ROLE_KEY
      'x-wallet-address': walletAddress,
    },
    body: JSON.stringify({
      walletAddress: walletAddress,
      level: parseInt(tokenId),
      transactionHash: transactionHash,
      referrerWallet: userData.referrer_wallet,
      source: 'webhook_auto_activation'
    }),
  }
)
```

### 3. Edge Function 创建记录 (activate-membership/index.ts)

| 行号 | 功能 | 创建的记录 |
|------|------|-----------|
| 397-401 | 创建 membership 记录 | membership 表 |
| 442-446 | 创建 members 记录 | members 表 → **触发所有触发器** |

---

## 🔐 安全机制

### 1. 防止重复激活 ✅
- **检查位置**: autoActivateMembership Line 618-628
- **逻辑**: 查询 membership 表，如果已存在则跳过

### 2. 验证用户注册 ✅
- **检查位置**: autoActivateMembership Line 630-641
- **逻辑**: 必须在 users 表中注册才能自动激活

### 3. 链上 NFT 验证 ✅
- **检查位置**: activate-membership/index.ts Line 302-386
- **逻辑**: 调用智能合约 balanceOf() 验证 NFT 所有权

### 4. 服务端权限 ✅
- **使用**: SUPABASE_SERVICE_ROLE_KEY
- **原因**: Webhook 使用服务端密钥绕过 RLS 限制

---

## 📝 触发的数据库触发器

当 `activate-membership` 创建 `members` 记录时，以下触发器会自动执行：

| 触发器名称 | 触发时机 | 执行函数 | 创建的记录 |
|-----------|---------|---------|-----------|
| sync_member_to_membership_trigger | AFTER INSERT | sync_member_to_membership() | 同步数据 |
| trg_auto_supplement_new_member | AFTER INSERT | fn_auto_supplement_new_member() | referrals ✅ |
| trigger_auto_create_balance_with_initial | AFTER INSERT | auto_create_user_balance_with_initial() | user_balances ✅ |
| trigger_recursive_matrix_placement | AFTER INSERT | trigger_recursive_matrix_placement() | matrix_referrals ✅ |
| trigger_member_initial_level1_rewards | AFTER INSERT | trigger_initial_level1_rewards() | 推荐人奖励 ✅ |

---

## 🎯 测试场景

### 场景 1: 正常流程 ✅
1. 用户已在 users 表注册
2. 用户 Claim NFT Level 1 成功
3. Webhook 接收 TransferSingle 事件
4. 自动调用 activate-membership
5. 创建所有数据库记录 ✅
6. 用户刷新页面 → 跳转到 Dashboard ✅

### 场景 2: 用户未注册 ✅
1. 用户直接从外部获得 NFT
2. Webhook 接收 TransferSingle 事件
3. 检测到用户未在 users 表注册
4. **跳过自动激活** ⚠️
5. 用户需要先注册，然后手动触发激活

### 场景 3: 重复激活 ✅
1. 用户已经激活过 Level 1
2. Webhook 再次接收 TransferSingle 事件
3. 检测到 membership 已存在
4. **跳过自动激活** ✅

### 场景 4: 前端调用失败，Webhook 成功 ✅
1. 用户 Claim NFT 成功
2. 前端调用 activate-membership 失败 (网络问题)
3. **Webhook 接收链上事件并自动激活** ✅
4. 数据库记录正确创建 ✅
5. 用户刷新页面 → 跳转到 Dashboard ✅

---

## 🔧 配置要求

### Thirdweb Dashboard 设置

1. 登录 Thirdweb Dashboard
2. 选择 NFT 合约 `0xe57332db0B8d7e6aF8a260a4fEcfA53104728693`
3. 进入 "Webhooks" 设置
4. 创建新的 Webhook：
   - **URL**: `https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/thirdweb-webhook`
   - **Events**: ✅ `TransferSingle` (ERC-1155)
   - **Chain**: Arbitrum One (42161)
   - **Secret**: (可选) 设置环境变量 `THIRDWEB_WEBHOOK_SECRET`

### Supabase 环境变量

在 Supabase Dashboard → Settings → Edge Functions → Secrets 中设置：

```bash
SUPABASE_URL=https://cvqibjcbfrwsgkvthccp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
SUPABASE_ANON_KEY=<anon_key>
THIRDWEB_WEBHOOK_SECRET=<webhook_secret> # 可选
```

---

## 📊 监控和日志

### Edge Function 日志
```bash
# 查看 Webhook 日志
supabase functions logs thirdweb-webhook --tail

# 查看激活日志
supabase functions logs activate-membership --tail
```

### 关键日志点

#### Webhook 接收
```
📦 TransferSingle event: { operator, from, to, tokenId, transactionHash }
🎯 NFT Level 1 minted to 0x... - triggering auto-activation
```

#### 自动激活
```
🚀 Auto-activating membership for wallet 0x..., Level 1
📞 Calling activate-membership Edge Function...
✅ Auto-activation successful for 0x... Level 1
```

#### 审计日志
```sql
SELECT * FROM audit_logs
WHERE action IN ('webhook_auto_activation', 'webhook_auto_activation_failed')
ORDER BY created_at DESC;
```

---

## ✅ 优势

### 相比前端调用 activate-membership

1. **可靠性更高**
   - ✅ 不依赖前端网络连接
   - ✅ Webhook 会自动重试失败的请求

2. **覆盖更广**
   - ✅ 捕获所有链上 NFT mint 事件
   - ✅ 即使前端调用失败，Webhook 也能补充记录

3. **去中心化**
   - ✅ 用户可以从任何地方 Claim NFT
   - ✅ 不一定需要通过我们的前端

4. **审计追踪**
   - ✅ transaction_logs 记录所有 NFT 事件
   - ✅ audit_logs 记录所有激活尝试

---

## 🎯 总结

**Webhook 自动激活机制已部署完成！**

### 工作流程
1. ✅ 用户 Claim NFT → 链上交易成功
2. ✅ Thirdweb 发送 TransferSingle 事件到 Webhook
3. ✅ Webhook 检测 Level 1-3 mint → 调用 activate-membership
4. ✅ activate-membership 创建 membership + members 记录
5. ✅ 数据库触发器自动创建所有其他记录
6. ✅ 用户刷新页面 → 正确跳转到 Dashboard

### 数据完整性
- ✅ membership 记录
- ✅ members 记录
- ✅ referrals 记录 (通过触发器)
- ✅ user_balances 记录 (通过触发器)
- ✅ matrix_referrals 记录 (通过触发器)
- ✅ 推荐人奖励 (通过触发器)

**整个激活流程现在完全自动化，即使前端调用失败也能保证数据完整性！** 🎉
