#!/bin/bash

# 设置 Supabase Edge Functions secret: VITE_VAULT_ACCESS_TOKEN
# 这个 token 用于 Thirdweb Engine/Vault 签署 USDC 转账交易

echo "🔐 Setting VITE_VAULT_ACCESS_TOKEN as Supabase secret..."

export SUPABASE_ACCESS_TOKEN=sbp_a7588eb0725800c535148983a1cdefd90ce309b7

VAULT_TOKEN="vt_act_34YT3E5HRWM4NJREXUCESPYT4GTJOUNMMNG3VGLX2FGI34OCA2YZ7LTNQKNKARMIVYKC7HSTXOVHIADWQDUA62LHJP7KCJOVGRBSL6F4"

echo "📝 Setting secret with value: ${VAULT_TOKEN:0:20}..."

cd supabase

npx supabase secrets set VITE_VAULT_ACCESS_TOKEN="$VAULT_TOKEN"

echo "✅ VITE_VAULT_ACCESS_TOKEN secret has been set!"
echo ""
echo "🔍 Verify by running:"
echo "   cd supabase && npx supabase secrets list"
echo ""
echo "🚀 Next step: Redeploy Edge Functions"
echo "   npm run functions:deploy:all"
