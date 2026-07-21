-- Migration: Generic Audit Logs
-- Date: 2025-12-14

BEGIN;

-- 1. Create Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    changed_by UUID DEFAULT auth.uid(),
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    organization_id UUID REFERENCES organizations(id) -- Optional linking
);

-- 2. Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit logs for their org" ON audit_logs
    FOR SELECT USING (
        -- Simple check: if the user fits the org of the record (needs complex join usually, or simpler direct check)
        -- For now, we allows access if the log entry matches the user's current org context
        -- Ideally, we'd check organization_members.
        EXISTS (
            SELECT 1 FROM organization_members 
            WHERE organization_id = audit_logs.organization_id 
            AND user_id = auth.uid()
        )
        OR changed_by = auth.uid()
    );

-- 3. Generic Trigger Function
CREATE OR REPLACE FUNCTION log_record_changes()
RETURNS TRIGGER AS $$
DECLARE
    old_row jsonb := null;
    new_row jsonb := null;
    rec_id UUID;
    org_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        old_row := to_jsonb(OLD);
        rec_id := OLD.id;
        -- Try to extract organization_id if exists
        IF (old_row ? 'organization_id') THEN
            org_id := (old_row->>'organization_id')::UUID;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        old_row := to_jsonb(OLD);
        new_row := to_jsonb(NEW);
        rec_id := NEW.id;
        IF (new_row ? 'organization_id') THEN
            org_id := (new_row->>'organization_id')::UUID;
        END IF;
    ELSIF TG_OP = 'INSERT' THEN
        new_row := to_jsonb(NEW);
        rec_id := NEW.id;
        IF (new_row ? 'organization_id') THEN
            org_id := (new_row->>'organization_id')::UUID;
        END IF;
    END IF;

    -- Insert Log
    INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, changed_by, organization_id)
    VALUES (TG_TABLE_NAME, rec_id, TG_OP, old_row, new_row, auth.uid(), org_id);

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Apply Triggers to Key Tables
-- Products
DROP TRIGGER IF EXISTS audit_products_trigger ON products;
CREATE TRIGGER audit_products_trigger
AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW EXECUTE FUNCTION log_record_changes();

-- Workers
DROP TRIGGER IF EXISTS audit_workers_trigger ON workers;
CREATE TRIGGER audit_workers_trigger
AFTER INSERT OR UPDATE OR DELETE ON workers
FOR EACH ROW EXECUTE FUNCTION log_record_changes();

-- Transactions
DROP TRIGGER IF EXISTS audit_transactions_trigger ON transactions;
CREATE TRIGGER audit_transactions_trigger
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION log_record_changes();

COMMIT;
