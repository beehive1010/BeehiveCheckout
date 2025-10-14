# PayEmbed Activation Flow 文档

## 📋 概述

这是一个新的 Edge Function (`payembed-activation`)，专门处理通过 PayEmbed 购买 NFT 后的会员激活流程。

## 🔄 完整激活流程

```
PayEmbed 购买成功 → 调用 payembed-activation → 按顺序执行数据库操作
```

### 数据库操作顺序

```
1. users (验证)           ← 用户必须先注册
                          ↓
2. membership (创建)      ← 记录会员资格
                          ↓
3. members (创建)         ← 触发自动流程
                          ├→ trigger: sync_member_to_membership_trigger (同步到membership)
                          ├→ trigger: trigger_auto_create_balance_with_initial (创建余额)
                          └→ trigger: trigger_member_initial_level1_rewards (初始奖励)
                          ↓
4. referrals (创建)       ← 记录直推关系
                          ↓
5. matrix_referrals (函数) ← 矩阵放置 + 滑落奖励
   └→ function: place_new_member_in_matrix_correct()
      └→ function: place_member_recursive_generation_based()
         ├→ 递归查找所有上线（最多19层）
         ├→ 在每个上线的矩阵中创建 matrix_referrals 记录
         └→ 触发层级奖励创建
```

## 📝 详细步骤说明

### Step 1: 验证用户注册
```sql
SELECT * FROM users WHERE wallet_address ILIKE ?
```
- **必须条件**: 用户必须先在 `users` 表中注册
- **失败处理**: 返回 `USER_NOT_REGISTERED` 错误
- **referrer获取**: 如果前端未传 referrerWallet，从 users.referrer_wallet 获取

### Step 2: 验证 NFT 所有权（链上）
```typescript
// 使用 Thirdweb SDK 查询链上余额
const balance = await readContract({
  contract,
  method: "balanceOf(address, uint256)",
  params: [walletAddress, level]
})
```
- **验证合约**: `0x018F516B0d1E77Cc5947226Abc2E864B167C7E29` (Arbitrum)
- **验证条件**: balance > 0
- **失败处理**: 返回 `NFT_NOT_FOUND` 错误

### Step 3: 检查已激活（幂等性）
```sql
SELECT * FROM members WHERE wallet_address ILIKE ? AND current_level >= ?
```
- **防止重复**: 如果已激活则直接返回成功
- **返回信息**: 包含现有 member 数据

### Step 4: 创建 membership 记录
```sql
INSERT INTO membership (
  wallet_address,
  nft_level,
  is_member,
  claimed_at,
  unlock_membership_level
) VALUES (?, ?, true, NOW(), ?)
```
- **记录内容**: NFT level、激活时间、会员状态
- **幂等处理**: 如果已存在（23505错误）则继续

### Step 5: 创建 members 记录（核心步骤）
```sql
-- 1. 获取激活序列号
SELECT get_next_activation_sequence()

-- 2. 插入 members 记录
INSERT INTO members (
  wallet_address,
  referrer_wallet,
  current_level,
  activation_sequence,
  activation_time,
  total_nft_claimed,
  is_activated
) VALUES (?, ?, ?, ?, NOW(), 1, true)
```

**自动触发的数据库 Triggers**:
1. `sync_member_to_membership_trigger` - 同步/更新 membership 表
2. `trigger_auto_create_balance_with_initial` - 创建 `user_balances` 记录
3. `trigger_member_initial_level1_rewards` - 创建初始奖励（如果适用）

**超时处理**:
- 设置1秒等待让triggers完成
- 如果timeout (57014错误)，记录详细日志

### Step 6: 创建 referrals 记录
```sql
INSERT INTO referrals (
  referred_wallet,
  referrer_wallet,
  referral_depth,
  created_at
) VALUES (?, ?, 1, NOW())
```
- **referral_depth**: 1 表示直推
- **非关键**: 如果失败，记录错误但继续流程

### Step 7: 触发矩阵放置
```sql
SELECT place_new_member_in_matrix_correct(
  p_member_wallet := ?,
  p_referrer_wallet := ?
)
```

**矩阵放置函数流程**:
```sql
place_new_member_in_matrix_correct()
  └→ place_member_recursive_generation_based()
      ├→ 递归查找上线链条（最多19层）
      ├→ 为每个上线创建 matrix_referrals 记录
      │   ├→ matrix_root_wallet: 上线钱包
      │   ├→ member_wallet: 新会员钱包
      │   ├→ layer: 距离上线的层数
      │   ├→ position: L/M/R 位置
      │   └→ referral_type: direct/spillover
      └→ 触发层级奖励创建
          └→ 每个上线根据其矩阵中的位置获得奖励
```

## 🎯 关键特性

### 1. 幂等性 (Idempotency)
- 检查 `members` 表防止重复激活
- 检查 `membership` 表的唯一约束
- 所有操作可安全重试

### 2. 错误处理
- **USER_NOT_REGISTERED**: 用户未注册
- **NFT_NOT_FOUND**: 链上未找到NFT
- **MEMBERSHIP_CREATION_FAILED**: membership 创建失败
- **MEMBER_CREATION_FAILED**: members 创建失败
- **SEQUENCE_ERROR**: 序列号获取失败

### 3. 超时处理
- members 插入可能触发多个triggers
- 设置合理的超时时间
- 记录超时日志便于问题排查

### 4. 非关键错误
- referrals 创建失败不影响激活
- matrix placement 失败不影响激活（可后续补充）

## 📊 数据库表关系

```
users (已存在)
  └→ membership (新建)
  └→ members (新建)
      ├→ triggers → user_balances (自动)
      ├→ triggers → membership (更新)
      └→ triggers → rewards (自动)
  └→ referrals (新建)
  └→ matrix_referrals (函数创建)
      └→ layer_rewards (自动)
```

## 🚀 部署步骤

### 1. 部署 Edge Function
```bash
cd /home/ubuntu/WebstormProjects/BeehiveCheckout

# 部署新的 Edge Function
supabase functions deploy payembed-activation

# 检查部署状态
supabase functions list
```

### 2. 设置环境变量
确保 Supabase 项目设置中配置了以下环境变量：
- `VITE_THIRDWEB_CLIENT_ID`
- `VITE_THIRDWEB_SECRET_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### 3. 测试调用
```bash
# API Endpoint
https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/payembed-activation

# 测试请求
curl -X POST https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/payembed-activation \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: 0xYourWalletAddress" \
  -d '{
    "level": 1,
    "referrerWallet": "0xReferrerAddress"
  }'
```

## 🔗 前端集成

### ✅ 已完成集成 (MembershipPurchase.tsx)

前端已成功集成 `payembed-activation` Edge Function，位置：
- **文件**: `/src/pages/MembershipPurchase.tsx`
- **行数**: 85-103

### 集成代码
```typescript
// Call payembed-activation Edge Function (new unified activation flow)
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  'https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1';

const response = await fetch(`${API_BASE}/payembed-activation`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    apikey: `${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    'x-wallet-address': account.address,
  },
  body: JSON.stringify({
    level,
    transactionHash: txHash,
    referrerWallet: referrerWallet,
  }),
});
```

### 完整流程
1. 用户在 ClaimNFT 页面选择等级并点击 "Claim" 按钮
2. 跳转到 `/purchase` 页面并传递参数（level, price, referrer）
3. PayEmbed 显示支付界面
4. 用户完成支付（加密货币或信用卡）
5. **PayEmbed onSuccess 触发**
6. **调用 `payembed-activation` Edge Function**
7. Edge Function 执行完整激活流程：
   - ✅ 验证用户注册 (users 表)
   - ✅ 验证 NFT 链上所有权
   - ✅ 创建 membership 记录
   - ✅ 创建 members 记录（触发自动流程）
   - ✅ 创建 referrals 记录
   - ✅ 触发矩阵放置（matrix_referrals + rewards）
8. 返回成功响应
9. 前端显示成功提示并跳转到 Dashboard

### 旧 Edge Function 对比
| 功能 | `activate-membership` (旧) | `payembed-activation` (新) |
|------|---------------------------|---------------------------|
| NFT 验证 | ❌ 跳过链上验证 | ✅ 完整链上验证 |
| 数据库顺序 | ⚠️ 顺序不确定 | ✅ 严格按顺序执行 |
| 矩阵放置 | ✅ 支持 | ✅ 支持 |
| Level 1 专用 | ✅ 是 | ✅ 支持所有等级 (1-19) |
| 错误处理 | ⚠️ 基础 | ✅ 详细错误代码 |
| 幂等性 | ❌ 无 | ✅ 防止重复激活 |

## 📈 监控和日志

### 关键日志点
1. `📝 Step 1: Verifying user registration...`
2. `🔍 Step 2: Verifying NFT ownership on-chain...`
3. `🔍 Step 3: Checking for existing activation...`
4. `📝 Step 4: Creating membership record...`
5. `👥 Step 5: Creating members record...`
6. `🔗 Step 6: Creating referrals record...`
7. `🎯 Step 7: Triggering matrix placement...`

### 成功响应
```json
{
  "success": true,
  "message": "Level 1 membership activated successfully",
  "data": {
    "walletAddress": "0x...",
    "level": 1,
    "activationSequence": 1234,
    "referrerWallet": "0x...",
    "membership": { ... },
    "member": { ... }
  }
}
```

### 错误响应
```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human readable error message",
  "details": { ... }
}
```

## ⚠️ 注意事项

1. **用户必须先注册**: users 表必须有记录
2. **NFT 必须已购买**: 链上验证必须通过
3. **推荐人必须存在**: referrer_wallet 必须在 members 表中
4. **按顺序执行**: 不能跳过任何步骤
5. **triggers 时间**: members 插入可能需要1-2秒完成所有triggers
6. **矩阵放置**: 可能需要额外时间，非阻塞操作

## 🔧 故障排查

### 问题: "USER_NOT_REGISTERED"
- 检查 users 表是否有该钱包地址
- 确保用户完成了注册流程

### 问题: "NFT_NOT_FOUND"
- 检查链上是否真的拥有NFT
- 确认合约地址正确
- 检查network（Arbitrum）

### 问题: "MEMBER_CREATION_FAILED"
- 检查 activation_sequence 函数是否正常
- 检查 referrer_wallet 是否存在于 members 表
- 查看详细错误信息

### 问题: Timeout
- 检查数据库triggers是否有死锁
- 检查矩阵放置函数性能
- 考虑禁用某些非关键triggers

## 📚 相关文档

- `MATRIX_PLACEMENT_FLOW.md` - 矩阵放置详细说明
- `DATABASE_CLEANUP_COMPLETE.md` - 数据库清理记录
- `activate-membership/index.ts` - 原有的激活函数（参考）

---

**创建日期**: 2025-10-14
**版本**: v1.0
**作者**: Claude Code
