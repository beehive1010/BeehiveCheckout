-- BCC释放问题修复脚本
-- 发现时间: 2025-10-16
-- 问题: 4个用户的BCC余额不正确

\echo '=== 开始修复BCC释放问题 ==='

BEGIN;

\echo ''
\echo '=== 修复前的状态检查 ==='
SELECT
    ub.wallet_address,
    m.current_level,
    ub.bcc_balance as current_bcc,
    ub.bcc_total_unlocked,
    CASE
        WHEN m.current_level = 2 THEN 600
        WHEN m.current_level = 3 THEN 750
        ELSE 500
    END as expected_bcc,
    ub.bcc_balance - CASE
        WHEN m.current_level = 2 THEN 600
        WHEN m.current_level = 3 THEN 750
        ELSE 500
    END as difference
FROM user_balances ub
LEFT JOIN members m ON LOWER(ub.wallet_address) = LOWER(m.wallet_address)
WHERE ub.wallet_address IN (
    '0x13992967cC62F67159Fc2942eFaF54a2eA035319',
    '0x1115AdeAE04fF38DBEe194823D7eB08B94e33d63',
    '0x17918ABa958f332717e594C53906F77afa551BFB',
    '0xd1669C2f27F679709CFC854F8a091110Ef5Ac0B2'
)
ORDER BY ub.wallet_address;

\echo ''
\echo '--- 修复1: 0x13992967cC62F67159Fc2942eFaF54a2eA035319 ---'
\echo '问题: Level 2, 少了100 BCC'
\echo '操作: 500 → 600, bcc_locked: 10450 → 10350, bcc_total_unlocked: 0 → 100'
UPDATE user_balances
SET
    bcc_balance = bcc_balance + 100,
    bcc_locked = bcc_locked - 100,
    bcc_total_unlocked = bcc_total_unlocked + 100,
    last_updated = NOW()
WHERE wallet_address = '0x13992967cC62F67159Fc2942eFaF54a2eA035319';

INSERT INTO audit_logs (user_wallet, action, new_values)
VALUES ('0x13992967cC62F67159Fc2942eFaF54a2eA035319', 'bcc_unlock_manual_fix', json_build_object(
    'reason', 'Missing Level 1 BCC unlock (100)',
    'previous_balance', 500,
    'new_balance', 600,
    'unlock_amount', 100,
    'fixed_at', NOW()
));

\echo ''
\echo '--- 修复2: 0x1115AdeAE04fF38DBEe194823D7eB08B94e33d63 ---'
\echo '问题: Level 2, 少了100 BCC'
\echo '操作: 500 → 600, bcc_locked: 10450 → 10350, bcc_total_unlocked: 0 → 100'
UPDATE user_balances
SET
    bcc_balance = bcc_balance + 100,
    bcc_locked = bcc_locked - 100,
    bcc_total_unlocked = bcc_total_unlocked + 100,
    last_updated = NOW()
WHERE wallet_address = '0x1115AdeAE04fF38DBEe194823D7eB08B94e33d63';

INSERT INTO audit_logs (user_wallet, action, new_values)
VALUES ('0x1115AdeAE04fF38DBEe194823D7eB08B94e33d63', 'bcc_unlock_manual_fix', json_build_object(
    'reason', 'Missing Level 1 BCC unlock (100)',
    'previous_balance', 500,
    'new_balance', 600,
    'unlock_amount', 100,
    'fixed_at', NOW()
));

\echo ''
\echo '--- 修复3: 0x17918ABa958f332717e594C53906F77afa551BFB ---'
\echo '问题: Level 2, 少了100 BCC'
\echo '操作: 500 → 600, bcc_locked: 10450 → 10350, bcc_total_unlocked: 0 → 100'
UPDATE user_balances
SET
    bcc_balance = bcc_balance + 100,
    bcc_locked = bcc_locked - 100,
    bcc_total_unlocked = bcc_total_unlocked + 100,
    last_updated = NOW()
WHERE wallet_address = '0x17918ABa958f332717e594C53906F77afa551BFB';

INSERT INTO audit_logs (user_wallet, action, new_values)
VALUES ('0x17918ABa958f332717e594C53906F77afa551BFB', 'bcc_unlock_manual_fix', json_build_object(
    'reason', 'Missing Level 1 BCC unlock (100)',
    'previous_balance', 500,
    'new_balance', 600,
    'unlock_amount', 100,
    'fixed_at', NOW()
));

\echo ''
\echo '--- 修复4: 0xd1669C2f27F679709CFC854F8a091110Ef5Ac0B2 ---'
\echo '问题: Level 3, 多释放了100 BCC (应该750但有850)'
\echo '操作: 850 → 750, bcc_locked: 9700 → 9800, bcc_total_unlocked: 350 → 250'
UPDATE user_balances
SET
    bcc_balance = bcc_balance - 100,
    bcc_locked = bcc_locked + 100,
    bcc_total_unlocked = bcc_total_unlocked - 100,
    last_updated = NOW()
WHERE wallet_address = '0xd1669C2f27F679709CFC854F8a091110Ef5Ac0B2';

INSERT INTO audit_logs (user_wallet, action, new_values)
VALUES ('0xd1669C2f27F679709CFC854F8a091110Ef5Ac0B2', 'bcc_unlock_manual_fix', json_build_object(
    'reason', 'Extra 100 BCC released (double unlock)',
    'previous_balance', 850,
    'new_balance', 750,
    'adjustment', -100,
    'fixed_at', NOW()
));

\echo ''
\echo '=== 修复后的状态验证 ==='
SELECT
    ub.wallet_address,
    m.current_level,
    ub.bcc_balance as current_bcc,
    ub.bcc_total_unlocked,
    CASE
        WHEN m.current_level = 2 THEN 600
        WHEN m.current_level = 3 THEN 750
        ELSE 500
    END as expected_bcc,
    ub.bcc_balance - CASE
        WHEN m.current_level = 2 THEN 600
        WHEN m.current_level = 3 THEN 750
        ELSE 500
    END as difference
FROM user_balances ub
LEFT JOIN members m ON LOWER(ub.wallet_address) = LOWER(m.wallet_address)
WHERE ub.wallet_address IN (
    '0x13992967cC62F67159Fc2942eFaF54a2eA035319',
    '0x1115AdeAE04fF38DBEe194823D7eB08B94e33d63',
    '0x17918ABa958f332717e594C53906F77afa551BFB',
    '0xd1669C2f27F679709CFC854F8a091110Ef5Ac0B2'
)
ORDER BY ub.wallet_address;

\echo ''
\echo '=== 最终一致性检查（应该全部为0）==='
WITH user_expected_bcc AS (
    SELECT
        m.wallet_address,
        m.current_level,
        ub.bcc_balance as actual_bcc,
        CASE
            WHEN m.current_level = 1 THEN 500
            WHEN m.current_level = 2 THEN 600
            WHEN m.current_level = 3 THEN 750
            WHEN m.current_level = 4 THEN 950
            WHEN m.current_level = 5 THEN 1200
            WHEN m.current_level = 6 THEN 1550
            ELSE 500
        END as expected_bcc
    FROM members m
    LEFT JOIN user_balances ub ON LOWER(m.wallet_address) = LOWER(ub.wallet_address)
    WHERE m.current_level >= 2
    AND (SELECT MAX(claimed_at) FROM membership WHERE wallet_address = m.wallet_address) >= '2025-10-08'
)
SELECT
    COUNT(*) as inconsistent_users_count
FROM user_expected_bcc
WHERE actual_bcc != expected_bcc;

COMMIT;

\echo ''
\echo '✅ BCC释放问题修复完成！'
\echo '修复汇总:'
\echo '  - 补充BCC: 3个用户 (+300 BCC)'
\echo '  - 回收多余BCC: 1个用户 (-100 BCC)'
\echo '  - 净变化: +200 BCC'
