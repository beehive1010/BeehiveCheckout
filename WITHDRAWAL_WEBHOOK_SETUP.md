# Withdrawal Webhook Setup Guide

## Overview
This webhook receives transaction status updates from Thirdweb and automatically updates withdrawal records in the database.

## Webhook URL
```
https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/withdrawal-webhook
```

## Webhook Secret
```
b2c3b730aa3199b8bcb4e17ac5f41f33b72803b9f11bc91535ea4432d4bcf89c
```

**Security Note**: This secret is used to verify webhook signatures using HMAC SHA-256. All webhook requests from Thirdweb must include a valid signature in the `x-thirdweb-signature` header.

## Thirdweb Configuration Steps

### 1. Access Thirdweb Dashboard
1. Go to https://thirdweb.com/dashboard
2. Navigate to your project
3. Go to **Settings** → **Webhooks**

### 2. Create Webhook
1. Click **Create Webhook**
2. Enter the webhook URL: `https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/withdrawal-webhook`
3. Enter the webhook secret: `b2c3b730aa3199b8bcb4e17ac5f41f33b72803b9f11bc91535ea4432d4bcf89c`
4. Select events to listen to:
   - ✅ `transaction.mined` (Transaction confirmed on blockchain)
   - ✅ `transaction.failed` (Transaction failed)
   - ✅ `transaction.pending` (Transaction pending)
   - ✅ `transaction.processing` (Transaction processing)

### 3. Configure Filters (Optional)
- **Chain ID**: 42161 (Arbitrum One) - or leave empty for all chains
- **Contract Address**: Leave empty to monitor all transactions from your server wallet

### 4. Save Webhook
- Verify the secret is correctly entered
- Click **Save**

## Webhook Payload Structure

Thirdweb will send payloads in this format:

```json
{
  "type": "transaction_status",
  "data": {
    "queueId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "transactionHash": "0x1234567890abcdef...",
    "chainId": 42161,
    "from": "0x8AABc891958D8a813dB15C355F0aEaa85E4E5C9c",
    "to": "0x7bDD543b2a7a9111EBEBdB040E3b0911383380F9",
    "value": "8000000",
    "blockNumber": 12345678,
    "timestamp": "2025-10-04T12:00:00Z"
  }
}
```

## What the Webhook Does

### 1. Receives Transaction Status
- Listens for transaction status updates from Thirdweb
- Supports statuses: `pending`, `processing`, `completed`, `failed`, `mined`, `reverted`

### 2. Updates Withdrawal Records
- Finds matching withdrawal in `withdrawal_requests` table by `queueId` or `transactionHash`
- Updates status and transaction details
- Records blockchain confirmation details (block number, timestamp, etc.)

### 3. Creates User Notifications
- **Completed**: Sends success notification to user
- **Failed**: Sends failure notification to user

### 4. Audit Logging
- Records all status changes in `audit_logs` table
- Tracks unmatched webhooks for debugging

## Status Mapping

| Thirdweb Status | Our Status   | Action                          |
|-----------------|--------------|----------------------------------|
| `mined`         | `completed`  | Mark as completed, notify user  |
| `completed`     | `completed`  | Mark as completed, notify user  |
| `failed`        | `failed`     | Mark as failed, notify user     |
| `reverted`      | `failed`     | Mark as failed, notify user     |
| `pending`       | `processing` | Update status to processing     |
| `processing`    | `processing` | Update status to processing     |

## Database Updates

The webhook updates `withdrawal_requests` table:

```sql
UPDATE withdrawal_requests SET
  status = 'completed',
  transaction_hash = '0x...',
  completed_at = '2025-10-04T12:00:00Z',
  updated_at = NOW(),
  metadata = jsonb_set(
    metadata,
    '{webhook_received_at, thirdweb_status, blockchain_transaction_hash, block_number, chain_id}',
    '...'
  )
WHERE id = 'withdrawal_id';
```

## Testing the Webhook

### Test with curl:
```bash
curl -X POST https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/withdrawal-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "transaction_status",
    "data": {
      "queueId": "test-queue-id",
      "status": "completed",
      "transactionHash": "0x1234567890abcdef",
      "chainId": 42161,
      "from": "0x8AABc891958D8a813dB15C355F0aEaa85E4E5C9c",
      "to": "0x7bDD543b2a7a9111EBEBdB040E3b0911383380F9",
      "value": "8000000",
      "blockNumber": 12345678,
      "timestamp": "2025-10-04T12:00:00Z"
    }
  }'
```

## Monitoring

### Check Webhook Logs
```bash
# View Supabase Edge Function logs
supabase functions logs withdrawal-webhook --project-ref cvqibjcbfrwsgkvthccp
```

### Check Audit Logs
```sql
SELECT * FROM audit_logs
WHERE action IN ('withdrawal_status_update', 'withdrawal_webhook_unmatched')
ORDER BY created_at DESC
LIMIT 20;
```

### Check Withdrawal Status
```sql
SELECT id, user_wallet, amount, status, transaction_hash, created_at, completed_at
FROM withdrawal_requests
WHERE status = 'completed'
ORDER BY completed_at DESC
LIMIT 10;
```

## Troubleshooting

### Webhook Not Receiving Events
1. Verify webhook URL is correct in Thirdweb dashboard
2. Check that correct events are selected
3. Verify server wallet address is making the transactions

### Withdrawal Not Updating
1. Check `queueId` or `transactionHash` matches what's in database
2. Verify withdrawal record exists in `withdrawal_requests` table
3. Check `audit_logs` for `withdrawal_webhook_unmatched` entries

### Status Not Changing
1. Verify Thirdweb is sending the correct status
2. Check webhook payload structure matches expected format
3. Review Edge Function logs for errors

## Security Considerations

1. **Signature Verification**: All webhook requests must include a valid HMAC SHA-256 signature
   - Secret: `b2c3b730aa3199b8bcb4e17ac5f41f33b72803b9f11bc91535ea4432d4bcf89c`
   - Header: `x-thirdweb-signature` or `x-webhook-signature`
   - Invalid signatures are rejected with 401 status
2. **CORS**: Webhook accepts requests from any origin (Thirdweb servers)
3. **Authentication**: Uses Supabase service role key (server-side only)
4. **Validation**: Validates payload structure before processing
5. **Idempotent**: Safe to receive duplicate webhooks for same transaction

## Next Steps

After setting up the webhook:

1. ✅ Deploy the webhook function (already done)
2. ⏳ Configure webhook in Thirdweb dashboard
3. ⏳ Test with a real withdrawal
4. ⏳ Monitor logs to verify updates
5. ⏳ Set up alerts for failed webhooks (optional)

## Support

For issues or questions:
- Check Supabase Edge Function logs
- Review `audit_logs` table
- Check Thirdweb webhook delivery logs in their dashboard
