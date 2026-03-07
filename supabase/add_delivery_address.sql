-- Add delivery_address column to orders table
-- Run this in Supabase SQL Editor
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;
