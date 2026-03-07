-- Enable replication for the orders table
alter publication supabase_realtime add table orders;

-- Ensure RLS allows access (should already be covered by schema.sql/fix_rls.sql, but good to check)
-- This assumes public select access or authenticated select access is allowed.
