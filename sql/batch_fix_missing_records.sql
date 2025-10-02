-- 批量修复所有缺失的matrix和referrer记录

-- 1. 为root用户 (0x0000000000000000000000000000000000000001) 补充记录
-- 这是系统根用户，需要特殊处理

-- 1.1 补充membership记录
INSERT INTO membership (
    wallet_address,
    referrer_wallet, 
    nft_level,
    claim_transaction_hash,
    claim_status,
    claimed_at,
    activated_at,
    profile_completed,
    payment_verified,
    nft_verified,
    member_created_at,
    activation_rank,
    activation_tier,
    bcc_locked_amount,
    platform_activation_fee,
    member_created,
    created_at,
    updated_at
) VALUES (
    '0x0000000000000000000000000000000000000001',
    '0x0000000000000000000000000000000000000001',
    19, -- Root level
    'root_system_init',
    'completed',
    '2025-09-06 17:50:16.130685+00',
    '2025-09-06 17:50:16.130685+00',
    true,
    true,
    true,
    '2025-09-06 17:50:16.130685+00',
    1,
    1,
    0.00, -- Root不需要锁仓
    0.00, -- Root不需要平台费
    true,
    '2025-09-06 17:50:16.130685+00',
    '2025-09-06 17:50:16.130685+00'
) ON CONFLICT (wallet_address) DO NOTHING;

-- 1.2 补充referrals记录 (Root指向自己)
INSERT INTO referrals (
    member_wallet,
    referrer_wallet,
    matrix_root,
    matrix_layer,
    matrix_position,
    is_active,
    activation_rank,
    placed_at
) VALUES (
    '0x0000000000000000000000000000000000000001',
    '0x0000000000000000000000000000000000000001',
    '0x0000000000000000000000000000000000000001',
    1,
    'ROOT',
    true,
    1,
    '2025-09-06 17:50:16.130685+00'
) ON CONFLICT DO NOTHING;

-- 1.3 补充individual_matrix_placements记录 (Root是自己matrix的owner)
INSERT INTO individual_matrix_placements (
    matrix_owner,
    member_wallet,
    layer_in_owner_matrix,
    position_in_layer,
    placement_order,
    placed_at,
    is_active
) VALUES (
    '0x0000000000000000000000000000000000000001',
    '0x0000000000000000000000000000000000000001',
    0, -- Root在自己的matrix层级0
    'ROOT',
    0,
    '2025-09-06 17:50:16.130685+00',
    true
) ON CONFLICT DO NOTHING;

-- 1.4 补充matrix_activity_log记录
INSERT INTO matrix_activity_log (
    root_wallet,
    member_wallet,
    activity_type,
    layer,
    position,
    details,
    created_at
) VALUES (
    '0x0000000000000000000000000000000000000001',
    '0x0000000000000000000000000000000000000001',
    'system_init',
    0,
    'ROOT',
    jsonb_build_object(
        'system_role', 'root',
        'level', 19,
        'initialization', true
    ),
    '2025-09-06 17:50:16.130685+00'
) ON CONFLICT DO NOTHING;

-- 2. 为测试用户 0xTEST123456789ABCDEF 补充记录
INSERT INTO individual_matrix_placements (
    matrix_owner,
    member_wallet,
    layer_in_owner_matrix,
    position_in_layer,
    placement_order,
    placed_at,
    is_active
) VALUES (
    '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab',
    '0xTEST123456789ABCDEF',
    1,
    'M', -- Second position
    2,
    (SELECT created_at FROM members WHERE wallet_address = '0xTEST123456789ABCDEF'),
    true
) ON CONFLICT DO NOTHING;

INSERT INTO matrix_activity_log (
    root_wallet,
    member_wallet,
    activity_type,
    layer,
    position,
    details,
    created_at
) VALUES (
    '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab',
    '0xTEST123456789ABCDEF',
    'member_placement',
    1,
    'M',
    jsonb_build_object(
        'placement_order', 2,
        'referrer_wallet', '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab',
        'nft_level', 1,
        'backfill', true
    ),
    (SELECT created_at FROM members WHERE wallet_address = '0xTEST123456789ABCDEF')
) ON CONFLICT DO NOTHING;

-- 为测试用户补充初始BCC余额
INSERT INTO user_balances (
    wallet_address,
    usdc_claimable,
    usdc_pending,
    usdc_claimed_total,
    bcc_transferable,
    bcc_locked,
    bcc_total_initial,
    created_at,
    updated_at
) VALUES (
    '0xTEST123456789ABCDEF',
    0,
    0,
    0,
    500, -- 初始可转账BCC
    10450, -- 初始锁仓BCC  
    10950, -- 总计
    (SELECT created_at FROM members WHERE wallet_address = '0xTEST123456789ABCDEF'),
    NOW()
) ON CONFLICT (wallet_address) DO NOTHING;

-- 3. 为用户 0xF9e54564D273531F97F95291BAF0C3d74F337937 补充记录
INSERT INTO individual_matrix_placements (
    matrix_owner,
    member_wallet,
    layer_in_owner_matrix,
    position_in_layer,
    placement_order,
    placed_at,
    is_active
) VALUES (
    '0x0000000000000000000000000000000000000001',
    '0xF9e54564D273531F97F95291BAF0C3d74F337937',
    1,
    'M', -- Second position under root
    2,
    (SELECT created_at FROM members WHERE wallet_address = '0xF9e54564D273531F97F95291BAF0C3d74F337937'),
    true
) ON CONFLICT DO NOTHING;

INSERT INTO matrix_activity_log (
    root_wallet,
    member_wallet,
    activity_type,
    layer,
    position,
    details,
    created_at
) VALUES (
    '0x0000000000000000000000000000000000000001',
    '0xF9e54564D273531F97F95291BAF0C3d74F337937',
    'member_placement',
    1,
    'M',
    jsonb_build_object(
        'placement_order', 2,
        'referrer_wallet', '0x0000000000000000000000000000000000000001',
        'nft_level', 1,
        'backfill', true
    ),
    (SELECT created_at FROM members WHERE wallet_address = '0xF9e54564D273531F97F95291BAF0C3d74F337937')
) ON CONFLICT DO NOTHING;

-- 为该用户补充初始BCC余额
INSERT INTO user_balances (
    wallet_address,
    usdc_claimable,
    usdc_pending,
    usdc_claimed_total,
    bcc_transferable,
    bcc_locked,
    bcc_total_initial,
    created_at,
    updated_at
) VALUES (
    '0xF9e54564D273531F97F95291BAF0C3d74F337937',
    0,
    0,
    0,
    500, -- 初始可转账BCC
    10450, -- 初始锁仓BCC  
    10950, -- 总计
    (SELECT created_at FROM members WHERE wallet_address = '0xF9e54564D273531F97F95291BAF0C3d74F337937'),
    NOW()
) ON CONFLICT (wallet_address) DO NOTHING;

-- 显示修复结果
SELECT '✅ 批量修复完成' as result;