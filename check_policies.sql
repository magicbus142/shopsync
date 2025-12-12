-- CHECK ACTIVE POLICIES
-- Run this to see what policies are actually protecting your tables.

SELECT schemaname, tablename, policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('products', 'workers', 'transactions')
ORDER BY tablename, cmd;
