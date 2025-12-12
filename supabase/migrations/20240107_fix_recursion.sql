-- Fix RLS Infinite Recursion Bug
-- The previous policy caused a loop by querying the table it was protecting.

-- 1. Fix Admin Users Policy
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view admin list" ON admin_users;

-- New Policy: Only allow users to see THEIR OWN row in the admin table.
-- This prevents recursion when checking "Am I an admin?"
CREATE POLICY "Admins can view themselves" ON admin_users
  FOR SELECT
  USING (email = auth.jwt() ->> 'email');

-- 2. Ensure Whitelist Policy is simpler (optional, but good for safety)
-- The existing whitelist policy queries admin_users. 
-- Since we fixed admin_users policy above, the subquery will now work correctly without recursion.
-- No changes needed for whitelist policy itself, but we re-apply for safety.

DROP POLICY IF EXISTS "Admin can full access whitelist" ON whitelist;
CREATE POLICY "Admin can full access whitelist" ON whitelist
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.email = auth.jwt() ->> 'email'
    )
  );
