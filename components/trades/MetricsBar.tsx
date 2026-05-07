"use client"

import { useEffect, useRef, useState } from "react"
import { Pencil, Check } from "lucide-react"
import { Trade } from "@/lib/types"
import { computeMetrics, formatUSD, formatPercent } from "@/lib/calculations"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface MetricsBarProps {
  trades: Trade[]
  loading: boolean
  initialBalance: number
  onUpdateBalance: (value: number) => Promise<void>
}

export function MetricsBar({ trades, loading, initialBalance, onUpdateBalance }: MetricsBarProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState("")
  const [saving, setSaving]   = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function startEdit() {
    setDraft(initialBalance > 0 ? String(initialBalance) : "")
    setEditing(true)
  }

  async function saveEdit() {
    const n = parseFloat(draft)
    if (!isNaN(n) && n >= 0) {
      setSaving(true)
      await onUpdateBalance(n)
      setSaving(false)
    }
    setEditing(false)
  }

  if (loading) return <MetricsSkeleton />

  const m = computeMetrics(trades)

  // Total realized P&L across all closed events
  const totalPnL = trades.reduce<number>((sum, t) => {
    if (t.partial_exits?.length > 0) {
      return sum + t.partial_exits.reduce(
        (s, e) => s + (e.price - t.entry_price) * e.quantity - e.fees, 0
      )
    }
    if (t.status === "closed" && t.exit_price !== null) {
      return sum + (t.exit_price - t.entry_price) * t.quantity - t.fees
    }
    return sum
  }, 0)

  const currentBalance = initialBalance > 0 ? initialBalance + totalPnL : null

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">

      {/* Win Rate */}
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">שיעור הצלחה</p>
          <p className={cn(
            "text-2xl font-bold tabular-nums",
            m.winRate !== null && m.winRate >= 50 ? "text-emerald-600"
              : m.winRate !== null ? "text-rose-600"
              : "text-slate-900"
          )}>
            {m.winRate !== null ? formatPercent(m.winRate) : "—"}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {m.closedTradeCount > 0 ? `${m.closedTradeCount} עסקאות סגורות` : "אין עסקאות סגורות"}
          </p>
          {m.closedTradeCount > 0 && m.closedTradeCount < 20 && (
            <p className="text-xs text-amber-500 mt-1">נדרשות 20+ עסקאות לנתון מהימן</p>
          )}
        </CardContent>
      </Card>

      {/* Total Realized P&L */}
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">רווח/הפסד ממומש</p>
          <p className={cn(
            "text-2xl font-bold tabular-nums",
            totalPnL > 0 ? "text-emerald-600"
              : totalPnL < 0 ? "text-rose-600"
              : "text-slate-900"
          )}>
            {totalPnL >= 0 ? "+" : ""}{formatUSD(totalPnL)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {currentBalance !== null
              ? `יתרה נוכחית: ${formatUSD(currentBalance)}`
              : "הגדר יתרה התחלתית"}
          </p>
        </CardContent>
      </Card>

      {/* Initial Balance — editable, saved to Supabase */}
      <Card className="border-0 shadow-sm bg-white col-span-2 lg:col-span-1">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">יתרה התחלתית</p>
            {!editing && (
              <button
                onClick={startEdit}
                className="text-slate-400 hover:text-primary transition-colors"
                aria-label="ערוך יתרה"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {editing ? (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-slate-400 text-sm">$</span>
              <input
                ref={inputRef}
                type="number"
                min="0"
                step="1000"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveEdit()
                  if (e.key === "Escape") setEditing(false)
                }}
                className="w-full bg-transparent text-xl font-bold text-slate-900 outline-none border-b-2 border-primary tabular-nums"
                placeholder="100000"
                dir="ltr"
              />
              <button onClick={saveEdit} disabled={saving} className="text-primary shrink-0 mr-1">
                <Check className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <p
              className="text-2xl font-bold tabular-nums text-slate-900 cursor-pointer"
              onClick={startEdit}
            >
              {initialBalance > 0 ? formatUSD(initialBalance) : "—"}
            </p>
          )}

          <p className="text-xs text-slate-400 mt-1">
            {initialBalance > 0 ? "נשמר בחשבון שלך" : "לחץ להגדרת יתרה התחלתית"}
          </p>
        </CardContent>
      </Card>

    </div>
  )
}

function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {[0, 1, 2].map((i) => (
        <Card key={i} className="border-0 shadow-sm bg-white">
          <CardContent className="p-5 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
