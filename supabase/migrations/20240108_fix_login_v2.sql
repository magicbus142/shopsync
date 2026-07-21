-- Fix login by updating password safely
-- This script avoids the 'ON CONFLICT' error by checking for existence first.

DO $$
DECLARE
  target_email TEXT := 'gangabhavani@gmail.com';
  new_pass TEXT := 'password123';
  v_user_id UUID;
BEGIN
  -- 1. Check if user exists
  SELECT id INTO v_user_id FROM auth.users WHERE email = target_email;

  IF v_user_id IS NOT NULL THEN
    -- UPDATE existing user
    UPDATE auth.users
    SET 
      encrypted_password = crypt(new_pass, gen_salt('bf')),
      email_confirmed_at = now(),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      updated_at = now()
    WHERE id = v_user_id;
  ELSE
    -- INSERT new user
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      target_email,
      crypt(new_pass, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      now(),
      now()
    );
  END IF;

  -- 2. Ensure Profile Exists
  -- We assume the ID matches if we just found/created it.
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
      INSERT INTO public.profiles (id, shop_name, full_name, role)
      VALUES (v_user_id, 'Ganga Bhavani Cement Shop', 'Admin', 'owner');
  ELSE
      UPDATE public.profiles
      SET shop_name = 'Ganga Bhavani Cement Shop'
      WHERE id = v_user_id;
  END IF;

  -- 3. Ensure Whitelist
  IF NOT EXISTS (SELECT 1 FROM public.whitelist WHERE email = target_email) THEN
      INSERT INTO public.whitelist (email) VALUES (target_email);
  END IF;

END $$;
