-- Check what tables currently exist in the database
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check if bcc_staking_tiers table exists and its structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'bcc_staking_tiers' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check current data in bcc_staking_tiers if it exists
SELECT * FROM bcc_staking_tiers ORDER BY tier_id;