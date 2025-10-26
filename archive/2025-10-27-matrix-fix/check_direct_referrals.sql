-- 检查0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab的直推人数

-- 1. 从referrals表查询直推人数（正确的直推统计）
SELECT 
    'Direct Referrals from referrals table' as source,
    COUNT(*) as direct_referrals_count,
    COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM members m 
        WHERE m.wallet_address = r.referred_wallet 
        AND m.current_level >= 1
    )) as activated_referrals
FROM referrals r
WHERE r.referrer_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab';

-- 2. Matrix Layer 1占位（只有3个位置）
SELECT 
    'Matrix Layer 1 Positions' as source,
    COUNT(*) as layer1_positions,
    array_agg(slot ORDER BY slot) as occupied_slots
FROM matrix_referrals
WHERE matrix_root_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'
  AND layer = 1;

-- 3. 对比referrals_stats_view
SELECT 
    'referrals_stats_view' as source,
    direct_referrals,
    total_referrals
FROM referrals_stats_view
WHERE referrer_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab';

-- 4. 列出所有直推成员
SELECT 
    r.referred_wallet,
    u.username,
    m.current_level,
    m.activation_time,
    r.created_at as referred_at
FROM referrals r
LEFT JOIN users u ON u.wallet_address = r.referred_wallet
LEFT JOIN members m ON m.wallet_address = r.referred_wallet
WHERE r.referrer_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'
ORDER BY r.created_at DESC
LIMIT 20;
