-- 修复所有表的RLS策略
-- ========================================
-- 为核心表创建完整的RLS策略
-- ========================================

SELECT '=== 修复所有表的RLS策略 ===' as rls_fix_section;

-- 第1步：启用核心表的RLS
-- ========================================

-- 用户表
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE layer_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE nft_membership_levels ENABLE ROW LEVEL SECURITY;

-- 第2步：创建用户表RLS策略
-- ========================================

-- users表策略
CREATE POLICY "Users can read own profile" ON users
    FOR SELECT USING (wallet_address::text = get_current_wallet_address()::text);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (wallet_address::text = get_current_wallet_address()::text);

CREATE POLICY "Allow user registration" ON users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role full access" ON users
    FOR ALL USING (true) WITH CHECK (true);

-- 第3步：创建members表RLS策略  
-- ========================================

-- members表策略
CREATE POLICY "Users can read own member data" ON members
    FOR SELECT USING (wallet_address::text = get_current_wallet_address()::text);

CREATE POLICY "Users can update own member data" ON members  
    FOR UPDATE USING (wallet_address::text = get_current_wallet_address()::text);

CREATE POLICY "System can create members" ON members
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can read member public info" ON members
    FOR SELECT USING (true);  -- 公开读取用于显示推荐结构

CREATE POLICY "Service role full access members" ON members
    FOR ALL USING (true) WITH CHECK (true);

-- 第4步：创建membership表RLS策略
-- ========================================

-- membership表策略
CREATE POLICY "Users can read own memberships" ON membership
    FOR SELECT USING (wallet_address::text = get_current_wallet_address()::text);

CREATE POLICY "Users can create own memberships" ON membership
    FOR INSERT WITH CHECK (wallet_address::text = get_current_wallet_address()::text);

CREATE POLICY "System can manage memberships" ON membership
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access membership" ON membership
    FOR ALL USING (true) WITH CHECK (true);

-- 第5步：创建referrals表RLS策略
-- ========================================

-- referrals表策略
CREATE POLICY "Users can read own referral data" ON referrals
    FOR SELECT USING (
        member_wallet::text = get_current_wallet_address()::text 
        OR referrer_wallet::text = get_current_wallet_address()::text
        OR matrix_root_wallet::text = get_current_wallet_address()::text
    );

CREATE POLICY "System can manage referrals" ON referrals
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public can read referral structure" ON referrals
    FOR SELECT USING (true);  -- 公开读取用于显示Matrix结构

CREATE POLICY "Service role full access referrals" ON referrals
    FOR ALL USING (true) WITH CHECK (true);

-- 第6步：创建layer_rewards表RLS策略
-- ========================================

-- layer_rewards表策略
CREATE POLICY "Users can read own rewards" ON layer_rewards
    FOR SELECT USING (
        reward_recipient_wallet::text = get_current_wallet_address()::text 
        OR triggering_member_wallet::text = get_current_wallet_address()::text
    );

CREATE POLICY "Users can claim own rewards" ON layer_rewards
    FOR UPDATE USING (reward_recipient_wallet::text = get_current_wallet_address()::text);

CREATE POLICY "System can manage layer rewards" ON layer_rewards
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access layer_rewards" ON layer_rewards
    FOR ALL USING (true) WITH CHECK (true);

-- 第7步：创建member_balances表RLS策略
-- ========================================

-- member_balances表策略
CREATE POLICY "Users can read own balance" ON member_balances
    FOR SELECT USING (wallet_address::text = get_current_wallet_address()::text);

CREATE POLICY "System can manage balances" ON member_balances
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access member_balances" ON member_balances
    FOR ALL USING (true) WITH CHECK (true);

-- 第8步：创建nft_membership_levels表RLS策略
-- ========================================

-- nft_membership_levels表策略（公开读取）
CREATE POLICY "Everyone can read NFT levels" ON nft_membership_levels
    FOR SELECT USING (true);

CREATE POLICY "Service role full access nft_levels" ON nft_membership_levels
    FOR ALL USING (true) WITH CHECK (true);

-- 第9步：验证RLS策略
-- ========================================

SELECT '=== RLS策略创建完成验证 ===' as verification_section;

-- 检查所有核心表的RLS启用状态
SELECT 
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS已启用' 
        ELSE '❌ RLS未启用' 
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'members', 'membership', 'referrals', 'layer_rewards', 'member_balances', 'nft_membership_levels')
ORDER BY tablename;

-- 统计每个核心表的策略数量
SELECT 
    tablename,
    COUNT(policyname) as policy_count,
    array_agg(cmd) as policy_types
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('users', 'members', 'membership', 'referrals', 'layer_rewards', 'member_balances', 'nft_membership_levels')
GROUP BY tablename
ORDER BY tablename;

SELECT '✅ 所有核心表RLS策略修复完成' as completion_message;