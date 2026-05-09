-- ============================================================
-- Migration: 002_portfolio_purchases.sql
-- Individual purchase transactions for the Investments section.
-- Run this in Supabase Dashboard → SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS portfolio_purchases (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker        TEXT        NOT NULL,
  price         NUMERIC(14,4) NOT NULL,
  quantity      NUMERIC(14,4) NOT NULL,
  purchase_date DATE        NOT NULL DEFAULT CURRENT_DATE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE portfolio_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portfolio_purchases: users access own rows"
  ON portfolio_purchases
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
