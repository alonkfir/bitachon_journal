export type StrategyType = "fundamental" | "technical" | "mixed"
export type TradeStatus = "active" | "closed"
export type TradeSide = "long" | "short"

export interface PartialExit {
  quantity: number
  price: number
  date: string
  fees: number
}

export interface Trade {
  id: string
  user_id: string
  symbol: string
  strategy_type: StrategyType
  entry_date: string
  entry_price: number
  exit_price: number | null
  stop_loss: number
  target_price: number | null
  quantity: number
  fees: number
  status: TradeStatus
  side: TradeSide
  notes: string | null
  partial_exits: PartialExit[]
  logo_url: string | null
  created_at: string
  updated_at: string
}

export interface PortfolioHolding {
  id: string
  user_id: string
  ticker: string
  amount: number
  sector: string
  purchase_date: string | null
  avg_cost: number | null
  shares: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface TradeMetrics {
  winRate: number | null
  profitFactor: number | null
  totalRisk: number
  totalExposure: number
  totalRealizedPnL: number
  closedTradeCount: number
}

// partial_exits defaults to [] in the DB — omit from insert type
export interface TradeInsert
  extends Omit<Trade, "id" | "user_id" | "created_at" | "updated_at" | "partial_exits"> {}

export interface TradeUpdate
  extends Partial<Omit<Trade, "id" | "user_id" | "created_at" | "updated_at">> {}

export interface PortfolioInsert
  extends Omit<PortfolioHolding, "id" | "user_id" | "created_at" | "updated_at"> {}
export interface PortfolioUpdate extends Partial<PortfolioInsert> {}

export interface TickerAllocation {
  ticker: string
  amount: number
  percentage: number
}
