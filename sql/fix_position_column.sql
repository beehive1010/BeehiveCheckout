-- =============================================
-- Fix position column to support Layer 2+ positions
-- =============================================

-- Step 1: Drop all dependencies
DROP VIEW IF EXISTS matrix_referrals_tree_view CASCADE;
DROP VIEW IF EXISTS matrix_layer_stats_view CASCADE;
DROP TRIGGER IF EXISTS trg_matrix_referrals_set_layer ON matrix_referrals;

-- Step 2: Alter the position column
ALTER TABLE matrix_referrals ALTER COLUMN position TYPE VARCHAR(50);

-- Step 3: Update constraints
ALTER TABLE matrix_referrals DROP CONSTRAINT IF EXISTS matrix_referrals_position_check;
ALTER TABLE matrix_referrals ADD CONSTRAINT matrix_referrals_position_check
CHECK (position ~ '^[LMR](\.[LMR])*$');

-- Step 4: Recreate the trigger
CREATE TRIGGER trg_matrix_referrals_set_layer
    BEFORE INSERT OR UPDATE OF position
    ON matrix_referrals
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_matrix_layer();

-- Step 5: Recreate the main view
CREATE OR REPLACE VIEW matrix_referrals_tree_view AS
SELECT
    -- Standard fields
    mr.layer as matrix_layer,
    mr.position as matrix_position,
    mr.member_wallet,
    mr.member_wallet as wallet_address,
    mr.matrix_root_wallet,
    mr.parent_wallet,

    -- User info
    COALESCE(u.referrer_wallet, mr.parent_wallet) as referrer_wallet,
    u.username,

    -- Activation status
    CASE
        WHEN m.current_level >= 1 THEN true
        ELSE false
    END as is_active,
    CASE
        WHEN m.current_level >= 1 THEN true
        ELSE false
    END as is_activated,

    -- Time fields
    COALESCE(mr.created_at, m.activation_time) as placed_at,
    mr.created_at,
    m.activation_time,

    -- Other fields
    m.activation_sequence,
    m.current_level,
    mr.parent_depth as referral_depth,

    -- Spillover status
    CASE
        WHEN mr.source = 'spillover' THEN true
        WHEN mr.referral_type = 'is_spillover' THEN true
        ELSE false
    END as is_spillover,

    -- Descriptions
    CASE
        WHEN mr.layer = 1 THEN 'Direct'
        WHEN mr.layer = 2 THEN 'Second Level'
        WHEN mr.layer >= 3 THEN 'Deep Level ' || mr.layer
        ELSE 'Unknown'
    END as layer_description,

    CASE
        WHEN mr.position = 'L' THEN 'Left'
        WHEN mr.position = 'M' THEN 'Middle'
        WHEN mr.position = 'R' THEN 'Right'
        WHEN mr.position LIKE '%.L' THEN 'Left Branch'
        WHEN mr.position LIKE '%.M' THEN 'Middle Branch'
        WHEN mr.position LIKE '%.R' THEN 'Right Branch'
        ELSE mr.position
    END as position_description

FROM matrix_referrals mr
LEFT JOIN members m ON m.wallet_address = mr.member_wallet
LEFT JOIN users u ON u.wallet_address = mr.member_wallet

WHERE mr.matrix_root_wallet IS NOT NULL
AND mr.member_wallet IS NOT NULL

ORDER BY
    mr.matrix_root_wallet,
    mr.layer,
    CASE
        WHEN mr.position = 'L' THEN 1
        WHEN mr.position = 'M' THEN 2
        WHEN mr.position = 'R' THEN 3
        ELSE 4
    END,
    mr.position;

-- Grant permissions
GRANT SELECT ON matrix_referrals_tree_view TO public;

-- Test the fixes
SELECT 'Position column fix completed' as status;