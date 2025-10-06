#!/bin/bash

# CheckoutWidget测试分支部署脚本

echo "🚀 Deploying CheckoutWidget Test Branch"
echo "========================================"

# 检查是否在正确的分支
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "checkout-widget-test" ]; then
  echo "❌ Error: Not on checkout-widget-test branch"
  echo "Current branch: $CURRENT_BRANCH"
  echo "Please run: git checkout checkout-widget-test"
  exit 1
fi

echo "✅ On checkout-widget-test branch"
echo ""

# 1. 部署Edge Function
echo "📦 Step 1: Deploying mint-and-send-nft Edge Function"
echo "---------------------------------------------------"

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "❌ Error: SUPABASE_ACCESS_TOKEN not set"
  echo "Please run: export SUPABASE_ACCESS_TOKEN=sbp_your_token"
  exit 1
fi

echo "Deploying function..."
supabase functions deploy mint-and-send-nft --project-ref cvqibjcbfrwsgkvthccp

if [ $? -eq 0 ]; then
  echo "✅ Edge Function deployed successfully"
else
  echo "❌ Edge Function deployment failed"
  exit 1
fi

echo ""
echo "📝 Step 2: Configure Edge Function Environment Variables"
echo "---------------------------------------------------------"
echo "Please set these environment variables in Supabase Dashboard:"
echo ""
echo "THIRDWEB_ENGINE_URL=https://your-engine-url.com"
echo "THIRDWEB_ENGINE_ACCESS_TOKEN=your_access_token"
echo "THIRDWEB_BACKEND_WALLET=0x_server_wallet_address"
echo "VITE_MEMBERSHIP_NFT_CONTRACT=0x_nft_contract_address"
echo ""
echo "Dashboard URL: https://supabase.com/dashboard/project/cvqibjcbfrwsgkvthccp/functions/mint-and-send-nft"
echo ""

# 2. 构建前端
echo "🔨 Step 3: Building Frontend"
echo "----------------------------"
npm run build

if [ $? -eq 0 ]; then
  echo "✅ Frontend built successfully"
else
  echo "❌ Frontend build failed"
  exit 1
fi

echo ""
echo "✅ Deployment Complete!"
echo "======================"
echo ""
echo "📝 Next Steps:"
echo "1. Configure Edge Function environment variables (see above)"
echo "2. Deploy frontend build to your hosting platform"
echo "3. Visit /checkout-test to test the new payment flow"
echo ""
echo "📚 Documentation: CHECKOUT_WIDGET_TEST.md"
echo ""
