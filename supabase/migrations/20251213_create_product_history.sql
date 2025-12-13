-- Create product_history table
CREATE TABLE IF NOT EXISTS product_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by UUID DEFAULT auth.uid()
);

-- Enable RLS
ALTER TABLE product_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own product history"
  ON product_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_history.product_id
      AND products.user_id = auth.uid()
    )
  );

-- Create Function to Log Changes
CREATE OR REPLACE FUNCTION log_product_changes()
RETURNS TRIGGER AS $$
DECLARE
    old_row jsonb := to_jsonb(OLD);
    new_row jsonb := to_jsonb(NEW);
    field text;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        FOR field IN SELECT * FROM jsonb_object_keys(new_row)
        LOOP
            IF new_row->>field IS DISTINCT FROM old_row->>field AND field NOT IN ('updated_at', 'created_at') THEN
                INSERT INTO product_history (product_id, field_changed, old_value, new_value, changed_by)
                VALUES (
                    NEW.id, 
                    field, 
                    old_row->>field, 
                    new_row->>field,
                    auth.uid()
                );
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Trigger
DROP TRIGGER IF EXISTS on_product_update ON products;
CREATE TRIGGER on_product_update
AFTER UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION log_product_changes();
