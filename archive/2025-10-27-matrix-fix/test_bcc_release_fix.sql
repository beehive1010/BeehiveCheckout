-- Test BCC Release Fix
-- This file tests the corrected BCC release logic after migration

-- Test 1: Verify the calculation for all levels
SELECT
    level,
    -- Previous level BCC
    CASE
        WHEN level = 1 THEN 0
        ELSE (level - 2) * 50 + 100
    END as previous_level_bcc,
    -- Current level BCC
    (level - 1) * 50 + 100 as current_level_bcc,
    -- Total BCC released on upgrade to this level
    CASE
        WHEN level = 1 THEN 100
        ELSE (level - 2) * 50 + 100 + (level - 1) * 50 + 100
    END as total_bcc_released,
    CASE
        WHEN level = 1 THEN 'Level 1 activation: 100 BCC'
        WHEN level = 2 THEN 'Level 1→2: 100 + 150 = 250 BCC'
        WHEN level = 18 THEN 'Level 17→18: 900 + 950 = 1850 BCC'
        WHEN level = 19 THEN 'Level 18→19: 950 + 1000 = 1950 BCC'
        ELSE ''
    END as example_note
FROM generate_series(1, 19) as level
ORDER BY level;

-- Test 2: Calculate cumulative BCC for each level
WITH RECURSIVE level_bcc AS (
    -- Level 1: Only 100 BCC
    SELECT
        1 as level,
        100 as bcc_released_this_level,
        100 as cumulative_bcc

    UNION ALL

    -- Level 2+: Previous level BCC + Current level BCC
    SELECT
        level_bcc.level + 1,
        -- BCC released on upgrade to next level
        ((level_bcc.level - 1) * 50 + 100) + (level_bcc.level * 50 + 100) as bcc_released_this_level,
        -- Cumulative total
        level_bcc.cumulative_bcc + ((level_bcc.level - 1) * 50 + 100) + (level_bcc.level * 50 + 100)
    FROM level_bcc
    WHERE level_bcc.level < 19
)
SELECT
    level,
    bcc_released_this_level as bcc_released_on_upgrade,
    cumulative_bcc as total_bcc_unlocked_at_level,
    CASE
        WHEN level = 1 THEN 'Level 1 activation'
        WHEN level = 19 THEN 'Level 18→19 upgrade (final level)'
        ELSE FORMAT('Level %s→%s upgrade', level - 1, level)
    END as upgrade_scenario
FROM level_bcc
ORDER BY level;

-- Test 3: Verify specific scenarios
SELECT
    '=== Critical Test Cases ===' as test_section;

SELECT
    'Level 18→19' as scenario,
    950 as level_18_bcc,
    1000 as level_19_bcc,
    950 + 1000 as total_released,
    'Should release 1950 BCC total' as expected_result;

SELECT
    'Level 1→2' as scenario,
    100 as level_1_bcc,
    150 as level_2_bcc,
    100 + 150 as total_released,
    'Should release 250 BCC total' as expected_result;

SELECT
    'Level 2→3' as scenario,
    150 as level_2_bcc,
    200 as level_3_bcc,
    150 + 200 as total_released,
    'Should release 350 BCC total' as expected_result;

-- Test 4: Expected cumulative BCC at Level 19
SELECT
    '=== Level 19 Total BCC Check ===' as test_section;

-- Sum all BCC releases from Level 1 to Level 19
WITH level_releases AS (
    SELECT
        1 as level,
        100 as bcc_released -- Level 1 activation
    UNION ALL
    SELECT
        level,
        -- For Level 2+: previous_level_bcc + current_level_bcc
        ((level - 2) * 50 + 100) + ((level - 1) * 50 + 100) as bcc_released
    FROM generate_series(2, 19) as level
)
SELECT
    SUM(bcc_released) as total_bcc_unlocked_at_level_19,
    'Expected cumulative BCC after reaching Level 19' as description;

-- Show breakdown for clarity
SELECT
    level,
    CASE
        WHEN level = 1 THEN 100
        ELSE ((level - 2) * 50 + 100) + ((level - 1) * 50 + 100)
    END as bcc_released,
    SUM(CASE
        WHEN level = 1 THEN 100
        ELSE ((level - 2) * 50 + 100) + ((level - 1) * 50 + 100)
    END) OVER (ORDER BY level) as cumulative_total
FROM generate_series(1, 19) as level
ORDER BY level;
