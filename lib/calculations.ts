import { Trade, PartialExit, TradeMetrics, TickerAllocation, PortfolioHolding } from "./types"

// ─── Core per-trade helpers ────────────────────────────────────────────────

/** R = (entry - stop_loss) × quantity — maximum dollar loss if stop is hit */
export function riskPerTrade(entryPrice: number, stopLoss: number, quantity: number): number {
  return (entryPrice - stopLoss) * quantity
}

/** Realized P&L for a single exit leg */
export function realizedPnL(
  entryPrice: number,
  exitPrice: number,
  quantity: number,
  fees: number
): number {
  return (exitPrice - entryPrice) * quantity - fees
}

/** RRR = (target - entry) / (entry - stop_loss) — pre-trade planning metric */
export function riskRewardRatio(
  entryPrice: number,
  targetPrice: number,
  stopLoss: number
): number {
  const denominator = entryPrice - stopLoss
  if (denominator === 0) return 0
  return (targetPrice - entryPrice) / denominator
}

/**
 * Total realized P&L for a trade.
 * Supports both partial exits (new model) and legacy single exit_price.
 */
export function tradePnL(trade: Trade): number | null {
  if (trade.partial_exits && trade.partial_exits.length > 0) {
    return trade.partial_exits.reduce(
      (sum, e: PartialExit) => sum + (e.price - trade.entry_price) * e.quantity - e.fees,
      0
    )
  }
  if (trade.status === "closed" && trade.exit_price !== null) {
    return realizedPnL(trade.entry_price, trade.exit_price, trade.quantity, trade.fees)
  }
  return null
}

/** Shares still held (not yet sold via partial exits) */
export function remainingQty(trade: Trade): number {
  if (trade.partial_exits && trade.partial_exits.length > 0) {
    const sold = trade.partial_exits.reduce((s, e) => s + e.quantity, 0)
    return Math.max(0, trade.quantity - sold)
  }
  return trade.status === "closed" ? 0 : trade.quantity
}

/** Whether a trade is fully exited (remaining qty = 0 or legacy closed) */
export function isFullyClosed(trade: Trade): boolean {
  return remainingQty(trade) === 0
}

/**
 * R-multiple: realized P&L expressed as multiples of the initial risk.
 * e.g. risk=$500, pnl=$1000 → R=2.0
 */
export function rMultiple(trade: Trade): number | null {
  const pnl = tradePnL(trade)
  if (pnl === null) return null
  const risk = riskPerTrade(trade.entry_price, trade.stop_loss, trade.quantity)
  if (risk === 0) return null
  return pnl / risk
}

// ─── Portfolio-level metrics ───────────────────────────────────────────────

/** Win Rate % — only fully-closed trades */
export function winRate(trades: Trade[]): number | null {
  const closed = trades.filter(isFullyClosed)
  if (closed.length === 0) return null
  const winners = closed.filter((t) => (tradePnL(t) ?? 0) > 0)
  return (winners.length / closed.length) * 100
}

/** Profit Factor = Σ(gains) / |Σ(losses)| — only fully-closed trades */
export function profitFactor(trades: Trade[]): number | null {
  const closed = trades.filter(isFullyClosed)
  if (closed.length === 0) return null

  let gains = 0
  let losses = 0
  for (const t of closed) {
    const pnl = tradePnL(t) ?? 0
    if (pnl > 0) gains += pnl
    else losses += Math.abs(pnl)
  }

  if (losses === 0) return gains > 0 ? Infinity : null
  return gains / losses
}

/** Total exposure = Σ(entry × remaining qty) for active positions */
export function totalExposure(trades: Trade[]): number {
  return trades
    .filter((t) => remainingQty(t) > 0)
    .reduce((sum, t) => sum + t.entry_price * remainingQty(t), 0)
}

/** Total risk = Σ(R) for active positions */
export function totalRisk(trades: Trade[]): number {
  return trades
    .filter((t) => remainingQty(t) > 0)
    .reduce((sum, t) => sum + riskPerTrade(t.entry_price, t.stop_loss, remainingQty(t)), 0)
}

/** Aggregate all metrics for the dashboard */
export function computeMetrics(trades: Trade[]): TradeMetrics {
  const closedTrades = trades.filter(isFullyClosed)
  const totalRealizedPnL = closedTrades.reduce((sum, t) => sum + (tradePnL(t) ?? 0), 0)

  return {
    winRate: winRate(trades),
    profitFactor: profitFactor(trades),
    totalRisk: totalRisk(trades),
    totalExposure: totalExposure(trades),
    totalRealizedPnL,
    closedTradeCount: closedTrades.length,
  }
}

// ─── Portfolio allocation ──────────────────────────────────────────────────

/** Ticker allocation breakdown for the pie chart */
export function tickerAllocations(holdings: PortfolioHolding[]): TickerAllocation[] {
  const total = holdings.reduce((sum, h) => sum + h.amount, 0)
  if (total === 0) return []

  const byTicker: Record<string, number> = {}
  for (const h of holdings) {
    byTicker[h.ticker] = (byTicker[h.ticker] ?? 0) + h.amount
  }

  return Object.entries(byTicker)
    .map(([ticker, amount]) => ({
      ticker,
      amount,
      percentage: (amount / total) * 100,
    }))
    .sort((a, b) => b.amount - a.amount)
}

// ─── Formatters ────────────────────────────────────────────────────────────

export function formatUSD(value: number): string {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

/** Format an R-multiple: "+2.30R" or "-1.50R" */
export function formatR(r: number): string {
  const sign = r >= 0 ? "+" : ""
  return `${sign}${r.toFixed(2)}R`
}
