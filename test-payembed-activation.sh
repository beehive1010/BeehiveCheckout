#!/bin/bash

# Test PayEmbed Activation Edge Function
# This script tests the complete activation flow

API_BASE="https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1"
EDGE_FUNCTION="$API_BASE/payembed-activation"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNjU0MDUsImV4cCI6MjA3MjY0MTQwNX0.7CfL8CS1dQ8Gua89maSCDkgnMsNb19qp97mJyoJqJjs"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}PayEmbed Activation Edge Function Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Test wallet address (you should use a real test wallet that owns Level 1 NFT)
TEST_WALLET="0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab"
REFERRER_WALLET="0x0000000000000000000000000000000000000000" # Replace with real referrer if needed

echo -e "${YELLOW}Test Configuration:${NC}"
echo "API Endpoint: $EDGE_FUNCTION"
echo "Test Wallet: $TEST_WALLET"
echo "Referrer: $REFERRER_WALLET"
echo ""

# Function to make API call
call_api() {
    local wallet=$1
    local level=$2
    local referrer=$3

    echo -e "${BLUE}Making API call...${NC}"

    response=$(curl -s -w "\n%{http_code}" -X POST "$EDGE_FUNCTION" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ANON_KEY" \
        -H "apikey: $ANON_KEY" \
        -H "x-wallet-address: $wallet" \
        -d "{
            \"level\": $level,
            \"referrerWallet\": \"$referrer\"
        }")

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    echo -e "${YELLOW}HTTP Status: $http_code${NC}"
    echo -e "${YELLOW}Response Body:${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    echo ""

    return $http_code
}

# Test 1: Check if user exists in users table
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Test 1: Check User Registration${NC}"
echo -e "${GREEN}========================================${NC}"

psql "$DATABASE_URL" -c "
SELECT
    wallet_address,
    username,
    email,
    referrer_wallet,
    created_at
FROM users
WHERE wallet_address ILIKE '$TEST_WALLET'
LIMIT 1;
" 2>/dev/null || echo -e "${RED}Database not accessible via psql${NC}"
echo ""

# Test 2: Check current member status
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Test 2: Check Current Member Status${NC}"
echo -e "${GREEN}========================================${NC}"

psql "$DATABASE_URL" -c "
SELECT
    wallet_address,
    current_level,
    activation_sequence,
    activation_time,
    referrer_wallet,
    is_activated
FROM members
WHERE wallet_address ILIKE '$TEST_WALLET'
LIMIT 1;
" 2>/dev/null || echo -e "${YELLOW}No existing member record or database not accessible${NC}"
echo ""

# Test 3: Call PayEmbed Activation API
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Test 3: Call PayEmbed Activation API${NC}"
echo -e "${GREEN}========================================${NC}"

call_api "$TEST_WALLET" 1 "$REFERRER_WALLET"
api_result=$?
echo ""

# Test 4: Verify membership record was created
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Test 4: Verify Membership Record${NC}"
echo -e "${GREEN}========================================${NC}"

psql "$DATABASE_URL" -c "
SELECT
    wallet_address,
    nft_level,
    is_member,
    claimed_at,
    unlock_membership_level
FROM membership
WHERE wallet_address ILIKE '$TEST_WALLET'
ORDER BY claimed_at DESC
LIMIT 3;
" 2>/dev/null || echo -e "${RED}Database not accessible${NC}"
echo ""

# Test 5: Verify members record was created/updated
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Test 5: Verify Members Record${NC}"
echo -e "${GREEN}========================================${NC}"

psql "$DATABASE_URL" -c "
SELECT
    wallet_address,
    current_level,
    activation_sequence,
    activation_time,
    referrer_wallet,
    total_nft_claimed,
    is_activated
FROM members
WHERE wallet_address ILIKE '$TEST_WALLET'
LIMIT 1;
" 2>/dev/null || echo -e "${RED}Database not accessible${NC}"
echo ""

# Test 6: Verify referrals record was created
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Test 6: Verify Referrals Record${NC}"
echo -e "${GREEN}========================================${NC}"

psql "$DATABASE_URL" -c "
SELECT
    referred_wallet,
    referrer_wallet,
    referral_depth,
    created_at
FROM referrals
WHERE referred_wallet ILIKE '$TEST_WALLET'
ORDER BY created_at DESC
LIMIT 1;
" 2>/dev/null || echo -e "${RED}Database not accessible${NC}"
echo ""

# Test 7: Verify matrix_referrals records were created
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Test 7: Verify Matrix Referrals${NC}"
echo -e "${GREEN}========================================${NC}"

psql "$DATABASE_URL" -c "
SELECT
    matrix_root_wallet,
    member_wallet,
    layer,
    position,
    referral_type,
    created_at
FROM matrix_referrals
WHERE member_wallet ILIKE '$TEST_WALLET'
ORDER BY created_at DESC
LIMIT 5;
" 2>/dev/null || echo -e "${RED}Database not accessible${NC}"
echo ""

# Test 8: Check user balance
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Test 8: Verify User Balance Created${NC}"
echo -e "${GREEN}========================================${NC}"

psql "$DATABASE_URL" -c "
SELECT
    wallet_address,
    claimable,
    pending,
    claimed,
    created_at
FROM user_balances
WHERE wallet_address ILIKE '$TEST_WALLET'
LIMIT 1;
" 2>/dev/null || echo -e "${RED}Database not accessible${NC}"
echo ""

# Test 9: Check rewards created
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Test 9: Verify Rewards Created${NC}"
echo -e "${GREEN}========================================${NC}"

psql "$DATABASE_URL" -c "
SELECT
    reward_recipient_wallet,
    referring_member_wallet,
    matrix_layer,
    reward_amount,
    status,
    created_at
FROM layer_rewards
WHERE referring_member_wallet ILIKE '$TEST_WALLET'
   OR reward_recipient_wallet ILIKE '$TEST_WALLET'
ORDER BY created_at DESC
LIMIT 5;
" 2>/dev/null || echo -e "${RED}Database not accessible${NC}"
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"

if [ $api_result -eq 200 ]; then
    echo -e "${GREEN}✅ API call successful (HTTP 200)${NC}"
else
    echo -e "${RED}❌ API call failed (HTTP $api_result)${NC}"
fi

echo ""
echo -e "${YELLOW}Expected Database Records:${NC}"
echo "1. ✓ users - User registration (pre-existing)"
echo "2. ✓ membership - Membership level record"
echo "3. ✓ members - Member activation record"
echo "4. ✓ referrals - Direct referral record (if referrer exists)"
echo "5. ✓ matrix_referrals - Matrix placement records (multiple)"
echo "6. ✓ user_balances - Balance record (via trigger)"
echo "7. ✓ layer_rewards - Reward records (via matrix placement)"
echo ""

echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Check Supabase Dashboard for logs"
echo "2. Verify NFT ownership on-chain: https://arbiscan.io/address/$TEST_WALLET"
echo "3. Check Edge Function logs: https://supabase.com/dashboard/project/cvqibjcbfrwsgkvthccp/functions/payembed-activation/logs"
echo ""
