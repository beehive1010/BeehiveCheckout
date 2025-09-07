# 任务流程文档 (Task Process Documentation)

## 项目概述
这是一个基于区块链的会员推荐系统，包含NFT会员制度、三三矩阵推荐树、奖励分配等核心功能。

## 主要技术栈
- Frontend: React + TypeScript
- Backend: Supabase (Database + Edge Functions)
- Blockchain: Web3 钱包集成
- Database: PostgreSQL (通过Supabase)

## 核心业务流程

### 1. 用户注册流程
```
钱包连接 -> 注册页面填写信息 -> users表记录 -> welcome页面 -> 
等待claim NFT level 1 -> 链上交易确认 -> 
记录orders + member NFT + membership -> 
插入members表和referrals表 -> dashboard
```

### 2. 矩阵推荐系统
```
新会员激活 -> 根据referrer查找安置位置 -> 
三三限制矩阵安置 -> 记录推荐关系 -> 
触发layer奖励 -> 更新余额
```

## 当前任务状态

### Phase 1: 基础架构清理和优化
- [🔄] 检查和清理页面组件API调用方式
- [⏳] 检查用户钱包连接和注册流程
- [⏳] 实现welcome界面NFT claim等待逻辑
- [⏳] 实现链上交易认证等待机制

### Phase 2: 核心业务逻辑实现
- [⏳] 完善订单和NFT记录系统
- [⏳] 实现members和referrals表数据插入
- [⏳] 构建矩阵推荐树安置系统
- [⏳] 实现layer1奖励触发系统

### Phase 3: 奖励和余额系统
- [⏳] 实现奖励记录和余额更新
- [⏳] 实现BCC余额和锁仓系统

### Phase 4: 数据同步和文档
- [⏳] 同步数据库类型定义
- [✅] 创建任务流程文档

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

### 2024-XX-XX
- 项目分析和任务规划
- 创建任务流程文档
- 开始API调用方式检查

---

## 注意事项
1. 所有数据库操作都要考虑事务一致性
2. 链上交易需要足够的确认时间
3. 矩阵安置算法需要考虑并发安全
4. 奖励计算需要精确的数学计算
5. 用户体验要考虑loading状态和错误处理