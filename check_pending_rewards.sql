-- 检查特定钱包的 pending 奖励详情
SELECT
    lr.id,
    lr.reward_recipient_wallet,
    lr.triggering_member_wallet,
    lr.reward_amount,
    lr.status,
    lr.matrix_layer,
    lr.layer_position,
    lr.recipient_required_level,
    lr.recipient_current_level,
    lr.created_at,
    lr.expires_at,
    -- 检查当前会员等级
    m.current_level as member_actual_level,
    -- 判断是否应该是 claimable
    CASE 
        WHEN m.current_level >= lr.recipient_required_level THEN 'SHOULD_BE_CLAIMABLE'
        ELSE 'CORRECTLY_PENDING'
    END as should_be_status,
    -- 距离过期时间
    EXTRACT(EPOCH FROM (lr.expires_at - NOW())) / 3600 as hours_until_expiry
FROM layer_rewards lr
LEFT JOIN members m ON m.wallet_address = lr.reward_recipient_wallet
WHERE lr.reward_recipient_wallet = '0x9aAF0ED38C24A1A51836ec1F67fF13731d7bE7e6'
  AND lr.status = 'pending'
ORDER BY lr.created_at DESC;
