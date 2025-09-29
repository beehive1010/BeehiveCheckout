# ThirdWeb Webhook 配置指南

## 🔗 **Webhook URL (用于ThirdWeb Dashboard)**
```
https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/thirdweb-webhook
```

## 🔐 **Webhook Secret (已提供)**
```
5aada87a79b4e45573607a1f46e0f3c8a04141d71044e3f6003c3a5a70e828f6
```

## ⚙️ **Supabase Environment Variables 配置**

在Supabase项目设置中添加以下环境变量：

1. **前往 Supabase Dashboard → Project Settings → Edge Functions**
2. **添加环境变量:**

```bash
THIRDWEB_WEBHOOK_SECRET=5aada87a79b4e45573607a1f46e0f3c8a04141d71044e3f6003c3a5a70e828f6
```

## 📋 **ThirdWeb Dashboard 配置步骤**

### 1. **登录 ThirdWeb Dashboard**
- 访问: https://thirdweb.com/dashboard
- 连接你的钱包

### 2. **选择合约**
- 找到你的NFT合约: `0x36a1aC6D8F0204827Fad16CA5e222F1Aeae4Adc8`
- 确保在 Arbitrum One 网络上

### 3. **配置 Webhook**
- 前往 "Settings" → "Webhooks"
- 点击 "Add Webhook"

**配置参数:**
```
Webhook URL: https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/thirdweb-webhook
Event Types: 
  ✅ pay.onchain-transaction (推荐)
  ✅ TransferSingle (备用)
  ✅ Transfer (备用)
Chain: Arbitrum One (42161)
Contract: 0x36a1aC6D8F0204827Fad16CA5e222F1Aeae4Adc8
Secret: 5aada87a79b4e45573607a1f46e0f3c8a04141d71044e3f6003c3a5a70e828f6
```

### 4. **Headers 配置**
```
Content-Type: application/json
x-payload-signature: [自动生成]
x-timestamp: [自动生成]
```

## 🚀 **部署 Edge Function**

```bash
# 设置环境变量
export SUPABASE_ACCESS_TOKEN=your_token

# 部署 webhook function
supabase functions deploy thirdweb-webhook --project-ref cvqibjcbfrwsgkvthccp
```

## ✅ **支持的 Webhook 格式**

### 1. **ThirdWeb 官方支付 Webhook (推荐)**
```json
{
  "version": 2,
  "type": "pay.onchain-transaction",
  "data": {
    "transactionId": "...",
    "paymentId": "...",
    "status": "COMPLETED",
    "fromAddress": "0x...",
    "toAddress": "0x...",
    "transactionHash": "0x...",
    "chainId": 42161,
    "contractAddress": "0x36a1aC6D8F0204827Fad16CA5e222F1Aeae4Adc8",
    "tokenId": "1",
    "amount": "1",
    "currency": "ETH",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

### 2. **Legacy 合约事件支持**
```json
{
  "type": "TransferSingle",
  "transactionHash": "0x...",
  "blockNumber": 123456,
  "contractAddress": "0x36a1aC6D8F0204827Fad16CA5e222F1Aeae4Adc8",
  "chainId": 42161,
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "operator": "0x...",
    "from": "0x0000000000000000000000000000000000000000",
    "to": "0x...",
    "id": "1",
    "value": "1"
  }
}
```

## 🔒 **安全特性**

- ✅ **HMAC-SHA256 签名验证**
- ✅ **时间戳验证 (5分钟容差)**
- ✅ **合约地址验证**
- ✅ **链ID验证 (Arbitrum One)**
- ✅ **重复处理防护**
- ✅ **Mint事件验证 (from 零地址)**

## 📊 **处理流程**

```
NFT Purchase/Mint → ThirdWeb Webhook → 签名验证 → 合约验证 
    → 用户注册检查 → 重复处理检查 → 自动激活Membership 
    → 矩阵放置 → 奖励分配 → 记录日志
```

## 🛠️ **测试 Webhook**

### 测试连接:
```bash
curl -X POST https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/thirdweb-webhook \
  -H "Content-Type: application/json" \
  -H "x-payload-signature: test" \
  -H "x-timestamp: $(date +%s)" \
  -d '{"version":2,"type":"pay.onchain-transaction","data":{"status":"test"}}'
```

### 检查日志:
```sql
SELECT * FROM webhook_processing_log ORDER BY processed_at DESC LIMIT 10;
```

## 📈 **监控和统计**

查看webhook统计:
```sql
SELECT * FROM webhook_stats;
SELECT * FROM recent_webhook_events LIMIT 20;
```

## 🎯 **预期行为**

1. **用户购买NFT** (通过ThirdWeb或直接合约交互)
2. **Webhook自动触发** 
3. **系统验证用户注册状态**
4. **自动激活Level 1 Membership**
5. **自动分配矩阵位置 (Layer 1, 2, 3等)**
6. **自动触发推荐奖励**
7. **记录完整日志**

## ⚠️ **注意事项**

- 用户必须先注册才能通过webhook激活membership
- 每个交易哈希只会被处理一次
- 只处理从零地址的mint交易
- 只处理指定合约和链的交易
- 失败的激活会被记录但不会重试

---

**配置完成后，整个NFT购买→激活流程将完全自动化！** 🎉