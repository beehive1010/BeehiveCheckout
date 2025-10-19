-- ============================================================================
-- 创建 v_matrix_direct_children 视图
-- 用于前端matrix组件查询每个parent的直接children
-- ============================================================================

CREATE OR REPLACE VIEW v_matrix_direct_children AS
SELECT
    mr.matrix_root_wallet,
    mr.member_wallet,
    mr.parent_wallet,
    mr.layer as layer_index,
    mr.slot as slot_index,
    -- BFS顺序（如果有的话，否则按created_at排序）
    COALESCE(mr.bfs_order,
      ROW_NUMBER() OVER (
        PARTITION BY mr.matrix_root_wallet
        ORDER BY mr.layer, mr.created_at
      )::INTEGER
    ) as slot_num_seq,
    mr.referral_type,
    mr.activation_time as placed_at,
    mr.created_at,
    -- 获取member的level信息
    m.current_level as child_level,
    m.current_level as child_nft_count
FROM matrix_referrals mr
LEFT JOIN members m ON m.wallet_address = mr.member_wallet
ORDER BY mr.matrix_root_wallet, mr.bfs_order NULLS LAST, mr.layer, mr.created_at;

COMMENT ON VIEW v_matrix_direct_children IS
'View for querying direct children of each parent in the matrix tree, used by frontend components';

-- 授予权限
GRANT SELECT ON v_matrix_direct_children TO authenticated, anon;
