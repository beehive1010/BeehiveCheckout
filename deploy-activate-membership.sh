#!/bin/bash

echo "🔧 部署activate-membership函数..."

# 使用环境变量中的token
export SUPABASE_ACCESS_TOKEN="sbp_92c70391157352d8248124dcf96b62368b45afe1"

# 部署activate-membership函数
supabase functions deploy activate-membership --project-ref cvqibjcbfrwsgkvthccp --no-verify-jwt

echo "✅ 部署完成"