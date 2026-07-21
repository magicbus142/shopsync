-- Secure Data Isolation Migration (V2 - Robust)
-- Use this script to fix the "Policy already exists" error.
-- It explicitly drops all policies before re-creating them.

BEGIN;

---------------------------------------------------------
-- 1. PRODUCTS
---------------------------------------------------------
-- Ensure column exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'user_id') THEN
        ALTER TABLE products ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
    END IF;
END $$;

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Drop old policies to prevent errors
DROP POLICY IF EXISTS "Users can view their own products" ON products;
DROP POLICY IF EXISTS "Users can insert their own products" ON products;
DROP POLICY IF EXISTS "Users can update their own products" ON products;
DROP POLICY IF EXISTS "Users can delete their own products" ON products;

-- Create new policies
CREATE POLICY "Users can view their own products" ON products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own products" ON products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own products" ON products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own products" ON products FOR DELETE USING (auth.uid() = user_id);


---------------------------------------------------------
-- 2. WORKERS
---------------------------------------------------------
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workers' AND column_name = 'user_id') THEN
        ALTER TABLE workers ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
    END IF;
END $$;

ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own workers" ON workers;
DROP POLICY IF EXISTS "Users can insert their own workers" ON workers;
DROP POLICY IF EXISTS "Users can update their own workers" ON workers;
DROP POLICY IF EXISTS "Users can delete their own workers" ON workers;

CREATE POLICY "Users can view their own workers" ON workers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own workers" ON workers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own workers" ON workers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own workers" ON workers FOR DELETE USING (auth.uid() = user_id);


---------------------------------------------------------
-- 3. TRANSACTIONS
---------------------------------------------------------
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'user_id') THEN
        ALTER TABLE transactions ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
    END IF;
END $$;

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON transactions;

CREATE POLICY "Users can view their own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own transactions" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own transactions" ON transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own transactions" ON transactions FOR DELETE USING (auth.uid() = user_id);

COMMIT;
