#!/bin/bash

# 完整端到端测试脚本
echo "🧪 完整端到端测试: Welcome界面 → Users → Claim NFT → Webhook认证 → Membership → Members → BCC初始化 → Layer奖励 → BCC Level1解锁 → User_Balances"
echo "======================================================================================================="

# 配置变量
WEBHOOK_URL="https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/thirdweb-webhook"
WEBHOOK_SECRET="5aada87a79b4e45573607a1f46e0f3c8a04141d71044e3f6003c3a5a70e828f6"
DB_URL="postgresql://postgres:bee8881941@db.cvqibjcbfrwsgkvthccp.supabase.co:5432/postgres"
TEST_WALLET="0x1234567890123456789012345678901234567890"
TEST_EMAIL="test-flow-$(date +%s)@beehive.test"
REFERRER_WALLET="0xC813218A28E130B46f8247F0a23F0BD841A8DB4E"  # 使用已存在的referrer
TIMESTAMP=$(date +%s)

echo "📋 测试配置:"
echo "   测试钱包: $TEST_WALLET"
echo "   测试邮箱: $TEST_EMAIL"
echo "   推荐人钱包: $REFERRER_WALLET" 
echo "   时间戳: $TIMESTAMP"
echo ""

# 步骤1: 测试用户注册流程
echo "🚀 步骤1: 测试用户注册流程"
echo "==============================="

# 创建测试用户 (带推荐人)
echo "📝 创建测试用户(带推荐人)..."
USER_CREATION=$(psql "$DB_URL" -t -c "
INSERT INTO users (wallet_address, email, username, referrer_wallet, created_at)
VALUES ('$TEST_WALLET', '$TEST_EMAIL', 'test-user-$TIMESTAMP', '$REFERRER_WALLET', NOW())
ON CONFLICT (wallet_address) DO UPDATE SET
  email = EXCLUDED.email,
  username = EXCLUDED.username,
  referrer_wallet = EXCLUDED.referrer_wallet,
  updated_at = NOW()
RETURNING wallet_address, email, referrer_wallet;
" 2>&1)

if [[ $USER_CREATION == *"ERROR"* ]]; then
    echo "❌ 用户创建失败: $USER_CREATION"
    exit 1
else
    echo "✅ 用户创建成功: $USER_CREATION"
fi
echo ""

# 步骤2: 测试NFT Claim和Webhook认证
echo "🎯 步骤2: 测试NFT Claim和Webhook认证"
echo "======================================"

# 生成ThirdWeb webhook payload
PAYLOAD="{
  \"version\": 2,
  \"type\": \"pay.onchain-transaction\",
  \"data\": {
    \"transactionId\": \"test-tx-complete-$TIMESTAMP\",
    \"paymentId\": \"pay-complete-$TIMESTAMP\",
    \"status\": \"COMPLETED\",
    \"fromAddress\": \"0x0000000000000000000000000000000000000000\",
    \"toAddress\": \"$TEST_WALLET\",
    \"transactionHash\": \"0x$(openssl rand -hex 32)\",
    \"chainId\": 42161,
    \"contractAddress\": \"0x36a1aC6D8F0204827Fad16CA5e222F1Aeae4Adc8\",
    \"tokenId\": \"1\",
    \"amount\": \"1\",
    \"currency\": \"USDC\",
    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"metadata\": {
      \"source\": \"end_to_end_test\",
      \"test\": true,
      \"referrer\": \"$REFERRER_WALLET\"
    }
  }
}"

echo "📤 发送Webhook请求进行NFT claim认证..."

# 生成签名
if command -v node &> /dev/null; then
    SIGNATURE=$(node -e "
        const crypto = require('crypto');
        const timestamp = '$TIMESTAMP';
        const payload = \`$PAYLOAD\`;
        const secret = '$WEBHOOK_SECRET';
        const signatureString = timestamp + '.' + payload;
        const signature = crypto.createHmac('sha256', secret).update(signatureString).digest('hex');
        console.log(signature);
    ")
    
    echo "🔐 生成签名: $SIGNATURE"
    
    # 发送webhook请求
    WEBHOOK_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -H "x-timestamp: $TIMESTAMP" \
      -H "x-payload-signature: $SIGNATURE" \
      -d "$PAYLOAD")
    
    HTTP_CODE=$(echo "$WEBHOOK_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
    WEBHOOK_BODY=$(echo "$WEBHOOK_RESPONSE" | sed '/HTTP_CODE:/d')
    
    echo "📊 Webhook状态码: $HTTP_CODE"
    echo "📋 Webhook响应: $WEBHOOK_BODY"
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ Webhook认证成功"
    else
        echo "❌ Webhook认证失败"
    fi
else
    echo "⚠️  跳过签名测试 (需要Node.js)"
fi
echo ""

# 步骤3: 检查Membership激活
echo "👑 步骤3: 检查Membership激活状态"
echo "================================="

sleep 2  # 等待处理完成

MEMBERSHIP_STATUS=$(psql "$DB_URL" -t -c "
SELECT 
    m.id as membership_id,
    m.nft_level,
    m.claimed_at,
    m.wallet_address,
    u.email
FROM membership m
JOIN users u ON m.wallet_address = u.wallet_address
WHERE m.wallet_address = '$TEST_WALLET'
ORDER BY m.claimed_at DESC
LIMIT 1;
" 2>&1)

if [[ $MEMBERSHIP_STATUS == *"ERROR"* ]] || [[ -z "$MEMBERSHIP_STATUS" ]]; then
    echo "❌ Membership状态检查失败: $MEMBERSHIP_STATUS"
else
    echo "✅ Membership状态: $MEMBERSHIP_STATUS"
fi
echo ""

# 步骤4: 检查Members表记录
echo "👥 步骤4: 检查Members表记录"
echo "=========================="

MEMBERS_STATUS=$(psql "$DB_URL" -t -c "
SELECT 
    wallet_address,
    referrer_wallet,
    current_level,
    activation_sequence,
    activation_time,
    total_nft_claimed
FROM members
WHERE wallet_address = '$TEST_WALLET'
ORDER BY activation_time DESC
LIMIT 1;
" 2>&1)

if [[ $MEMBERS_STATUS == *"ERROR"* ]] || [[ -z "$MEMBERS_STATUS" ]]; then
    echo "❌ Members表记录检查失败: $MEMBERS_STATUS"
else
    echo "✅ Members表记录: $MEMBERS_STATUS"
fi
echo ""

# 步骤5: 检查BCC初始化
echo "💰 步骤5: 检查BCC初始化"
echo "======================"

BCC_INIT_STATUS=$(psql "$DB_URL" -t -c "
SELECT 
    wallet_address,
    bcc_balance,
    bcc_locked,
    bcc_total_unlocked,
    available_balance,
    last_updated
FROM user_balances
WHERE wallet_address = '$TEST_WALLET'
ORDER BY last_updated DESC;
" 2>&1)

if [[ $BCC_INIT_STATUS == *"ERROR"* ]] || [[ -z "$BCC_INIT_STATUS" ]]; then
    echo "❌ BCC初始化检查失败: $BCC_INIT_STATUS"
else
    echo "✅ BCC初始化状态: $BCC_INIT_STATUS"
fi
echo ""

# 步骤6: 检查Referral推荐系统
echo "🔗 步骤6: 检查Referral推荐系统"
echo "============================="

echo "📊 6.1 检查推荐关系建立..."
REFERRAL_RELATIONSHIP=$(psql "$DB_URL" -t -c "
SELECT 
    u.wallet_address as user_wallet,
    u.referrer_wallet,
    r.wallet_address as referrer_info,
    r.username as referrer_username
FROM users u
LEFT JOIN users r ON u.referrer_wallet = r.wallet_address
WHERE u.wallet_address = '$TEST_WALLET';
" 2>&1)

if [[ $REFERRAL_RELATIONSHIP == *"ERROR"* ]] || [[ -z "$REFERRAL_RELATIONSHIP" ]]; then
    echo "❌ 推荐关系检查失败: $REFERRAL_RELATIONSHIP"
else
    echo "✅ 推荐关系: $REFERRAL_RELATIONSHIP"
fi

echo "📊 6.2 检查推荐奖励生成..."
REFERRAL_REWARDS=$(psql "$DB_URL" -t -c "
SELECT 
    r.id,
    r.member_wallet,
    r.referrer_wallet,
    r.matrix_root_wallet,
    r.matrix_layer,
    r.matrix_position,
    r.is_direct_referral,
    r.placed_at
FROM referrals r
WHERE r.member_wallet = '$TEST_WALLET' OR r.referrer_wallet = '$REFERRER_WALLET'
ORDER BY r.placed_at DESC
LIMIT 5;
" 2>&1)

if [[ $REFERRAL_REWARDS == *"ERROR"* ]] || [[ -z "$REFERRAL_REWARDS" ]]; then
    echo "❌ 推荐奖励检查失败: $REFERRAL_REWARDS"
else
    echo "✅ 推荐奖励记录: $REFERRAL_REWARDS"
fi

echo "📊 6.3 检查多层级推荐奖励..."
MULTI_LAYER_REWARDS=$(psql "$DB_URL" -t -c "
SELECT 
    matrix_layer,
    COUNT(*) as placement_count,
    matrix_position,
    is_direct_referral
FROM referrals
WHERE referrer_wallet = '$REFERRER_WALLET' AND member_wallet = '$TEST_WALLET'
GROUP BY matrix_layer, matrix_position, is_direct_referral
ORDER BY matrix_layer;
" 2>&1)

if [[ $MULTI_LAYER_REWARDS == *"ERROR"* ]] || [[ -z "$MULTI_LAYER_REWARDS" ]]; then
    echo "❌ 多层级奖励检查失败: $MULTI_LAYER_REWARDS"
else
    echo "✅ 多层级奖励汇总: $MULTI_LAYER_REWARDS"
fi
echo ""

# 步骤7: 检查Matrix矩阵系统
echo "🔲 步骤7: 检查Matrix矩阵系统"
echo "==========================="

echo "📊 7.1 检查矩阵位置分配..."
MATRIX_POSITION=$(psql "$DB_URL" -t -c "
SELECT 
    r.id,
    r.member_wallet,
    r.matrix_layer,
    r.matrix_position,
    r.referrer_wallet,
    r.matrix_root_wallet,
    r.placed_at
FROM referrals r
WHERE r.member_wallet = '$TEST_WALLET'
ORDER BY r.placed_at DESC
LIMIT 1;
" 2>&1)

if [[ $MATRIX_POSITION == *"ERROR"* ]] || [[ -z "$MATRIX_POSITION" ]]; then
    echo "❌ 矩阵位置检查失败: $MATRIX_POSITION"
else
    echo "✅ 矩阵位置: $MATRIX_POSITION"
fi

echo "📊 7.2 检查推荐人的矩阵状态..."
REFERRER_MATRIX=$(psql "$DB_URL" -t -c "
SELECT 
    m.wallet_address,
    m.current_level,
    m.activation_sequence,
    COUNT(ref.member_wallet) as direct_referrals
FROM members m
LEFT JOIN referrals ref ON ref.referrer_wallet = m.wallet_address
WHERE m.wallet_address = '$REFERRER_WALLET'
GROUP BY m.wallet_address, m.current_level, m.activation_sequence;
" 2>&1)

if [[ $REFERRER_MATRIX == *"ERROR"* ]] || [[ -z "$REFERRER_MATRIX" ]]; then
    echo "❌ 推荐人矩阵状态检查失败: $REFERRER_MATRIX"
else
    echo "✅ 推荐人矩阵状态: $REFERRER_MATRIX"
fi

echo "📊 7.3 检查矩阵层级分布..."
MATRIX_DISTRIBUTION=$(psql "$DB_URL" -t -c "
SELECT 
    matrix_layer,
    matrix_position,
    COUNT(*) as member_count
FROM referrals
GROUP BY matrix_layer, matrix_position
ORDER BY matrix_layer, matrix_position;
" 2>&1)

if [[ $MATRIX_DISTRIBUTION == *"ERROR"* ]] || [[ -z "$MATRIX_DISTRIBUTION" ]]; then
    echo "❌ 矩阵分布检查失败: $MATRIX_DISTRIBUTION"
else
    echo "✅ 矩阵分布统计: $MATRIX_DISTRIBUTION"
fi

echo "📊 7.4 检查溢出逻辑..."
SPILLOVER_CHECK=$(psql "$DB_URL" -t -c "
WITH layer_stats AS (
    SELECT 
        matrix_layer,
        matrix_position,
        COUNT(*) as position_count,
        CASE 
            WHEN matrix_layer = 1 AND COUNT(*) > 3 THEN 'OVERFLOW'
            WHEN matrix_layer > 1 AND COUNT(*) > 9 THEN 'OVERFLOW'
            ELSE 'NORMAL'
        END as status
    FROM referrals
    GROUP BY matrix_layer, matrix_position
)
SELECT 
    matrix_layer,
    matrix_position,
    position_count,
    status
FROM layer_stats
WHERE status = 'OVERFLOW'
ORDER BY matrix_layer, matrix_position;
" 2>&1)

if [[ $SPILLOVER_CHECK == *"ERROR"* ]] || [[ -z "$SPILLOVER_CHECK" ]]; then
    echo "✅ 无溢出情况或检查失败: $SPILLOVER_CHECK"
else
    echo "⚠️  发现溢出情况: $SPILLOVER_CHECK"
fi
echo ""

# 步骤8: 检查BCC Level1解锁(100代币)
echo "🔓 步骤8: 检查BCC Level1解锁(100代币)"
echo "===================================="

BCC_LEVEL1_UNLOCK=$(psql "$DB_URL" -t -c "
SELECT 
    ub.wallet_address,
    ub.bcc_balance,
    ub.bcc_total_unlocked,
    ub.last_updated,
    CASE 
        WHEN ub.bcc_total_unlocked >= 100 THEN 'Level1已解锁'
        ELSE 'Level1未解锁'
    END as level1_status
FROM user_balances ub
WHERE ub.wallet_address = '$TEST_WALLET';
" 2>&1)

if [[ $BCC_LEVEL1_UNLOCK == *"ERROR"* ]] || [[ -z "$BCC_LEVEL1_UNLOCK" ]]; then
    echo "❌ BCC Level1解锁检查失败: $BCC_LEVEL1_UNLOCK"
else
    echo "✅ BCC Level1解锁状态: $BCC_LEVEL1_UNLOCK"
fi
echo ""

# 步骤9: 最终User_Balances汇总
echo "💳 步骤9: 最终User_Balances汇总"
echo "=============================="

FINAL_BALANCES=$(psql "$DB_URL" -t -c "
SELECT 
    wallet_address,
    bcc_balance,
    bcc_total_unlocked,
    available_balance,
    reward_balance,
    last_updated,
    CASE 
        WHEN bcc_total_unlocked >= 100 THEN '✅ BCC Level1已达成'
        WHEN bcc_total_unlocked < 100 THEN '⏳ BCC Level1未达成'
        ELSE '📊 BCC余额状态'
    END as status
FROM user_balances
WHERE wallet_address = '$TEST_WALLET'
ORDER BY last_updated DESC;
" 2>&1)

if [[ $FINAL_BALANCES == *"ERROR"* ]] || [[ -z "$FINAL_BALANCES" ]]; then
    echo "❌ 最终余额检查失败: $FINAL_BALANCES"
else
    echo "✅ 最终余额汇总: $FINAL_BALANCES"
fi
echo ""

# 测试总结
echo "🎯 端到端测试总结"
echo "=================="
echo "📊 测试流程完成情况:"
echo "   1. ✅ 用户注册流程(带推荐人)"
echo "   2. 🔄 NFT Claim和Webhook认证"
echo "   3. 👑 Membership激活检查"
echo "   4. 👥 Members表记录检查" 
echo "   5. 💰 BCC初始化检查"
echo "   6. 🔗 Referral推荐系统检查"
echo "   7. 🔲 Matrix矩阵系统检查"
echo "   8. 🔓 BCC Level1解锁检查"
echo "   9. 💳 User_Balances最终汇总"
echo ""
echo "🔍 手动验证步骤:"
echo "   1. 检查前端Welcome界面显示"
echo "   2. 确认用户可以连接钱包(带推荐人链接)"
echo "   3. 验证Claim按钮功能正常"
echo "   4. 确认Membership状态更新"
echo "   5. 验证Matrix位置正确分配"
echo "   6. 确认推荐奖励正确发放"
echo "   7. 验证BCC余额显示正确"
echo "   8. 检查溢出逻辑是否正常工作"
echo ""
echo "🎉 端到端测试完成！请查看以上各步骤的执行结果。"