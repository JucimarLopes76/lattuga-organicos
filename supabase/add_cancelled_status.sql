-- =============================================================
-- Add 'cancelled' to orders.status CHECK constraint
-- =============================================================
-- Drop the existing check constraint and recreate with 'cancelled'
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled'));
