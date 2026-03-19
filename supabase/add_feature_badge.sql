-- =============================================================
-- ADD FEATURE BADGE TO PRODUCTS
-- Execute this script in your Supabase SQL Editor
-- =============================================================

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS feature_badge TEXT DEFAULT 'none' 
CHECK (feature_badge IN ('none', 'highlight', 'offer'));

-- Optional: Create an index since we will be querying for offers/highlights
CREATE INDEX IF NOT EXISTS idx_products_feature_badge ON products(feature_badge) WHERE feature_badge != 'none';
