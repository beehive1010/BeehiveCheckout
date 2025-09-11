# 手动部署指南

## 🚨 认证问题解决方案

由于CLI认证问题，以下是手动部署的步骤：

## 📋 修复后的函数清单

### 1. auth函数 ✅ 已修复
**位置**: `supabase/functions/auth/index.ts`  
**修复内容**:
- 链上同步前检查用户注册
- 强化推荐人验证
- 大小写不敏感查询

### 2. activate-membership函数 ✅ 已修复  
**位置**: `supabase/functions/activate-membership/index.ts`  
**修复内容**:
- NFT同步前强制用户验证
- 修复levels_owned重复问题
- 大小写不敏感查询

### 3. member-management函数 ✅ 已修复
**位置**: `supabase/functions/member-management/index.ts`  
**修复内容**:
- 数据同步前检查用户注册
- 增强安全性验证
- 大小写不敏感查询

### 4. balance函数 ✅ 已修复
**位置**: `supabase/functions/balance/index.ts`  
**修复内容**:
- 余额查询前验证用户注册
- 防止未注册用户访问
- 大小写不敏感查询

### 5. matrix函数 ⏳ 待完整集成
**位置**: `supabase/functions/matrix/index.ts`  
**修复内容**:
- 准备集成安全placement算法
- 位置冲突检测
- 严格L-M-R顺序验证

## 🔧 部署方法选项

### 选项1: 通过Supabase Dashboard
1. 访问 https://supabase.com/dashboard/project/cvqibjcbfrwsgkvthccp
2. 进入 Edge Functions 页面
3. 编辑或创建每个函数
4. 复制粘贴修复后的代码

### 选项2: 修复CLI认证后部署
```bash
# 重新登录
supabase logout
supabase login

# 重新链接项目
supabase link --project-ref cvqibjcbfrwsgkvthccp

# 部署函数
supabase functions deploy auth
supabase functions deploy activate-membership  
supabase functions deploy member-management
supabase functions deploy balance
```

### 选项3: 使用API直接上传
```bash
# 使用curl上传函数代码
curl -X POST https://api.supabase.com/v1/projects/cvqibjcbfrwsgkvthccp/functions/auth \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source": "函数代码..."}'
```

## 📊 当前函数状态

根据之前的查询，以下函数需要更新：

| 函数名 | 当前版本 | 状态 | 需要更新 |
|--------|----------|------|----------|
| auth | v49 | ACTIVE | ✅ 是 |
| activate-membership | v18 | ACTIVE | ✅ 是 |
| member-management | v2 | ACTIVE | ✅ 是 |
| balance | v9 | ACTIVE | ✅ 是 |
| matrix | v16 | ACTIVE | ⏳ 准备中 |

## 🛡️ 修复验证清单

部署后请验证以下功能：

### auth函数验证:
- [ ] 用户注册需要有效推荐人
- [ ] 推荐人必须是激活会员  
- [ ] 返回清晰的错误消息

### activate-membership函数验证:
- [ ] NFT激活前检查用户注册
- [ ] levels_owned不再出现重复值
- [ ] 链上NFT同步需要用户注册

### member-management函数验证:
- [ ] 数据同步前验证用户存在
- [ ] 未注册用户无法同步数据
- [ ] 错误处理更加完善

### balance函数验证:
- [ ] 余额查询需要用户注册
- [ ] 未注册用户被拒绝访问
- [ ] 查询支持大小写不敏感

## 🎯 关键代码片段

### auth函数关键修复:
```typescript
// 用户注册验证
const { data: userData, error: userError } = await supabase
  .from('users')
  .select('wallet_address')
  .ilike('wallet_address', walletAddress)
  .single();

if (userError || !userData) {
  return new Response(JSON.stringify({
    success: false,
    error: 'User must be registered before accessing...'
  }), { status: 403 });
}
```

### activate-membership函数关键修复:
```typescript
// NFT同步前用户验证
console.log(`🔍 Checking if user is registered before NFT sync: ${walletAddress}`);
const { data: userData, error: userError } = await supabase
  .from('users')
  .select('wallet_address, referrer_wallet, username, email')
  .ilike('wallet_address', walletAddress)
  .single();

if (userError || !userData) {
  return {
    hasNFT: false,
    error: 'User must be registered before NFT synchronization can occur.'
  };
}
```

## 📝 部署完成后的测试

1. **用户注册流程测试**
   - 尝试用无效推荐人注册 (应该失败)
   - 用有效激活会员推荐注册 (应该成功)

2. **NFT激活流程测试**  
   - 未注册用户尝试激活 (应该失败)
   - 已注册用户激活NFT (应该成功)

3. **数据查询测试**
   - 未注册用户查询余额 (应该失败)
   - 已注册用户查询余额 (应该成功)

4. **矩阵完整性测试**
   - 检查位置是否有冲突
   - 验证L-M-R顺序正确

---

**注意**: 这些修复解决了严重的数据一致性和安全问题。建议先在测试环境验证，然后再部署到生产环境。