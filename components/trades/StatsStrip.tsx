"use client"

import { useMemo, useRef, useState } from "react"
import {
  AreaChart, Area, XAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts"
import { Pencil, Check } from "lucide-react"
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
    <div className="rounded-lg border bg-white shadow-md px-2.5 py-1.5 text-[11px]">
      <p className="text-slate-400">{new Date(date).toLocaleDateString("he-IL")}</p>
      <p className="font-semibold text-slate-800">{formatUSD(balance)}</p>
      {pnl !== 0 && (
        <p className={pnl >= 0 ? "text-emerald-600" : "text-rose-600"}>
          {pnl >= 0 ? "+" : ""}{formatUSD(pnl)}
        </p>
      )}
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export function StatsStrip({ trades, loading, initialBalance, onUpdateBalance }: StatsStripProps) {
  const [range, setRange]           = useState<Range>("ALL")
  const [editBal, setEditBal]       = useState(false)
  const [draft, setDraft]           = useState("")
  const [saving, setSaving]         = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

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
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden flex h-[196px]">
        <div className="w-[190px] shrink-0 border-r p-6 flex flex-col justify-center gap-3">
          <Skeleton className="h-3.5 w-16" /><Skeleton className="h-9 w-28" /><Skeleton className="h-3 w-20" />
        </div>
        <div className="flex-1 p-4"><Skeleton className="h-full w-full rounded-lg" /></div>
        <div className="w-[190px] shrink-0 border-l p-6 flex flex-col justify-center gap-3">
          <Skeleton className="h-3.5 w-16" /><Skeleton className="h-9 w-28" /><Skeleton className="h-3 w-20" />
        </div>
      </div>
    )
  }

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="rounded-xl border bg-white shadow-sm overflow-hidden flex h-[196px]"
      dir="ltr"   /* strip always reads left→right so chart timeline is natural */
    >

      {/* ── LEFT: Total Realized P&L ── */}
      <div className="w-[190px] shrink-0 border-r flex flex-col justify-center px-6 py-5 gap-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider leading-none">
          P &amp; L
        </p>
        <p className={cn(
          "text-3xl font-bold tabular-nums leading-tight",
          totalPnL > 0 ? "text-emerald-600" : totalPnL < 0 ? "text-rose-600" : "text-slate-700"
        )}>
          {totalPnL >= 0 ? "+" : ""}{formatUSD(totalPnL)}
        </p>
        {initialBalance > 0 && (
          <p className="text-xs text-slate-400 leading-none tabular-nums">
            {formatUSD(finalBalance)}
          </p>
        )}
      </div>

      {/* ── MIDDLE: Equity Curve ── */}
      <div className="flex-1 min-w-0 relative">

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
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                {r}
              </button>
            ))}
          </div>

          {/* initial balance edit */}
          <div className="pointer-events-auto">
            {editBal ? (
              <div className="flex items-center gap-1 bg-white/95 rounded px-1.5 py-0.5 border shadow-sm">
                <span className="text-[10px] text-slate-400">$</span>
                <input
                  ref={inputRef}
                  type="number"
                  min="0"
                  step="1000"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveBalance(); if (e.key === "Escape") setEditBal(false) }}
                  className="w-20 text-[11px] font-semibold text-slate-800 outline-none bg-transparent tabular-nums"
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
                className="flex items-center gap-1 text-slate-300 hover:text-slate-500 transition-colors"
                title="Set initial balance"
              >
                {initialBalance > 0 && (
                  <span className="text-[10px] text-slate-400 tabular-nums">${(initialBalance / 1000).toFixed(0)}k</span>
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
                <ReferenceLine y={initialBalance} stroke="#e2e8f0" strokeDasharray="3 3" strokeWidth={1} />
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
            <p className="text-[11px] text-slate-300">
              {initialBalance === 0 ? "הגדר יתרה התחלתית ←" : "אין עסקאות סגורות עדיין"}
            </p>
          </div>
        )}
      </div>

      {/* ── RIGHT: Win Rate ── */}
      <div className="w-[190px] shrink-0 border-l flex flex-col justify-center px-6 py-5 gap-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider leading-none text-right">
          WIN RATE
        </p>
        <p className={cn(
          "text-3xl font-bold tabular-nums leading-tight text-right",
          m.winRate !== null && m.winRate >= 50 ? "text-emerald-600"
            : m.winRate !== null ? "text-rose-600"
            : "text-slate-700"
        )}>
          {m.winRate !== null ? formatPercent(m.winRate) : "—"}
        </p>
        <p className="text-xs text-slate-400 leading-none text-right">
          {m.closedTradeCount > 0 ? `${m.closedTradeCount} עסקאות` : "אין עדיין"}
        </p>
      </div>

    </div>
  )
}
