-- Fix Delete functionality for Transactions & Customers

BEGIN;

-- 1. Relax the Foreign Key Constraint
-- Currently, deleting a customer fails if they have transactions.
-- usage: ON DELETE SET NULL -> Updates transaction.customer_id to NULL, keeping the transaction history.
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_customer_id_fkey;

ALTER TABLE transactions
ADD CONSTRAINT transactions_customer_id_fkey
FOREIGN KEY (customer_id)
REFERENCES customers(id)
ON DELETE SET NULL;


-- 2. Ensure DELETE Policies exist and are correct

-- Customers
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON customers;
DROP POLICY IF EXISTS "Strict: Users can delete own customers" ON customers;

CREATE POLICY "Strict: Users can delete own customers" ON customers 
    FOR DELETE USING (auth.uid() = user_id);

-- Transactions
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;

CREATE POLICY "Users can delete own transactions" ON transactions 
    FOR DELETE USING (auth.uid() = user_id);

COMMIT;
