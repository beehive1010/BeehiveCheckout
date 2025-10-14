# PayEmbed Activation 测试结果

## 📅 测试日期
2025-10-14

## 🎯 测试目标
验证新的 `payembed-activation` Edge Function 是否能正确：
1. 验证 NFT 所有权（链上）
2. 按顺序创建数据库记录
3. 触发矩阵放置和奖励

## ✅ 测试结果总结

### 1. Edge Function 部署 ✅
- **状态**: 成功部署
- **项目**: cvqibjcbfrwsgkvthccp
- **Endpoint**: `https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/payembed-activation`
- **脚本大小**: 520.2kB

### 2. API 授权验证 ✅
- **测试**: 使用 anon key 调用 API
- **结果**: 授权通过，Edge Function 正常响应
- **Headers 需要**:
  ```
  Authorization: Bearer {ANON_KEY}
  apikey: {ANON_KEY}
  x-wallet-address: {WALLET_ADDRESS}
  ```

### 3. NFT 链上验证 ✅
- **测试**: 使用不拥有 NFT 的钱包地址
- **结果**: 正确返回 `NFT_NOT_FOUND` 错误
- **验证合约**: `0x018F516B0d1E77Cc5947226Abc2E864B167C7E29` (Arbitrum)
- **验证方法**: `balanceOf(address, uint256)`
- **错误响应**:
  ```json
  {
    "success": false,
    "error": "NFT_NOT_FOUND",
    "message": "You must own Level 1 NFT to activate",
    "level": 1,
    "walletAddress": "0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab"
  }
  ```

### 4. 完整流程测试 ⏳
**状态**: 需要使用真实拥有 NFT 的钱包进行测试

## 📊 测试用例

### Test Case 1: 无 NFT 钱包 ✅
**输入**:
```json
{
  "walletAddress": "0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab",
  "level": 1,
  "referrerWallet": "0x0000000000000000000000000000000000000000"
}
```

**预期结果**: NFT_NOT_FOUND 错误
**实际结果**: ✅ 符合预期
```json
{
  "success": false,
  "error": "NFT_NOT_FOUND",
  "message": "You must own Level 1 NFT to activate"
}
```

### Test Case 2: 有 NFT 钱包 ⏳
**状态**: 待测试
**需要**: 一个真实拥有 Level 1 NFT 的钱包地址

**预期流程**:
1. ✅ 验证 users 表存在记录
2. ✅ 验证 NFT 所有权（链上）
3. ✅ 创建 membership 记录
4. ✅ 创建 members 记录（触发 triggers）
5. ✅ 创建 referrals 记录
6. ✅ 调用矩阵放置函数
7. ✅ 返回成功响应

**预期响应**:
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

**预期数据库记录**:
```
1. membership 表: 1条新记录
2. members 表: 1条新记录
3. referrals 表: 1条新记录（如果有 referrer）
4. matrix_referrals 表: N条记录（N = 上线层数）
5. user_balances 表: 1条新记录（trigger创建）
6. layer_rewards 表: M条记录（根据矩阵位置）
```

## 🎨 前端集成更新

### 已完成集成 ✅

**文件**: `src/pages/MembershipPurchase.tsx`

**主要变更**:
1. ✅ 更新 API endpoint 从 `activate-membership` 改为 `payembed-activation`
2. ✅ 添加 `apikey` header（Edge Function 授权要求）
3. ✅ 移除 `walletAddress` 参数（通过 `x-wallet-address` header 传递）
4. ✅ 移除 `paymentAmount` 参数（不需要）
5. ✅ 统一处理所有等级（Level 1-19）

**更新前**:
```typescript
const activationEndpoint = level === 1 ? 'activate-membership' : 'level-upgrade';

const response = await fetch(`${API_BASE}/${activationEndpoint}`, {
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${ANON_KEY}`,
    'x-wallet-address': account.address,
  },
  body: JSON.stringify({
    walletAddress: account.address,
    level,
    transactionHash: txHash,
    paymentAmount: parseInt(price!),
    referrerWallet: referrerWallet,
  }),
});
```

**更新后**:
```typescript
const response = await fetch(`${API_BASE}/payembed-activation`, {
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${ANON_KEY}`,
    apikey: `${ANON_KEY}`,
    'x-wallet-address': account.address,
  },
  body: JSON.stringify({
    level,
    transactionHash: txHash,
    referrerWallet: referrerWallet,
  }),
});
```

**优势**:
- ✅ 统一 API endpoint（不再区分 Level 1 和其他等级）
- ✅ 完整链上 NFT 验证
- ✅ 严格数据库操作顺序
- ✅ 更好的错误处理和日志
- ✅ 幂等性支持（防止重复激活）

## 🔧 Edge Function 代码验证

### 已验证的功能 ✅

1. **CORS 处理** ✅
   ```typescript
   if (req.method === 'OPTIONS') {
     return new Response('ok', { headers: corsHeaders })
   }
   ```

2. **钱包地址获取** ✅
   ```typescript
   const headerWalletAddress = req.headers.get('x-wallet-address')
   const walletAddress = headerWalletAddress || bodyWalletAddress
   ```

3. **Thirdweb NFT 验证** ✅
   ```typescript
   const balance = await readContract({
     contract,
     method: "balanceOf",
     params: [walletAddress, BigInt(level)]
   })

   if (Number(balance) === 0) {
     return NFT_NOT_FOUND error
   }
   ```

4. **错误处理** ✅
   - USER_NOT_REGISTERED
   - NFT_NOT_FOUND
   - NFT_VERIFICATION_FAILED
   - MEMBERSHIP_CREATION_FAILED
   - MEMBER_CREATION_FAILED
   - SEQUENCE_ERROR
   - INTERNAL_ERROR

## 📝 测试命令

### 手动测试 API
```bash
curl -X POST https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/payembed-activation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "x-wallet-address: 0xYourWalletAddress" \
  -d '{
    "level": 1,
    "referrerWallet": "0xReferrerAddress"
  }'
```

### 运行自动化测试
```bash
./test-payembed-activation.sh
```

## 🎯 下一步测试计划

### Phase 1: NFT 所有权测试 ✅
- [x] 部署 Edge Function
- [x] 验证授权机制
- [x] 测试 NFT 链上验证
- [x] 确认错误处理

### Phase 2: 前端集成 ✅
- [x] 更新 MembershipPurchase.tsx 使用新 Edge Function
- [x] 添加 apikey header（授权要求）
- [x] 移除不必要的参数（paymentAmount, walletAddress）
- [x] 更新文档说明前端集成

### Phase 3: 完整激活流程测试 ⏳
- [ ] 使用拥有 NFT 的测试钱包
- [ ] 验证 membership 记录创建
- [ ] 验证 members 记录创建
- [ ] 验证 triggers 自动执行
- [ ] 验证 referrals 记录创建
- [ ] 验证矩阵放置功能
- [ ] 验证奖励创建

### Phase 4: 边界条件测试 ⏳
- [ ] 测试重复激活（幂等性）
- [ ] 测试无 referrer 情况
- [ ] 测试无效钱包地址
- [ ] 测试超时处理
- [ ] 测试数据库错误恢复

### Phase 5: 端到端测试 ⏳
- [ ] 测试完整购买流程（从 ClaimNFT → PayEmbed → Dashboard）
- [ ] 验证用户体验
- [ ] 性能测试
- [ ] 多用户并发测试

## 📚 相关文档
- `PAYEMBED_ACTIVATION_FLOW.md` - 完整流程文档
- `MATRIX_PLACEMENT_FLOW.md` - 矩阵放置说明
- `supabase/functions/payembed-activation/index.ts` - Edge Function 源码

## 🔍 Supabase Dashboard 链接
- **Functions**: https://supabase.com/dashboard/project/cvqibjcbfrwsgkvthccp/functions
- **Logs**: https://supabase.com/dashboard/project/cvqibjcbfrwsgkvthccp/functions/payembed-activation/logs
- **Database**: https://supabase.com/dashboard/project/cvqibjcbfrwsgkvthccp/editor

## ✅ 结论

### 当前状态
Edge Function **已成功部署并正常工作**。NFT 验证功能已确认可以正确检查链上所有权。

### 下一步行动
需要使用**真实拥有 Level 1 NFT** 的钱包地址来完成完整流程测试，验证：
1. 数据库记录按正确顺序创建
2. Triggers 自动执行
3. 矩阵放置和奖励正确生成

### 建议
1. 在测试网购买一个 Level 1 NFT 用于测试
2. 或者临时修改 Edge Function 添加测试模式（跳过 NFT 验证）
3. 完成测试后在生产环境部署

---

**测试执行者**: Claude Code
**最后更新**: 2025-10-14
