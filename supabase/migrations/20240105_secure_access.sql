-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial admin
INSERT INTO admin_users (email)
VALUES ('swamy@magicbus142.com')
ON CONFLICT (email) DO NOTHING;

-- Secure Whitelist Table
-- Enable RLS
ALTER TABLE whitelist ENABLE ROW LEVEL SECURITY;

-- Policy: Admin can do everything on whitelist
DROP POLICY IF EXISTS "Admin can full access whitelist" ON whitelist;
CREATE POLICY "Admin can full access whitelist" ON whitelist
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.email = auth.jwt() ->> 'email'
    )
  );

-- Policy: Public/Anyone can check if their email is whitelisted (for signup check)
-- We need to allow SELECT for anyone so the signup form can verify presence.
DROP POLICY IF EXISTS "Anyone can check whitelist" ON whitelist;
CREATE POLICY "Anyone can check whitelist" ON whitelist
  FOR SELECT
  USING (true);

-- Create a helper function to check admin status (optional but useful for frontend RLS or claims)
CREATE OR REPLACE FUNCTION is_admin(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM admin_users WHERE email = user_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Secure Admin Stats View (if we keep it)
-- We can also secure the admin_users table itself
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view admin list" ON admin_users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.email = auth.jwt() ->> 'email'
    )
  );
