# 任务流程文档 (Task Process Documentation)

## 项目概述
这是一个基于区块链的会员推荐系统，包含NFT会员制度、3×3矩阵推荐树、层级奖励分配等核心功能。

## 主要技术栈
- Frontend: React + TypeScript
- Backend: Supabase (Database + Edge Functions)  
- Blockchain: Thirdweb In-App Wallet + EditionDrop NFT
- Database: PostgreSQL (通过Supabase)

## 核心业务流程

### 1. 完整用户注册激活流程
```
1. 钱包连接 (Thirdweb In-App Wallet)
   ↓
2. 注册页面 (username + email + referrer捕获)
   ↓  
3. users表记录 (wallet_address, username, email, referrer_wallet)
   ↓
4. welcome页面 (非会员只能看到这个页面)
   ↓
5. claim Membership NFT Level 1 (token_id=1, 130 USDC)
   - 100 USDC = NFT Level 1 价格
   - 30 USDC = 平台激活费
   ↓
6. 链上交易确认 (3种方式: Arbitrum One/Sepolia/Simulation)
   ↓  
7. 激活后处理:
   - orders表记录订单
   - nft_purchases表记录NFT购买
   - members表插入会员记录 (is_activated=true, current_level=1)
   - referrals表插入推荐矩阵安置
   - 自动获得500 BCC unlocked balance
   - 根据激活顺序获得tier-based locked BCC (Level 1 = 100 BCC)
   ↓
8. dashboard (只有激活会员才能访问)
```

### 2. 3×3矩阵推荐系统详细逻辑
```
新会员激活 -> 
查找referrer在推荐树中的位置 -> 
寻找第一个不完整的下线层级 (L→M→R优先级) ->
将新会员作为该不完整成员的第一层下线安置 ->
形成每个会员的19层矩阵:
  Layer 1: 3 个成员
  Layer 2: 3² = 9 个成员  
  Layer 3: 3³ = 27 个成员
  ...
  Layer 19: 3¹⁹ 个成员
```

### 3. 奖励系统架构
#### Layer Rewards (层级奖励)
- 当下线成员达到某等级时，该树的root成员获得该层级奖励
- 奖励金额 = 该等级NFT价格
- 领取条件: Root必须已持有 ≥ 该等级
- 如未达到: 奖励进入pending状态 (72小时升级期限)
- 超时未升级: 奖励roll up到上一级合格成员

#### Locked BCC Release (锁仓BCC释放)
基于激活顺序的tier分配:
- Tier 1 (第1-9,999名): 全额奖励
- Tier 2 (第10,000-29,999名): 奖励减半  
- Tier 3 (第30,000-99,999名): 奖励再减半
- Tier 4 (第100,000-268,240名): 奖励再减半

#### New Activation Bonus
- 每个新会员自动获得500 BCC unlocked balance

## 当前任务状态

### Phase 1: API架构重构 ✅ **已完成** (2024-09-07)
- [✅] **重构API调用方式**: 移除复杂hooks，改用直接Supabase客户端和Edge Functions
- [✅] **创建统一Supabase客户端**: 集成database.types.ts类型定义，创建authService/nftService/balanceService等服务
- [✅] **重构现有页面组件**: 更新useWallet hook，使用新的Supabase API调用方式
- [✅] **Header组件优化**: 简化为只有钱包连接按钮，添加多语言翻译支持

### Phase 2: 用户注册激活流程 ✅ **已完成** (2024-09-07)  
- [✅] **用户注册流程**: wallet连接 → 注册弹窗 → users表记录，集成referrer链接捕获
- [✅] **MemberGuard访问控制**: 创建全站访问保护，钱包断连自动跳转landing，非会员自动跳转welcome
- [✅] **RegistrationModal注册弹窗**: 钱包连接后自动弹出，收集用户信息和referrer地址
- [🔄] **Welcome页面**: 非会员访问限制，NFT claim界面 (进行中)
- [⏳] **NFT claim等待机制**: 链上交易确认与状态追踪
- [⏳] **激活后处理**: orders/nft_purchases/members/referrals表数据插入

### Phase 3: 3×3矩阵推荐系统 (优先级: 高)
- [⏳] **矩阵安置算法**: L→M→R优先级，寻找第一个不完整下线层
- [⏳] **referrals表管理**: 安置位置计算与记录
- [⏳] **矩阵树构建**: 支持19层深度的3×3矩阵结构

### Phase 4: 奖励系统实现 (优先级: 中)
- [⏳] **Layer Rewards**: 层级奖励触发与pending/rollup机制
- [⏳] **Locked BCC Release**: 基于激活顺序的tier分配系统  
- [⏳] **New Activation Bonus**: 500 BCC自动发放
- [⏳] **余额管理**: BCC locked/unlocked/transferable分类管理

### Phase 5: 特殊业务规则 (优先级: 中)
- [⏳] **Level 2升级限制**: 需要3个直推激活会员
- [⏳] **Layer 1 Right slot奖励**: 需要Level 2才能领取  
- [⏳] **72小时pending期限**: 超时自动rollup机制

### Phase 6: 数据同步与优化 (优先级: 低)
- [⏳] **Supabase CLI类型同步**: 保持database.types.ts最新
- [✅] **任务流程文档**: 记录业务逻辑与开发进度

## 技术要求

### API调用优化
- ❌ 避免使用复杂的hooks api路由方式
- ✅ 使用直接的Supabase API调用
- ✅ 使用Supabase Edge Functions进行服务端逻辑

### 数据库表结构（主要相关表）
- `users`: 用户基本信息
- `members`: 会员信息和状态
- `referrals`: 推荐关系和矩阵安置
- `orders`: 订单记录
- `nft_purchases`: NFT购买记录
- `layer_rewards`: 层级奖励记录
- `reward_claims`: 奖励申领记录

## 开发进度记录

### 2024-09-07 (API架构重构 + 用户注册流程)
#### 已完成 ✅
- **API架构全面重构**: 移除复杂hooks API路由，改用直接Supabase客户端调用
- **创建统一Supabase服务**: supabaseClient.ts，包含authService、nftService、balanceService等8个服务模块
- **用户注册完整流程**: 钱包连接 → 自动弹出注册模态框 → users表记录 → referrer地址捕获
- **MemberGuard访问控制**: 全站钱包连接保护 + Dashboard会员访问限制
- **Header组件优化**: 简化为移动友好设计，只保留Logo + 语言切换 + 钱包连接
- **多语言翻译支持**: 为6种语言(EN/ZH/JA/KO/TH/MS)添加header.connectWallet翻译
- **useWallet hook重构**: 使用新Supabase服务替代旧API调用

#### 核心组件
- `src/lib/supabaseClient.ts` - 统一Supabase服务层
- `src/components/guards/MemberGuard.tsx` - 访问控制组件  
- `src/components/modals/RegistrationModal.tsx` - 注册弹窗组件
- `src/components/shared/Header.tsx` - 简化Header组件
- `src/hooks/useWallet.ts` - 重构钱包Hook

### 下一步规划 🎯

#### 立即执行 (本次会话)
1. **完成Welcome页面更新** - 确保与新的MemberGuard和supabaseClient兼容
2. **实现NFT claim基础界面** - 三种网络选择(Mainnet/Testnet/Simulation)  
3. **添加基础状态管理** - 处理NFT claim的loading和成功状态

#### 短期目标 (1-2天)  
1. **NFT claim链上集成** - 集成Thirdweb EditionDrop合约调用
2. **激活后数据处理** - 完成orders/members/nft_purchases表插入逻辑
3. **基础矩阵安置** - 实现referrals表的简单安置逻辑

#### 中期目标 (3-7天)
1. **3×3矩阵算法** - 完整的L→M→R安置优先级算法
2. **Layer奖励系统** - pending/rollup机制实现  
3. **BCC余额管理** - locked/unlocked/transferable分类管理
4. **Tier分配系统** - 基于激活顺序的4层tier系统

#### 长期目标 (1-2周)
1. **特殊业务规则** - Level 2升级限制、72小时pending机制
2. **Dashboard完整功能** - 矩阵可视化、奖励查看、余额管理
3. **数据同步优化** - 实时状态更新、错误处理、性能优化

---

## 注意事项
1. 所有数据库操作都要考虑事务一致性
2. 链上交易需要足够的确认时间
3. 矩阵安置算法需要考虑并发安全
4. 奖励计算需要精确的数学计算
5. 用户体验要考虑loading状态和错误处理