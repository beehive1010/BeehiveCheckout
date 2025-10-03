#!/bin/bash

echo "========================================="
echo "🧪 Testing USDC Transfer Functions"
echo "========================================="
echo ""
echo "Server Wallet: 0xfA278827a612BBA895e7F0A4fBA504b22ff3E7C9"
echo "Recipient (NFT Claim): 0x0bA198F73DF3A1374a49Acb2c293ccA20e150Fe0"
echo "Recipient (Withdrawal): 0x5B307A53edFA4A3fbfB35Eb622827D31a685d0Fd"
echo ""

# Test NFT Claim Transfer
echo "Testing NFT Claim USDC Transfer..."
echo ""

curl -X POST \
  "https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/nft-claim-usdc-transfer" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNjU0MDUsImV4cCI6MjA3MjY0MTQwNX0.7CfL8CS1dQ8Gua89maSCDkgnMsNb19qp97mJyoJqJjs" \
  -H "Content-Type: application/json" \
  -d '{
    "token_id": "1",
    "claimer_address": "0x8aAbC891958d8a813Db15C355f0AeaA85E4E5c9C",
    "transaction_hash": "0xtest_'"$(date +%s)"'"
  }'

echo ""
echo ""
echo "========================================="
echo "✅ Test Complete"
echo "========================================="
