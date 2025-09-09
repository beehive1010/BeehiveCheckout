#!/bin/bash
# Revert all wallet address toLowerCase() fixes to preserve original case
# This script removes .toLowerCase() calls from wallet address queries

echo "🔄 Reverting wallet address toLowerCase() fixes..."

# Function to revert a file
revert_file() {
    local file=$1
    local backup_file="${file}.backup_revert"
    
    # Create backup
    cp "$file" "$backup_file"
    
    # Apply reverts - remove .toLowerCase() from wallet address queries
    sed -i.tmp \
        -e "s/\.eq('wallet_address', walletAddress\.toLowerCase())/\.eq('wallet_address', walletAddress)/g" \
        -e "s/\.eq('buyer_wallet', walletAddress\.toLowerCase())/\.eq('buyer_wallet', walletAddress)/g" \
        -e "s/\.eq('recipient_wallet', walletAddress\.toLowerCase())/\.eq('recipient_wallet', walletAddress)/g" \
        -e "s/\.eq('admin_wallet', walletAddress\.toLowerCase())/\.eq('admin_wallet', walletAddress)/g" \
        -e "s/\.eq('target_wallet', walletAddress\.toLowerCase())/\.eq('target_wallet', walletAddress)/g" \
        -e "s/\.eq('user_wallet', walletAddress\.toLowerCase())/\.eq('user_wallet', walletAddress)/g" \
        -e "s/\.eq('root_wallet', walletAddress\.toLowerCase())/\.eq('root_wallet', walletAddress)/g" \
        -e "s/\.eq('member_wallet', walletAddress\.toLowerCase())/\.eq('member_wallet', walletAddress)/g" \
        -e "s/\.eq('referrer_wallet', walletAddress\.toLowerCase())/\.eq('referrer_wallet', walletAddress)/g" \
        -e "s/\.eq('placer_wallet', walletAddress\.toLowerCase())/\.eq('placer_wallet', walletAddress)/g" \
        -e "s/\.eq('parent_wallet', walletAddress\.toLowerCase())/\.eq('parent_wallet', walletAddress)/g" \
        -e "s/\.eq('triggering_member_wallet', walletAddress\.toLowerCase())/\.eq('triggering_member_wallet', walletAddress)/g" \
        -e "s/\.eq('rolled_up_to_wallet', walletAddress\.toLowerCase())/\.eq('rolled_up_to_wallet', walletAddress)/g" \
        -e "s/\.eq('payer_wallet', walletAddress\.toLowerCase())/\.eq('payer_wallet', walletAddress)/g" \
        -e "s/\.eq('instructor_wallet', walletAddress\.toLowerCase())/\.eq('instructor_wallet', walletAddress)/g" \
        -e "s/\.eq('author_wallet', walletAddress\.toLowerCase())/\.eq('author_wallet', walletAddress)/g" \
        -e "s/\.eq('advertiser_wallet', walletAddress\.toLowerCase())/\.eq('advertiser_wallet', walletAddress)/g" \
        -e "s/\.eq('creator_wallet', walletAddress\.toLowerCase())/\.eq('creator_wallet', walletAddress)/g" \
        -e "s/\.eq('referred_wallet', walletAddress\.toLowerCase())/\.eq('referred_wallet', walletAddress)/g" \
        -e "s/walletAddress\.toLowerCase()/walletAddress/g" \
        -e "s/currentWallet\.toLowerCase()/currentWallet/g" \
        -e "s/rootWallet\.toLowerCase()/rootWallet/g" \
        "$file"
    
    # Clean up temp file
    rm -f "${file}.tmp"
    
    echo "  ✅ Reverted: $file"
}

# List of Edge Functions to revert
edge_functions=(
    "/home/runner/workspace/supabase/functions/matrix/index.ts"
    "/home/runner/workspace/supabase/functions/balance/index.ts"
    "/home/runner/workspace/supabase/functions/auth/index.ts"
    "/home/runner/workspace/supabase/functions/admin/index.ts"
    "/home/runner/workspace/supabase/functions/member-management/index.ts"
    "/home/runner/workspace/supabase/functions/admin-cleanup/index.ts" 
    "/home/runner/workspace/supabase/functions/service-requests/index.ts"
    "/home/runner/workspace/supabase/functions/member-info/index.ts"
    "/home/runner/workspace/supabase/functions/matrix-operations/index.ts"
    "/home/runner/workspace/supabase/functions/rewards/index.ts"
    "/home/runner/workspace/supabase/functions/fix-activation-bcc/index.ts"
    "/home/runner/workspace/supabase/functions/fix-bcc-balance/index.ts"
    "/home/runner/workspace/supabase/functions/fix-bcc-rewards/index.ts"
    "/home/runner/workspace/supabase/functions/nft-upgrades/index.ts"
    "/home/runner/workspace/supabase/functions/debug-user/index.ts"
    "/home/runner/workspace/supabase/functions/courses/index.ts"
    "/home/runner/workspace/supabase/functions/activate-membership/index.ts"
    "/home/runner/workspace/supabase/functions/dashboard/index.ts"
    "/home/runner/workspace/supabase/functions/balance-enhanced/index.ts"
    "/home/runner/workspace/supabase/functions/multi-chain-payment/index.ts"
    "/home/runner/workspace/supabase/functions/bcc-purchase/index.ts"
    "/home/runner/workspace/supabase/functions/cron-timers/index.ts"
    "/home/runner/workspace/supabase/functions/referral-links/index.ts"
)

echo "📁 Processing Edge Functions..."
for func in "${edge_functions[@]}"; do
    if [[ -f "$func" ]]; then
        revert_file "$func"
    else
        echo "  ⚠️  File not found: $func"
    fi
done

# Also revert specific header toLowerCase() calls
echo ""
echo "📁 Processing header toLowerCase() calls..."

# Special handling for header wallet address extraction
for func in "${edge_functions[@]}"; do
    if [[ -f "$func" ]]; then
        # Revert header extraction toLowerCase calls
        sed -i.tmp2 \
            -e "s/req\.headers\.get('x-wallet-address')?\.toLowerCase()/req.headers.get('x-wallet-address')/g" \
            -e "s/\.wallet_address.*||.*req\.headers\.get('x-wallet-address'))?\\.toLowerCase()/.wallet_address || req.headers.get('x-wallet-address'))/g" \
            "$func"
        rm -f "${func}.tmp2"
        echo "  ✅ Fixed headers in: $func"
    fi
done

echo ""
echo "📁 Processing Frontend Files..."

# Frontend files to revert
frontend_files=(
    "/home/runner/workspace/src/components/referrals/ReferralMatrixVisualization.tsx"
    "/home/runner/workspace/src/lib/thirdweb-auth.ts"
)

for file in "${frontend_files[@]}"; do
    if [[ -f "$file" ]]; then
        # Revert frontend toLowerCase calls
        sed -i.tmp3 \
            -e "s/member?\\.walletAddress?\\.toLowerCase() === walletAddress?\\.toLowerCase()/member?.walletAddress === walletAddress/g" \
            -e "s/account?\\.address?\\.toLowerCase() === walletAddress?\\.toLowerCase()/account?.address === walletAddress/g" \
            "$file"
        rm -f "${file}.tmp3"
        echo "  ✅ Reverted frontend: $file"
    fi
done

echo ""
echo "🎯 Checking for remaining toLowerCase() calls..."

# Check for any remaining toLowerCase patterns
remaining_issues=$(grep -r "walletAddress\.toLowerCase\|\.toLowerCase()" /home/runner/workspace/supabase/functions/ --include="*.ts" | wc -l)
remaining_frontend=$(grep -r "walletAddress.*toLowerCase\|address.*toLowerCase" /home/runner/workspace/src/ --include="*.tsx" --include="*.ts" | wc -l)

if [[ $remaining_issues -eq 0 && $remaining_frontend -eq 0 ]]; then
    echo "✅ All toLowerCase() calls have been successfully reverted!"
else
    echo "⚠️  Found $remaining_issues remaining Edge Function issues"
    echo "⚠️  Found $remaining_frontend remaining frontend issues"
    echo ""
    echo "Remaining Edge Function issues:"
    grep -r "walletAddress\.toLowerCase\|\.toLowerCase()" /home/runner/workspace/supabase/functions/ --include="*.ts" | head -5
    echo ""
    echo "Remaining frontend issues:"
    grep -r "walletAddress.*toLowerCase\|address.*toLowerCase" /home/runner/workspace/src/ --include="*.tsx" --include="*.ts" | head -5
fi

echo ""
echo "🧹 Cleaning up backup files..."
find /home/runner/workspace/supabase/functions/ -name "*.backup_revert" -delete
find /home/runner/workspace/src/ -name "*.backup_revert" -delete

echo "✨ Wallet address case reversion completed!"
echo "📝 All wallet addresses now preserve their original case format"