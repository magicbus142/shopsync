-- Enable RLS
ALTER TABLE transaction_payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can manage their own transaction payments" ON transaction_payments;

-- Create comprehensive policy
CREATE POLICY "Users can manage their own transaction payments"
ON transaction_payments
FOR ALL
USING (
  exists (
    select 1 from transactions
    where transactions.id = transaction_payments.transaction_id
    and transactions.user_id = auth.uid()
  )
);
