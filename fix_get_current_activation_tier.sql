-- Fix get_current_activation_tier function
-- ==========================================
-- Replace 'activated_at' with 'claimed_at' since that's the actual field name in membership table

CREATE OR REPLACE FUNCTION public.get_current_activation_tier()
RETURNS TABLE(tier integer, tier_name character varying, bcc_multiplier numeric, current_activations bigint, next_milestone integer)
LANGUAGE plpgsql
AS $function$
DECLARE
    total_activated_members BIGINT;
    current_tier_record RECORD;
BEGIN
    -- 计算当前已激活的会员总数 (修复: 使用 claimed_at 替代 activated_at)
    SELECT COUNT(*) INTO total_activated_members
    FROM membership 
    WHERE claimed_at IS NOT NULL 
    AND nft_level = 1;
    
    -- 根据激活数量确定当前阶段（使用表别名避免歧义）
    SELECT * INTO current_tier_record
    FROM member_activation_tiers mat
    WHERE mat.is_active = TRUE
    AND (
        total_activated_members BETWEEN mat.min_activation_rank AND mat.max_activation_rank
        OR (mat.tier = 4 AND total_activated_members >= mat.min_activation_rank)
    )
    ORDER BY mat.tier
    LIMIT 1;
    
    -- 如果没有找到，默认返回Tier 1（使用表别名避免歧义）
    IF current_tier_record IS NULL THEN
        SELECT * INTO current_tier_record
        FROM member_activation_tiers mat
        WHERE mat.tier = 1 AND mat.is_active = TRUE;
    END IF;
    
    -- 如果member_activation_tiers表不存在或为空，返回默认值
    IF current_tier_record IS NULL THEN
        RETURN QUERY SELECT 
            1 as tier,
            'Tier 1'::character varying as tier_name,
            1.000::NUMERIC as bcc_multiplier,
            total_activated_members as current_activations,
            100 as next_milestone;
        RETURN;
    END IF;
    
    -- 返回结果
    RETURN QUERY SELECT 
        current_tier_record.tier,
        current_tier_record.tier_name,
        CASE current_tier_record.tier
            WHEN 1 THEN 1.000::NUMERIC
            WHEN 2 THEN 0.500::NUMERIC
            WHEN 3 THEN 0.250::NUMERIC
            WHEN 4 THEN 0.125::NUMERIC
            ELSE 1.000::NUMERIC
        END as bcc_multiplier,
        total_activated_members as current_activations,
        current_tier_record.max_activation_rank as next_milestone;
END;
$function$;

-- Test the function
SELECT * FROM get_current_activation_tier();