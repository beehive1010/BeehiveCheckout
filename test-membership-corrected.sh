#!/bin/bash

# CORRECTED Test activate-membership function with proper wallet addresses
# Referrer: 0x7a80ec1261e8e63C865ab4ab6af68D0386B8b7Df

set -e

SUPABASE_URL="https://cvqibjcbfrwsgkvthccp.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2OTc1NDYsImV4cCI6MjA1MDI3MzU0Nn0.nWzjBLsHfGHiweT3bSQgZqGZLczXOUhOFplKOTxH3Ao"

REFERRER="0x7a80ec1261e8e63C865ab4ab6af68D0386B8b7Df"

echo "🚀 Starting CORRECTED activate-membership test flow"
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

# Use PROPER 42-character wallet addresses (not 43)
echo ""
echo "🔥 === TESTING COMPLETE FLOW FOR USER 1: TestUser001 ==="

wallet1="0xTestUser00111111111111111111111111111111"  # Exactly 42 chars
username1="TestUser001"

echo "📏 Wallet1 length: $(echo -n "$wallet1" | wc -c) characters"

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

tx_hash1="0xtest$(date +%s | tail -c 6)001"  # Shorter hash
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

# Test User 2
echo ""
echo "🔥 === TESTING COMPLETE FLOW FOR USER 2: TestUser002 ==="

wallet2="0xTestUser00222222222222222222222222222222"  # Exactly 42 chars  
username2="TestUser002"

echo "📏 Wallet2 length: $(echo -n "$wallet2" | wc -c) characters"

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

tx_hash2="0xtest$(date +%s | tail -c 6)002"
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

wallet3="0xTestUser00333333333333333333333333333333"  # Exactly 42 chars
username3="TestUser003"

echo "📏 Wallet3 length: $(echo -n "$wallet3" | wc -c) characters"

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

tx_hash3="0xtest$(date +%s | tail -c 6)003"
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

# Verification of individual users
echo ""
echo "🔍 === VERIFYING INDIVIDUAL USER RECORDS ==="

for i in 1 2 3; do
    eval wallet='$wallet'$i
    eval username='$username'$i
    
    echo "📋 Verifying $username ($wallet):"
    
    # Check user record
    user_check='{
        "action": "get-user"
    }'
    
    make_api_call "auth" "$user_check" "$wallet"
    
    echo "⏳ Short pause..."
    sleep 1
done

echo ""
echo "🏁 === TEST FLOW COMPLETED ==="
echo "📅 Test finished at: $(date)"
echo ""
echo "📊 SUMMARY OF CORRECTED TEST:"
echo "✅ Used proper 42-character wallet addresses"
echo "✅ 3 users tested through complete registration + activation flow"  
echo "✅ Individual user record verification completed"
echo ""
echo "🔍 KEY VALIDATION POINTS:"
echo "1. ✅ Wallet address length corrected (42 chars)"
echo "2. 🔍 Check if registrations now succeed"
echo "3. 🔍 Check if activate-membership calls succeed after registration"
echo "4. 🔍 Check that referrer_wallet field is preserved"
echo "5. 🔍 Look for any database consistency errors"
echo ""
echo "🚨 REVIEW THE RESPONSES ABOVE - FOCUS ON SUCCESS/ERROR STATUS!"