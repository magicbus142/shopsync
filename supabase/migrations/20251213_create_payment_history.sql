-- Create transaction_payments table
CREATE TABLE IF NOT EXISTS transaction_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    payment_method TEXT DEFAULT 'Cash',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add amount_paid to transactions if it doesn't exist (safety check)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'amount_paid') THEN
        ALTER TABLE transactions ADD COLUMN amount_paid NUMERIC DEFAULT 0;
    END IF;
END $$;

-- Backfill: Create payment records for existing 'Paid' transactions
-- Only if they don't have payments yet to prevent double backfill
INSERT INTO transaction_payments (transaction_id, amount, date, payment_method)
SELECT id, amount, date, COALESCE(payment_method, 'Cash')
FROM transactions
WHERE payment_status = 'Paid' 
AND NOT EXISTS (SELECT 1 FROM transaction_payments WHERE transaction_id = transactions.id);

-- Backfill: Update amount_paid for existing transactions based on the new payments
UPDATE transactions
SET amount_paid = (
    SELECT COALESCE(SUM(amount), 0)
    FROM transaction_payments
    WHERE transaction_id = transactions.id
);

-- Trigger Function to auto-update transactions
CREATE OR REPLACE FUNCTION update_transaction_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    target_transaction_id UUID;
    total_paid NUMERIC;
    total_amount NUMERIC;
BEGIN
    -- Determine transaction_id based on operation
    IF (TG_OP = 'DELETE') THEN
        target_transaction_id := OLD.transaction_id;
    ELSE
        target_transaction_id := NEW.transaction_id;
    END IF;

    -- Calculate total paid
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM transaction_payments
    WHERE transaction_id = target_transaction_id;

    -- Get total transaction amount
    SELECT amount INTO total_amount
    FROM transactions
    WHERE id = target_transaction_id;

    -- Update transactions table
    UPDATE transactions
    SET 
        amount_paid = total_paid,
        payment_status = CASE 
            WHEN total_paid >= total_amount THEN 'Paid'
            WHEN total_paid > 0 THEN 'Partial'
            ELSE 'Pending'
        END
    WHERE id = target_transaction_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create Trigger
DROP TRIGGER IF EXISTS update_payment_status_trigger ON transaction_payments;

CREATE TRIGGER update_payment_status_trigger
AFTER INSERT OR UPDATE OR DELETE ON transaction_payments
FOR EACH ROW
EXECUTE FUNCTION update_transaction_payment_status();
