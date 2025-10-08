-- Fix RLS policies - Direct application via SQL Editor

-- 1. members table
DROP POLICY IF EXISTS "Allow read access to members" ON members;
CREATE POLICY "Allow read access to members"
ON members FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Service role full access to members" ON members;
CREATE POLICY "Service role full access to members"
ON members FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. membership table
DROP POLICY IF EXISTS "Allow read access to membership" ON membership;
CREATE POLICY "Allow read access to membership"
ON membership FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Service role full access to membership" ON membership;
CREATE POLICY "Service role full access to membership"
ON membership FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. referrals table
DROP POLICY IF EXISTS "Allow read access to referrals" ON referrals;
CREATE POLICY "Allow read access to referrals"
ON referrals FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Service role full access to referrals" ON referrals;
CREATE POLICY "Service role full access to referrals"
ON referrals FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. layer_rewards table
DROP POLICY IF EXISTS "Allow read access to layer_rewards" ON layer_rewards;
CREATE POLICY "Allow read access to layer_rewards"
ON layer_rewards FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Service role full access to layer_rewards" ON layer_rewards;
CREATE POLICY "Service role full access to layer_rewards"
ON layer_rewards FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. Enable RLS
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE layer_rewards ENABLE ROW LEVEL SECURITY;

-- 6. Grant permissions
GRANT SELECT ON v_reward_overview TO anon, authenticated;
GRANT SELECT ON v_member_overview TO anon, authenticated;
GRANT SELECT ON v_matrix_overview TO anon, authenticated;
GRANT SELECT ON members TO anon, authenticated;
GRANT SELECT ON membership TO anon, authenticated;
GRANT SELECT ON referrals TO anon, authenticated;
GRANT SELECT ON layer_rewards TO anon, authenticated;
