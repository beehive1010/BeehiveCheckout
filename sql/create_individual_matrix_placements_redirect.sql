-- Create a view that redirects individual_matrix_placements queries to spillover_matrix
-- This fixes any legacy frontend queries that still try to access the old table

BEGIN;

-- Drop the view if it exists
DROP VIEW IF EXISTS individual_matrix_placements CASCADE;

-- Create a view that maps old table structure to new spillover_matrix structure
CREATE OR REPLACE VIEW individual_matrix_placements AS
SELECT 
    ROW_NUMBER() OVER (ORDER BY sm.created_at) as id,
    sm.matrix_root as matrix_owner,
    sm.member_wallet as member_wallet,
    sm.matrix_layer as layer_in_owner_matrix,
    sm.matrix_position as position_in_layer,
    CASE 
        WHEN sm.matrix_position = 'L' THEN 0
        WHEN sm.matrix_position = 'M' THEN 1  
        WHEN sm.matrix_position = 'R' THEN 2
        ELSE 0
    END as position_index,
    sm.is_active as is_active,
    sm.created_at as created_at,
    sm.updated_at as updated_at
FROM spillover_matrix sm
WHERE sm.is_active = true;

-- Add row level security
ALTER VIEW individual_matrix_placements ENABLE ROW LEVEL SECURITY;

-- Create policies to allow access
CREATE POLICY "Enable read access for all users" ON individual_matrix_placements FOR SELECT USING (true);

-- Create indexes to improve performance
CREATE INDEX IF NOT EXISTS idx_individual_matrix_placements_matrix_owner ON spillover_matrix(matrix_root) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_individual_matrix_placements_member_wallet ON spillover_matrix(member_wallet) WHERE is_active = true;

SELECT '✅ individual_matrix_placements redirect view created successfully!' as result;

COMMIT;