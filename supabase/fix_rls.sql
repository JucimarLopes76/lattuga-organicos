-- =============================================================
-- FIX: Permissive RLS policies for anon key access
-- The admin panel uses the anon key (not Supabase Auth),
-- so we need public policies for full CRUD.
-- Run this in Supabase SQL Editor.
-- =============================================================

-- ========================
-- PRODUCTS
-- ========================
-- Allow reading ALL products (admin needs to see inactive ones too)
CREATE POLICY "Public can view all products"
  ON products FOR SELECT
  USING (true);

-- Allow creating products
CREATE POLICY "Public can insert products"
  ON products FOR INSERT
  WITH CHECK (true);

-- Allow updating products (toggle active, catalog, edit)
CREATE POLICY "Public can update products"
  ON products FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow deleting products
CREATE POLICY "Public can delete products"
  ON products FOR DELETE
  USING (true);

-- ========================
-- ORDERS
-- ========================
-- Allow reading all orders
CREATE POLICY "Public can view all orders"
  ON orders FOR SELECT
  USING (true);

-- Allow updating orders (status changes)
CREATE POLICY "Public can update orders"
  ON orders FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ========================
-- CUSTOMERS
-- ========================
CREATE POLICY "Public can view all customers"
  ON customers FOR SELECT
  USING (true);

CREATE POLICY "Public can insert customers"
  ON customers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update customers"
  ON customers FOR UPDATE
  USING (true)
  WITH CHECK (true);
