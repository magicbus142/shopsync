-- Secure Whitelist Table
-- (Assuming table exists from previous step)

-- 1. Create a secure function to check if user is admin
-- For this MVP, we'll hardcode the admin email check in the policy for simplicity
-- or use a specific 'role' if we had one. Let's assume the user with a specific email is admin.

-- DROP POLICY IF EXISTS "Anyone can check whitelist" ON whitelist;
-- CREATE POLICY "Anyone can check whitelist" ON whitelist FOR SELECT USING (true);

-- 2. Allow only Admin (swamy@example.com - replace with actual admin email) to INSERT/DELETE
CREATE POLICY "Admin can full access whitelist" ON whitelist
  FOR ALL
  USING (auth.jwt() ->> 'email' IN ('swamy@example.com', 'admin@magicbus.com', 'swamy@magicbus142.com'));

-- 3. (Optional) Create a view for Admin Stats to bypass RLS on profiles/tables
-- This allows the admin to see counts without giving direct access to row data if we wanted to be strict,
-- but for now we might need to rely on the admin being an 'owner' or having a special role.
-- A simple view to count users:
CREATE OR REPLACE VIEW admin_user_stats AS
SELECT 
  p.id,
  p.full_name,
  p.shop_name,
  p.shop_name,
  -- p.email removed as it does not exist in profiles
  p.updated_at as created_at, -- using updated_at or created_at if exists
  p.updated_at,
  (SELECT count(*) FROM transactions t WHERE t.user_id = p.id) as transaction_count,
  (SELECT count(*) FROM products pr WHERE pr.user_id = p.id) as product_count
FROM profiles p;

-- Grant access to this view to authenticated users (or restrict to admin in application logic + RLS if possible on views - Views don't have RLS by default in standard PG unless enabled, but Supabase handles it differently. We'll keep it simple).
