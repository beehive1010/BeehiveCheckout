-- Update all Level 1 admin users to have full permissions
-- This ensures Level 1 admins (superadmins) have access to all features

-- Update all Level 1 admins with comprehensive permission set
UPDATE public.admins
SET
    permissions = '[
        "*",
        "dashboard.read",
        "users.read",
        "users.write",
        "users.delete",
        "referrals.read",
        "matrix.read",
        "rewards.read",
        "rewards.write",
        "withdrawals.read",
        "withdrawals.process",
        "nfts.read",
        "nfts.write",
        "contracts.read",
        "contracts.deploy",
        "courses.read",
        "blog.read",
        "system.read",
        "system.write",
        "discover.read",
        "settings.read",
        "admin.manage",
        "translations.read"
    ]'::jsonb,
    is_active = true,
    updated_at = NOW()
WHERE admin_level = 1 AND is_active = true;

-- Verify the update
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count
    FROM public.admins
    WHERE admin_level = 1 AND is_active = true AND permissions @> '["*"]'::jsonb;

    RAISE NOTICE 'Updated % Level 1 admin(s) with full permissions', updated_count;
END $$;
