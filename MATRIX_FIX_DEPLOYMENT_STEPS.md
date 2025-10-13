# MATRIX PLACEMENT FIX - DEPLOYMENT STEPS

## Quick Summary

**Issue:** 2 members (4020, 4021) had ZERO matrix placements due to broken RPC call
**Fix:** Updated Edge Function to use correct RPC function
**Status:** Fixed and Validated - Ready to Deploy

---

## What Was Fixed

1. **Members 4020 & 4021:** Manually placed in 19 matrices each
2. **Edge Function:** Updated to use `place_new_member_in_matrix_correct` instead of broken `batch_place_member_in_matrices`
3. **Validated:** All placements follow BFS+LMR ordering, 19-layer limit enforced

---

## Deployment Steps

### Step 1: Review Changes

```bash
cd /home/ubuntu/WebstormProjects/BeehiveCheckout
git diff supabase/functions/activate-membership/index.ts
```

Expected changes: Lines 618-656 (RPC function call replacement)

### Step 2: Commit Changes

```bash
git add supabase/functions/activate-membership/index.ts
git commit -m "Fix matrix placement: Replace batch_place_member_in_matrices with place_new_member_in_matrix_correct

- batch_place_member_in_matrices requires missing matrix_placement_progress table
- place_new_member_in_matrix_correct uses recursive_matrix_placement (working)
- Tested with members 4020 and 4021: 19 placements each
- 19-layer limit enforced, BFS+LMR ordering validated"
```

### Step 3: Deploy Edge Function

```bash
supabase functions deploy activate-membership --project-ref cvqibjcbfrwsgkvthccp
```

### Step 4: Verify Deployment

Test with a check-activation-status call:

```bash
curl -X POST https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/activate-membership \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: 0x17918ABa958f332717e594C53906F77afa551BFB" \
  -d '{"action":"check-activation-status"}'
```

Expected response:
```json
{
  "success": true,
  "isActivated": true,
  "hasNFT": true,
  "member": {
    "wallet_address": "0x17918ABa958f332717e594C53906F77afa551BFB",
    "activation_sequence": 4020,
    "current_level": 1
  }
}
```

### Step 5: Monitor Next Registration

Watch the logs for the next member registration to confirm matrix placement works:

```bash
# In Supabase Dashboard -> Edge Functions -> activate-membership -> Logs
# Look for:
# "✅ Matrix placement result: {...}"
# Should show: "placements_created": 19 (or appropriate count)
```

### Step 6: Validation Query

Run this query to check new registrations after deployment:

```sql
SELECT
    m.wallet_address,
    m.activation_sequence,
    m.activation_time,
    COUNT(mr.id) as matrix_count,
    CASE
        WHEN COUNT(mr.id) = 0 THEN 'BROKEN'
        WHEN COUNT(mr.id) < 10 THEN 'SUSPICIOUS'
        ELSE 'OK'
    END as status
FROM members m
LEFT JOIN matrix_referrals mr ON m.wallet_address = mr.member_wallet
WHERE m.activation_time > NOW() - INTERVAL '24 hours'
GROUP BY m.wallet_address, m.activation_sequence, m.activation_time
ORDER BY m.activation_sequence DESC
LIMIT 20;
```

All recent members should show `matrix_count > 0` and `status = 'OK'`

---

## Rollback Plan (if needed)

If issues occur after deployment:

### Step 1: Revert Code Change

```bash
cd /home/ubuntu/WebstormProjects/BeehiveCheckout
git revert HEAD
```

### Step 2: Redeploy Previous Version

```bash
supabase functions deploy activate-membership --project-ref cvqibjcbfrwsgkvthccp
```

### Step 3: Manual Placement Script

If rollback is needed, use this script to manually place affected members:

```sql
-- Save this as manual_place_member.sql
DO $$
DECLARE
    v_result JSON;
BEGIN
    -- Replace wallet addresses with actual values
    SELECT * INTO v_result
    FROM place_new_member_in_matrix_correct(
        'MEMBER_WALLET_ADDRESS',
        'REFERRER_WALLET_ADDRESS'
    );

    RAISE NOTICE 'Result: %', v_result;
END $$;
```

---

## Post-Deployment Monitoring

### Metrics to Watch (First 24 Hours)

1. **Matrix Placement Success Rate:**
   - Target: 100% of new registrations have matrix placements
   - Query: See Step 6 validation query above

2. **Edge Function Error Rate:**
   - Target: 0% errors in matrix placement step
   - Monitor: Supabase Dashboard -> Edge Functions -> Logs

3. **Matrix Placement Time:**
   - Target: < 30 seconds per member
   - Monitor: Edge Function logs (look for timing in placement result)

4. **Layer Limit Violations:**
   - Target: 0 violations (no layer > 19)
   - Query:
     ```sql
     SELECT COUNT(*) as violations
     FROM matrix_referrals
     WHERE layer > 19
     AND created_at > NOW() - INTERVAL '24 hours';
     ```

### Alert Thresholds

Set up alerts for:
- Any member with 0 matrix placements after 5 minutes
- Any matrix_referrals record with layer > 19
- Any Edge Function error containing "matrix placement"

---

## Files Modified

1. `/home/ubuntu/WebstormProjects/BeehiveCheckout/supabase/functions/activate-membership/index.ts`
   - Lines 618-656: RPC function call replacement
   - Changed: `batch_place_member_in_matrices` → `place_new_member_in_matrix_correct`

---

## Database Changes (Already Applied)

No schema changes required. The following were executed directly:

1. Manual placement for member 4020:
   ```sql
   SELECT * FROM place_new_member_in_matrix_correct(
       '0x17918ABa958f332717e594C53906F77afa551BFB',
       '0xee6fC09a7591e34B79795A5481e3ad785b795a02'
   );
   ```

2. Manual placement for member 4021:
   ```sql
   SELECT * FROM place_new_member_in_matrix_correct(
       '0x0E0ff5a9C37C37b8972b4F1b12a10CE95Cd88c18',
       '0x17918ABa958f332717e594C53906F77afa551BFB'
   );
   ```

---

## Support Contacts

If issues occur during/after deployment:
- Check full audit report: `/home/ubuntu/WebstormProjects/BeehiveCheckout/MATRIX_PLACEMENT_AUDIT_FIX_REPORT.md`
- Review function definitions: See Appendix B in audit report
- Run validation queries: See Appendix A in audit report

---

**Last Updated:** 2025-10-13 12:15:00 UTC
**Deployment Status:** READY TO DEPLOY
