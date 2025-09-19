#!/bin/bash

# Script to fix layer_rewards column names in edge functions
echo "🔧 Fixing layer_rewards column names in edge functions..."

# Define the functions directory
FUNCTIONS_DIR="/home/ubuntu/projects/BEEHIVE-V2/supabase/functions"

# Function to fix column names in a file
fix_columns() {
    local file=$1
    echo "📝 Fixing $file..."
    
    # Backup original file
    cp "$file" "$file.backup"
    
    # Fix column name mappings
    sed -i 's/amount_usdt/reward_amount/g' "$file"
    sed -i 's/is_claimed/status/g' "$file"
    sed -i 's/payer_wallet/triggering_member_wallet/g' "$file"
    sed -i 's/recipient_wallet/reward_recipient_wallet/g' "$file"
    sed -i 's/\.layer\([^a-zA-Z]\)/\.matrix_layer\1/g' "$file"
    
    # Fix specific status checks
    sed -i 's/status === true/status === '\''claimed'\''/g' "$file"
    sed -i 's/status === false/status !== '\''claimed'\''/g' "$file"
    sed -i 's/status: true/status: '\''claimed'\''/g' "$file"
    sed -i 's/status: false/status: '\''pending'\''/g' "$file"
    
    # Fix common filter patterns
    sed -i 's/\.eq('\''status'\'', false)/\.in('\''status'\'', [\'\''pending'\'', \'\''claimable'\''])/g' "$file"
    sed -i 's/\.eq('\''status'\'', true)/\.eq('\''status'\'', '\''claimed'\'')/g' "$file"
    
    echo "✅ Fixed $file"
}

# Fix specific functions
echo "🎯 Fixing rewards function..."
fix_columns "$FUNCTIONS_DIR/rewards/index.ts"

echo "🎯 Fixing admin-stats function..."
fix_columns "$FUNCTIONS_DIR/admin-stats/index.ts"

echo "🎯 Fixing nft-upgrades function..."
fix_columns "$FUNCTIONS_DIR/nft-upgrades/index.ts"

echo "🎯 Fixing cron-timers function..."
fix_columns "$FUNCTIONS_DIR/cron-timers/index.ts"

# Also fix any remaining references in other files
echo "🔍 Checking for remaining issues..."
grep -r "amount_usdt\|is_claimed.*layer_rewards\|payer_wallet.*layer_rewards" "$FUNCTIONS_DIR" --include="*.ts" || echo "✅ No remaining column issues found"

echo "🎉 Column name fixes completed!"
echo "📋 Modified files have .backup copies for safety"