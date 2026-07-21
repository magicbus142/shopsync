-- Create a whitelist table for invite-only access
CREATE TABLE IF NOT EXISTS whitelist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE whitelist ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read the whitelist (to check if they are invited)
-- In production, you might want to wrap this in an Edge Function to avoid exposing the full list,
-- but for this MVP, a simple SELECT policy is sufficient/fastest.
CREATE POLICY "Anyone can check whitelist" ON whitelist
  FOR SELECT USING (true); -- ideally: email = currently_trying_email (but we don't have auth yet)

-- Insert some initial allowed users (Replace with actual emails)
INSERT INTO whitelist (email) VALUES 
('test@shopsync.ai'),
('swamy@magicbus142.com'),
('admin@magicbus.com')
ON CONFLICT (email) DO NOTHING;
