-- Fix analyze_matrix_structure function to use correct column names for 3x3 matrix
-- Replace placement_root with matrix_root and fix other column references

\echo '🔧 Fixing analyze_matrix_structure function...'

-- Drop existing function
DROP FUNCTION IF EXISTS analyze_matrix_structure();

-- Create corrected function
CREATE OR REPLACE FUNCTION analyze_matrix_structure()
RETURNS TABLE(
    matrix_root TEXT,
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
BEGIN
    -- For each matrix_root
    FOR root_record IN
        SELECT DISTINCT r.matrix_root, u.username
        FROM referrals r
        LEFT JOIN users u ON r.matrix_root = u.wallet_address
        WHERE r.matrix_root IS NOT NULL
    LOOP
        -- Count total members for this root
        SELECT COUNT(*) INTO total_members
        FROM referrals
        WHERE matrix_root = root_record.matrix_root;

        -- Get layer distribution
        layers := '{}'::jsonb;
        FOR layer_counts IN
            SELECT matrix_layer, COUNT(*) as count
            FROM referrals
            WHERE matrix_root = root_record.matrix_root
              AND matrix_layer IS NOT NULL
            GROUP BY matrix_layer
            ORDER BY matrix_layer
        LOOP
            layers := layers || jsonb_build_object('Layer_' || layer_counts.matrix_layer::TEXT, layer_counts.count);
        END LOOP;

        -- Get position distribution for 3x3 matrix (L, M, R)
        SELECT
            COUNT(*) FILTER (WHERE matrix_position = 'L') as l_pos,
            COUNT(*) FILTER (WHERE matrix_position = 'M') as m_pos,
            COUNT(*) FILTER (WHERE matrix_position = 'R') as r_pos
        INTO position_counts
        FROM referrals
        WHERE matrix_root = root_record.matrix_root;

        -- Return the row for this root
        matrix_root := root_record.matrix_root;
        root_username := root_record.username;
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

\echo '✅ Fixed analyze_matrix_structure function for 3x3 matrix system'

-- Test the corrected function
\echo ''
\echo '📊 Testing corrected function:'
SELECT * FROM analyze_matrix_structure();

\echo ''
\echo '✅ analyze_matrix_structure function is now compatible with 3x3 matrix system!'