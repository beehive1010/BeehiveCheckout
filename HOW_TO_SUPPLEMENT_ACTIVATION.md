# 如何补充丢失的激活记录

## 问题场景

当activate-membership因超时失败时，可能出现：
- ✅ users记录已创建
- ❌ members记录未创建
- ❌ membership记录未创建
- ❌ matrix_referrals记录未创建

## 解决方案

### 方法1: 使用SQL脚本（推荐）

```bash
# 1. 编辑脚本，替换钱包地址
nano supplement_activation_simple.sql

# 2. 修改第一行：
\set wallet_address '0xYOUR_WALLET_ADDRESS_HERE'

# 3. 执行脚本
psql "$DATABASE_URL" -f supplement_activation_simple.sql
```

### 方法2: 直接执行SQL

```sql
BEGIN;

DO $$
DECLARE
    v_wallet TEXT := '0xa212A85f7434A5EBAa5b468971EC3972cE72a544';  -- 替换这里
    v_referrer TEXT;
    v_next_sequence INT;
BEGIN
    -- 从users获取referrer
    SELECT referrer_wallet INTO v_referrer
    FROM users
    WHERE wallet_address ILIKE v_wallet;

    IF v_referrer IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- 检查是否已存在
    IF EXISTS(SELECT 1 FROM members WHERE wallet_address ILIKE v_wallet) THEN
        RAISE NOTICE 'Already activated';
        RETURN;
    END IF;

    -- 获取下一个sequence
    SELECT COALESCE(MAX(activation_sequence), 0) + 1 INTO v_next_sequence
    FROM members;

    -- 插入members（会触发所有triggers）
    INSERT INTO members (
        wallet_address,
        referrer_wallet,
        current_level,
        activation_sequence,
        activation_time,
        total_nft_claimed
    ) VALUES (
        v_wallet,
        v_referrer,
        1,
        v_next_sequence,
        NOW(),
        1
    );

    RAISE NOTICE 'Activation supplemented: sequence %', v_next_sequence;
END $$;

-- 验证
SELECT * FROM members WHERE wallet_address ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544';
SELECT * FROM membership WHERE wallet_address ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544';
SELECT COUNT(*) FROM matrix_referrals WHERE member_wallet ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544';

COMMIT;
```

## 自动触发的操作

当INSERT members记录时，以下triggers会自动执行：

### 1. sync_member_to_membership_trigger
创建对应的membership记录

### 2. trigger_recursive_matrix_placement
- 查找19层上级链
- 在每个上级的矩阵中找到空位
- 创建matrix_referrals记录
- 如果是直接推荐人(i=1)，同时创建referrals记录

### 3. trigger_auto_create_balance_with_initial
创建user_balances记录

### 4. trigger_member_initial_level1_rewards
- 计算Level 1奖励（100 USDT）
- 发放给推荐人
- 记录平台费（30 USDT）

## 验证结果

执行后检查以下表：

```sql
-- 1. Members记录
SELECT wallet_address, activation_sequence, current_level
FROM members
WHERE wallet_address ILIKE '0xYOUR_WALLET%';

-- 2. Membership记录
SELECT wallet_address, nft_level, claimed_at
FROM membership
WHERE wallet_address ILIKE '0xYOUR_WALLET%';

-- 3. 直推记录（应该有1条）
SELECT COUNT(*) FROM referrals
WHERE member_wallet ILIKE '0xYOUR_WALLET%'
AND is_direct_referral = true;

-- 4. 矩阵记录（根据上级数量，最多19条）
SELECT COUNT(*), MAX(layer) FROM matrix_referrals
WHERE member_wallet ILIKE '0xYOUR_WALLET%';

-- 5. 余额记录
SELECT * FROM user_balances
WHERE wallet_address ILIKE '0xYOUR_WALLET%';
```

## 常见问题

### Q: 脚本会重复创建记录吗？
A: 不会。脚本会先检查members记录是否存在，如果已存在则跳过。

### Q: 如果只有membership缺members怎么办？
A: 这种情况不应该发生（因为membership由trigger创建）。如果发生，需要手动检查数据一致性。

### Q: 补充后能看到奖励吗？
A: 是的。trigger_member_initial_level1_rewards会自动创建Level 1奖励记录。

### Q: Matrix placement会完整执行吗？
A: 会。trigger_recursive_matrix_placement会找到所有19层上级并placement。但如果超时（>180s），可能只完成部分。

## 示例：成功补充的输出

```
NOTICE:  📊 Checking Activation Status
NOTICE:  Wallet: 0xa212A85f7434A5EBAa5b468971EC3972cE72a544
NOTICE:  Has members record: f
NOTICE:  Has membership record: f
NOTICE:
NOTICE:  👤 User Information
NOTICE:  Username: test004L2
NOTICE:  Referrer: 0xc26EC29A4b08bC9B8E292574F893606930E66E1C
NOTICE:  Next Sequence: 3962
NOTICE:
NOTICE:  🔧 Creating Members Record
NOTICE:  Inserting members record...
NOTICE:
NOTICE:  ✅ Members record created successfully!
NOTICE:  ✅ Activation sequence: 3962

Verification Results:
- Members: 1 record
- Membership: 1 record
- Referrals: 1 direct
- Matrix: 3 records (max layer 8)
```

## 性能注意事项

- 补充单个会员：约30-60秒
- Matrix placement时间取决于上级数量（最多19个）
- 建议在低峰期执行
- 如果会员基数>5000，可能需要更长时间

## 安全检查

在执行前：
1. ✅ 确认users记录存在
2. ✅ 确认referrer_wallet有效
3. ✅ 确认members记录不存在
4. ✅ 备份数据库（可选，生产环境推荐）
