#!/bin/bash

# ThirdWeb Webhook Edge Function 部署脚本

set -e

echo "🔗 开始部署 ThirdWeb Webhook Edge Function..."

# 配置信息
PROJECT_REF="cdjmtevekxpmgrixkiqt"
FUNCTION_NAME="thirdweb-webhook"

# 检查必要的环境变量
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "⚠️  请设置 SUPABASE_ACCESS_TOKEN 环境变量"
    echo "   export SUPABASE_ACCESS_TOKEN=your_token"
    exit 1
fi

echo "📋 配置信息:"
echo "   项目: $PROJECT_REF"
echo "   函数: $FUNCTION_NAME"
echo "   Token: ${SUPABASE_ACCESS_TOKEN:0:10}..."

# 部署函数
echo "🚀 开始部署..."
SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN supabase functions deploy $FUNCTION_NAME --project-ref $PROJECT_REF

if [ $? -eq 0 ]; then
    echo "✅ Webhook函数部署成功!"
    echo ""
    echo "📋 下一步配置:"
    echo "1. 在 Supabase Dashboard → Project Settings → Edge Functions 中添加环境变量:"
    echo "   THIRDWEB_WEBHOOK_SECRET=5aada87a79b4e45573607a1f46e0f3c8a04141d71044e3f6003c3a5a70e828f6"
    echo ""
    echo "2. 在 ThirdWeb Dashboard 中配置 Webhook URL:"
    echo "   https://cdjmtevekxpmgrixkiqt.supabase.co/functions/v1/thirdweb-webhook"
    echo ""
    echo "3. 创建webhook_processing_log表 (如果还没有):"
    echo "   运行: sql/create_webhook_system.sql"
    echo ""
    echo "🎉 部署完成! Webhook已准备就绪。"
else
    echo "❌ 部署失败，请检查错误信息"
    exit 1
fi