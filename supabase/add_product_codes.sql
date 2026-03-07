-- Add internal_code and supplier_code columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS internal_code TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_code TEXT;

-- Populate internal_code for existing products sequentially by created_at
WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
    FROM products
    WHERE internal_code IS NULL
)
UPDATE products
SET internal_code = LPAD(numbered.rn::TEXT, 4, '0')
FROM numbered
WHERE products.id = numbered.id;
