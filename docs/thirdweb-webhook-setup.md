# Thirdweb Webhook 配置指南

## 概述
这个文档说明如何配置 thirdweb webhook 来监控 USDT 提现交易状态。

## Webhook URL
```
https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/thirdweb-webhook
```

## 支持的事件类型

### 1. `transaction.sent` - 交易已发送
当交易被广播到区块链网络时触发。
```json
{
  "eventType": "transaction.sent",
  "data": {
    "transactionHash": "0x...",
    "from": "0x服务器钱包地址",
    "to": "0x接收者地址",
    "value": "1000000000000000000",
    "tokenAddress": "0xfA278827a612BBA895e7F0A4fBA504b22ff3E7C9",
    "chainId": 42161
  }
}
```

### 2. `transaction.mined` - 交易已确认
当交易被矿工打包并写入区块链时触发。
```json
{
  "eventType": "transaction.mined",
  "data": {
    "transactionHash": "0x...",
    "blockNumber": 12345678,
    "gasUsed": "21000",
    "status": "success"
  }
}
```

### 3. `transaction.failed` - 交易失败
当交易执行失败时触发。
```json
{
  "eventType": "transaction.failed",
  "data": {
    "transactionHash": "0x...",
    "error": "Transaction reverted",
    "reason": "Insufficient balance"
  }
}
```

### 4. `wallet.send` - 批量转账操作
当使用 `/v1/wallets/send` API 时触发。
```json
{
  "eventType": "wallet.send",
  "data": {
    "transactionHash": "0x...",
    "recipients": [
      {"address": "0x...", "quantity": "1000000000000000000"}
    ],
    "totalAmount": "1000000000000000000",
    "chainId": 42161
  }
}
```

## Webhook 处理流程

### 交易成功流程
```
1. transaction.sent → 状态更新为 'processing'
2. transaction.mined → 状态更新为 'completed'
3. 发送成功通知给用户
```

### 交易失败流程
```
1. transaction.sent → 状态更新为 'processing'
2. transaction.failed → 状态更新为 'failed'
3. 自动退回用户余额
4. 发送失败通知给用户
```

## 在 thirdweb Dashboard 中设置 Webhook

### 步骤 1: 登录 thirdweb Dashboard
访问: https://thirdweb.com/dashboard

### 步骤 2: 选择项目
选择您的项目或创建新项目。

### 步骤 3: 配置 Webhook
1. 进入 "Settings" → "Webhooks"
2. 点击 "Add Webhook"
3. 输入 Webhook URL: `https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/thirdweb-webhook`

### 步骤 4: 选择事件类型
勾选以下事件：
- ✅ `transaction.sent`
- ✅ `transaction.mined`
- ✅ `transaction.failed`
- ✅ `wallet.send`

### 步骤 5: 配置安全设置（推荐）
1. 生成 Webhook Secret
2. 在 Supabase 环境变量中设置 `THIRDWEB_WEBHOOK_SECRET`

## 环境变量
在 Supabase 项目设置中添加以下环境变量：

```bash
THIRDWEB_WEBHOOK_SECRET=your_webhook_secret_here
```

## 测试 Webhook

### 使用 curl 测试
```bash
curl -X POST https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/thirdweb-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "transaction.sent",
    "data": {
      "transactionHash": "0x1234567890abcdef",
      "from": "0xserver",
      "to": "0xuser",
      "value": "1000000000000000000",
      "chainId": 42161
    }
  }'
```

### 预期响应
```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "eventType": "transaction.sent",
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

## 数据库表结构

### withdrawal_requests
- `status`: 'pending' → 'processing' → 'completed'/'failed'
- `user_transaction_hash`: 交易哈希
- `completed_at`: 完成时间
- `metadata`: webhook 事件数据

### notifications
- `wallet_address`: 用户钱包地址
- `title`: 通知标题
- `message`: 通知内容
- `type`: 'withdrawal'
- `data`: 交易详情

### transaction_logs
- `transaction_hash`: 交易哈希
- `transaction_type`: 'wallet_send'
- `chain_id`: 区块链ID
- `recipients_count`: 接收者数量
- `metadata`: 完整事件数据

## 监控和调试

### 查看 Webhook 日志
在 Supabase Dashboard → Functions → thirdweb-webhook → Logs

### 检查处理状态
```sql
SELECT * FROM withdrawal_requests 
WHERE user_transaction_hash = '0x...'
ORDER BY created_at DESC;
```

### 查看通知记录
```sql
SELECT * FROM notifications 
WHERE type = 'withdrawal' 
ORDER BY created_at DESC;
```

## 安全注意事项

1. **签名验证**: 实现 webhook 签名验证以防止伪造请求
2. **IP 白名单**: 限制只接受来自 thirdweb 服务器的请求
3. **重复处理**: 确保同一事件不会被重复处理
4. **错误处理**: 妥善处理各种错误情况

## 故障排除

### 常见问题
1. **Webhook 未触发**: 检查 thirdweb Dashboard 中的 webhook 配置
2. **签名验证失败**: 确认 `THIRDWEB_WEBHOOK_SECRET` 设置正确
3. **数据库更新失败**: 检查表结构和权限设置

### 调试技巧
1. 查看 Supabase Function 日志
2. 使用 curl 手动测试 webhook
3. 检查数据库中的 webhook 处理记录