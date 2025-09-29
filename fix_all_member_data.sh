#!/bin/bash

# 批量修复所有会员数据的脚本

echo "🚀 开始批量修复所有会员数据..."

# 获取所有没有奖励数据的会员钱包地址
PGPASSWORD=bee8881941 psql -h db.cvqibjcbfrwsgkvthccp.supabase.co -U postgres -d postgres -t -c "
SELECT DISTINCT m.wallet_address
FROM members m
LEFT JOIN reward_claims rc ON rc.root_wallet = m.wallet_address
WHERE rc.root_wallet IS NULL
  AND m.current_level >= 1;
" | sed 's/^ *//' | sed '/^$/d' > /tmp/members_to_fix.txt

echo "📊 找到 $(wc -l < /tmp/members_to_fix.txt) 个需要修复的会员"

# 计数器
counter=0
success_count=0
error_count=0

# 读取每个会员地址并调用修复API
while IFS= read -r wallet_address; do
    # 跳过空行
    if [ -z "$wallet_address" ]; then
        continue
    fi
    
    counter=$((counter + 1))
    echo "[$counter] 🔧 修复会员数据: $wallet_address"
    
    # 调用admin-system-fix API (使用正确的ANON KEY)
    response=$(curl -s -X POST "https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/admin-system-fix" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNjU0MDUsImV4cCI6MjA3MjY0MTQwNX0.7CfL8CS1dQ8Gua89maSCDkgnMsNb19qp97mJyoJqJjs" \
        -d "{\"checkType\": \"fix_member_data\", \"options\": {\"wallet_address\": \"$wallet_address\"}}")
    
    # 检查响应
    if echo "$response" | grep -q '"success":true'; then
        success_count=$((success_count + 1))
        echo "  ✅ 修复成功"
    else
        error_count=$((error_count + 1))
        echo "  ❌ 修复失败: $response"
    fi
    
    # 每处理10个会员后暂停一下，避免API限流
    if [ $((counter % 10)) -eq 0 ]; then
        echo "⏱️  处理了 $counter 个会员，暂停2秒..."
        sleep 2
    fi
    
done < /tmp/members_to_fix.txt

echo ""
echo "🎉 批量修复完成!"
echo "📈 统计结果:"
echo "  • 总处理数: $counter"
echo "  • 成功修复: $success_count"  
echo "  • 修复失败: $error_count"
if [ $counter -gt 0 ]; then
    echo "  • 成功率: $(( success_count * 100 / counter ))%"
else
    echo "  • 成功率: N/A (无处理数据)"
fi

# 清理临时文件
rm -f /tmp/members_to_fix.txt

echo "✨ 脚本执行完成!"