#!/bin/bash

# Direct test of activate-membership function with 3 new users
# Referrer: 0x7a80ec1261e8e63C865ab4ab6af68D0386B8b7Df

set -e

SUPABASE_URL="https://cvqibjcbfrwsgkvthccp.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2OTc1NDYsImV4cCI6MjA1MDI3MzU0Nn0.nWzjBLsHfGHiweT3bSQgZqGZLczXOUhOFplKOTxH3Ao"

REFERRER="0x7a80ec1261e8e63C865ab4ab6af68D0386B8b7Df"

# Test user addresses
declare -a TEST_USERS=(
    "0xTestUser001111111111111111111111111111111"
    "0xTestUser002222222222222222222222222222222" 
    "0xTestUser003333333333333333333333333333333"
)

declare -a USERNAMES=(
    "TestUser001"
    "TestUser002"
    "TestUser003"
)

echo "🚀 Starting activate-membership test flow"
echo "📅 Test started at: $(date)"
echo "👥 Referrer: $REFERRER"
echo "🔢 Testing with ${#TEST_USERS[@]} users"

# Function to make API calls
make_api_call() {
    local endpoint="$1"
    local data="$2"
    local wallet_header="$3"
    
    local headers=(-H "Authorization: Bearer $ANON_KEY" -H "apikey: $ANON_KEY" -H "Content-Type: application/json")
    
    if [ ! -z "$wallet_header" ]; then
        headers+=(-H "x-wallet-address: $wallet_header")
    fi
    
    curl -s -X POST "$SUPABASE_URL/functions/v1/$endpoint" \
        "${headers[@]}" \
        -d "$data"
}

# Step 1: Register users
echo ""
echo "📋 === STEP 1: USER REGISTRATIONS ==="

for i in "${!TEST_USERS[@]}"; do
    wallet="${TEST_USERS[$i]}"
    username="${USERNAMES[$i]}"
    
    echo "🔥 Registering $username ($wallet)"
    
    registration_data=$(cat <<EOF
{
    "walletAddress": "$wallet",
    "username": "$username", 
    "referrerWallet": "$REFERRER",
    "email": "${username,,}@test.com",
    "telegramHandle": "@${username,,}"
}
EOF
)
    
    echo "📡 Registration request for $username:"
    echo "$registration_data" | jq '.'
    
    response=$(make_api_call "user-registration" "$registration_data")
    echo "📥 Registration response:"
    echo "$response" | jq '.'
    
    success=$(echo "$response" | jq -r '.success // false')
    if [ "$success" = "true" ]; then
        echo "✅ $username registered successfully"
    else
        echo "❌ Registration failed for $username"
        echo "$response"
    fi
    
    echo "⏳ Waiting 1 second..."
    sleep 1
done

# Step 2: Activate memberships
echo ""
echo "💎 === STEP 2: MEMBERSHIP ACTIVATIONS ==="

for i in "${!TEST_USERS[@]}"; do
    wallet="${TEST_USERS[$i]}"
    username="${USERNAMES[$i]}"
    
    echo "🎯 Activating Level 1 membership for $username ($wallet)"
    
    # Generate random transaction hash
    tx_hash="0xtest$(date +%s)$(openssl rand -hex 4)"
    
    activation_data=$(cat <<EOF
{
    "walletAddress": "$wallet",
    "level": 1,
    "referrerWallet": "$REFERRER",
    "paymentAmount": 130,
    "transactionHash": "$tx_hash"
}
EOF
)
    
    echo "📡 Activation request for $username:"
    echo "$activation_data" | jq '.'
    
    response=$(make_api_call "activate-membership" "$activation_data" "$wallet")
    echo "📥 Activation response:"
    echo "$response" | jq '.'
    
    success=$(echo "$response" | jq -r '.success // false')
    if [ "$success" = "true" ]; then
        echo "✅ Level 1 membership activated successfully for $username"
        
        # Extract key details
        membership_id=$(echo "$response" | jq -r '.result.membership.id // "N/A"')
        member_wallet=$(echo "$response" | jq -r '.result.member.wallet_address // "N/A"')
        referral_success=$(echo "$response" | jq -r '.result.referral.success // false')
        matrix_success=$(echo "$response" | jq -r '.result.matrixPlacement.success // false')
        layer_reward_success=$(echo "$response" | jq -r '.result.layerReward.success // false')
        
        echo "📊 Activation Summary for $username:"
        echo "  - Membership ID: $membership_id"
        echo "  - Member Wallet: $member_wallet"
        echo "  - Referral Created: $referral_success"
        echo "  - Matrix Placed: $matrix_success" 
        echo "  - Layer Reward Created: $layer_reward_success"
        
    else
        echo "❌ Membership activation failed for $username"
        error_msg=$(echo "$response" | jq -r '.error // "Unknown error"')
        echo "Error: $error_msg"
    fi
    
    echo "⏳ Waiting 2 seconds..."
    sleep 2
done

# Step 3: Check referrer's matrix and rewards
echo ""
echo "🕸️ === STEP 3: CHECKING REFERRER MATRIX ==="

echo "🔍 Checking matrix structure for referrer: $REFERRER"

matrix_data=$(cat <<EOF
{
    "walletAddress": "$REFERRER",
    "includeDetails": true
}
EOF
)

matrix_response=$(make_api_call "matrix-view" "$matrix_data")
echo "📥 Matrix response:"
echo "$matrix_response" | jq '.'

echo ""
echo "💰 === STEP 4: CHECKING LAYER REWARDS ==="

echo "🎁 Checking layer rewards for referrer: $REFERRER"

rewards_data=$(cat <<EOF
{
    "action": "get-layer-rewards", 
    "walletAddress": "$REFERRER"
}
EOF
)

rewards_response=$(make_api_call "rewards" "$rewards_data")
echo "📥 Rewards response:"
echo "$rewards_response" | jq '.'

# Step 4: Final verification
echo ""
echo "✅ === STEP 5: FINAL VERIFICATION ==="

echo "🔍 Verifying all database records..."

for i in "${!TEST_USERS[@]}"; do
    wallet="${TEST_USERS[$i]}"
    username="${USERNAMES[$i]}"
    
    echo "📋 Verifying records for $username ($wallet):"
    
    # Check if membership was created
    echo "  🎯 Checking membership record..."
    membership_check=$(cat <<EOF
{
    "walletAddress": "$wallet",
    "level": 1
}
EOF
)
    
    # This would need a specific endpoint to check records
    # For now we'll just indicate what should be checked
    echo "  ✅ Should verify: users table record"
    echo "  ✅ Should verify: membership table record" 
    echo "  ✅ Should verify: members table record"
    echo "  ✅ Should verify: referrals_new table record"
    echo "  ✅ Should verify: referrer_wallet field is preserved"
done

echo ""
echo "🏁 === TEST COMPLETED ==="
echo "📅 Test finished at: $(date)"
echo "✨ Check the logs above for any errors or issues"
echo "🔍 Manual verification recommended for database consistency"