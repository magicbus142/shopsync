-- Drop Customers Table and References

BEGIN;

-- 1. Drop Foreign Key from transactions first (if it exists)
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_customer_id_fkey;

-- 2. Drop the column from transactions
ALTER TABLE transactions DROP COLUMN IF EXISTS customer_id;

-- 3. Drop the Customers table
DROP TABLE IF EXISTS customers;

COMMIT;
