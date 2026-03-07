-- =============================================================
-- Cash Register Sessions table
-- Run this in Supabase SQL Editor
-- =============================================================

CREATE TABLE cash_register_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at TIMESTAMPTZ,
    opened_by TEXT NOT NULL,
    opening_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
    closing_cash NUMERIC(10,2),
    closing_pix NUMERIC(10,2),
    closing_debit NUMERIC(10,2),
    closing_credit NUMERIC(10,2),
    expected_cash NUMERIC(10,2),
    expected_pix NUMERIC(10,2),
    expected_debit NUMERIC(10,2),
    expected_credit NUMERIC(10,2),
    total_orders INTEGER DEFAULT 0,
    total_orders_pdv INTEGER DEFAULT 0,
    total_orders_online INTEGER DEFAULT 0,
    total_items_sold INTEGER DEFAULT 0,
    total_sales NUMERIC(10,2) DEFAULT 0,
    status TEXT CHECK (status IN ('open', 'closed')) DEFAULT 'open',
    notes TEXT
);

-- RLS
ALTER TABLE cash_register_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view cash register sessions"
    ON cash_register_sessions FOR SELECT USING (true);
CREATE POLICY "Public can insert cash register sessions"
    ON cash_register_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update cash register sessions"
    ON cash_register_sessions FOR UPDATE USING (true) WITH CHECK (true);
