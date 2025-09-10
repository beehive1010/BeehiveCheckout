# 修复Edge Function中的重复调用问题

## 🔍 问题分析

在 `activate-membership/index.ts` 中存在两处调用 `activate_nft_level1_membership` 函数：

1. **第118行**: 主流程调用 `activateNftLevel1Membership`
2. **第446行**: `checkExistingNFTAndSync` 函数中也调用了数据库函数

这导致同一个用户可能被激活两次，造成 `levels_owned` 出现 `[1,1]` 重复值。

## 🔧 修复方案

### 方案1: 修改 checkExistingNFTAndSync 逻辑

```typescript
// 在 checkExistingNFTAndSync 函数中 (第440-452行)
// 删除或注释掉重复的activation调用

// ❌ 当前有问题的代码:
// const { data: activationResult, error: activationError } = await supabase.rpc(
//   'activate_nft_level1_membership',
//   {
//     p_wallet_address: walletAddress,
//     p_referrer_wallet: userData.referrer_wallet || '0x0000000000000000000000000000000000000001',
//     p_transaction_hash: `chain_sync_${Date.now()}`
//   }
// );

// ✅ 修复后的代码:
// 只同步必要的 members 记录，不调用完整的activation函数
console.log(`🔄 只同步基础成员记录，避免重复激活...`);
return {
  success: true,
  hasNFT: true,
  isActivated: true,
  membershipCreated: true,
  level: level,
  wallet: walletAddress,
  message: `用户已拥有Level ${level} NFT，同步完成`
};
```

### 方案2: 在数据库函数中添加幂等性检查

✅ **已在 SQL 修复脚本中实现**:

```sql
-- 检查是否已经是activated member (防重复激活)
SELECT 
    current_level > 0,
    levels_owned
INTO 
    v_existing_member,
    v_current_levels_owned
FROM members 
WHERE wallet_address = p_wallet_address;

IF v_existing_member AND v_existing_membership THEN
    RAISE NOTICE 'Member % already activated, skipping duplicate activation', p_wallet_address;
    RETURN json_build_object(
        'success', true,
        'message', 'Member already activated - skipping duplicate activation',
        'already_activated', true
    );
END IF;
```

## 🎯 推荐操作顺序

1. **运行 SQL 修复脚本**:
   ```bash
   psql -f sql/fix_levels_owned_duplication.sql
   ```

2. **修改 Edge Function** (可选，因为SQL已有保护):
   - 注释掉 `checkExistingNFTAndSync` 中第446行的重复调用
   - 或者保持不变，依赖数据库函数的幂等性保护

3. **测试验证**:
   - 对同一个钱包多次调用activation
   - 确认 `levels_owned` 不会出现重复值

## ✅ 修复效果

- ✅ 清理现有的 `[1,1]` 重复值
- ✅ 防止未来的重复激活
- ✅ 保持Edge Function的向后兼容性
- ✅ 添加详细的日志输出便于调试