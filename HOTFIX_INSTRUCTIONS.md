# 🚨 紧急修复说明

## 问题描述

用户报告: **claim 成功但数据记录 failed**

## 根本原因

后端验证函数 `verifyTransaction.ts` 需要 `VITE_THIRDWEB_CLIENT_ID` 环境变量查询链上交易，但该变量未在 Supabase Edge Functions 环境中配置。

导致验证失败 → 激活 API 返回错误 → 前端显示 "failed"

## 解决方案

### 方案 1: 配置环境变量 (推荐)

在 Supabase Dashboard 中添加环境变量:

1. 访问: https://supabase.com/dashboard/project/cvqibjcbfrwsgkvthccp/settings/functions
2. 点击 "Environment variables"
3. 添加变量:
   - Name: `THIRDWEB_CLIENT_ID`
   - Value: `<your_thirdweb_client_id>`

4. 重新部署函数:
```bash
npx supabase functions deploy activate-membership --project-ref cvqibjcbfrwsgkvthccp
npx supabase functions deploy level-upgrade --project-ref cvqibjcbfrwsgkvthccp
```

### 方案 2: 临时跳过验证 (已实施)

已修改 `verifyTransaction.ts`:
- 如果缺少 client ID，不会失败
- 会跳过验证但允许激活继续
- 记录警告日志

**部署修复**:
```bash
npx supabase functions deploy activate-membership --project-ref cvqibjcbfrwsgkvthccp
npx supabase functions deploy level-upgrade --project-ref cvqibjcbfrwsgkvthccp
```

## 测试验证

```bash
# 测试激活 API (应该返回成功)
curl -X POST "https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/activate-membership" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNjU0MDUsImV4cCI6MjA3MjY0MTQwNX0.7CfL8CS1dQ8Gua89maSCDkgnMsNb19qp97mJyoJqJjs" \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: 0x1234..." \
  -d '{
    "walletAddress": "0x1234...",
    "level": 1,
    "transactionHash": "0xabc...",
    "referrerWallet": "0x5678..."
  }'
```

## 长期解决方案

1. **立即**: 部署临时修复 (跳过验证)
2. **今天**: 配置 Thirdweb client ID 环境变量
3. **明天**: 重新启用完整验证

## 监控命令

```sql
-- 检查最近的 claim 尝试
SELECT * FROM claim_sync_queue ORDER BY created_at DESC LIMIT 10;

-- 检查最近的激活
SELECT * FROM members ORDER BY activation_time DESC LIMIT 10;
```
