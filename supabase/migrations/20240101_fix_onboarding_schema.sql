-- Add missing columns to profiles table to support Onboarding Flow
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS full_name text,
ADD COLUMN IF NOT EXISTS role text DEFAULT 'owner',
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS onboarded boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS shop_name text,
-- New column for feature selection (JSON array of strings, e.g. ['inventory', 'reports'])
ADD COLUMN IF NOT EXISTS features jsonb DEFAULT '["inventory", "workers", "transactions", "reports"]'::jsonb;

-- Ensure RLS policies allow updates
-- (These typically exist, but reinforcing them is good practice)
-- create policy "Users can update own profile" on profiles for update using ( auth.uid() = id );
