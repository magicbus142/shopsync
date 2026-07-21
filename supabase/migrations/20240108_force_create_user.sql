-- Create a secure user directly in auth.users to bypass signup/confirmation issues
-- Password will be 'password123'

BEGIN;

-- 1. Insert into auth.users (if not exists)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'gangabhavani@gmail.com',
  crypt('password123', gen_salt('bf')), -- Password: password123
  now(), -- Auto-confirm
  NULL,
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO UPDATE SET 
  encrypted_password = crypt('password123', gen_salt('bf')),
  email_confirmed_at = now();

-- 2. Ensure Profile Exists
INSERT INTO public.profiles (id, shop_name, full_name, role)
SELECT id, 'Ganga Bhavani Cement Shop', 'Admin', 'owner'
FROM auth.users
WHERE email = 'gangabhavani@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  shop_name = 'Ganga Bhavani Cement Shop';

-- 3. Ensure Whitelist
INSERT INTO public.whitelist (email)
VALUES ('gangabhavani@gmail.com')
ON CONFLICT (email) DO NOTHING;

COMMIT;
