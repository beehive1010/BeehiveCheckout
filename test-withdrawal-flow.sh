#!/bin/bash

# Test Withdrawal Flow
# Tests both NFT claim transfer and user withdrawal functions

SUPABASE_URL="https://cvqibjcbfrwsgkvthccp.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNjU0MDUsImV4cCI6MjA3MjY0MTQwNX0.7CfL8CS1dQ8Gua89maSCDkgnMsNb19qp97mJyoJqJjs"

SERVER_WALLET="0xfA278827a612BBA895e7F0A4fBA504b22ff3E7C9"
RECIPIENT_WALLET="0x0bA198F73DF3A1374a49Acb2c293ccA20e150Fe0"
USER_WITHDRAW_ADDRESS="0x5B307A53edFA4A3fbfB35Eb622827D31a685d0Fd"

echo "========================================="
echo "🧪 Testing BEEHIVE Withdrawal Functions"
echo "========================================="
echo ""
echo "Server Wallet: $SERVER_WALLET"
echo "NFT Claim Recipient: $RECIPIENT_WALLET"
echo "User Withdraw Address: $USER_WITHDRAW_ADDRESS"
echo ""

# Test 1: NFT Claim USDC Transfer
echo "========================================="
echo "Test 1: NFT Claim USDC Transfer (30 USDC)"
echo "========================================="
echo ""

CLAIM_PAYLOAD='{
  "token_id": "1",
  "claimer_address": "0x1234567890123456789012345678901234567890",
  "transaction_hash": "0xtest_claim_tx_'$(date +%s)'"
}'

echo "📤 Calling nft-claim-usdc-transfer endpoint..."
echo "Payload: $CLAIM_PAYLOAD"
echo ""

CLAIM_RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/functions/v1/nft-claim-usdc-transfer" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "$CLAIM_PAYLOAD")

echo "📥 Response:"
echo "$CLAIM_RESPONSE" | jq '.'
echo ""

# Extract transaction ID from response
CLAIM_TX_ID=$(echo "$CLAIM_RESPONSE" | jq -r '.transfer.transaction_id // .transactionHash // "unknown"')
echo "Transaction ID: $CLAIM_TX_ID"
echo ""

# Test 2: User Withdrawal
echo "========================================="
echo "Test 2: User Withdrawal (10 USDC)"
echo "========================================="
echo ""

WITHDRAWAL_PAYLOAD='{
  "action": "process-withdrawal",
  "amount": 10,
  "recipientAddress": "'$USER_WITHDRAW_ADDRESS'",
  "sourceChainId": 42161,
  "targetChainId": 42161,
  "selectedToken": "USDC",
  "memberWallet": "0x1234567890123456789012345678901234567890",
  "targetTokenSymbol": "USDC"
}'

echo "📤 Calling withdrawal endpoint..."
echo "Payload: $WITHDRAWAL_PAYLOAD"
echo ""

# Note: This will likely fail due to insufficient user balance
# This is just to test the API endpoint functionality
WITHDRAWAL_RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/functions/v1/withdrawal" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: 0x1234567890123456789012345678901234567890" \
  -d "$WITHDRAWAL_PAYLOAD")

echo "📥 Response:"
echo "$WITHDRAWAL_RESPONSE" | jq '.'
echo ""

WITHDRAWAL_TX_ID=$(echo "$WITHDRAWAL_RESPONSE" | jq -r '.result.transactionHash // .transactionHash // "unknown"')
echo "Transaction ID: $WITHDRAWAL_TX_ID"
echo ""

echo "========================================="
echo "✅ Test Complete"
echo "========================================="
echo ""
echo "Summary:"
echo "  NFT Claim TX: $CLAIM_TX_ID"
echo "  Withdrawal TX: $WITHDRAWAL_TX_ID"
echo ""
echo "⚠️  Note: Check server wallet balance and environment variables"
echo "    Server Wallet: $SERVER_WALLET"
echo "    Should have USDC on Arbitrum One (Chain ID: 42161)"
echo ""
