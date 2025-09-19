#!/bin/bash

# Fix double replacement issues
echo "🔧 Fixing double replacement issues..."

FUNCTIONS_DIR="/home/ubuntu/projects/BEEHIVE-V2/supabase/functions"

# Fix double replacements
find "$FUNCTIONS_DIR" -name "*.ts" -exec sed -i 's/reward_amount\.reward_amount/reward_amount/g' {} \;
find "$FUNCTIONS_DIR" -name "*.ts" -exec sed -i 's/triggering_member_wallet\.triggering_member_wallet/triggering_member_wallet/g' {} \;
find "$FUNCTIONS_DIR" -name "*.ts" -exec sed -i 's/reward_recipient_wallet\.reward_recipient_wallet/reward_recipient_wallet/g' {} \;
find "$FUNCTIONS_DIR" -name "*.ts" -exec sed -i 's/matrix_layer\.matrix_layer/matrix_layer/g' {} \;

# Fix specific incorrect patterns that might have been created
find "$FUNCTIONS_DIR" -name "*.ts" -exec sed -i 's/reward\.status,/reward.status,/g' {} \;
find "$FUNCTIONS_DIR" -name "*.ts" -exec sed -i 's/Layer \${reward\.matrix_layer}/Layer ${reward.matrix_layer}/g' {} \;

echo "✅ Fixed double replacement issues"