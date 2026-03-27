CREATE TABLE delivery_zones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    city TEXT NOT NULL,
    neighborhood TEXT NOT NULL,
    fee NUMERIC(10,2) NOT NULL DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active delivery zones"
  ON delivery_zones FOR SELECT
  USING (active = true);

CREATE POLICY "Admin full access to delivery zones"
  ON delivery_zones FOR ALL
  USING (auth.role() = 'authenticated');
