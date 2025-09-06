-- =============================================
-- Beehive Platform - Database Views for Frontend Components
-- Supabase Migration - Views for efficient data access
-- =============================================

-- =============================================
-- User Dashboard Views
-- =============================================

-- Complete user profile view with all related data (basic version)
CREATE OR REPLACE VIEW public.user_dashboard AS
SELECT 
    u.wallet_address,
    u.username,
    u.email,
    u.referrer_wallet,
    u.current_level,
    u.created_at as user_created_at,
    u.updated_at as user_updated_at,
    
    -- Member data
    m.is_activated,
    m.activated_at,
    m.current_level as member_level,
    m.max_layer,
    m.levels_owned,
    m.has_pending_rewards,
    m.upgrade_reminder_enabled,
    m.last_upgrade_at,
    m.last_reward_claim_at,
    m.total_direct_referrals,
    m.total_team_size,
    
    -- Balance data
    b.bcc_transferable,
    b.bcc_locked,
    b.total_usdt_earned,
    b.pending_upgrade_rewards,
    b.rewards_claimed,
    b.updated_at as balance_updated_at,
    
    -- Derived fields
    CASE 
        WHEN m.is_activated THEN 'activated'
        ELSE 'inactive'
    END as activation_status,
    
    (b.bcc_transferable + b.bcc_locked) as total_bcc_balance
    
FROM public.users u
LEFT JOIN public.members m ON u.wallet_address = m.wallet_address
LEFT JOIN public.user_balances b ON u.wallet_address = b.wallet_address;

-- Matrix overview for user as root
CREATE OR REPLACE VIEW public.matrix_overview AS
SELECT 
    r.root_wallet,
    r.layer,
    COUNT(r.member_wallet) as member_count,
    COUNT(CASE WHEN m.is_activated THEN 1 END) as activated_count,
    COUNT(CASE WHEN r.placement_type = 'direct' THEN 1 END) as direct_count,
    COUNT(CASE WHEN r.placement_type = 'spillover' THEN 1 END) as spillover_count,
    AVG(CASE WHEN m.current_level IS NOT NULL THEN m.current_level END) as avg_member_level,
    MAX(r.created_at) as latest_placement
FROM public.referrals r
LEFT JOIN public.members m ON r.member_wallet = m.wallet_address
GROUP BY r.root_wallet, r.layer;

-- Rewards summary view
CREATE OR REPLACE VIEW public.rewards_summary AS
SELECT 
    lr.recipient_wallet,
    lr.layer,
    lr.reward_type,
    COUNT(*) as total_rewards,
    COUNT(CASE WHEN lr.is_claimed = false THEN 1 END) as pending_rewards,
    COUNT(CASE WHEN lr.is_claimed = true THEN 1 END) as claimed_rewards,
    SUM(lr.amount_usdt) as total_amount,
    SUM(CASE WHEN lr.is_claimed = false THEN lr.amount_usdt ELSE 0 END) as pending_amount,
    SUM(CASE WHEN lr.is_claimed = true THEN lr.amount_usdt ELSE 0 END) as claimed_amount,
    SUM(lr.amount_bcc) as total_bcc_amount,
    MAX(lr.created_at) as latest_reward_date,
    MAX(lr.claimed_at) as latest_claim_date
FROM public.layer_rewards lr
GROUP BY lr.recipient_wallet, lr.layer, lr.reward_type;

-- =============================================
-- Referral System Views
-- =============================================

-- Complete referral tree view with member details
CREATE OR REPLACE VIEW public.referral_tree_detailed AS
SELECT 
    r.root_wallet,
    r.member_wallet,
    r.layer,
    r.position,
    r.parent_wallet,
    r.placer_wallet,
    r.placement_type,
    r.is_active,
    r.created_at as placement_date,
    
    -- Member information
    u.username as member_username,
    u.email as member_email,
    u.current_level as member_current_level,
    u.created_at as member_joined_date,
    
    -- Member activation data
    m.is_activated as member_is_activated,
    m.activated_at as member_activated_at,
    m.current_level as member_bbc_level,
    m.levels_owned as member_levels_owned,
    m.total_direct_referrals,
    m.total_team_size,
    
    -- Balance information
    b.bcc_transferable as member_bcc_transferable,
    b.bcc_locked as member_bcc_locked,
    b.total_usdt_earned as member_total_earned,
    
    -- Root member information
    root_u.username as root_username,
    root_m.current_level as root_current_level
    
FROM public.referrals r
LEFT JOIN public.users u ON r.member_wallet = u.wallet_address
LEFT JOIN public.members m ON r.member_wallet = m.wallet_address
LEFT JOIN public.user_balances b ON r.member_wallet = b.wallet_address
LEFT JOIN public.users root_u ON r.root_wallet = root_u.wallet_address
LEFT JOIN public.members root_m ON r.root_wallet = root_m.wallet_address;

-- Direct referrals view (Layer 1 only)
CREATE OR REPLACE VIEW public.direct_referrals AS
SELECT 
    r.root_wallet,
    r.member_wallet,
    r.position,
    r.placement_type,
    r.created_at as referral_date,
    
    u.username,
    u.current_level,
    u.created_at as member_joined,
    
    m.is_activated,
    m.activated_at,
    m.current_level as bbc_level,
    m.total_direct_referrals as their_referrals,
    m.total_team_size,
    
    b.total_usdt_earned,
    (b.bcc_transferable + b.bcc_locked) as total_bcc_balance
    
FROM public.referrals r
LEFT JOIN public.users u ON r.member_wallet = u.wallet_address
LEFT JOIN public.members m ON r.member_wallet = m.wallet_address
LEFT JOIN public.user_balances b ON r.member_wallet = b.wallet_address
WHERE r.layer = 1;

-- =============================================
-- Purchase and Order Views
-- =============================================

-- Complete purchase history view
CREATE OR REPLACE VIEW public.purchase_history AS
SELECT 
    'bcc_purchase' as purchase_type,
    bpo.order_id as transaction_id,
    bpo.buyer_wallet as wallet_address,
    bpo.amount_usdc as amount_paid,
    bpo.amount_bcc as amount_received,
    bpo.network,
    bpo.payment_method,
    bpo.status,
    bpo.transaction_hash,
    bpo.created_at,
    bpo.completed_at,
    NULL as item_type,
    NULL as item_id
FROM public.bcc_purchase_orders bpo

UNION ALL

SELECT 
    'membership' as purchase_type,
    o.transaction_hash as transaction_id,
    o.wallet_address,
    o.amount_usdt as amount_paid,
    NULL as amount_received,
    NULL as network,
    o.payment_method,
    o.status,
    o.transaction_hash,
    o.created_at,
    o.completed_at,
    o.order_type as item_type,
    o.item_id
FROM public.orders o
WHERE o.order_type = 'membership'

UNION ALL

SELECT 
    'nft_purchase' as purchase_type,
    np.transaction_hash as transaction_id,
    np.buyer_wallet as wallet_address,
    np.price_bcc as amount_paid,
    NULL as amount_received,
    NULL as network,
    'bcc' as payment_method,
    CASE WHEN np.purchased_at IS NOT NULL THEN 'completed' ELSE 'pending' END as status,
    np.transaction_hash,
    np.purchased_at as created_at,
    np.purchased_at as completed_at,
    'nft' as item_type,
    np.nft_id::text as item_id
FROM public.nft_purchases np;

-- BCC transaction history view
CREATE OR REPLACE VIEW public.bcc_transactions AS
SELECT 
    'purchase' as transaction_type,
    bpo.order_id as reference_id,
    bpo.buyer_wallet as wallet_address,
    bpo.amount_bcc as amount,
    'credit' as direction,
    bpo.created_at,
    'BCC Purchase via ' || bpo.payment_method as description,
    bpo.status
FROM public.bcc_purchase_orders bpo
WHERE bpo.status = 'completed'

UNION ALL

SELECT 
    'nft_purchase' as transaction_type,
    np.id::text as reference_id,
    np.buyer_wallet as wallet_address,
    np.price_bcc as amount,
    'debit' as direction,
    np.purchased_at as created_at,
    'NFT Purchase: ' || COALESCE(mn.title, an.title, 'Unknown NFT') as description,
    CASE WHEN np.purchased_at IS NOT NULL THEN 'completed' ELSE 'pending' END as status
FROM public.nft_purchases np
LEFT JOIN public.merchant_nfts mn ON np.nft_id = mn.id AND np.nft_type = 'merchant'
LEFT JOIN public.advertisement_nfts an ON np.nft_id = an.id AND np.nft_type = 'advertisement'

UNION ALL

SELECT 
    'course_purchase' as transaction_type,
    ca.id::text as reference_id,
    ca.wallet_address,
    c.price_bcc as amount,
    'debit' as direction,
    ca.activated_at as created_at,
    'Course Access: ' || c.title as description,
    'completed' as status
FROM public.course_activations ca
LEFT JOIN public.courses c ON ca.course_id = c.id
WHERE c.price_bcc > 0;

-- =============================================
-- NFT and Marketplace Views
-- =============================================

-- Active marketplace NFTs view
CREATE OR REPLACE VIEW public.marketplace_nfts AS
SELECT 
    'merchant' as nft_type,
    mn.id,
    mn.title as title,
    mn.description,
    mn.image_url,
    NULL as metadata_url,
    mn.price_bcc,
    mn.creator_wallet,
    mn.category,
    NULL as tags,
    mn.is_active,
    mn.created_at,
    mn.updated_at,
    u.username as creator_username,
    NULL as advertiser_wallet,
    NULL as advertiser_username
FROM public.merchant_nfts mn
LEFT JOIN public.users u ON mn.creator_wallet = u.wallet_address
WHERE mn.is_active = true

UNION ALL

SELECT 
    'advertisement' as nft_type,
    an.id,
    an.title,
    an.description,
    an.image_url,
    NULL as metadata_url,
    an.price_bcc,
    an.advertiser_wallet as creator_wallet,
    an.category,
    NULL as tags,
    an.is_active,
    an.created_at,
    an.updated_at,
    u.username as creator_username,
    an.advertiser_wallet,
    u.username as advertiser_username
FROM public.advertisement_nfts an
LEFT JOIN public.users u ON an.advertiser_wallet = u.wallet_address
WHERE an.is_active = true;

-- User NFT collection view
CREATE OR REPLACE VIEW public.user_nft_collection AS
SELECT 
    np.buyer_wallet as wallet_address,
    np.nft_type,
    np.nft_id,
    np.price_bcc,
    np.purchased_at,
    np.transaction_hash,
    
    -- NFT details based on type
    CASE 
        WHEN np.nft_type = 'merchant' THEN mn.title
        WHEN np.nft_type = 'advertisement' THEN an.title
    END as nft_title,
    
    CASE 
        WHEN np.nft_type = 'merchant' THEN mn.description
        WHEN np.nft_type = 'advertisement' THEN an.description
    END as nft_description,
    
    CASE 
        WHEN np.nft_type = 'merchant' THEN mn.image_url
        WHEN np.nft_type = 'advertisement' THEN an.image_url
    END as nft_image_url,
    
    CASE 
        WHEN np.nft_type = 'merchant' THEN mn.creator_wallet
        WHEN np.nft_type = 'advertisement' THEN an.advertiser_wallet
    END as creator_wallet
    
FROM public.nft_purchases np
LEFT JOIN public.merchant_nfts mn ON np.nft_id = mn.id AND np.nft_type = 'merchant'
LEFT JOIN public.advertisement_nfts an ON np.nft_id = an.id AND np.nft_type = 'advertisement'
WHERE np.purchased_at IS NOT NULL;

-- =============================================
-- Course and Education Views
-- =============================================

-- Active courses with enrollment data
CREATE OR REPLACE VIEW public.courses_overview AS
SELECT 
    c.id,
    c.title,
    c.description,
    c.instructor_wallet,
    c.price_bcc,
    c.required_level,
    c.duration_hours,
    c.difficulty_level,
    c.category,
    NULL as tags,
    c.image_url as thumbnail_url,
    c.is_active,
    c.created_at,
    c.updated_at,
    
    -- Instructor information
    u.username as instructor_username,
    
    -- Course statistics
    COUNT(ca.wallet_address) as total_enrollments,
    COUNT(CASE WHEN ca.activated_at IS NOT NULL THEN 1 END) as active_enrollments,
    AVG(CASE WHEN ca.progress_percentage IS NOT NULL THEN ca.progress_percentage END) as avg_progress,
    
    -- Lesson count
    (SELECT COUNT(*) FROM public.course_lessons cl WHERE cl.course_id = c.id) as lesson_count
    
FROM public.courses c
LEFT JOIN public.users u ON c.instructor_wallet = u.wallet_address
LEFT JOIN public.course_activations ca ON c.id = ca.course_id
WHERE c.is_active = true
GROUP BY c.id, c.title, c.description, c.instructor_wallet, c.price_bcc, c.required_level, 
         c.duration_hours, c.difficulty_level, c.category, c.image_url, 
         c.is_active, c.created_at, c.updated_at, u.username;

-- User course progress view
CREATE OR REPLACE VIEW public.user_course_progress AS
SELECT 
    ca.wallet_address,
    ca.course_id,
    ca.activated_at,
    ca.progress_percentage,
    ca.completed_at,
    c.price_bcc,
    
    c.title as course_title,
    c.description as course_description,
    c.instructor_wallet,
    c.duration_hours,
    c.difficulty_level,
    c.image_url as thumbnail_url,
    
    u.username as instructor_username,
    
    -- Progress statistics
    (SELECT COUNT(*) FROM public.course_lessons cl WHERE cl.course_id = c.id) as total_lessons,
    (SELECT COUNT(*) FROM public.course_progress cp 
     WHERE cp.wallet_address = ca.wallet_address AND cp.course_id = ca.course_id AND cp.completed = true) as completed_lessons,
    
    -- Recent activity
    (SELECT MAX(cp.last_accessed_at) FROM public.course_progress cp 
     WHERE cp.wallet_address = ca.wallet_address AND cp.course_id = ca.course_id) as last_activity
    
FROM public.course_activations ca
LEFT JOIN public.courses c ON ca.course_id = c.id
LEFT JOIN public.users u ON c.instructor_wallet = u.wallet_address;

-- =============================================
-- Analytics and Statistics Views
-- =============================================

-- Platform statistics view
CREATE OR REPLACE VIEW public.platform_stats AS
SELECT 
    (SELECT COUNT(*) FROM public.users) as total_users,
    (SELECT COUNT(*) FROM public.members WHERE is_activated = true) as activated_members,
    (SELECT COUNT(*) FROM public.referrals) as total_referrals,
    (SELECT COUNT(DISTINCT root_wallet) FROM public.referrals) as active_matrices,
    (SELECT SUM(amount_usdt) FROM public.layer_rewards WHERE is_claimed = true) as total_rewards_claimed,
    (SELECT SUM(amount_bcc) FROM public.bcc_purchase_orders WHERE status = 'completed') as total_bcc_purchased,
    (SELECT COUNT(*) FROM public.nft_purchases WHERE purchased_at IS NOT NULL) as total_nft_sales,
    (SELECT COUNT(*) FROM public.course_activations WHERE activated_at IS NOT NULL) as total_course_enrollments;

-- Monthly activity statistics
CREATE OR REPLACE VIEW public.monthly_activity AS
SELECT 
    DATE_TRUNC('month', created_at) as month,
    'user_registrations' as activity_type,
    COUNT(*) as count
FROM public.users
GROUP BY DATE_TRUNC('month', created_at)

UNION ALL

SELECT 
    DATE_TRUNC('month', activated_at) as month,
    'member_activations' as activity_type,
    COUNT(*) as count
FROM public.members
WHERE activated_at IS NOT NULL
GROUP BY DATE_TRUNC('month', activated_at)

UNION ALL

SELECT 
    DATE_TRUNC('month', created_at) as month,
    'referral_placements' as activity_type,
    COUNT(*) as count
FROM public.referrals
GROUP BY DATE_TRUNC('month', created_at)

UNION ALL

SELECT 
    DATE_TRUNC('month', completed_at) as month,
    'bcc_purchases' as activity_type,
    COUNT(*) as count
FROM public.bcc_purchase_orders
WHERE completed_at IS NOT NULL
GROUP BY DATE_TRUNC('month', completed_at);

-- =============================================
-- Grant permissions for views
-- =============================================

-- Grant SELECT permissions on all views to authenticated users
GRANT SELECT ON public.user_dashboard TO authenticated;
GRANT SELECT ON public.matrix_overview TO authenticated;
GRANT SELECT ON public.rewards_summary TO authenticated;
GRANT SELECT ON public.referral_tree_detailed TO authenticated;
GRANT SELECT ON public.direct_referrals TO authenticated;
GRANT SELECT ON public.purchase_history TO authenticated;
GRANT SELECT ON public.bcc_transactions TO authenticated;
GRANT SELECT ON public.marketplace_nfts TO authenticated;
GRANT SELECT ON public.user_nft_collection TO authenticated;
GRANT SELECT ON public.courses_overview TO authenticated;
GRANT SELECT ON public.user_course_progress TO authenticated;
GRANT SELECT ON public.platform_stats TO authenticated;
GRANT SELECT ON public.monthly_activity TO authenticated;

-- Also grant to anonymous users for public data
GRANT SELECT ON public.marketplace_nfts TO anon;
GRANT SELECT ON public.courses_overview TO anon;
GRANT SELECT ON public.platform_stats TO anon;

-- End of views migration