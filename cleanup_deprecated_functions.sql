-- ====================================================================
-- 清理废弃的矩阵占位函数
-- ====================================================================
-- 警告: 执行前请确认这些函数确实不再使用
-- 建议: 先在staging环境测试
-- ====================================================================

BEGIN;

SELECT '=== 开始清理废弃函数 ===' AS status;

-- 记录要删除的函数（用于日志）
CREATE TEMP TABLE IF NOT EXISTS temp_deleted_functions (
    function_name TEXT,
    deleted_at TIMESTAMP DEFAULT NOW()
);

-- 删除旧的Branch-First BFS函数（已重命名为_old的备份版本）
-- 保留1周后再删除
SELECT '跳过删除 fn_place_member_branch_bfs_old (保留作为备份1周)' AS note;

-- 删除重复的递归占位函数
DROP FUNCTION IF EXISTS place_member_in_matrix_recursive(TEXT, TEXT, INTEGER);
INSERT INTO temp_deleted_functions (function_name) VALUES ('place_member_in_matrix_recursive');

DROP FUNCTION IF EXISTS place_member_in_matrix_recursive_v2(TEXT, TEXT, INTEGER);
INSERT INTO temp_deleted_functions (function_name) VALUES ('place_member_in_matrix_recursive_v2');

DROP FUNCTION IF EXISTS place_member_in_recursive_matrix(VARCHAR, VARCHAR);
INSERT INTO temp_deleted_functions (function_name) VALUES ('place_member_in_recursive_matrix');

-- 删除单矩阵占位的多个版本（已被unified版本替代）
DROP FUNCTION IF EXISTS place_member_in_single_matrix(VARCHAR, VARCHAR, INTEGER);
INSERT INTO temp_deleted_functions (function_name) VALUES ('place_member_in_single_matrix');

DROP FUNCTION IF EXISTS place_member_in_single_matrix_bfs(VARCHAR, VARCHAR, INTEGER);
INSERT INTO temp_deleted_functions (function_name) VALUES ('place_member_in_single_matrix_bfs');

DROP FUNCTION IF EXISTS place_member_in_single_matrix_fixed_layer(VARCHAR, VARCHAR, INTEGER);
INSERT INTO temp_deleted_functions (function_name) VALUES ('place_member_in_single_matrix_fixed_layer');

DROP FUNCTION IF EXISTS place_member_in_single_matrix_gen_v3(VARCHAR, VARCHAR, INTEGER);
INSERT INTO temp_deleted_functions (function_name) VALUES ('place_member_in_single_matrix_gen_v3');

DROP FUNCTION IF EXISTS place_member_in_single_matrix_generation(VARCHAR, VARCHAR, INTEGER);
INSERT INTO temp_deleted_functions (function_name) VALUES ('place_member_in_single_matrix_generation');

-- 删除旧的完整占位函数
DROP FUNCTION IF EXISTS place_member_matrix_complete(VARCHAR, VARCHAR);
INSERT INTO temp_deleted_functions (function_name) VALUES ('place_member_matrix_complete');

-- 删除基于generation的旧逻辑
DROP FUNCTION IF EXISTS place_member_recursive_generation_based(VARCHAR, VARCHAR);
INSERT INTO temp_deleted_functions (function_name) VALUES ('place_member_recursive_generation_based');

DROP FUNCTION IF EXISTS place_member_referrer_depth_logic(TEXT, TEXT);
INSERT INTO temp_deleted_functions (function_name) VALUES ('place_member_referrer_depth_logic');

-- 删除旧的spillover函数（被新版本替代）
DROP FUNCTION IF EXISTS place_member_spillover(VARCHAR, VARCHAR);
INSERT INTO temp_deleted_functions (function_name) VALUES ('place_member_spillover');

DROP FUNCTION IF EXISTS place_member_spillover_safe(VARCHAR, VARCHAR);
INSERT INTO temp_deleted_functions (function_name) VALUES ('place_member_spillover_safe');

DROP FUNCTION IF EXISTS place_member_with_spillover(VARCHAR, VARCHAR);
INSERT INTO temp_deleted_functions (function_name) VALUES ('place_member_with_spillover');

-- 删除旧的"correct"版本（已被修复版替代）
DROP FUNCTION IF EXISTS place_new_member_in_matrix_correct(TEXT, TEXT);
INSERT INTO temp_deleted_functions (function_name) VALUES ('place_new_member_in_matrix_correct');

-- 删除简化版本
DROP FUNCTION IF EXISTS simple_matrix_placement(VARCHAR, VARCHAR);
INSERT INTO temp_deleted_functions (function_name) VALUES ('simple_matrix_placement');

DROP FUNCTION IF EXISTS simple_place_orphaned_members();
INSERT INTO temp_deleted_functions (function_name) VALUES ('simple_place_orphaned_members');

DROP FUNCTION IF EXISTS fn_simple_spillover_place(VARCHAR, VARCHAR);
INSERT INTO temp_deleted_functions (function_name) VALUES ('fn_simple_spillover_place');

-- 显示删除的函数列表
SELECT '=== 已删除的函数 ===' AS report;
SELECT * FROM temp_deleted_functions ORDER BY deleted_at;

-- 显示保留的核心函数
SELECT '=== 保留的核心函数 ===' AS report;
SELECT
    proname AS function_name,
    pg_get_function_identity_arguments(oid) AS arguments
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
AND proname LIKE '%place%'
ORDER BY proname;

-- 提交或回滚
-- COMMIT;  -- 取消注释以提交删除
ROLLBACK;  -- 默认回滚，请先检查结果

SELECT '=== 清理脚本已准备（默认ROLLBACK）===' AS status;
SELECT '请检查以上列表，确认无误后将ROLLBACK改为COMMIT' AS instruction;
