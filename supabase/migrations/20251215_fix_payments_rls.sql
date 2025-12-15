-- Enable RLS on transaction_payments
ALTER TABLE transaction_payments ENABLE ROW LEVEL SECURITY;

-- Create Policies using the parent transaction relationship

-- VIEW: Allow view if user has access to the parent transaction
CREATE POLICY "Users can view payments for their organization transactions"
ON transaction_payments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM transactions
        WHERE transactions.id = transaction_payments.transaction_id
        AND transactions.organization_id = (
            -- This relies on the app setting the claim or context, 
            -- OR we check if the transaction is visible to the user.
            -- A simpler robust check for this project which seems to use RLS on transactions:
            -- If I can see the transaction, I can see the payments.
            -- However, 'transactions' RLS usually checks auth.uid() or organization via a helper.
            -- Let's just join on transactions and check auth.uid() == transactions.user_id 
            -- OR transactions.organization_id matches.
            -- For simplicity and security in this specific app context:
            transactions.user_id = auth.uid() 
            OR 
            EXISTS (
                SELECT 1 FROM organization_members 
                WHERE organization_id = transactions.organization_id 
                AND user_id = auth.uid()
            )
        )
    )
);

-- INSERT: Allow insert if user can edit the parent transaction
CREATE POLICY "Users can insert payments for their organization transactions"
ON transaction_payments FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM transactions
        WHERE transactions.id = transaction_payments.transaction_id
        AND (
            transactions.user_id = auth.uid() 
            OR 
            EXISTS (
                SELECT 1 FROM organization_members 
                WHERE organization_id = transactions.organization_id 
                AND user_id = auth.uid()
            )
        )
    )
);

-- UPDATE: Allow update if user can edit the parent transaction
CREATE POLICY "Users can update payments for their organization transactions"
ON transaction_payments FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM transactions
        WHERE transactions.id = transaction_payments.transaction_id
        AND (
            transactions.user_id = auth.uid() 
            OR 
            EXISTS (
                SELECT 1 FROM organization_members 
                WHERE organization_id = transactions.organization_id 
                AND user_id = auth.uid()
            )
        )
    )
);

-- DELETE: Allow delete if user can edit the parent transaction
CREATE POLICY "Users can delete payments for their organization transactions"
ON transaction_payments FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM transactions
        WHERE transactions.id = transaction_payments.transaction_id
        AND (
           transactions.user_id = auth.uid() 
            OR 
            EXISTS (
                SELECT 1 FROM organization_members 
                WHERE organization_id = transactions.organization_id 
                AND user_id = auth.uid()
            )
        )
    )
);
