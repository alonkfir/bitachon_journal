-- ============================================================
-- The Security Journal — Initial Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- TRADES TABLE (Swing Journal)
CREATE TABLE trades (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol          TEXT          NOT NULL,
  strategy_type   TEXT          NOT NULL CHECK (strategy_type IN ('fundamental', 'technical', 'mixed')),
  entry_date      DATE          NOT NULL,
  entry_price     NUMERIC(14,4) NOT NULL,
  exit_price      NUMERIC(14,4),
  stop_loss       NUMERIC(14,4) NOT NULL,
  target_price    NUMERIC(14,4),
  quantity        NUMERIC(14,4) NOT NULL,
  fees            NUMERIC(10,4) NOT NULL DEFAULT 0,
  status          TEXT          NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  notes           TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- PORTFOLIO TABLE (Long-term Holdings)
CREATE TABLE portfolio (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker          TEXT          NOT NULL,
  amount          NUMERIC(16,2) NOT NULL,
  sector          TEXT          NOT NULL,
  purchase_date   DATE,
  avg_cost        NUMERIC(14,4),
  shares          NUMERIC(14,4),
  notes           TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE(user_id, ticker)
);

-- ROW LEVEL SECURITY — trades
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trades: users access own rows"
  ON trades FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ROW LEVEL SECURITY — portfolio
ALTER TABLE portfolio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portfolio: users access own rows"
  ON portfolio FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trades_updated_at
  BEFORE UPDATE ON trades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER portfolio_updated_at
  BEFORE UPDATE ON portfolio
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
