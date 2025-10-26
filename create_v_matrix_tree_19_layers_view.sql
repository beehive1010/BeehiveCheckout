-- ============================================================================
-- Create v_matrix_tree_19_layers View
-- Run this SQL in Supabase Dashboard > SQL Editor
-- ============================================================================

-- Drop the view if it exists
DROP VIEW IF EXISTS v_matrix_tree_19_layers CASCADE;

-- Create the comprehensive matrix tree view
CREATE OR REPLACE VIEW v_matrix_tree_19_layers AS
WITH children_slots AS (
    -- Pre-compute children slots for each parent
    SELECT
        matrix_root_wallet,
        parent_wallet,
        jsonb_object_agg(
            slot,
            member_wallet
        ) FILTER (WHERE slot IS NOT NULL) as slots
    FROM matrix_referrals
    WHERE parent_wallet IS NOT NULL
    GROUP BY matrix_root_wallet, parent_wallet
)
SELECT
    -- Matrix referral fields
    mr.matrix_root_wallet,
    mr.layer,
    mr.member_wallet,
    mr.parent_wallet,
    mr.slot,
    mr.referral_type,
    mr.activation_time,
    mr.bfs_order as activation_sequence,  -- Use bfs_order as activation_sequence
    mr.tx_hash,
    mr.entry_anchor,
    mr.source,
    mr.created_at,

    -- Member fields
    m.username as member_username,
    m.current_level,
    m.is_activated,
    m.referrer_wallet,

    -- Computed fields for children
    CASE
        WHEN (SELECT COUNT(*) FROM matrix_referrals sub
              WHERE sub.parent_wallet = mr.member_wallet
              AND sub.matrix_root_wallet = mr.matrix_root_wallet) > 0
        THEN TRUE
        ELSE FALSE
    END as has_children,

    (SELECT COUNT(*) FROM matrix_referrals sub
     WHERE sub.parent_wallet = mr.member_wallet
     AND sub.matrix_root_wallet = mr.matrix_root_wallet) as children_count,

    -- Children slots (L, M, R)
    CASE
        WHEN cs.slots IS NOT NULL THEN
            jsonb_build_object(
                'L', cs.slots->>'L',
                'M', cs.slots->>'M',
                'R', cs.slots->>'R'
            )
        ELSE
            jsonb_build_object(
                'L', NULL,
                'M', NULL,
                'R', NULL
            )
    END as children_slots

FROM matrix_referrals mr
LEFT JOIN members m ON m.wallet_address = mr.member_wallet
LEFT JOIN children_slots cs ON cs.matrix_root_wallet = mr.matrix_root_wallet
    AND cs.parent_wallet = mr.member_wallet
WHERE mr.layer <= 19
ORDER BY mr.matrix_root_wallet, mr.layer, mr.bfs_order NULLS LAST, mr.slot;

-- Add comment
COMMENT ON VIEW v_matrix_tree_19_layers IS
'Complete 19-layer matrix tree view with member data and children slots for frontend MobileMatrixView component';

-- Grant permissions
GRANT SELECT ON v_matrix_tree_19_layers TO authenticated, anon;

-- Test query
SELECT
    matrix_root_wallet,
    member_wallet,
    member_username,
    current_level,
    layer,
    slot,
    children_count,
    children_slots
FROM v_matrix_tree_19_layers
LIMIT 10;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Created v_matrix_tree_19_layers view successfully!';
END$$;
