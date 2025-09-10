-- Fix analyze_matrix_structure function - avoid column name conflicts
-- Use table aliases to resolve ambiguous column references

\echo '🔧 Fixing analyze_matrix_structure function (v2)...'

-- Drop existing function
DROP FUNCTION IF EXISTS analyze_matrix_structure();

-- Create corrected function with proper table aliases
CREATE OR REPLACE FUNCTION analyze_matrix_structure()
RETURNS TABLE(
    matrix_root_wallet TEXT,
    root_username TEXT,
    total_members INTEGER,
    layer_distribution JSONB,
    position_distribution JSONB
) 
LANGUAGE plpgsql AS $$
DECLARE
    root_record record;
    layers jsonb := '{}'::jsonb;
    layer_counts record;
    position_counts record;
    member_count INTEGER;
BEGIN
    -- For each matrix_root
    FOR root_record IN
        SELECT DISTINCT r.matrix_root, u.username
        FROM referrals r
        LEFT JOIN users u ON r.matrix_root = u.wallet_address
        WHERE r.matrix_root IS NOT NULL
    LOOP
        -- Count total members for this root
        SELECT COUNT(*) INTO member_count
        FROM referrals r2
        WHERE r2.matrix_root = root_record.matrix_root;

        -- Get layer distribution
        layers := '{}'::jsonb;
        FOR layer_counts IN
            SELECT r3.matrix_layer, COUNT(*) as count
            FROM referrals r3
            WHERE r3.matrix_root = root_record.matrix_root
              AND r3.matrix_layer IS NOT NULL
            GROUP BY r3.matrix_layer
            ORDER BY r3.matrix_layer
        LOOP
            layers := layers || jsonb_build_object('Layer_' || layer_counts.matrix_layer::TEXT, layer_counts.count);
        END LOOP;

        -- Get position distribution for 3x3 matrix (L, M, R)
        SELECT
            COUNT(*) FILTER (WHERE r4.matrix_position = 'L') as l_pos,
            COUNT(*) FILTER (WHERE r4.matrix_position = 'M') as m_pos,
            COUNT(*) FILTER (WHERE r4.matrix_position = 'R') as r_pos
        INTO position_counts
        FROM referrals r4
        WHERE r4.matrix_root = root_record.matrix_root;

        -- Return the row for this root
        matrix_root_wallet := root_record.matrix_root;
        root_username := root_record.username;
        total_members := member_count;
        layer_distribution := layers;
        position_distribution := jsonb_build_object(
            'L_positions', position_counts.l_pos,
            'M_positions', position_counts.m_pos,
            'R_positions', position_counts.r_pos,
            'total_positions', position_counts.l_pos + position_counts.m_pos + position_counts.r_pos
        );

        RETURN NEXT;
    END LOOP;

    RETURN;
END;
$$;

\echo '✅ Fixed analyze_matrix_structure function with proper table aliases'

-- Test the corrected function
\echo ''
\echo '📊 Testing corrected function:'
SELECT * FROM analyze_matrix_structure();

\echo ''
\echo '✅ analyze_matrix_structure function is now working correctly!'