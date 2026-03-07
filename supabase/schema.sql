-- =============================================================
-- Lattuga Orgânicos — Database Schema
-- =============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------
-- PRODUCTS
-- -----------------------------------------------------------
CREATE TABLE products (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  description TEXT,
  price       NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  image_url   TEXT,
  category    TEXT NOT NULL DEFAULT 'geral',
  stock_qty   INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  show_in_catalog BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------
-- CUSTOMERS
-- -----------------------------------------------------------
CREATE TABLE customers (
  id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name     TEXT NOT NULL,
  phone    TEXT,
  address  TEXT,
  email    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------
-- ORDERS
-- -----------------------------------------------------------
CREATE TABLE orders (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id      UUID REFERENCES customers(id) ON DELETE SET NULL,
  type             TEXT NOT NULL CHECK (type IN ('pdv', 'online')),
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  delivery_method  TEXT CHECK (delivery_method IN ('pickup', 'delivery')),
  payment_method   TEXT,
  total_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount  NUMERIC(10,2) NOT NULL DEFAULT 0,
  surcharge_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------
-- ORDER ITEMS
-- -----------------------------------------------------------
CREATE TABLE order_items (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0)
);

-- -----------------------------------------------------------
-- INDEXES
-- -----------------------------------------------------------
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active_catalog ON products(is_active, show_in_catalog);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_type ON orders(type);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- -----------------------------------------------------------
-- ROW LEVEL SECURITY (basic — adjust per your auth needs)
-- -----------------------------------------------------------
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Public read for catalog products
CREATE POLICY "Public can view active catalog products"
  ON products FOR SELECT
  USING (is_active = true AND show_in_catalog = true);

-- Authenticated full access (admin)
CREATE POLICY "Admin full access to products"
  ON products FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin full access to customers"
  ON customers FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin full access to orders"
  ON orders FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Public can insert orders"
  ON orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin full access to order_items"
  ON order_items FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Public can insert order_items"
  ON order_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can view own order items"
  ON order_items FOR SELECT
  USING (true);

-- -----------------------------------------------------------
-- REALTIME (enable for orders)
-- -----------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- -----------------------------------------------------------
-- STORAGE BUCKET for product images
-- -----------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------
-- SEED DATA
-- -----------------------------------------------------------
INSERT INTO products (name, description, price, category, stock_qty, is_active, show_in_catalog, image_url) VALUES
  ('Alface Crespa Orgânica',    'Alface crespa fresca, cultivada sem agrotóxicos.',        4.50,  'Verduras',    50, true, true, 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=400&h=400&fit=crop'),
  ('Tomate Italiano Orgânico',  'Tomate italiano maduro, perfeito para molhos.',            8.90,  'Legumes',     40, true, true, 'https://images.unsplash.com/photo-1546470427-0d4db154ceb8?w=400&h=400&fit=crop'),
  ('Cenoura Orgânica (maço)',   'Maço de cenouras frescas e crocantes.',                    6.50,  'Legumes',     35, true, true, 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&h=400&fit=crop'),
  ('Banana Prata Orgânica (kg)','Banana prata madura, rica em potássio.',                   7.90,  'Frutas',      60, true, true, 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=400&fit=crop'),
  ('Maçã Fuji Orgânica (kg)',   'Maçã fuji doce e suculenta.',                              12.90, 'Frutas',      30, true, true, 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=400&fit=crop'),
  ('Ovos Caipira (dúzia)',      'Ovos de galinha caipira, criação livre.',                   15.90, 'Proteínas',   25, true, true, 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&h=400&fit=crop'),
  ('Mel Puro Orgânico (500g)',  'Mel silvestre puro, sem aditivos.',                         28.00, 'Mercearia',   20, true, true, 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=400&fit=crop'),
  ('Granola Artesanal (300g)',  'Granola crocante com castanhas e frutas secas.',            18.50, 'Mercearia',   30, true, true, 'https://images.unsplash.com/photo-1517093728432-a0440f8d45af?w=400&h=400&fit=crop'),
  ('Suco Verde Detox (500ml)',  'Suco prensado a frio com couve, maçã e gengibre.',         14.90, 'Bebidas',     15, true, true, 'https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=400&h=400&fit=crop'),
  ('Pão Integral Artesanal',   'Pão integral feito com farinha orgânica e fermentação natural.', 12.00, 'Padaria', 10, true, true, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop'),
  ('Queijo Minas Frescal',     'Queijo minas artesanal, fresco e leve.',                    22.00, 'Laticínios',  12, true, true, 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&h=400&fit=crop'),
  ('Manteiga Orgânica (200g)', 'Manteiga de leite orgânico, sem conservantes.',              16.50, 'Laticínios',  18, true, true, 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&h=400&fit=crop'),
  ('Café Orgânico Torrado (250g)', 'Café especial torrado artesanalmente.',                  24.90, 'Bebidas',     22, true, true, 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=400&fit=crop'),
  ('Abobrinha Orgânica (kg)',   'Abobrinha verde fresca, ideal para refogados.',             9.50,  'Legumes',     25, true, true, 'https://images.unsplash.com/photo-1563252722-6434563a985d?w=400&h=400&fit=crop'),
  ('Espinafre Orgânico (maço)', 'Espinafre fresco, rico em ferro.',                          5.90,  'Verduras',    20, true, true, 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=400&fit=crop');
