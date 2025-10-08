# 🔧 配置 Thirdweb Client ID

## 获取的 Client ID

```
8a03a62aecf43f8444f136509dc34a50
```

## 配置步骤

### 方法 1: 通过 Supabase Dashboard (推荐)

1. **访问 Edge Functions 设置页面**:
   - URL: https://supabase.com/dashboard/project/cvqibjcbfrwsgkvthccp/settings/functions

2. **添加环境变量**:
   - 点击 "Add new secret" 或 "Environment variables"
   - Name: `THIRDWEB_CLIENT_ID`
   - Value: `8a03a62aecf43f8444f136509dc34a50`
   - 点击 "Save"

3. **重新部署函数** (可选，下次部署时自动生效):
   ```bash
   cd /home/ubuntu/WebstormProjects/BeehiveCheckout
   npx supabase functions deploy activate-membership --project-ref cvqibjcbfrwsgkvthccp
   npx supabase functions deploy level-upgrade --project-ref cvqibjcbfrwsgkvthccp
   ```

### 方法 2: 通过 Supabase CLI

```bash
# 设置环境变量
npx supabase secrets set THIRDWEB_CLIENT_ID=8a03a62aecf43f8444f136509dc34a50 --project-ref cvqibjcbfrwsgkvthccp

# 验证设置
npx supabase secrets list --project-ref cvqibjcbfrwsgkvthccp

# 重新部署函数
npx supabase functions deploy activate-membership --project-ref cvqibjcbfrwsgkvthccp
npx supabase functions deploy level-upgrade --project-ref cvqibjcbfrwsgkvthccp
```

---

## 配置后的效果

### ✅ 启用完整的链上交易验证

配置后，后端会：

1. **验证交易存在性**
   - 查询 Arbitrum 区块链
   - 确认交易已确认

2. **验证交易状态**
   - 检查 status === 1 (成功)
   - 拒绝失败的交易

3. **验证交易目标**
   - 确认是 NFT 合约 (0x018F516B0d1E77Cc5947226Abc2E864B167C7E29)
   - 拒绝其他合约的交易

4. **验证 TransferSingle event**
   - 检查 ERC1155 NFT mint 事件
   - 验证接收地址和 tokenId

5. **拒绝伪造交易**
   - 无法通过伪造 txHash 激活
   - 提供额外安全保护

---

## 验证配置是否生效

### 步骤 1: 检查环境变量

```bash
# 方法 1: 通过 CLI
npx supabase secrets list --project-ref cvqibjcbfrwsgkvthccp

# 方法 2: 通过 Dashboard
# 访问: https://supabase.com/dashboard/project/cvqibjcbfrwsgkvthccp/settings/functions
```

**预期输出**:
```
THIRDWEB_CLIENT_ID: 8a03***************
```

### 步骤 2: 查看函数日志

1. 访问: https://supabase.com/dashboard/project/cvqibjcbfrwsgkvthccp/logs/edge-functions

2. 选择 `activate-membership` 函数

3. 查找日志:
   - ✅ 成功: `✅ Transaction verified successfully`
   - ⚠️ 跳过: `⚠️ Missing Thirdweb client ID - skipping blockchain verification`

### 步骤 3: 测试激活

执行一次真实的 Level 1 激活，查看日志输出：

**配置前** (跳过验证):
```
⚠️ Missing Thirdweb client ID - skipping blockchain verification
```

**配置后** (完整验证):
```
🔍 Verifying NFT claim transaction: 0xabc...
📡 Querying transaction receipt from blockchain...
✅ Transaction found: blockNumber: 0x...
✅ Transaction verified successfully
```

---

## 当前状态 vs 配置后对比

### 当前状态 (未配置环境变量)

```
用户 claim NFT ✅
  ↓
调用 activate-membership API
  ↓
后端跳过验证 ⚠️ (没有 client ID)
  ↓
直接创建数据库记录 ✅
  ↓
激活成功 ✅
```

**安全性**: 中等 (没有链上验证)
**功能性**: 正常工作 ✅

### 配置后 (有环境变量)

```
用户 claim NFT ✅
  ↓
调用 activate-membership API
  ↓
后端验证链上交易 ✅
  ├─ 查询交易收据
  ├─ 验证交易状态
  ├─ 验证目标合约
  ├─ 验证 TransferSingle event
  └─ 验证接收地址和 tokenId
  ↓
验证通过 ✅
  ↓
创建数据库记录 ✅
  ↓
激活成功 ✅
```

**安全性**: 高 (完整链上验证)
**功能性**: 正常工作 ✅

---

## 建议执行时间

### 🔥 立即配置 (推荐)

虽然当前系统可以正常工作（跳过验证），但建议立即配置以获得：

1. **额外安全保护**
   - 防止伪造交易
   - 确保真实的链上 claim

2. **完整功能**
   - 启用我们刚才实现的验证功能
   - 充分利用修复的价值

3. **审计追溯**
   - 完整的交易验证日志
   - 更容易排查问题

### ⏰ 非紧急

如果暂时无法配置，系统仍然可以正常工作：
- ✅ 用户可以正常激活
- ✅ 数据记录正常
- ✅ 数据一致性 100%
- ⚠️ 只是缺少链上验证这一层安全保护

---

## 前端环境变量 (已配置)

前端的 Thirdweb client ID 已经配置在 `.env.production`:

```env
VITE_THIRDWEB_CLIENT_ID=8a03a62aecf43f8444f136509dc34a50
```

但 Edge Functions 需要单独配置环境变量（不会自动读取 .env 文件）。

---

## 常见问题

### Q: 配置后需要重新部署吗？

A: 不需要立即重新部署。环境变量会在下次函数执行时自动生效。但如果想立即测试，可以重新部署。

### Q: 如果配置错误的 client ID 会怎样？

A: 验证会失败，但不会影响激活。系统会跳过验证并记录警告，继续正常激活。

### Q: 可以删除这个环境变量吗？

A: 可以。删除后系统会自动跳过验证，像现在一样正常工作。

### Q: 这个 client ID 会过期吗？

A: Thirdweb client ID 通常不会过期，但如果在 Thirdweb dashboard 中删除或重新生成，需要更新这里的配置。

---

## 相关文档

- `HOTFIX_DEPLOYED.md` - 紧急修复说明
- `FIXES_COMPLETED_REPORT.md` - 完整修复报告
- `FINAL_ANALYSIS_SUMMARY.md` - 分析总结

---

**配置时间**: 建议立即配置
**优先级**: 中 (系统可正常工作，但建议配置以获得完整功能)
**影响范围**: activate-membership, level-upgrade 函数
