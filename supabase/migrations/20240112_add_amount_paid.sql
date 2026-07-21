-- Add amount_paid column to transactions for Partial Payments

BEGIN;

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0;

-- Optional: Backfill existing Paid transactions
UPDATE transactions 
SET amount_paid = amount 
WHERE payment_status = 'Paid' AND amount_paid = 0;

COMMIT;
