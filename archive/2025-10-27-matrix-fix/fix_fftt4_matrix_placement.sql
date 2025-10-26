-- 修复FFTT4矩阵的Layer 2占位问题
-- 问题：Layer 2的成员没有按照Branch-First BFS规则正确分布到3个parent

-- 当前错误状态：
-- Layer 2全部都在FFTT411下：
--   FFTT411 (L) -> FFTT4121 (L), FFTT413 (M), FFTT416 (R)
--   FFTT412 (M) -> 空
--   FFTT4114 (R) -> 空

-- 正确状态应该是：
-- Layer 2按照Branch-First规则先填所有parent的L：
--   FFTT411 (L) -> FFTT4121 (L)
--   FFTT412 (M) -> FFTT413 (L)
--   FFTT4114 (R) -> FFTT416 (L)

BEGIN;

-- 更新FFTT413：从FFTT411的M位移到FFTT412的L位
UPDATE matrix_referrals
SET
  parent_wallet = '0xcfE6d113B22085922Bc7202d018Eb13D2dAF95ff',  -- FFTT412
  slot = 'L'
WHERE matrix_root_wallet = '0xD95E2e17507E25C6a8556dB3d65cC47664Bf96df'  -- FFTT4
  AND member_wallet = '0x4c0A310D823b76b0ebF0C13ccdA0D43Fd017ae67'    -- FFTT413
  AND layer = 2;

-- 更新FFTT416：从FFTT411的R位移到FFTT4114的L位
UPDATE matrix_referrals
SET
  parent_wallet = '0xC453d55D47c3c6D6cd0DEc25710950CF76d17F9A',  -- FFTT4114
  slot = 'L'
WHERE matrix_root_wallet = '0xD95E2e17507E25C6a8556dB3d65cC47664Bf96df'  -- FFTT4
  AND member_wallet = '0x9a25823E002C8F9f242B752cbBb307046604DA33'    -- FFTT416
  AND layer = 2;

-- 验证修复后的数据
SELECT
  '=== 修复后的FFTT4矩阵 ===' AS title;

SELECT
  mr.layer,
  mr.parent_wallet,
  p.username as parent_username,
  mr.slot,
  mr.member_wallet,
  u.username as member_username,
  m.activation_sequence,
  CASE
    WHEN mr.layer = 2 AND mr.slot = 'L' THEN '✓ 正确（Branch-First：先填所有parent的L）'
    ELSE ''
  END as correctness_note
FROM matrix_referrals mr
LEFT JOIN users u ON u.wallet_address = mr.member_wallet
LEFT JOIN members m ON m.wallet_address = mr.member_wallet
LEFT JOIN users p ON p.wallet_address = mr.parent_wallet
WHERE mr.matrix_root_wallet = '0xD95E2e17507E25C6a8556dB3d65cC47664Bf96df'
ORDER BY mr.layer, m.activation_sequence;

COMMIT;

-- 说明修复逻辑
SELECT
  '=== Branch-First BFS规则说明 ===' AS explanation,
  E'当Layer 1有3个parent（FFTT411, FFTT412, FFTT4114）时，\n' ||
  E'Layer 2的前3个成员应该按照激活顺序依次填充：\n' ||
  E'  第1个 (FFTT4121 #4073) → FFTT411的L位 ✓\n' ||
  E'  第2个 (FFTT413 #4074)  → FFTT412的L位 ✓ (已修复)\n' ||
  E'  第3个 (FFTT416 #4076)  → FFTT4114的L位 ✓ (已修复)\n' ||
  E'\n' ||
  E'这样每个parent都有1个child在L位，符合Branch-First规则！' AS rule_description;
