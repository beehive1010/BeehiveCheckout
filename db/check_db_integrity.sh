#!/bin/bash

echo "=== Database Integrity Check ==="
echo "检查数据库各表之间的同步状态..."

echo ""
echo "1. 检查Root用户信息:"
curl -s -X POST "https://cdjmtevekxpmgrixkiqt.supabase.co/functions/v1/activate-membership" \
-H "Content-Type: application/json" \
-H "x-wallet-address: 0x0000000000000000000000000000000000000001" \
-d '{"action": "get-member-info"}' | jq '.member | {wallet_address, current_level, levels_owned, activation_rank}'

echo ""
echo "2. 检查Root用户的Matrix统计:"
curl -s -X POST "https://cdjmtevekxpmgrixkiqt.supabase.co/functions/v1/matrix" \
-H "Content-Type: application/json" \
-H "x-wallet-address: 0x0000000000000000000000000000000000000001" \
-d '{
    "action": "get-matrix-stats",
    "rootWallet": "0x0000000000000000000000000000000000000001"
}' | jq '.data | {total_team_size, activated_members, direct_referrals, activated_referrals}'

echo ""
echo "3. 检查Root用户的Rewards余额:"
curl -s -X GET "https://cdjmtevekxpmgrixkiqt.supabase.co/functions/v1/rewards/user" \
-H "Content-Type: application/json" \
-H "x-wallet-address: 0x0000000000000000000000000000000000000001" | jq '.data | {wallet_address, usdc_claimable, usdc_pending, usdc_claimed_total}'

echo ""
echo "4. 检查测试用户信息:"
curl -s -X POST "https://cdjmtevekxpmgrixkiqt.supabase.co/functions/v1/activate-membership" \
-H "Content-Type: application/json" \
-H "x-wallet-address: 0x1234567890123456789012345678901234567890" \
-d '{"action": "get-member-info"}' | jq '.member | {wallet_address, current_level, referrer_wallet, activation_rank}'

echo ""
echo "5. 测试一个新的NFT Level 1 激活:"
TIMESTAMP=$(date +%s)
curl -s -X POST "https://cdjmtevekxpmgrixkiqt.supabase.co/functions/v1/activate-membership" \
-H "Content-Type: application/json" \
-H "x-wallet-address: 0xABCDEF1234567890123456789012345678901234" \
-d "{
    \"transactionHash\": \"demo_integrity_test_${TIMESTAMP}\",
    \"level\": 1,
    \"referrerWallet\": \"0x0000000000000000000000000000000000000001\"
}" | jq '{success, action, level, message}'

echo ""
echo "6. 检查新激活用户的Matrix位置:"
sleep 2  # 等待数据库更新
curl -s -X POST "https://cdjmtevekxpmgrixkiqt.supabase.co/functions/v1/matrix" \
-H "Content-Type: application/json" \
-H "x-wallet-address: 0xABCDEF1234567890123456789012345678901234" \
-d '{
    "action": "get-matrix-stats",
    "rootWallet": "0x0000000000000000000000000000000000000001"
}' | jq '.data | {total_team_size, layer_distribution}'

echo ""
echo "7. 检查更新后的Root Matrix统计:"
curl -s -X POST "https://cdjmtevekxpmgrixkiqt.supabase.co/functions/v1/matrix" \
-H "Content-Type: application/json" \
-H "x-wallet-address: 0x0000000000000000000000000000000000000001" \
-d '{
    "action": "get-matrix-stats",
    "rootWallet": "0x0000000000000000000000000000000000000001"
}' | jq '.data | {total_team_size, activated_members, direct_referrals}'

echo ""
echo "=== 数据库检查完成 ==="