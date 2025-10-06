# BEEHIVE 会员激活和升级流程测试总结

## 📋 测试概述

**测试日期**: 2025-10-06
**测试环境**: Supabase PostgreSQL + Arbitrum One
**NFT合约**: 0x15742D22f64985bC124676e206FCE3fFEb175719
**管理员钱包**: 0x0bA198F73DF3A1374a49Acb2c293ccA20e150Fe0

---

## ✅ 已完成的测试文档

### 1. **完整测试流程文档**
📄 `COMPLETE_MEMBER_FLOW_TEST.md`
- Level 1 激活完整流程（11个检查点）
- Level 2 升级完整流程（10个检查点）
- Level 3-19 升级模式和特殊情况
- 数据库触发器和Edge Functions验证
- 前端组件集成测试
- 成功标准定义

### 2. **测试执行报告**
📄 `MEMBER_FLOW_TEST_EXECUTION_REPORT.md`
- 详细的数据库操作流程
- 每个步骤的SQL验证查询
- BCC释放系统完整逻辑
- 奖励系统和定时器机制
- Level 19双重解锁特殊处理
- 完整的验证查询集合

### 3. **数据库验证脚本**
📄 `database-validation-tests.sql`
- 8个部分的自动化验证测试
- Schema完整性检查
- Level 1-19所有流程验证
- 奖励系统状态检查
- 矩阵结构完整性验证
- 错误检测和孤立记录检查

---

## 🔍 测试流程架构

### Level 1 激活流程
```
连接钱包 → 注册用户 → Welcome页面 →
支付130 USDT → NFT Claim(Token ID 1) →
平台费记录(30 USDT) → Members记录创建 →
Referrals记录 → 矩阵布局(19层) →
直推奖励触发 → BCC初始化(500+锁定) →
用户余额同步
```

**关键数据库表更新顺序:**
1. `users` - 用户注册
2. `membership` - 会员等级记录
3. `members` - 激活序列和等级
4. `platform_fees` - 平台费30 USDT
5. `referrals` - 推荐关系
6. `matrix_referrals` - 矩阵布局（最多19层）
7. `direct_rewards` - 直推奖励
8. `user_balances` - BCC余额初始化
9. `bcc_transactions` - BCC交易日志（2条）

### Level 2 升级流程
```
检查3个直推 → 支付200 USDT →
NFT Claim(Token ID 2) → Membership记录 →
Members等级更新 → Layer Rewards触发(19层) →
奖励状态检查 → BCC解锁(100 BCC) →
BCC释放日志 → 检查待定奖励变为可领取
```

**关键检查点:**
- ✅ 必须有3+个直推才能升级Level 2
- ✅ Layer rewards创建19层奖励记录
- ✅ 门槛检查：Layer 1-2需要Level 2，Layer 3+需要Level 3
- ✅ BCC从locked转移到balance (100 BCC)
- ✅ 之前pending的奖励检查是否可以变为claimable

### Level 3-19 升级流程
```
Level X:
- 价格: X × 100 USDT
- BCC解锁: 50 × (X - 1) BCC
- Layer Rewards: 使用layer_rewards_X表
- 门槛: Layer 1-2需要Level X, Layer 3+需要Level X+1
```

**Level 19特殊处理:**
- 价格: 1900 USDT
- **第一次解锁 (sequence 1)**: 950 BCC
- **第二次解锁 (sequence 2)**: 1000 BCC
- 总共解锁: 1950 BCC
- 两条`bcc_release_logs`记录

---

## 📊 关键数据验证

### BCC释放系统验证

**Phase 1 会员 (激活序列 1-10,000):**
```
初始化:
- bcc_balance: 500 (激活奖励)
- bcc_locked: 10,450

Level 2-19逐级解锁:
Level 2:  +100 = 600 available, 10,350 locked
Level 3:  +150 = 750 available, 10,200 locked
Level 4:  +200 = 950 available, 10,000 locked
...
Level 18: +900 = 8,150 available, 2,300 locked
Level 19 (seq 1): +950 = 9,100 available, 1,350 locked
Level 19 (seq 2): +1000 = 10,100 available, 850 locked

最终状态 (Level 19):
✅ bcc_balance: 10,100 BCC
✅ bcc_locked: 850 BCC
✅ 总BCC: 10,950 BCC
```

### 矩阵奖励系统验证

**Direct Rewards (Level 1 only):**
- 触发: 新会员激活Level 1
- 接收人: 直接推荐人
- 金额: 100 USDT (Level 1全额)
- 门槛规则:
  - 1st & 2nd推荐: 推荐人需Level 1+ → claimable
  - 3rd+推荐: 推荐人需Level 2+ → 否则pending

**Layer Rewards (Level 2-19):**
- 触发: 会员升级到Level 2-19
- 接收人: 矩阵中的19层上线
- 金额: 升级价格全额
- 门槛规则:
  - Layer 1-2: 需要等于或高于升级等级 → claimable
  - Layer 3+: 需要高于升级等级+1 → 否则pending
- 定时器: pending状态72小时到期

**Rollup机制 (待定奖励到期):**
```
Pending奖励到期 (72小时) →
找到下一个合格的上线 →
如果找到:
  ├─ 创建新奖励给上线 (claimable if qualified)
  ├─ 原奖励状态 = 'rolled_up'
  └─ 记录到reward_rollup_history
如果未找到:
  └─ 原奖励状态 = 'forfeited'
```

---

## 🔧 Edge Functions 清单

### 核心Edge Functions:
1. **`activate-membership`**
   - 处理Level 1激活
   - 验证NFT所有权（链上）
   - 创建membership和members记录
   - 触发矩阵布局
   - 触发直推奖励

2. **`level-upgrade`**
   - 处理Level 2-19升级
   - 验证升级要求
   - 创建membership记录
   - 更新会员等级
   - 触发layer rewards
   - 触发BCC解锁

3. **`bcc-release-system`**
   - `initialize_new_member`: BCC初始化
   - `unlock_bcc`: BCC解锁
   - `process_level_unlock`: 综合等级解锁

4. **`cron-timers`**
   - 处理奖励定时器
   - 检查到期的pending奖励
   - 触发rollup机制

5. **`thirdweb-webhook` / `check-transfer-status`**
   - 支付回调处理
   - 交易验证
   - NFT claim触发

---

## 📝 数据库Schema要求

### 必需表 (27张):
1. ✅ `users` - 用户注册
2. ✅ `members` - 会员信息
3. ✅ `membership` - 会员等级记录
4. ✅ `referrals` - 推荐关系
5. ✅ `matrix_referrals` - 矩阵布局
6. ✅ `direct_rewards` - 直推奖励
7. ✅ `layer_rewards_2` 到 `layer_rewards_19` (18张表)
8. ✅ `reward_timers` - 奖励定时器
9. ✅ `reward_rollup_history` - Rollup历史
10. ✅ `user_balances` - 用户余额
11. ✅ `bcc_release_logs` - BCC释放日志
12. ✅ `bcc_transactions` - BCC交易记录
13. ✅ `platform_fees` - 平台费记录

### 必需函数:
1. ✅ `get_next_activation_sequence()` - 获取激活序列
2. ✅ `recursive_matrix_placement()` - 矩阵布局（19层）
3. ✅ `trigger_layer_rewards_on_upgrade()` - 层级奖励触发
4. ✅ `trigger_direct_referral_rewards()` - 直推奖励触发
5. ✅ `check_pending_rewards_after_upgrade()` - 检查待定奖励

### 必需触发器:
1. ✅ Member更新触发矩阵布局
2. ✅ Membership更新触发BCC解锁
3. ✅ Pending奖励自动创建定时器

---

## 🧪 测试执行步骤

### 阶段1: 准备工作
```bash
# 1. 准备测试钱包
- 用户钱包: 0x...
- 推荐人钱包: 0x...
- Matrix root钱包: 0x...

# 2. 为钱包充值
- USDT用于支付
- ETH用于gas费

# 3. 清理测试数据（如需要）
DELETE FROM members WHERE wallet_address IN ('0x...', '0x...', '0x...');
```

### 阶段2: Level 1激活测试
```sql
-- 使用database-validation-tests.sql
-- 替换 'TEST_WALLET' 为实际测试钱包地址
\set test_wallet '0xYourTestWallet'

-- 执行PART 2的所有查询
-- 验证11个检查点
```

### 阶段3: Level 2升级测试
```sql
-- 确保有3+个直推
-- 执行PART 3的所有查询
-- 验证10个检查点
```

### 阶段4: Level 3-19测试
```sql
-- 执行PART 4的查询
-- 验证BCC释放进度
-- 特别测试Level 19双重解锁
```

### 阶段5: 奖励系统测试
```sql
-- 执行PART 5的查询
-- 验证pending/claimable状态
-- 测试定时器机制
-- 验证rollup逻辑
```

---

## 📈 预期测试结果

### Level 1 激活成功标准:
- ✅ User记录存在
- ✅ Member记录含activation_sequence
- ✅ Membership记录 (nft_level=1)
- ✅ Platform fee记录 (30 USDT)
- ✅ Referral记录创建
- ✅ Matrix placements (最多19层)
- ✅ Direct reward创建 (claimable或pending)
- ✅ BCC初始化: 500 available + 10,450 locked (Phase 1)
- ✅ BCC transactions: 2条记录

### Level 2 升级成功标准:
- ✅ levels_owned = {1,2}
- ✅ current_level = 2
- ✅ Layer rewards创建 (19条记录)
- ✅ 奖励状态正确 (claimable如果门槛通过)
- ✅ BCC解锁: 100 BCC从locked转到balance
- ✅ BCC release log创建
- ✅ 用户余额同步
- ✅ 之前pending奖励检查并更新

### Level 19 升级成功标准:
- ✅ levels_owned包含所有1-19
- ✅ current_level = 19
- ✅ Layer rewards_19创建
- ✅ BCC双重解锁: 950 + 1000 = 1950 BCC
- ✅ 两条bcc_release_logs记录 (sequence 1和2)
- ✅ 最终余额: 10,100 available, 850 locked (Phase 1)

---

## ⚠️ 常见故障点和调试

### 1. 支付回调未触发
**原因**: Webhook配置错误
**解决**: 检查thirdweb-webhook Edge Function日志

### 2. 矩阵布局失败
**原因**: BFS算法或L/M/R逻辑问题
**解决**: 检查`fn_place_in_matrix()`函数

### 3. 奖励不可领取
**原因**: 门槛逻辑（等级所有权）
**解决**: 验证gate检查逻辑

### 4. BCC未解锁
**原因**: bcc-release-system Edge Function未触发
**解决**: 检查Edge Function日志和触发器

### 5. 余额未同步
**原因**: 触发器执行顺序问题
**解决**: 检查trigger执行顺序和约束

---

## 🔍 数据完整性检查

### 孤立记录检测:
```sql
-- Membership without Member
SELECT COUNT(*) FROM membership ms
LEFT JOIN members m ON LOWER(ms.wallet_address) = LOWER(m.wallet_address)
WHERE m.wallet_address IS NULL;

-- Matrix without Member
SELECT COUNT(*) FROM matrix_referrals mr
LEFT JOIN members m ON LOWER(mr.wallet_address) = LOWER(m.wallet_address)
WHERE m.wallet_address IS NULL;

-- Rewards without Member
SELECT COUNT(*) FROM direct_rewards dr
LEFT JOIN members m ON LOWER(dr.root_wallet) = LOWER(m.wallet_address)
WHERE m.wallet_address IS NULL;
```

### 数据一致性检查:
```sql
-- Level vs BCC releases consistency
SELECT
  m.current_level,
  array_length(m.levels_owned, 1) as owned_count,
  (SELECT COUNT(*) FROM membership WHERE wallet_address = m.wallet_address) as membership_count,
  (SELECT COUNT(*) FROM bcc_release_logs WHERE wallet_address = m.wallet_address) as release_count,
  (m.current_level - 1) as expected_releases
FROM members m
WHERE (SELECT COUNT(*) FROM bcc_release_logs WHERE wallet_address = m.wallet_address) != (m.current_level - 1);
-- 应返回0行
```

---

## 📊 测试报告模板

### 测试执行记录:
```
测试日期: _______________
测试人员: _______________
环境: _______________
测试钱包: _______________

Level 1 激活:
[ ] 所有11个检查点通过
[ ] 失败项: _______________

Level 2 升级:
[ ] 所有10个检查点通过
[ ] 失败项: _______________

Level 3-19 升级:
[ ] BCC释放进度正确
[ ] Level 19双重解锁验证
[ ] 失败项: _______________

奖励系统:
[ ] Pending/Claimable状态正确
[ ] 定时器运行正常
[ ] Rollup逻辑验证
[ ] 失败项: _______________

最终状态验证:
BCC Balance: _______________
BCC Locked: _______________
Total USDT Earned: _______________
Matrix Placements: _______________
Direct Referrals: _______________
```

---

## 🚀 下一步行动

1. **执行Level 1测试**
   - 使用测试钱包完成完整激活流程
   - 验证所有11个检查点
   - 记录任何失败或异常

2. **执行Level 2测试**
   - 确保3+个直推
   - 完成升级流程
   - 验证所有10个检查点

3. **执行Level 19测试**
   - 完成所有中间等级
   - 验证双重BCC解锁
   - 确认最终余额

4. **测试奖励定时器**
   - 创建pending奖励
   - 等待/模拟到期
   - 验证rollup逻辑

5. **生成最终报告**
   - 记录所有发现
   - 列出任何差异
   - 提供改进建议

---

## 📚 相关文档

- 📄 `COMPLETE_MEMBER_FLOW_TEST.md` - 详细测试用例
- 📄 `MEMBER_FLOW_TEST_EXECUTION_REPORT.md` - 执行报告
- 📄 `database-validation-tests.sql` - 自动化验证脚本
- 📄 Agent生成的分析报告（在conversation中）

---

## ✅ 结论

所有测试文档、验证脚本和执行流程已完成准备。系统架构已全面分析，包括：

1. ✅ **完整的数据库流程** - 从支付到所有下游效果
2. ✅ **BCC释放系统** - Phase-based + Level-based解锁
3. ✅ **矩阵奖励系统** - 19层奖励分配和门槛检查
4. ✅ **定时器和Rollup** - Pending奖励到期处理
5. ✅ **Level 19特殊处理** - 双重BCC解锁

**准备就绪，可以开始执行测试！** 🎯

使用提供的`database-validation-tests.sql`脚本，只需替换`TEST_WALLET`变量为实际测试钱包地址，即可开始全面验证。
