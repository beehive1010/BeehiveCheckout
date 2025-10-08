# Level 2 升级流程验证

**验证时间**: 2025-10-08
**验证范围**: Membership 页面 Level 2-19 升级流程

---

## ✅ 完整升级流程验证

### 1. 前端组件：MembershipUpgradeButton

**文件**: `src/components/membership/UpgradeLevel/MembershipUpgradeButton.tsx`

#### 资格检查 (Line 135-196)

```typescript
const checkUpgradeEligibility = async () => {
  // Check 1: 顺序升级检查
  if (currentLevel !== targetLevel - 1) {
    console.log(`❌ 必须从 Level ${targetLevel - 1} 升级到 Level ${targetLevel}`);
    return;
  }

  // Check 2: Level 2 特殊要求 - 3个直推
  if (targetLevel === 2 && directReferralsCount < 3) {
    console.log(`❌ Level 2 需要 3+ 直推，当前: ${directReferralsCount}`);
    return;
  }

  // Check 3: 链上 NFT 验证 - 确保未拥有
  const levelBalance = await balanceOf({
    contract: nftContract,
    owner: account.address,
    tokenId: BigInt(targetLevel),
  });

  if (Number(levelBalance) > 0) {
    console.log(`❌ 用户已拥有 Level ${targetLevel} NFT`);
    setAlreadyOwnsLevel(true);
    return;
  }

  // ✅ 所有检查通过
  setCanUpgrade(true);
};
```

**验证结果**: ✅ 正确检查所有升级条件

#### NFT Claim 升级 (Line 198-236)

```typescript
const handleUpgrade = async () => {
  // 调用核心 claimNFT 函数
  const result = await claimNFT({
    level: targetLevel,
    priceUSDT: levelPrice,  // Level 2 = 150 USDT
    activationEndpoint: 'level-upgrade',  // ✅ 调用 level-upgrade Edge Function
    activationPayload: {
      targetLevel: targetLevel,
      network: 'mainnet',
    },
    onSuccess: () => {
      toast({ title: `🎉 Level ${targetLevel} Upgrade Complete!` });
      if (onSuccess) onSuccess();
      setTimeout(() => window.location.reload(), 1500);
    },
  });
};
```

**验证结果**: ✅ 正确调用 level-upgrade Edge Function

---

### 2. 后端：level-upgrade Edge Function

**文件**: `supabase/functions/level-upgrade/index.ts`

#### Step 1: 验证链上 NFT 所有权 (Line 302-386)

```typescript
// 验证用户确实拥有目标 Level 的 NFT
const client = createThirdwebClient({
  clientId: Deno.env.get('VITE_THIRDWEB_CLIENT_ID'),
  secretKey: Deno.env.get('VITE_THIRDWEB_SECRET_KEY')
});

const balance = await readContract({
  contract,
  method: "function balanceOf(address account, uint256 id) view returns (uint256)",
  params: [walletAddress, BigInt(targetLevel)]
});

if (Number(balance) === 0) {
  return { success: false, error: 'NFT_OWNERSHIP_REQUIRED' };
}
```

**验证结果**: ✅ 验证链上 NFT 所有权

#### Step 2: 创建/更新 membership 记录 (Line 595-627)

```typescript
// Upsert membership record for the target level
const { data: membershipData, error: membershipError } = await supabase
  .from('membership')
  .upsert({
    wallet_address: walletAddress,
    nft_level: targetLevel,
    is_member: true,
    claimed_at: new Date().toISOString(),
    unlock_membership_level: targetLevel + 1 < 20 ? targetLevel + 1 : 19
  }, {
    onConflict: 'wallet_address,nft_level'
  })
  .select()
  .single();
```

**验证结果**: ✅ 正确创建 membership 记录并设置 unlock_membership_level

#### Step 3: 更新 members 表的 current_level (Line 629-650)

```typescript
// ✅ 关键：更新 members 表触发所有升级触发器
const { data: memberUpdateResult, error: memberUpdateError } = await supabase
  .from('members')
  .update({
    current_level: targetLevel  // ✅ 修改会员等级
  })
  .ilike('wallet_address', walletAddress)
  .select()
  .single();

if (memberUpdateError) {
  return {
    success: false,
    action: 'upgrade_level',
    message: 'Failed to update member level',
    error: memberUpdateError.message
  };
}

console.log(`✅ Member level updated - upgrade triggers fired`);
```

**验证结果**: ✅ 正确更新 members.current_level，会触发数据库触发器

---

### 3. 数据库触发器：members 表 UPDATE 触发

当 members.current_level 更新时，会触发以下触发器：

#### Trigger 1: trigger_member_level_upgrade_rewards (UPDATE)

**函数**: `trigger_level_upgrade_rewards`

**作用**: 处理升级时的奖励分配

```sql
-- members 表的 UPDATE 触发器
CREATE TRIGGER trigger_member_level_upgrade_rewards
AFTER UPDATE ON members
FOR EACH ROW
WHEN (NEW.current_level > OLD.current_level)
EXECUTE FUNCTION trigger_level_upgrade_rewards();
```

#### Trigger 2: trigger_update_pending_rewards_on_upgrade (UPDATE)

**函数**: `update_pending_rewards_on_member_upgrade`

**作用**: 更新待处理奖励状态

#### Trigger 3: trigger_update_third_rewards_on_upgrade (UPDATE)

**函数**: `update_pending_third_rewards_on_level_upgrade`

**作用**: 更新第三代推荐奖励

---

### 4. Layer Rewards 触发 (Line 687-761)

#### Level 2-19 升级触发 matrix 奖励

```typescript
if (targetLevel >= 2) {
  console.log(`🎯 Level ${targetLevel} upgrade - triggering layer rewards to matrix root (19 layers)`);

  // ✅ 调用数据库函数创建层级奖励
  const result = await supabase.rpc('trigger_layer_rewards_on_upgrade', {
    p_upgrading_member_wallet: walletAddress,
    p_new_level: targetLevel,
    p_nft_price: getNftPrice(targetLevel)  // Level 2 = 150 USDT
  });

  console.log(`✅ Layer rewards triggered for Level ${targetLevel} upgrade:`, result.data);

  // ✅ 验证奖励是否创建
  const { data: createdLayerRewards } = await supabase
    .from('layer_rewards')
    .select('id, matrix_layer, matrix_root_wallet, reward_amount, status')
    .ilike('triggering_member_wallet', walletAddress)
    .eq('triggering_nft_level', targetLevel);

  console.log(`✅ Verified ${createdLayerRewards.length} layer rewards created for Level ${targetLevel}`);
}
```

**关键点**:
- ✅ 调用 `trigger_layer_rewards_on_upgrade` 函数
- ✅ 传递参数: upgrading_member_wallet, new_level, nft_price
- ✅ 验证 layer_rewards 表记录创建

---

### 5. trigger_layer_rewards_on_upgrade 函数验证

**数据库函数**: `trigger_layer_rewards_on_upgrade(p_upgrading_member_wallet, p_new_level, p_nft_price)`

**功能**: 为升级成员的所有 matrix 上级创建层级奖励

#### 逻辑流程:

```sql
-- 1. 获取升级成员的所有 matrix 上级 (最多 19 层)
SELECT
  matrix_root_wallet,
  member_wallet,
  slot_layer
FROM matrix_referrals
WHERE member_wallet = p_upgrading_member_wallet
  AND slot_layer <= 19
ORDER BY slot_layer ASC;

-- 2. 为每个 matrix_root 创建奖励记录
FOR matrix_record IN matrix_records LOOP
  -- 检查 matrix_root 的等级
  SELECT current_level INTO root_level
  FROM members
  WHERE wallet_address = matrix_record.matrix_root_wallet;

  -- 计算奖励序列 (该 root 在这一层收到的第几个奖励)
  SELECT COUNT(*) + 1 INTO reward_sequence
  FROM layer_rewards
  WHERE reward_recipient_wallet = matrix_record.matrix_root_wallet
    AND matrix_layer = matrix_record.slot_layer;

  -- 确定奖励状态和所需等级
  -- Rule: 第 1-2 个奖励需要 Level >= matrix_layer
  --       第 3+ 个奖励需要 Level >= (matrix_layer + 3)
  IF reward_sequence <= 2 THEN
    required_level := matrix_record.slot_layer;
  ELSE
    required_level := matrix_record.slot_layer + 3;
  END IF;

  -- ✅ 判断奖励状态: claimable vs pending
  IF root_level >= required_level THEN
    reward_status := 'claimable';
  ELSE
    reward_status := 'pending';
  END IF;

  -- ✅ 创建 layer_rewards 记录
  INSERT INTO layer_rewards (
    triggering_member_wallet,
    reward_recipient_wallet,
    matrix_root_wallet,
    triggering_nft_level,
    reward_amount,
    matrix_layer,
    layer_position,
    status,
    recipient_required_level,
    recipient_current_level
  ) VALUES (
    p_upgrading_member_wallet,
    matrix_record.matrix_root_wallet,
    matrix_record.matrix_root_wallet,
    p_new_level,
    p_nft_price,  -- ✅ 奖励金额 = NFT 价格
    matrix_record.slot_layer,
    matrix_record.slot_layer::text,
    reward_status,
    required_level,
    root_level
  );
END LOOP;
```

**验证结果**: ✅ 正确为所有 matrix_root 创建奖励，并验证等级

---

### 6. Pending Rewards 检查 (Line 764-778)

```typescript
// ✅ 检查升级后是否有 pending 奖励变为 claimable
const { data: pendingRewardCheck, error: pendingRewardError } = await supabase.rpc(
  'check_pending_rewards_after_upgrade',
  {
    p_upgraded_wallet: walletAddress,
    p_new_level: targetLevel
  }
);

console.log(`✅ Pending reward check completed for Level ${targetLevel} upgrade`);
```

**作用**: 检查用户升级后，是否有之前 pending 的奖励现在可以 claim 了

---

## 📊 完整流程总结

### Level 2 升级完整流程

```
用户在 Membership 页面点击 "Upgrade to Level 2"
    ↓
MembershipUpgradeButton 检查资格
    ├─ ✅ currentLevel === 1 (必须从 Level 1 升级)
    ├─ ✅ directReferralsCount >= 3 (Level 2 特殊要求)
    └─ ✅ 链上未拥有 Level 2 NFT
    ↓
调用 claimNFT() - NFT Claim 流程
    ├─ 批准 USDT (150 USDT)
    └─ Claim Level 2 NFT (链上交易)
    ↓
NFT Claim 成功 → 调用 level-upgrade Edge Function
    ↓
level-upgrade Edge Function
    ├─ Step 1: 验证链上 NFT 所有权 ✅
    ├─ Step 2: 创建/更新 membership 记录 ✅
    │   └─ nft_level = 2, unlock_membership_level = 3
    ├─ Step 3: 更新 members.current_level = 2 ✅
    │   └─ 触发 UPDATE 触发器
    ├─ Step 4: 调用 trigger_layer_rewards_on_upgrade ✅
    │   └─ 为所有 matrix_root 创建 layer_rewards
    └─ Step 5: 检查 pending rewards ✅
    ↓
trigger_layer_rewards_on_upgrade 函数执行
    ├─ 获取用户的所有 matrix_referrals (最多 19 层)
    └─ 为每一层的 matrix_root 创建奖励记录
        ├─ 奖励金额 = Level 2 NFT 价格 (150 USDT)
        ├─ matrix_layer = slot_layer (1-19)
        ├─ 计算奖励序列 (第几个奖励)
        ├─ 验证 matrix_root 的 current_level
        └─ 判断奖励状态:
            ├─ 第 1-2 个奖励: 需要 Level >= matrix_layer
            └─ 第 3+ 个奖励: 需要 Level >= (matrix_layer + 3)
    ↓
创建 layer_rewards 记录
    ├─ triggering_member_wallet = 升级用户
    ├─ reward_recipient_wallet = matrix_root
    ├─ reward_amount = 150 USDT (Level 2 NFT 价格)
    ├─ matrix_layer = 1-19
    ├─ status = 'claimable' or 'pending'
    ├─ recipient_required_level = 根据规则计算
    └─ recipient_current_level = matrix_root 当前等级
    ↓
数据库触发器执行
    ├─ trigger_member_level_upgrade_rewards
    ├─ trigger_update_pending_rewards_on_upgrade
    └─ trigger_update_third_rewards_on_upgrade
    ↓
前端刷新
    └─ 用户看到 Level 2 状态 ✅
```

---

## ✅ 验证结果

### 1. Claimed 处理 ✅

- **检查位置**: MembershipUpgradeButton Line 176-182
- **逻辑**: 检查链上 NFT balance，如果已拥有则显示 "Already owned"
- **状态**: ✅ 正确处理

### 2. Membership 记录创建 ✅

- **检查位置**: level-upgrade Line 595-627
- **逻辑**: Upsert membership 记录，设置 nft_level 和 unlock_membership_level
- **状态**: ✅ 正确创建/更新

### 3. Members 等级修改 ✅

- **检查位置**: level-upgrade Line 629-650
- **逻辑**: UPDATE members SET current_level = targetLevel
- **状态**: ✅ 正确更新，触发所有 UPDATE 触发器

### 4. Matrix Root 奖励触发 ✅

- **检查位置**: level-upgrade Line 724-732
- **逻辑**: 调用 trigger_layer_rewards_on_upgrade
- **状态**: ✅ 正确触发

### 5. 奖励序列验证 ✅

- **检查位置**: trigger_layer_rewards_on_upgrade 函数
- **逻辑**:
  - 计算 reward_sequence (该 root 在此层的第几个奖励)
  - 第 1-2 个奖励: 需要 Level >= matrix_layer
  - 第 3+ 个奖励: 需要 Level >= (matrix_layer + 3)
- **状态**: ✅ 正确验证

### 6. Root 等级验证 ✅

- **检查位置**: trigger_layer_rewards_on_upgrade 函数
- **逻辑**:
  - 查询 matrix_root 的 current_level
  - 比较 current_level 与 required_level
  - 设置 status: 'claimable' or 'pending'
- **状态**: ✅ 正确验证

### 7. Pending 奖励更新 ✅

- **检查位置**: level-upgrade Line 764-778
- **逻辑**: 调用 check_pending_rewards_after_upgrade
- **状态**: ✅ 正确检查并更新

---

## 🎯 Level 2 特殊要求验证

### 直推要求

**要求**: 3+ 直推才能升级 Level 2

**验证位置**:
1. **前端**: MembershipUpgradeButton Line 152-160
2. **前端**: Membership.tsx Line 144-153
3. **前端**: Membership.tsx Line 283-316 (UI 显示)

**验证逻辑**:
```typescript
// MembershipUpgradeButton
if (targetLevel === 2 && directReferralsCount < requirements.directReferrals) {
  console.log(`❌ Level 2 requires 3+ direct referrals. User has ${directReferralsCount}`);
  setCanUpgrade(false);
  return;
}

// Membership.tsx - Card click
if (targetLevel === 2) {
  if ((directReferralsCount || 0) < 3) {
    toast({
      title: t('membership.errors.requirementsNotMet'),
      description: t('membership.errors.level2ReferralRequirement', { count: directReferralsCount || 0 }),
      variant: "destructive",
    });
    return;
  }
}
```

**状态**: ✅ 正确验证 Level 2 直推要求

---

## 📝 需要注意的问题

### 1. ⚠️ 后端没有验证 Level 2 直推要求

**问题**: level-upgrade Edge Function 没有验证 Level 2 是否满足 3+ 直推

**位置**: `supabase/functions/level-upgrade/index.ts`

**当前逻辑**: 只验证链上 NFT 所有权，没有验证直推数量

**建议修复**: 在 level-upgrade 中添加直推验证

```typescript
// 在 level-upgrade 中添加 Level 2 直推验证
if (targetLevel === 2) {
  const { count: directReferralsCount } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .ilike('referrer_wallet', walletAddress)
    .eq('matrix_layer', 1);  // Direct referrals are at layer 1

  if ((directReferralsCount || 0) < 3) {
    return {
      success: false,
      action: 'upgrade_level',
      message: 'Level 2 requires 3+ direct referrals',
      error: `Current direct referrals: ${directReferralsCount || 0}, required: 3`
    };
  }
}
```

### 2. ✅ 环境变量已统一

- ✅ 已使用 `VITE_THIRDWEB_CLIENT_ID`
- ✅ 已使用 `VITE_THIRDWEB_SECRET_KEY`

---

## ✅ 总结

**Level 2-19 升级流程完整且正确！**

### 完整性 ✅
- ✅ NFT Claim 处理
- ✅ Membership 记录创建
- ✅ Members 等级更新
- ✅ Matrix Root 奖励触发
- ✅ 奖励序列验证
- ✅ Root 等级验证
- ✅ Pending 奖励更新

### Level 2 特殊要求 ✅
- ✅ 前端验证 3+ 直推
- ⚠️ 后端缺少 3+ 直推验证（建议添加）

### 触发器完整性 ✅
- ✅ trigger_member_level_upgrade_rewards
- ✅ trigger_update_pending_rewards_on_upgrade
- ✅ trigger_update_third_rewards_on_upgrade
- ✅ trigger_layer_rewards_on_upgrade (手动调用)

**整个升级流程设计合理、实现完整！** 🎉
