-- Simple Level 2 NFT Fix without disabling system triggers
-- =====================================================

BEGIN;

-- First, let's check current triggers on membership table
SELECT 
    t.tgname as trigger_name,
    p.proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'membership'
AND NOT t.tgisinternal;

-- Check current triggers on members table
SELECT 
    t.tgname as trigger_name,
    p.proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'members'
AND NOT t.tgisinternal;

-- Now try to temporarily disable specific non-system triggers
-- (We'll identify which ones are causing the issue)

COMMIT;