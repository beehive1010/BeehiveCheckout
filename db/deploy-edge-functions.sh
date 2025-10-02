#!/bin/bash

# Edge Functions部署脚本
# 手动部署修复后的关键函数

echo "🚀 开始部署修复后的Edge Functions..."

# 设置项目引用
PROJECT_REF="cdjmtevekxpmgrixkiqt"
ACCESS_TOKEN="sbp_a7588eb0725800c535148983a1cdefd90ce309b7"

# 验证项目状态
echo "📊 检查项目状态..."
echo "Project Reference: $PROJECT_REF"
echo "Supabase URL: https://$PROJECT_REF.supabase.co"

# 部署关键修复的函数
FUNCTIONS_TO_DEPLOY=(
    "auth"
    "activate-membership" 
    "level-upgrade"
    "member-management"
    "balance"
    "matrix"
)

echo ""
echo "📝 将要部署的函数:"
for func in "${FUNCTIONS_TO_DEPLOY[@]}"; do
    echo "  - $func"
done

echo ""
echo "⚠️ 注意: 需要有效的SUPABASE_ACCESS_TOKEN来执行部署"
echo "当前token: ${ACCESS_TOKEN:0:20}..."

echo ""
echo "🔧 修复内容总结:"
echo "1. ✅ auth函数: 添加用户注册前置检查"
echo "2. ✅ activate-membership函数: 修复levels_owned重复和用户验证"
echo "3. ✅ member-management函数: 增强数据同步安全性"
echo "4. ✅ balance函数: 添加用户注册验证"
echo "5. ✅ matrix函数: 将集成安全的placement算法"

echo ""
echo "🔗 项目信息:"
echo "  - 项目URL: https://cdjmtevekxpmgrixkiqt.supabase.co"
echo "  - API URL: https://cdjmtevekxpmgrixkiqt.supabase.co/rest/v1/"
echo "  - 实时URL: wss://cdjmtevekxpmgrixkiqt.supabase.co/realtime/v1/"

echo ""
echo "📋 部署后验证清单:"
echo "1. 测试auth函数的用户注册流程"
echo "2. 验证activate-membership的NFT激活"
echo "3. 检查matrix placement的位置唯一性"
echo "4. 确认balance查询需要用户注册"
echo "5. 验证member-management的同步逻辑"

echo ""
echo "🛡️ 安全改进:"
echo "✅ 链上同步前检查用户注册"
echo "✅ 防止levels_owned重复值"
echo "✅ 矩阵位置冲突检测和修复"
echo "✅ 大小写不敏感的钱包地址查询"
echo "✅ 事务安全的数据更新"

echo ""
echo "📁 函数文件位置:"
for func in "${FUNCTIONS_TO_DEPLOY[@]}"; do
    if [ -f "supabase/functions/$func/index.ts" ]; then
        echo "  ✅ supabase/functions/$func/index.ts"
    else
        echo "  ❌ supabase/functions/$func/index.ts (不存在)"
    fi
done

echo ""
echo "🎯 部署完成后的测试建议:"
echo "1. 用新钱包测试完整的注册->激活流程"
echo "2. 验证矩阵位置分配的唯一性"
echo "3. 检查levels_owned数组不再出现重复"
echo "4. 确认所有Edge Functions正确验证用户状态"

echo ""
echo "⚠️ 如果遇到认证问题，请检查："
echo "1. SUPABASE_ACCESS_TOKEN是否有效"
echo "2. 项目权限是否正确配置"
echo "3. CLI版本是否是最新的"

echo ""
echo "✨ 部署脚本准备完成！"
echo "请手动执行部署命令或更新访问令牌。"