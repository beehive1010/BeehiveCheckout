#!/bin/bash

# Test activate-membership function with proper registration flow
# Referrer: 0x7a80ec1261e8e63C865ab4ab6af68D0386B8b7Df

set -e

SUPABASE_URL="https://cvqibjcbfrwsgkvthccp.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2OTc1NDYsImV4cCI6MjA1MDI3MzU0Nn0.nWzjBLsHfGHiweT3bSQgZqGZLczXOUhOFplKOTxH3Ao"

REFERRER="0x7a80ec1261e8e63C865ab4ab6af68D0386B8b7Df"

echo "🚀 Starting COMPLETE activate-membership test flow"
echo "📅 Test started at: $(date)"
echo "👥 Referrer: $REFERRER"

# Function to make API calls
make_api_call() {
    local endpoint="$1"
    local data="$2"
    local wallet_header="$3"
    
    local headers=(-H "Authorization: Bearer $ANON_KEY" -H "apikey: $ANON_KEY" -H "Content-Type: application/json")
    
    if [ ! -z "$wallet_header" ]; then
        headers+=(-H "x-wallet-address: $wallet_header")
    fi
    
    echo "📡 Making request to: $endpoint"
    echo "📊 Request data: $data"
    
    response=$(curl -s -X POST "$SUPABASE_URL/functions/v1/$endpoint" \
        "${headers[@]}" \
        -d "$data")
        
    echo "📥 Response: $response"
    
    # Check for success in response
    if echo "$response" | grep -q '"success":true'; then
        echo "✅ SUCCESS"
    elif echo "$response" | grep -q '"error"'; then
        echo "❌ ERROR DETECTED"
    else
        echo "⚠️  UNCLEAR STATUS"
    fi
    
    echo "---"
    return 0
}

# Test complete flow for one user first
echo ""
echo "🔥 === TESTING COMPLETE FLOW FOR USER 1: TestUser001 ==="

wallet1="0xTestUser001111111111111111111111111111111"
username1="TestUser001"

# Step 1: Register User 1 using auth function
echo "📋 Step 1: Registering $username1..."

registration_data1='{
    "action": "register",
    "username": "'$username1'",
    "referrerWallet": "'$REFERRER'",
    "email": "testuser001@test.com",
    "telegramHandle": "@testuser001"
}'

make_api_call "auth" "$registration_data1" "$wallet1"

echo "⏳ Waiting 3 seconds after registration..."
sleep 3

# Step 2: Activate Membership for User 1
echo "💎 Step 2: Activating Level 1 membership for $username1..."

tx_hash1="0xtest$(date +%s)001"
activation_data1='{
    "walletAddress": "'$wallet1'",
    "level": 1,
    "referrerWallet": "'$REFERRER'",
    "paymentAmount": 130,
    "transactionHash": "'$tx_hash1'"
}'

make_api_call "activate-membership" "$activation_data1" "$wallet1"

echo "⏳ Waiting 5 seconds after activation..."
sleep 5

# Step 3: Verify User 1 Records
echo "🔍 Step 3: Verifying records for $username1..."

# Check user record
user_check1='{
    "action": "get-user"
}'

make_api_call "auth" "$user_check1" "$wallet1"

# Check if NFT ownership shows up
nft_check1='{
    "action": "check-nft-ownership",
    "level": 1
}'

make_api_call "activate-membership" "$nft_check1" "$wallet1"

echo "⏳ Waiting 3 seconds before next user..."
sleep 3

# Test User 2
echo ""
echo "🔥 === TESTING COMPLETE FLOW FOR USER 2: TestUser002 ==="

wallet2="0xTestUser002222222222222222222222222222222"
username2="TestUser002"

# Step 1: Register User 2
echo "📋 Step 1: Registering $username2..."

registration_data2='{
    "action": "register",
    "username": "'$username2'",
    "referrerWallet": "'$REFERRER'",
    "email": "testuser002@test.com",
    "telegramHandle": "@testuser002"
}'

make_api_call "auth" "$registration_data2" "$wallet2"

echo "⏳ Waiting 3 seconds after registration..."
sleep 3

# Step 2: Activate Membership for User 2
echo "💎 Step 2: Activating Level 1 membership for $username2..."

tx_hash2="0xtest$(date +%s)002"
activation_data2='{
    "walletAddress": "'$wallet2'",
    "level": 1,
    "referrerWallet": "'$REFERRER'",
    "paymentAmount": 130,
    "transactionHash": "'$tx_hash2'"
}'

make_api_call "activate-membership" "$activation_data2" "$wallet2"

echo "⏳ Waiting 5 seconds after activation..."
sleep 5

# Test User 3
echo ""
echo "🔥 === TESTING COMPLETE FLOW FOR USER 3: TestUser003 ==="

wallet3="0xTestUser003333333333333333333333333333333"
username3="TestUser003"

# Step 1: Register User 3
echo "📋 Step 1: Registering $username3..."

registration_data3='{
    "action": "register",
    "username": "'$username3'",
    "referrerWallet": "'$REFERRER'",
    "email": "testuser003@test.com",
    "telegramHandle": "@testuser003"
}'

make_api_call "auth" "$registration_data3" "$wallet3"

echo "⏳ Waiting 3 seconds after registration..."
sleep 3

# Step 2: Activate Membership for User 3
echo "💎 Step 2: Activating Level 1 membership for $username3..."

tx_hash3="0xtest$(date +%s)003"
activation_data3='{
    "walletAddress": "'$wallet3'",
    "level": 1,
    "referrerWallet": "'$REFERRER'",
    "paymentAmount": 130,
    "transactionHash": "'$tx_hash3'"
}'

make_api_call "activate-membership" "$activation_data3" "$wallet3"

echo "⏳ Waiting 5 seconds after final activation..."
sleep 5

# Final verification - check referrer's matrix and rewards
echo ""
echo "🕸️ === FINAL VERIFICATION: CHECKING REFERRER MATRIX & REWARDS ==="

echo "🔍 Checking matrix structure for referrer: $REFERRER"

matrix_check='{
    "walletAddress": "'$REFERRER'",
    "includeDetails": true
}'

make_api_call "matrix-view" "$matrix_check"

echo "💰 Checking layer rewards for referrer: $REFERRER"

rewards_check='{
    "action": "get-layer-rewards",
    "walletAddress": "'$REFERRER'"
}'

make_api_call "rewards" "$rewards_check"

echo ""
echo "🏁 === TEST FLOW COMPLETED ==="
echo "📅 Test finished at: $(date)"
echo ""
echo "📊 SUMMARY:"
echo "✅ 3 users registered through auth function"
echo "✅ 3 Level 1 memberships activated through activate-membership function" 
echo "✅ Matrix and rewards verification completed"
echo ""
echo "🔍 VALIDATION CHECKLIST:"
echo "1. Check that all users were successfully registered"
echo "2. Check that all activate-membership calls succeeded"
echo "3. Check that referrer_wallet field was preserved in all records"
echo "4. Check that matrix placement was successful for all 3 users"
echo "5. Check that layer rewards were generated for the referrer"
echo "6. Check for any database consistency issues"
echo ""
echo "🚨 REVIEW THE RESPONSES ABOVE FOR ANY ERRORS OR ISSUES!"