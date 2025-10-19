-- ============================================================================
-- 创建 v_matrix_layers_v2 视图
-- 用于 MatrixLayerStatsView 组件显示层级统计
-- ============================================================================

CREATE OR REPLACE VIEW v_matrix_layers_v2 AS
SELECT
    mr.matrix_root_wallet as root,
    mr.layer,
    -- 理论最大容量
    POWER(3, mr.layer)::INTEGER as capacity,
    -- 实际填充数量
    COUNT(*)::INTEGER as filled,
    -- 按推荐类型统计
    COUNT(*) FILTER (WHERE mr.referral_type = 'spillover')::INTEGER as spillovers,
    COUNT(*) FILTER (WHERE mr.referral_type = 'direct')::INTEGER as directs,
    -- L/M/R位置统计
    COUNT(*) FILTER (WHERE mr.slot = 'L')::INTEGER as left_count,
    COUNT(*) FILTER (WHERE mr.slot = 'M')::INTEGER as middle_count,
    COUNT(*) FILTER (WHERE mr.slot = 'R')::INTEGER as right_count
FROM matrix_referrals mr
WHERE mr.layer >= 1 AND mr.layer <= 19
GROUP BY mr.matrix_root_wallet, mr.layer
ORDER BY mr.matrix_root_wallet, mr.layer;

COMMENT ON VIEW v_matrix_layers_v2 IS
'Layer-by-layer statistics for each matrix root, used by MatrixLayerStatsView component';

-- 授予权限
GRANT SELECT ON v_matrix_layers_v2 TO authenticated, anon;
