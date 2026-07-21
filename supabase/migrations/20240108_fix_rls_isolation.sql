-- Secure Data Isolation Migration
-- 1. Add user_id column to tables if missing
-- 2. Enable RLS
-- 3. Add strict policies

-- PRODUCTS
ALTER TABLE products ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own products" ON products;
CREATE POLICY "Users can view their own products" ON products FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own products" ON products;
CREATE POLICY "Users can insert their own products" ON products FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own products" ON products;
CREATE POLICY "Users can update their own products" ON products FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own products" ON products;
CREATE POLICY "Users can delete their own products" ON products FOR DELETE USING (auth.uid() = user_id);


-- WORKERS
ALTER TABLE workers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own workers" ON workers;
CREATE POLICY "Users can view their own workers" ON workers FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own workers" ON workers;
CREATE POLICY "Users can insert their own workers" ON workers FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own workers" ON workers;
CREATE POLICY "Users can update their own workers" ON workers FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own workers" ON workers;
CREATE POLICY "Users can delete their own workers" ON workers FOR DELETE USING (auth.uid() = user_id);


-- TRANSACTIONS
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
CREATE POLICY "Users can view their own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own transactions" ON transactions;
CREATE POLICY "Users can insert their own transactions" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;
CREATE POLICY "Users can update their own transactions" ON transactions FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own transactions" ON transactions;
CREATE POLICY "Users can delete their own transactions" ON transactions FOR DELETE USING (auth.uid() = user_id);

-- Backfill undefined user_id to the current user running this? 
-- No, we can't easily guess. 
-- BUT, to fix the user's immediate issue where they see "first shop details",
-- we might want to assign existing orphaned data to the 'gangabhavani@gmail.com' user if possible, 
-- or just leave it hidden (since they can't claim it).
-- Let's rely on new data being correct.

-- Force update any null user_ids to the ID of the user executing this? No, that's dangerous.
-- Logic: If user_id is NULL, it's effectively "public" or "lost" under strict RLS.
-- We'll leave it as is. New items will be correct.
