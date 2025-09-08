-- 修正绑定逻辑：根据服务性质决定绑定
-- Correct binding logic: Bind based on service nature

-- 重新分析绑定逻辑：
-- users表：管理员和用户的基础身份识别
-- members表：激活会员的专属服务

-- 管理员相关服务 - 绑定users表（因为管理员不一定是会员）
-- Admin related services - bind to users (admins may not be members)

-- admin_actions表的admin_wallet应该绑定users（管理员身份）
ALTER TABLE admin_actions DROP CONSTRAINT IF EXISTS admin_actions_admin_wallet_fkey;
ALTER TABLE admin_actions 
ADD CONSTRAINT admin_actions_admin_wallet_fkey 
FOREIGN KEY (admin_wallet) REFERENCES users(wallet_address);

-- admin_actions表的target_wallet应该绑定members（被管理的对象是会员）
-- target_wallet stays bound to members (managed objects are members)

-- countdown_timers表的admin_wallet绑定users（管理员操作）
ALTER TABLE countdown_timers DROP CONSTRAINT IF EXISTS countdown_timers_admin_wallet_fkey;
ALTER TABLE countdown_timers 
ADD CONSTRAINT countdown_timers_admin_wallet_fkey 
FOREIGN KEY (admin_wallet) REFERENCES users(wallet_address);

-- countdown_timers表的wallet_address绑定members（倒计时是给会员的）
-- wallet_address stays bound to members (timers are for members)

-- system_settings的updated_by绑定users（管理员更新系统设置）
ALTER TABLE system_settings DROP CONSTRAINT IF EXISTS system_settings_updated_by_fkey;
ALTER TABLE system_settings 
ADD CONSTRAINT system_settings_updated_by_fkey 
FOREIGN KEY (updated_by) REFERENCES users(wallet_address);

-- 内容创建相关 - 根据业务逻辑决定
-- Content creation - decide based on business logic

-- 博客作者可能是管理员，绑定users
ALTER TABLE blog_posts DROP CONSTRAINT IF EXISTS blog_posts_author_wallet_fkey;
ALTER TABLE blog_posts 
ADD CONSTRAINT blog_posts_author_wallet_fkey 
FOREIGN KEY (author_wallet) REFERENCES users(wallet_address);

-- 课程讲师可能是管理员，绑定users  
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_instructor_wallet_fkey;
ALTER TABLE courses 
ADD CONSTRAINT courses_instructor_wallet_fkey 
FOREIGN KEY (instructor_wallet) REFERENCES users(wallet_address);

-- 广告创建者需要是会员，绑定members
-- advertisement_nfts stays bound to members (advertisers must be members)

-- 商户NFT创建者需要是会员，绑定members
-- merchant_nfts stays bound to members (creators must be members)

-- 购买行为 - 会员专属服务
-- Purchase behavior - member exclusive services

-- BCC购买需要是会员，绑定members
-- bcc_purchase_orders stays bound to members

-- NFT购买需要是会员，绑定members  
-- nft_purchases stays bound to members

-- 订单需要是会员，绑定members
-- orders stays bound to members

-- 学习服务 - 会员专属
-- Learning services - member exclusive

-- 课程激活需要是会员，绑定members
-- course_activations stays bound to members

-- 学习进度需要是会员，绑定members
-- course_progress stays bound to members

-- 基础用户服务 - 绑定users表
-- Basic user services - bind to users

-- 用户通知绑定users（所有用户都可以接收通知）
ALTER TABLE user_notifications DROP CONSTRAINT IF EXISTS user_notifications_wallet_address_fkey;
ALTER TABLE user_notifications 
ADD CONSTRAINT user_notifications_wallet_address_fkey 
FOREIGN KEY (wallet_address) REFERENCES users(wallet_address);

-- 用户连接记录绑定users（所有用户的连接）
ALTER TABLE user_wallet_connections DROP CONSTRAINT IF EXISTS user_wallet_connections_wallet_address_fkey;
ALTER TABLE user_wallet_connections 
ADD CONSTRAINT user_wallet_connections_wallet_address_fkey 
FOREIGN KEY (wallet_address) REFERENCES users(wallet_address);

-- 审计日志绑定users（记录所有用户操作）
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_wallet_fkey;
ALTER TABLE audit_logs 
ADD CONSTRAINT audit_logs_user_wallet_fkey 
FOREIGN KEY (user_wallet) REFERENCES users(wallet_address);

-- 会员专属服务保持绑定members表：
-- Member exclusive services stay bound to members:
-- ✓ referrals (推荐矩阵)
-- ✓ matrix_activity_log (矩阵活动) 
-- ✓ matrix_layer_summary (矩阵统计)
-- ✓ layer_rewards (层级奖励)
-- ✓ reward_claims (奖励申领)
-- ✓ reward_notifications (奖励通知)
-- ✓ user_balances (余额管理)
-- ✓ usdt_withdrawals (提现服务)
-- ✓ member_requirements (会员要求)
-- ✓ advertisement_nfts (广告NFT)
-- ✓ merchant_nfts (商户NFT)
-- ✓ bcc_purchase_orders (BCC购买)
-- ✓ nft_purchases (NFT购买)
-- ✓ orders (订单)
-- ✓ course_activations (课程激活)
-- ✓ course_progress (学习进度)
-- ✓ countdown_timers.wallet_address (会员倒计时)
-- ✓ admin_actions.target_wallet (管理目标是会员)

-- 最终绑定总结
SELECT 'Binding logic corrected' as status,
       'users: admin functions + basic user services' as users_table,
       'members: all member-exclusive services' as members_table;

COMMIT;