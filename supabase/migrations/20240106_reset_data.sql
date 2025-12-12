-- DANGER: This script purges all application data!
-- It also ensures the necessary 'admin_users' table exists.

-- 1. Ensure Schema Exists (Fix for "relation does not exist" error)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on admin_users if not already active
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- 2. Truncate Data Tables
TRUNCATE TABLE transactions CASCADE;
TRUNCATE TABLE products CASCADE;
TRUNCATE TABLE workers CASCADE;
TRUNCATE TABLE whitelist CASCADE;
TRUNCATE TABLE profiles CASCADE;

-- 3. Re-Seed Admin and Policies
-- Insert admin if missing
INSERT INTO admin_users (email) 
VALUES ('swamy@magicbus142.com')
ON CONFLICT (email) DO NOTHING;

-- Ensure Admin Policy exists
DROP POLICY IF EXISTS "Admins can view admin list" ON admin_users;
CREATE POLICY "Admins can view admin list" ON admin_users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.email = auth.jwt() ->> 'email'
    )
  );

-- Ensure Whitelist Policy is correct
ALTER TABLE whitelist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can full access whitelist" ON whitelist;
CREATE POLICY "Admin can full access whitelist" ON whitelist
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.email = auth.jwt() ->> 'email'
    )
  );

DROP POLICY IF EXISTS "Anyone can check whitelist" ON whitelist;
CREATE POLICY "Anyone can check whitelist" ON whitelist
  FOR SELECT
  USING (true);

-- 4. Whitelist the Admin
INSERT INTO whitelist (email) 
VALUES ('swamy@magicbus142.com');
