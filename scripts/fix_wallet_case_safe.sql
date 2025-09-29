-- Fix wallet case for user: 0xa212A85f7434A5EBAa5b468971EC3972cE72a544
-- Convert from lowercase: 0xa212a85f7434a5ebaa5b468971ec3972ce72a544
-- To correct case: 0xa212A85f7434A5EBAa5b468971EC3972cE72a544
-- Safe order to avoid foreign key constraint violations

BEGIN;

-- First update child tables (tables that reference other tables)

-- Update layer_rewards first
UPDATE layer_rewards 
SET matrix_root_wallet = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
WHERE matrix_root_wallet = '0xa212a85f7434a5ebaa5b468971ec3972ce72a544';

UPDATE layer_rewards 
SET reward_recipient_wallet = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
WHERE reward_recipient_wallet = '0xa212a85f7434a5ebaa5b468971ec3972ce72a544';

UPDATE layer_rewards 
SET triggering_member_wallet = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
WHERE triggering_member_wallet = '0xa212a85f7434a5ebaa5b468971ec3972ce72a544';

-- Update matrix_referrals
UPDATE matrix_referrals 
SET matrix_root_wallet = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
WHERE matrix_root_wallet = '0xa212a85f7434a5ebaa5b468971ec3972ce72a544';

UPDATE matrix_referrals 
SET member_wallet = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
WHERE member_wallet = '0xa212a85f7434a5ebaa5b468971ec3972ce72a544';

UPDATE matrix_referrals 
SET parent_wallet = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
WHERE parent_wallet = '0xa212a85f7434a5ebaa5b468971ec3972ce72a544';

-- Update referrals_new
UPDATE referrals_new 
SET referrer_wallet = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
WHERE referrer_wallet = '0xa212a85f7434a5ebaa5b468971ec3972ce72a544';

UPDATE referrals_new 
SET referred_wallet = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
WHERE referred_wallet = '0xa212a85f7434a5ebaa5b468971ec3972ce72a544';

-- Update user_balances
UPDATE user_balances 
SET wallet_address = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
WHERE wallet_address = '0xa212a85f7434a5ebaa5b468971ec3972ce72a544';

-- Update members table
UPDATE members 
SET wallet_address = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
WHERE wallet_address = '0xa212a85f7434a5ebaa5b468971ec3972ce72a544';

UPDATE members 
SET referrer_wallet = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
WHERE referrer_wallet = '0xa212a85f7434a5ebaa5b468971ec3972ce72a544';

-- Finally update users table
UPDATE users 
SET wallet_address = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
WHERE wallet_address = '0xa212a85f7434a5ebaa5b468971ec3972ce72a544';

UPDATE users 
SET referrer_wallet = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
WHERE referrer_wallet = '0xa212a85f7434a5ebaa5b468971ec3972ce72a544';

COMMIT;

-- Verify the changes
SELECT 'After update - Verification' as status;
SELECT 'users' as table_name, count(*) as count 
FROM users WHERE wallet_address = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
UNION ALL
SELECT 'members', count(*) 
FROM members WHERE wallet_address = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
UNION ALL  
SELECT 'matrix_referrals_root', count(*) 
FROM matrix_referrals WHERE matrix_root_wallet = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
UNION ALL
SELECT 'referrals_new_referrer', count(*) 
FROM referrals_new WHERE referrer_wallet = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
UNION ALL
SELECT 'user_balances', count(*) 
FROM user_balances WHERE wallet_address = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544';

-- Check views are updated
SELECT 'referrer_stats' as view_name, count(*) as count
FROM referrer_stats WHERE referrer = '0xa212A85f7434A5EBAa5b468971EC3972cE72a544';