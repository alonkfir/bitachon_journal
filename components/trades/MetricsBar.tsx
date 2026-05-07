"use client"

import { useEffect, useRef, useState } from "react"
import { Pencil, Check } from "lucide-react"
import { Trade } from "@/lib/types"
import { computeMetrics, formatUSD, formatPercent } from "@/lib/calculations"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

const ACCOUNT_SIZE_KEY = "trading_account_size"

interface MetricsBarProps {
  trades: Trade[]
  loading: boolean
}

export function MetricsBar({ trades, loading }: MetricsBarProps) {
  const [accountSize, setAccountSize] = useState<number | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // Hydrate from localStorage after mount
  useEffect(() => {
    const saved = localStorage.getItem(ACCOUNT_SIZE_KEY)
    if (saved) setAccountSize(parseFloat(saved))
  }, [])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function startEdit() {
    setDraft(accountSize !== null ? String(accountSize) : "")
    setEditing(true)
  }

  function saveEdit() {
    const n = parseFloat(draft)
    if (!isNaN(n) && n > 0) {
      setAccountSize(n)
      localStorage.setItem(ACCOUNT_SIZE_KEY, String(n))
    } else if (draft === "") {
      setAccountSize(null)
      localStorage.removeItem(ACCOUNT_SIZE_KEY)
    }
    setEditing(false)
  }

  if (loading) return <MetricsSkeleton />

  const m = computeMetrics(trades)
  const exposurePct =
    accountSize && accountSize > 0
      ? (m.totalExposure / accountSize) * 100
      : null

  const cards = [
    {
      label: "שיעור הצלחה",
      value: m.winRate !== null ? formatPercent(m.winRate) : "—",
      sub: m.closedTradeCount > 0 ? `${m.closedTradeCount} עסקאות סגורות` : "אין עסקאות סגורות",
      warning: m.closedTradeCount > 0 && m.closedTradeCount < 20,
      warningText: "נדרשות 20+ עסקאות לנתון מהימן",
      color:
        m.winRate !== null && m.winRate >= 50
          ? "text-emerald-600"
          : m.winRate !== null
          ? "text-rose-600"
          : "text-slate-900",
    },
    {
      label: "פקטור רווח",
      value:
        m.profitFactor === null
          ? "—"
          : m.profitFactor === Infinity
          ? "∞"
          : m.profitFactor.toFixed(2),
      sub: "> 1.0 = מערכת רווחית",
      color:
        m.profitFactor !== null && m.profitFactor > 1
          ? "text-emerald-600"
          : m.profitFactor !== null
          ? "text-rose-600"
          : "text-slate-900",
    },
    {
      label: "סיכון כולל (R)",
      value: formatUSD(m.totalRisk),
      sub: "בפוזיציות פעילות",
      color: m.totalRisk > 0 ? "text-amber-600" : "text-slate-900",
    },
    {
      label: "חשיפת תיק",
      value: formatUSD(m.totalExposure),
      sub: exposurePct !== null ? `${exposurePct.toFixed(1)}% מהחשבון` : "שווי פוזיציות פעילות",
      color: "text-slate-900",
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <Card key={card.label} className="border-0 shadow-sm bg-white">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
              {card.label}
            </p>
            <p className={cn("text-2xl font-bold tabular-nums", card.color)}>{card.value}</p>
            <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
            {card.warning && (
              <p className="text-xs text-amber-500 mt-1">{card.warningText}</p>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Editable Account Size card */}
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              גודל חשבון
            </p>
            {!editing && (
              <button
                onClick={startEdit}
                className="text-slate-400 hover:text-primary transition-colors"
                aria-label="ערוך גודל חשבון"
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
              <button onClick={saveEdit} className="text-primary shrink-0 mr-1">
                <Check className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <p
              className="text-2xl font-bold tabular-nums text-slate-900 cursor-pointer"
              onClick={startEdit}
            >
              {accountSize !== null ? formatUSD(accountSize) : "—"}
            </p>
          )}

          <p className="text-xs text-slate-400 mt-1">
            {accountSize !== null ? "לחץ לעדכון" : "לחץ להגדרת גודל חשבון"}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
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
