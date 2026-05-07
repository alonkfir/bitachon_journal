"use client"

import { useMemo, useState } from "react"
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts"
import { Trade } from "@/lib/types"
import { formatUSD } from "@/lib/calculations"
import { cn } from "@/lib/utils"

interface EquityCurveProps {
  trades: Trade[]
  initialBalance: number
}

type Range = "1M" | "3M" | "1Y" | "ALL"

interface CurvePoint {
  date: string
  balance: number
  pnl: number
}

// ── data helpers ──────────────────────────────────────────────────────────────

function buildRawEvents(trades: Trade[]): { date: string; pnl: number }[] {
  const events: { date: string; pnl: number }[] = []

  for (const trade of trades) {
    // Partial exits (each has its own date)
    if (trade.partial_exits?.length > 0) {
      for (const exit of trade.partial_exits) {
        const pnl = (exit.price - trade.entry_price) * exit.quantity - exit.fees
        events.push({ date: exit.date, pnl })
      }
    }
    // Full close via exit_price (no partial exits)
    if (
      trade.status === "closed" &&
      trade.exit_price !== null &&
      (!trade.partial_exits || trade.partial_exits.length === 0)
    ) {
      const pnl = (trade.exit_price - trade.entry_price) * trade.quantity - trade.fees
      events.push({ date: trade.updated_at.slice(0, 10), pnl })
    }
  }

  return events.sort((a, b) => a.date.localeCompare(b.date))
}

function buildFullCurve(events: { date: string; pnl: number }[], initialBalance: number): CurvePoint[] {
  // Group same-day events together
  const byDate = new Map<string, number>()
  for (const e of events) {
    byDate.set(e.date, (byDate.get(e.date) ?? 0) + e.pnl)
  }

  const sorted = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b))

  let balance = initialBalance
  const points: CurvePoint[] = []

  for (const [date, pnl] of sorted) {
    balance += pnl
    points.push({ date, balance, pnl })
  }

  return points
}

function filterCurve(allPoints: CurvePoint[], range: Range, initialBalance: number): CurvePoint[] {
  const today = new Date().toISOString().slice(0, 10)

  // Compute the start point (synthetic "before all events")
  const firstDate = allPoints[0]?.date ?? today

  if (range === "ALL" || allPoints.length === 0) {
    return [{ date: firstDate, balance: initialBalance, pnl: 0 }, ...allPoints]
  }

  const now = new Date()
  const months = range === "1M" ? 1 : range === "3M" ? 3 : 12
  const cutoff = new Date(now.getFullYear(), now.getMonth() - months, now.getDate())
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  // Balance just before the cutoff window
  let baseBalance = initialBalance
  for (const p of allPoints) {
    if (p.date < cutoffStr) baseBalance = p.balance
    else break
  }

  const filtered = allPoints.filter((p) => p.date >= cutoffStr)
  return [{ date: cutoffStr, balance: baseBalance, pnl: 0 }, ...filtered]
}

// ── tooltip ───────────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { value: number; payload: CurvePoint }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  const pnlSign = point.pnl >= 0 ? "+" : ""

  return (
    <div className="rounded-lg border bg-white shadow-lg px-3 py-2 text-xs">
      <p className="text-slate-400 mb-1">{label}</p>
      <p className="font-semibold text-slate-800">{formatUSD(point.balance)}</p>
      {point.pnl !== 0 && (
        <p className={cn(
          "font-medium",
          point.pnl >= 0 ? "text-emerald-600" : "text-rose-600"
        )}>
          {pnlSign}{formatUSD(point.pnl)}
        </p>
      )}
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export function EquityCurve({ trades, initialBalance }: EquityCurveProps) {
  const [range, setRange] = useState<Range>("ALL")

  const rawEvents = useMemo(() => buildRawEvents(trades), [trades])
  const fullCurve = useMemo(() => buildFullCurve(rawEvents, initialBalance), [rawEvents, initialBalance])
  const points    = useMemo(() => filterCurve(fullCurve, range, initialBalance), [fullCurve, range, initialBalance])

  const hasData = points.length > 1

  const finalBalance  = points[points.length - 1]?.balance ?? initialBalance
  const totalPnL      = finalBalance - initialBalance
  const isPositive    = totalPnL >= 0
  const lineColor     = isPositive ? "#10b981" : "#f43f5e"
  const gradientColor = isPositive ? "#10b981" : "#f43f5e"

  const ranges: Range[] = ["1M", "3M", "1Y", "ALL"]

  if (!hasData) {
    return (
      <div className="rounded-xl border bg-white shadow-sm p-6 flex flex-col items-center justify-center text-center h-36">
        <p className="text-sm font-medium text-slate-500">אין נתוני עקומת הון עדיין</p>
        <p className="text-xs text-slate-400 mt-1">
          {initialBalance === 0
            ? "הגדר יתרה התחלתית כדי להתחיל"
            : "סגור עסקה ראשונה כדי לראות את עקומת ההון"}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-white shadow-sm p-5">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">עקומת הון</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl font-bold text-slate-900 tabular-nums">
              {formatUSD(finalBalance)}
            </span>
            <span className={cn(
              "text-sm font-semibold tabular-nums",
              isPositive ? "text-emerald-600" : "text-rose-600"
            )}>
              {totalPnL >= 0 ? "+" : ""}{formatUSD(totalPnL)}
            </span>
          </div>
        </div>

        {/* Range filters */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-semibold transition-all",
                range === r
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={points} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={gradientColor} stopOpacity={0.18} />
              <stop offset="95%" stopColor={gradientColor} stopOpacity={0} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#94a3b8", fontFamily: "var(--font-google-sans, sans-serif)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) =>
              new Date(v).toLocaleDateString("he-IL", { month: "short", day: "numeric" })
            }
          />
          <YAxis
            hide
            domain={["auto", "auto"]}
          />

          <ReferenceLine
            y={initialBalance}
            stroke="#e2e8f0"
            strokeDasharray="4 4"
            strokeWidth={1}
          />

          <Tooltip content={<CustomTooltip />} />

          <Area
            type="monotone"
            dataKey="balance"
            stroke={lineColor}
            strokeWidth={2}
            fill="url(#equityGrad)"
            dot={false}
            activeDot={{ r: 4, fill: lineColor, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
