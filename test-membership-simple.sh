#!/bin/bash

# Simple test of activate-membership function with 3 new users
# Referrer: 0x7a80ec1261e8e63C865ab4ab6af68D0386B8b7Df

set -e

SUPABASE_URL="https://cvqibjcbfrwsgkvthccp.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2OTc1NDYsImV4cCI6MjA1MDI3MzU0Nn0.nWzjBLsHfGHiweT3bSQgZqGZLczXOUhOFplKOTxH3Ao"

REFERRER="0x7a80ec1261e8e63C865ab4ab6af68D0386B8b7Df"

echo "🚀 Starting activate-membership test flow"
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
    echo "---"
    return 0
}

# Test User 1
echo ""
echo "🔥 === TESTING USER 1: TestUser001 ==="

wallet1="0xTestUser001111111111111111111111111111111"
username1="TestUser001"

# Step 1: Register User 1
echo "📋 Registering $username1..."

registration_data1='{
    "walletAddress": "'$wallet1'",
    "username": "'$username1'", 
    "referrerWallet": "'$REFERRER'",
    "email": "testuser001@test.com",
    "telegramHandle": "@testuser001"
}'

make_api_call "user-registration" "$registration_data1"

echo "⏳ Waiting 2 seconds..."
sleep 2

# Step 2: Activate Membership for User 1
echo "💎 Activating Level 1 membership for $username1..."

tx_hash1="0xtest$(date +%s)001"
activation_data1='{
    "walletAddress": "'$wallet1'",
    "level": 1,
    "referrerWallet": "'$REFERRER'",
    "paymentAmount": 130,
    "transactionHash": "'$tx_hash1'"
}'

make_api_call "activate-membership" "$activation_data1" "$wallet1"

echo "⏳ Waiting 3 seconds..."
sleep 3

# Test User 2
echo ""
echo "🔥 === TESTING USER 2: TestUser002 ==="

wallet2="0xTestUser002222222222222222222222222222222"
username2="TestUser002"

# Step 1: Register User 2
echo "📋 Registering $username2..."

registration_data2='{
    "walletAddress": "'$wallet2'",
    "username": "'$username2'", 
    "referrerWallet": "'$REFERRER'",
    "email": "testuser002@test.com",
    "telegramHandle": "@testuser002"
}'

make_api_call "user-registration" "$registration_data2"

echo "⏳ Waiting 2 seconds..."
sleep 2

# Step 2: Activate Membership for User 2
echo "💎 Activating Level 1 membership for $username2..."

tx_hash2="0xtest$(date +%s)002"
activation_data2='{
    "walletAddress": "'$wallet2'",
    "level": 1,
    "referrerWallet": "'$REFERRER'",
    "paymentAmount": 130,
    "transactionHash": "'$tx_hash2'"
}'

make_api_call "activate-membership" "$activation_data2" "$wallet2"

echo "⏳ Waiting 3 seconds..."
sleep 3

# Test User 3
echo ""
echo "🔥 === TESTING USER 3: TestUser003 ==="

wallet3="0xTestUser003333333333333333333333333333333"
username3="TestUser003"

# Step 1: Register User 3
echo "📋 Registering $username3..."

registration_data3='{
    "walletAddress": "'$wallet3'",
    "username": "'$username3'", 
    "referrerWallet": "'$REFERRER'",
    "email": "testuser003@test.com",
    "telegramHandle": "@testuser003"
}'

make_api_call "user-registration" "$registration_data3"

echo "⏳ Waiting 2 seconds..."
sleep 2

# Step 2: Activate Membership for User 3
echo "💎 Activating Level 1 membership for $username3..."

tx_hash3="0xtest$(date +%s)003"
activation_data3='{
    "walletAddress": "'$wallet3'",
    "level": 1,
    "referrerWallet": "'$REFERRER'",
    "paymentAmount": 130,
    "transactionHash": "'$tx_hash3'"
}'

make_api_call "activate-membership" "$activation_data3" "$wallet3"

echo ""
echo "🏁 === TEST COMPLETED ==="
echo "📅 Test finished at: $(date)"
echo "✨ All 3 users have been processed through the complete registration + activation flow"
echo "🔍 Check the responses above for any errors or issues"