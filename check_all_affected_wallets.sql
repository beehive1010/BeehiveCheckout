-- 查找所有类似情况：已经符合条件但仍是 pending 的奖励
SELECT
    lr.reward_recipient_wallet,
    COUNT(*) as pending_count,
    SUM(lr.reward_amount) as total_pending_amount,
    m.current_level,
    lr.recipient_required_level
FROM layer_rewards lr
JOIN members m ON m.wallet_address = lr.reward_recipient_wallet
WHERE lr.status = 'pending'
  AND lr.expires_at > NOW()
  AND m.current_level >= lr.recipient_required_level
GROUP BY lr.reward_recipient_wallet, m.current_level, lr.recipient_required_level
ORDER BY total_pending_amount DESC;
