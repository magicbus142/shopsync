-- Fix Customers Table & Permissions
-- Forcefully ensures the table exists and has the correct permissions.

BEGIN;

-- 1. Ensure Table Exists
CREATE TABLE IF NOT EXISTS customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Reset RLS (Security Rules)
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Drop old policies to clean up
DROP POLICY IF EXISTS "Users can view own customers" ON customers;
DROP POLICY IF EXISTS "Users can insert own customers" ON customers;
DROP POLICY IF EXISTS "Users can update own customers" ON customers;
DROP POLICY IF EXISTS "Users can delete own customers" ON customers;
DROP POLICY IF EXISTS "Strict: Users can view own customers" ON customers;
DROP POLICY IF EXISTS "Strict: Users can insert own customers" ON customers;
DROP POLICY IF EXISTS "Strict: Users can update own customers" ON customers;
DROP POLICY IF EXISTS "Strict: Users can delete own customers" ON customers;


-- 3. Create Strict Policies
CREATE POLICY "Strict: Users can view own customers" ON customers 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Strict: Users can insert own customers" ON customers 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Strict: Users can update own customers" ON customers 
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Strict: Users can delete own customers" ON customers 
    FOR DELETE USING (auth.uid() = user_id);

COMMIT;
