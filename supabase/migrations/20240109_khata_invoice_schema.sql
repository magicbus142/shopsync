-- Phase 2: Khata (Ledger) & Invoicing Schema

BEGIN;

-- 1. Create CUSTOMERS Table
CREATE TABLE IF NOT EXISTS customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own customers" ON customers 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own customers" ON customers 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own customers" ON customers 
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own customers" ON customers 
    FOR DELETE USING (auth.uid() = user_id);


-- 2. Update TRANSACTIONS Table for Invoicing
-- We use DO blocks to safely add columns if they don't exist

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'customer_id') THEN
        ALTER TABLE transactions ADD COLUMN customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'payment_status') THEN
        ALTER TABLE transactions ADD COLUMN payment_status TEXT DEFAULT 'paid'; -- 'paid', 'pending', 'partial'
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'invoice_items') THEN
        ALTER TABLE transactions ADD COLUMN invoice_items JSONB DEFAULT '[]'::jsonb; 
        -- Structure: [{ "name": "Item A", "qty": 1, "price": 100, "productId": "..." }]
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'invoice_number') THEN
        ALTER TABLE transactions ADD COLUMN invoice_number TEXT;
    END IF;
END $$;

COMMIT;
