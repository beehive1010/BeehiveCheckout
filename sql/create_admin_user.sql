-- Create admin user for accessing admin dashboard
-- This script sets up the admin table and creates a default admin user

-- Create admins table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash TEXT,
    role VARCHAR(20) DEFAULT 'admin',
    admin_level INTEGER DEFAULT 1,
    permissions TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_admins ON public.admins;
CREATE TRIGGER set_timestamp_admins
    BEFORE UPDATE ON public.admins
    FOR EACH ROW
    EXECUTE PROCEDURE trigger_set_timestamp();

-- Insert default admin user
-- Password hash for "admin123" using bcrypt
INSERT INTO public.admins (
    username, 
    email, 
    password_hash, 
    role, 
    admin_level, 
    permissions, 
    is_active
) VALUES (
    'admin',
    'admin@beehive.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- admin123
    'super_admin',
    3,
    ARRAY['*'], -- All permissions
    true
) ON CONFLICT (username) DO UPDATE SET
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    admin_level = EXCLUDED.admin_level,
    permissions = EXCLUDED.permissions,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Enable Row Level Security
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Create policies for admin table access
DROP POLICY IF EXISTS "Admin users can read all admin records" ON public.admins;
CREATE POLICY "Admin users can read all admin records" ON public.admins
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin users can update their own record" ON public.admins;
CREATE POLICY "Admin users can update their own record" ON public.admins
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.admins TO anon;
GRANT SELECT, INSERT, UPDATE ON public.admins TO authenticated;

-- Grant usage on sequence
GRANT USAGE ON SEQUENCE public.admins_id_seq TO anon;
GRANT USAGE ON SEQUENCE public.admins_id_seq TO authenticated;

-- Display the created admin user
SELECT 
    id,
    username,
    email,
    role,
    admin_level,
    permissions,
    is_active,
    created_at
FROM public.admins 
WHERE username = 'admin';