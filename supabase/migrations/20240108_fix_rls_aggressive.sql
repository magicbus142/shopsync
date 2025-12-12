-- Aggressive RLS Fix (V3)
-- This script dynamically drops ALL policies on the target tables to ensure no 'Public Access' policies remain.
-- Then it re-applies strict user isolation.

BEGIN;

-- Function to drop all policies for a given table
CREATE OR REPLACE FUNCTION drop_all_policies(table_name_text text) RETURNS void AS $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = table_name_text LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, table_name_text);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 1. PRODUCTS: Wipe and Re-secure
SELECT drop_all_policies('products');
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Strict: Users can only view own products" ON products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Strict: Users can only insert own products" ON products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Strict: Users can only update own products" ON products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Strict: Users can only delete own products" ON products FOR DELETE USING (auth.uid() = user_id);


-- 2. WORKERS: Wipe and Re-secure
SELECT drop_all_policies('workers');
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Strict: Users can only view own workers" ON workers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Strict: Users can only insert own workers" ON workers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Strict: Users can only update own workers" ON workers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Strict: Users can only delete own workers" ON workers FOR DELETE USING (auth.uid() = user_id);


-- 3. TRANSACTIONS: Wipe and Re-secure
SELECT drop_all_policies('transactions');
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Strict: Users can only view own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Strict: Users can only insert own transactions" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Strict: Users can only update own transactions" ON transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Strict: Users can only delete own transactions" ON transactions FOR DELETE USING (auth.uid() = user_id);

-- Cleanup helper function
DROP FUNCTION drop_all_policies(text);

COMMIT;
