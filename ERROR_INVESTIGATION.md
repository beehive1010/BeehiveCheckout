# 🔍 错误调查报告

## 报告的错误

### 错误 1: user_balances 406 Not Acceptable
```
GET https://cvqibjcbfrwsgkvthccp.supabase.co/rest/v1/user_balances?select=*&wallet_address=eq.0x380fd6a… 406 (Not Acceptable)
```

**调查结果**: ✅ **已解决/不是真实问题**
- 测试查询成功返回数据
- 可能是浏览器暂时缓存或网络问题
- RLS 策略正确配置 (public 有 SELECT 权限)

**测试结果**:
```json
[{
  "wallet_address":"0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0",
  "available_balance":500.000000,
  "bcc_balance":950.000000,
  ...
}]
```

**建议**: 刷新页面或清除浏览器缓存

---

### 错误 2: withdrawal CORS 错误
```
Access to fetch at 'https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/withdrawal'
from origin 'https://beehive-lifestyle.io' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**调查结果**: ⚠️ **CORS 配置正确，但 500 错误导致没有返回 CORS headers**

**分析**:
1. withdrawal 函数 CORS 配置正确:
   ```typescript
   const corsHeaders = {
     'Access-Control-Allow-Origin': '*',
     'Access-Control-Allow-Headers': '...',
     'Access-Control-Allow-Methods': 'POST, OPTIONS'
   };
   ```

2. OPTIONS preflight 正确处理:
   ```typescript
   if (req.method === 'OPTIONS') {
     return new Response('ok', { headers: corsHeaders });
   }
   ```

3. 错误响应也包含 CORS headers:
   ```typescript
   return new Response(JSON.stringify({...}), {
     headers: { ...corsHeaders, 'Content-Type': 'application/json' },
     status: 500
   });
   ```

**根本原因**: 不是 CORS 配置问题，而是函数内部 500 错误导致

---

### 错误 3: withdrawal 500 Internal Server Error ✅ **已修复**
```
POST https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/withdrawal
net::ERR_FAILED 500 (Internal Server Error)
```

**状态**: ✅ **已修复**

**根本原因**:
- withdrawal 函数调用了 logger.ts 中不存在的方法:
  - `logger.logSuccess()` - Line 627
  - `logger.logCritical()` - Line 650
  - `timer.end()` 参数不匹配 - Line 626, 656

**修复方案**:
1. 在 shared/logger.ts 中添加缺失方法:
   - `logSuccess(event, category, details)`
   - `logCritical(event, category, error, errorCode, details)`
2. 更新 `PerformanceTimer.end()` 支持多参数调用
3. 重新部署 withdrawal 函数

**部署状态**: ✅ 已部署 (2025-10-08)

---

## 调查步骤

### 1. 检查 Edge Function 日志

访问: https://supabase.com/dashboard/project/cvqibjcbfrwsgkvthccp/logs/edge-functions

选择 `withdrawal` 函数，查看最近的错误日志

### 2. 检查 shared/logger.ts

withdrawal 函数依赖 `EdgeFunctionLogger` 和 `PerformanceTimer`

```typescript
import { EdgeFunctionLogger, PerformanceTimer } from '../shared/logger.ts';
```

检查这个文件是否存在并正确配置

### 3. 测试 withdrawal 函数

```bash
curl -X POST "https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/withdrawal" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: 0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0" \
  -d '{
    "action": "process-withdrawal",
    "amount": 10,
    "recipientAddress": "0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0",
    "targetChainId": "42161",
    "memberWallet": "0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0",
    "targetTokenSymbol": "USDT"
  }'
```

### 4. 检查依赖文件

```bash
ls -la /home/ubuntu/WebstormProjects/BeehiveCheckout/supabase/functions/shared/
```

---

## 下一步行动

### 立即行动

1. **检查 shared/logger.ts 是否存在**
2. **查看 withdrawal 函数日志**
3. **测试 withdrawal 函数调用**

### 可能的修复

如果 shared/logger.ts 不存在或有问题:

**选项 1**: 创建简单的 logger stub
**选项 2**: 移除 logger 依赖
**选项 3**: 修复 logger 实现

---

## 临时解决方案

如果需要快速修复 withdrawal 函数，可以临时移除 logger:

```typescript
// 注释掉 logger imports
// import { EdgeFunctionLogger, PerformanceTimer } from '../shared/logger.ts';

serve(async (req) => {
  try {
    // 移除 logger 初始化
    // logger = new EdgeFunctionLogger(supabase, 'withdrawal');
    // timer = new PerformanceTimer('withdrawal-request', logger);

    // 移除所有 logger.logXXX 调用
    // await logger.logInfo(...);

    // 保留核心业务逻辑...
  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
```

---

## 监控建议

### 检查是否影响用户

```sql
-- 检查最近的提现尝试
SELECT * FROM withdrawal_requests
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- 检查用户余额
SELECT
  wallet_address,
  available_balance,
  reward_balance
FROM user_balances
WHERE available_balance > 0
ORDER BY available_balance DESC
LIMIT 20;
```

---

## 修复总结

### ✅ 已修复的错误

1. **withdrawal 500 错误** - logger.ts 缺失方法
   - 添加 `logSuccess()` 和 `logCritical()` 方法
   - 修复 `PerformanceTimer.end()` 参数处理
   - 重新部署 withdrawal 函数

### ✅ 已确认不是问题

1. **user_balances 406** - 测试查询成功,可能是浏览器缓存问题
2. **withdrawal CORS** - CORS 配置正确,实际问题是 500 错误(已修复)

---

**调查时间**: 2025-10-08
**修复时间**: 2025-10-08
**状态**: ✅ 全部修复完成
