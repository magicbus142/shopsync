-- Helper to promote a user to admin
-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Update the profile role
UPDATE profiles 
SET role = 'admin' 
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'swamy@magicbus142.com'
);

-- 2. Update the RLS Policy to use the ROLE column instead of email
DROP POLICY IF EXISTS "Admin can full access whitelist" ON whitelist;

CREATE POLICY "Admin can full access whitelist" ON whitelist
FOR ALL
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);
