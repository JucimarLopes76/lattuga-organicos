-- =============================================================
-- FINANCEIRO (Expenses)
-- =============================================================

CREATE TABLE IF NOT EXISTS expenses (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description    TEXT NOT NULL,
  amount         NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  category       TEXT NOT NULL,
  supplier       TEXT,
  due_date       DATE NOT NULL,
  payment_date   DATE,
  payment_method TEXT,
  proof_url      TEXT,
  status         TEXT NOT NULL CHECK (status IN ('paid', 'pending')) DEFAULT 'pending',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_due_date ON expenses(due_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);

-- RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to expenses"
  ON expenses FOR ALL
  USING (auth.role() = 'authenticated');

-- Optional: View for unified transactions (if needed later)
-- CREATE OR REPLACE VIEW financial_movements AS ...
