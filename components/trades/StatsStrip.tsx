"use client"

import { useMemo, useRef, useState } from "react"
import {
  AreaChart, Area, XAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts"
import { Pencil, Check } from "lucide-react"
import { useTheme } from "next-themes"
import { Skeleton } from "@/components/ui/skeleton"
import { Trade } from "@/lib/types"
import { computeMetrics, formatUSD, formatPercent } from "@/lib/calculations"
import { cn } from "@/lib/utils"

// ── types ─────────────────────────────────────────────────────────────────────

type Range = "1M" | "3M" | "1Y" | "ALL"
const RANGES: Range[] = ["1M", "3M", "1Y", "ALL"]

interface CurvePoint { date: string; balance: number; pnl: number }

interface StatsStripProps {
  trades: Trade[]
  loading: boolean
  initialBalance: number
  onUpdateBalance: (v: number) => Promise<void>
}

// ── equity curve helpers ──────────────────────────────────────────────────────

function buildCurve(trades: Trade[], initialBalance: number): CurvePoint[] {
  const events: { date: string; pnl: number }[] = []

  for (const t of trades) {
    if (t.partial_exits?.length > 0) {
      for (const e of t.partial_exits) {
        events.push({ date: e.date, pnl: (e.price - t.entry_price) * e.quantity - e.fees })
      }
    } else if (t.status === "closed" && t.exit_price !== null) {
      events.push({
        date: t.updated_at.slice(0, 10),
        pnl: (t.exit_price - t.entry_price) * t.quantity - t.fees,
      })
    }
  }

  events.sort((a, b) => a.date.localeCompare(b.date))

  const byDate = new Map<string, number>()
  for (const e of events) byDate.set(e.date, (byDate.get(e.date) ?? 0) + e.pnl)

  let balance = initialBalance
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, pnl]) => { balance += pnl; return { date, balance, pnl } })
}

function applyRange(full: CurvePoint[], range: Range, initialBalance: number): CurvePoint[] {
  const startPoint = (date: string, bal: number): CurvePoint => ({ date, balance: bal, pnl: 0 })

  if (range === "ALL" || full.length === 0) {
    const d = full[0]?.date ?? new Date().toISOString().slice(0, 10)
    return [startPoint(d, initialBalance), ...full]
  }

  const months = range === "1M" ? 1 : range === "3M" ? 3 : 12
  const now = new Date()
  const cutoff = new Date(now.getFullYear(), now.getMonth() - months, now.getDate())
    .toISOString().slice(0, 10)

  let base = initialBalance
  for (const p of full) { if (p.date < cutoff) base = p.balance; else break }

  return [startPoint(cutoff, base), ...full.filter(p => p.date >= cutoff)]
}

// ── tooltip ───────────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: CurvePoint }[] }) {
  if (!active || !payload?.length) return null
  const { date, balance, pnl } = payload[0].payload
  return (
    <div className="rounded-lg border dark:border-slate-700 bg-white dark:bg-slate-800 shadow-md px-2.5 py-1.5 text-[11px]">
      <p className="text-slate-400 dark:text-slate-500">{new Date(date).toLocaleDateString("he-IL")}</p>
      <p className="font-semibold text-slate-800 dark:text-slate-100">{formatUSD(balance)}</p>
      {pnl !== 0 && (
        <p className={pnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
          {pnl >= 0 ? "+" : ""}{formatUSD(pnl)}
        </p>
      )}
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export function StatsStrip({ trades, loading, initialBalance, onUpdateBalance }: StatsStripProps) {
  const [range, setRange]     = useState<Range>("ALL")
  const [editBal, setEditBal] = useState(false)
  const [draft, setDraft]     = useState("")
  const [saving, setSaving]   = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { resolvedTheme } = useTheme()
  const isDarkChart = resolvedTheme === "dark"

  const m = useMemo(() => computeMetrics(trades), [trades])

  const totalPnL = useMemo(() => trades.reduce<number>((sum, t) => {
    if (t.partial_exits?.length > 0)
      return sum + t.partial_exits.reduce((s, e) => s + (e.price - t.entry_price) * e.quantity - e.fees, 0)
    if (t.status === "closed" && t.exit_price !== null)
      return sum + (t.exit_price - t.entry_price) * t.quantity - t.fees
    return sum
  }, 0), [trades])

  const fullCurve = useMemo(() => buildCurve(trades, initialBalance), [trades, initialBalance])
  const points    = useMemo(() => applyRange(fullCurve, range, initialBalance), [fullCurve, range, initialBalance])

  const finalBalance = points[points.length - 1]?.balance ?? initialBalance
  const isPositive   = totalPnL >= 0
  const lineColor    = isPositive ? "#10b981" : "#f43f5e"
  const hasChart     = points.length > 1

  async function saveBalance() {
    const n = parseFloat(draft)
    if (!isNaN(n) && n >= 0) { setSaving(true); await onUpdateBalance(n); setSaving(false) }
    setEditBal(false)
  }

  function startEditBalance() {
    setDraft(initialBalance > 0 ? String(initialBalance) : "")
    setEditBal(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  // ── loading skeleton ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="rounded-xl border dark:border-slate-700/50 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-wrap md:flex-nowrap md:h-[196px]">
        {/* P&L skeleton */}
        <div className="w-1/2 md:w-[190px] shrink-0 border-b md:border-b-0 border-r dark:border-slate-700/50 p-4 md:p-6 flex flex-col justify-center gap-2 md:gap-3 order-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 md:h-9 w-20 md:w-28" />
          <Skeleton className="h-3 w-14 md:w-20" />
        </div>
        {/* Win Rate skeleton */}
        <div className="w-1/2 md:w-[190px] shrink-0 border-b md:border-b-0 md:border-l dark:border-slate-700/50 p-4 md:p-6 flex flex-col items-end justify-center gap-2 md:gap-3 order-2 md:order-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 md:h-9 w-20 md:w-28" />
          <Skeleton className="h-3 w-14 md:w-20" />
        </div>
        {/* Chart skeleton */}
        <div className="w-full md:flex-1 h-[150px] md:h-auto p-4 order-3 md:order-2">
          <Skeleton className="h-full w-full rounded-lg" />
        </div>
      </div>
    )
  }

  // ── render ──────────────────────────────────────────────────────────────────
  // Layout strategy:
  //   Mobile  (flex-wrap):   [P&L | Win Rate] on row 1, [Chart] on row 2
  //   Desktop (flex-nowrap): [P&L | Chart | Win Rate] in one row
  // Achieved via CSS `order` — P&L=1, Win Rate=2→3, Chart=3→2

  return (
    <div
      className="rounded-xl border dark:border-slate-700/50 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-wrap md:flex-nowrap md:h-[196px]"
      dir="ltr"
    >

      {/* ── P&L card — order 1 on both layouts ── */}
      <div className={cn(
        "w-1/2 md:w-[190px] shrink-0",
        "border-b md:border-b-0 border-r dark:border-slate-700/50",
        "flex flex-col justify-center px-4 md:px-6 py-3 md:py-5 gap-1 md:gap-2",
        "order-1",
      )}>
        <p className="text-[10px] md:text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">
          P &amp; L
        </p>
        <p className={cn(
          "text-xl md:text-3xl font-bold tabular-nums leading-tight",
          totalPnL > 0 ? "text-emerald-600 dark:text-emerald-400" : totalPnL < 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-slate-300"
        )}>
          {totalPnL >= 0 ? "+" : ""}{formatUSD(totalPnL)}
        </p>
        {initialBalance > 0 && (
          <p className="text-[10px] md:text-xs text-slate-400 dark:text-slate-500 leading-none tabular-nums">
            {formatUSD(finalBalance)}
          </p>
        )}
      </div>

      {/* ── Win Rate card — order 2 on mobile (next to P&L), order 3 on desktop (after chart) ── */}
      <div className={cn(
        "w-1/2 md:w-[190px] shrink-0",
        "border-b md:border-b-0 md:border-l dark:border-slate-700/50",
        "flex flex-col justify-center px-4 md:px-6 py-3 md:py-5 gap-1 md:gap-2",
        "order-2 md:order-3",
      )}>
        <p className="text-[10px] md:text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none text-right">
          WIN RATE
        </p>
        <p className={cn(
          "text-xl md:text-3xl font-bold tabular-nums leading-tight text-right",
          m.winRate !== null && m.winRate >= 50 ? "text-emerald-600 dark:text-emerald-400"
            : m.winRate !== null ? "text-rose-600 dark:text-rose-400"
            : "text-slate-700 dark:text-slate-300"
        )}>
          {m.winRate !== null ? formatPercent(m.winRate) : "—"}
        </p>
        <p className="text-[10px] md:text-xs text-slate-400 dark:text-slate-500 leading-none text-right">
          {m.closedTradeCount > 0 ? `${m.closedTradeCount} עסקאות` : "אין עדיין"}
        </p>
      </div>

      {/* ── Chart — order 3 on mobile (below cards), order 2 on desktop (between cards) ── */}
      <div className={cn(
        "w-full md:w-auto md:flex-1 min-w-0 relative",
        "h-[150px] md:h-auto",
        "order-3 md:order-2",
      )}>

        {/* overlay: range filters + balance edit icon */}
        <div className="absolute top-2 inset-x-2 flex items-center justify-between z-10 pointer-events-none">
          <div className="flex gap-0.5 pointer-events-auto">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "px-2 py-1 rounded text-xs font-semibold transition-all",
                  range === r
                    ? "bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900"
                    : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                )}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="pointer-events-auto">
            {editBal ? (
              <div className="flex items-center gap-1 bg-white/95 dark:bg-slate-800/95 rounded px-1.5 py-0.5 border dark:border-slate-700 shadow-sm">
                <span className="text-[10px] text-slate-400 dark:text-slate-500">$</span>
                <input
                  ref={inputRef}
                  type="number"
                  min="0"
                  step="1000"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveBalance(); if (e.key === "Escape") setEditBal(false) }}
                  className="w-20 text-[11px] font-semibold text-slate-800 dark:text-slate-100 outline-none bg-transparent tabular-nums"
                  placeholder="100000"
                  dir="ltr"
                />
                <button onClick={saveBalance} disabled={saving} className="text-emerald-600">
                  <Check className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={startEditBalance}
                className="flex items-center gap-1 text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 transition-colors"
                title="Set initial balance"
              >
                {initialBalance > 0 && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">${(initialBalance / 1000).toFixed(0)}k</span>
                )}
                <Pencil className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* chart */}
        {hasChart ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 38, right: 8, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={lineColor} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              {initialBalance > 0 && (
                <ReferenceLine y={initialBalance} stroke={isDarkChart ? "#334155" : "#e2e8f0"} strokeDasharray="3 3" strokeWidth={1} />
              )}
              <XAxis dataKey="date" hide />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="balance"
                stroke={lineColor}
                strokeWidth={1.5}
                fill="url(#sg)"
                dot={false}
                activeDot={{ r: 3, fill: lineColor, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-[11px] text-slate-300 dark:text-slate-600">
              {initialBalance === 0 ? "הגדר יתרה התחלתית ←" : "אין עסקאות סגורות עדיין"}
            </p>
          </div>
        )}
      </div>

    </div>
  )
}
