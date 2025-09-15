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

# 创建测试用户
echo "📝 创建测试用户..."
USER_CREATION=$(psql "$DB_URL" -t -c "
INSERT INTO users (wallet_address, email, username, avatar_url, created_at)
VALUES ('$TEST_WALLET', '$TEST_EMAIL', 'test-user-$TIMESTAMP', 'https://example.com/avatar.jpg', NOW())
ON CONFLICT (wallet_address) DO UPDATE SET
  email = EXCLUDED.email,
  username = EXCLUDED.username,
  updated_at = NOW()
RETURNING id, wallet_address, email;
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
      \"test\": true
    }
  }
}"

echo "📤 发送Webhook请求进行NFT claim认证..."

# 生成签名
if command -v node &> /dev/null; then
    SIGNATURE=$(node -e "
        const crypto = require('crypto');
        const timestamp = '$TIMESTAMP';
        const payload = '$PAYLOAD';
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
    m.level,
    m.status,
    m.activated_at,
    u.wallet_address,
    u.email
FROM memberships m
JOIN users u ON m.user_id = u.id
WHERE u.wallet_address = '$TEST_WALLET'
ORDER BY m.created_at DESC
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
    id,
    user_id,
    wallet_address,
    matrix_layer,
    matrix_position,
    referrer_wallet,
    created_at
FROM members
WHERE wallet_address = '$TEST_WALLET'
ORDER BY created_at DESC
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
    token_type,
    balance,
    last_updated
FROM user_balances
WHERE wallet_address = '$TEST_WALLET' AND token_type = 'BCC'
ORDER BY last_updated DESC;
" 2>&1)

if [[ $BCC_INIT_STATUS == *"ERROR"* ]] || [[ -z "$BCC_INIT_STATUS" ]]; then
    echo "❌ BCC初始化检查失败: $BCC_INIT_STATUS"
else
    echo "✅ BCC初始化状态: $BCC_INIT_STATUS"
fi
echo ""

# 步骤6: 检查Layer奖励触发
echo "🎁 步骤6: 检查Layer奖励触发"
echo "=========================="

LAYER_REWARDS=$(psql "$DB_URL" -t -c "
SELECT 
    r.id,
    r.referrer_wallet,
    r.referred_wallet,
    r.reward_type,
    r.amount,
    r.layer,
    r.created_at
FROM referral_rewards r
WHERE r.referred_wallet = '$TEST_WALLET' OR r.referrer_wallet = '$TEST_WALLET'
ORDER BY r.created_at DESC
LIMIT 3;
" 2>&1)

if [[ $LAYER_REWARDS == *"ERROR"* ]] || [[ -z "$LAYER_REWARDS" ]]; then
    echo "❌ Layer奖励检查失败: $LAYER_REWARDS"
else
    echo "✅ Layer奖励记录: $LAYER_REWARDS"
fi
echo ""

# 步骤7: 检查BCC Level1解锁(100代币)
echo "🔓 步骤7: 检查BCC Level1解锁(100代币)"
echo "===================================="

BCC_LEVEL1_UNLOCK=$(psql "$DB_URL" -t -c "
SELECT 
    ub.wallet_address,
    ub.token_type,
    ub.balance,
    ub.last_updated,
    CASE 
        WHEN ub.balance >= 100 THEN 'Level1已解锁'
        ELSE 'Level1未解锁'
    END as level1_status
FROM user_balances ub
WHERE ub.wallet_address = '$TEST_WALLET' AND ub.token_type = 'BCC';
" 2>&1)

if [[ $BCC_LEVEL1_UNLOCK == *"ERROR"* ]] || [[ -z "$BCC_LEVEL1_UNLOCK" ]]; then
    echo "❌ BCC Level1解锁检查失败: $BCC_LEVEL1_UNLOCK"
else
    echo "✅ BCC Level1解锁状态: $BCC_LEVEL1_UNLOCK"
fi
echo ""

# 步骤8: 最终User_Balances汇总
echo "💳 步骤8: 最终User_Balances汇总"
echo "=============================="

FINAL_BALANCES=$(psql "$DB_URL" -t -c "
SELECT 
    wallet_address,
    token_type,
    balance,
    last_updated,
    CASE 
        WHEN token_type = 'BCC' AND balance >= 100 THEN '✅ Level1已达成'
        WHEN token_type = 'BCC' AND balance < 100 THEN '⏳ Level1未达成'
        ELSE '📊 其他代币'
    END as status
FROM user_balances
WHERE wallet_address = '$TEST_WALLET'
ORDER BY token_type, last_updated DESC;
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
echo "   1. ✅ 用户注册流程"
echo "   2. 🔄 NFT Claim和Webhook认证"
echo "   3. 👑 Membership激活检查"
echo "   4. 👥 Members表记录检查" 
echo "   5. 💰 BCC初始化检查"
echo "   6. 🎁 Layer奖励触发检查"
echo "   7. 🔓 BCC Level1解锁检查"
echo "   8. 💳 User_Balances最终汇总"
echo ""
echo "🔍 手动验证步骤:"
echo "   1. 检查前端Welcome界面显示"
echo "   2. 确认用户可以连接钱包"
echo "   3. 验证Claim按钮功能正常"
echo "   4. 确认Membership状态更新"
echo "   5. 验证BCC余额显示正确"
echo ""
echo "🎉 端到端测试完成！请查看以上各步骤的执行结果。"