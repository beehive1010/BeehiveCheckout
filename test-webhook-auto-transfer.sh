#!/bin/bash

echo "========================================="
echo "🧪 Testing Auto Platform Fee Transfer"
echo "========================================="
echo ""
echo "Simulating USDC transfer to server wallet..."
echo "Server Wallet: 0x8AABc891958D8a813dB15C355F0aEaa85E4E5C9c"
echo "Amount: 130 USDC"
echo "Platform Fee: 30 USDC → 0x0bA198F73DF3A1374a49Acb2c293ccA20e150Fe0"
echo ""

curl -X POST \
  "https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/thirdweb-webhook" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNjU0MDUsImV4cCI6MjA3MjY0MTQwNX0.7CfL8CS1dQ8Gua89maSCDkgnMsNb19qp97mJyoJqJjs" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "token_transfer",
    "data": {
      "chainId": "42161",
      "contractAddress": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      "from": "0x1234567890123456789012345678901234567890",
      "to": "0x8AABc891958D8a813dB15C355F0aEaa85E4E5C9c",
      "value": "130000000",
      "transactionHash": "0xtest_auto_transfer_'"$(date +%s)"'"
    }
  }' | jq '.'

echo ""
echo ""
echo "========================================="
echo "✅ Webhook Test Complete"
echo "========================================="
echo ""
echo "Expected Flow:"
echo "1. Webhook receives token_transfer event"
echo "2. Validates: chainId=42161, token=USDC, to=server_wallet, amount>=130"
echo "3. Triggers nft-claim-usdc-transfer function"
echo "4. Transfers 30 USDC to platform recipient"
echo "5. Records in platform_activation_fees table"
echo ""
