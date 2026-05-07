"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Pencil, Trash2, BookOpen, MoreHorizontal,
  TrendingDown, TrendingUp, History, ChevronDown,
} from "lucide-react"
import { Trade } from "@/lib/types"
import {
  tradePnL,
  riskPerTrade,
  rMultiple,
  remainingQty,
  formatUSD,
  formatR,
} from "@/lib/calculations"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { EmptyState } from "@/components/shared/EmptyState"
import { QuickSellDialog } from "./QuickSellDialog"
import { ExitHistoryDialog } from "./ExitHistoryDialog"
import { TickerAvatar } from "./StockSearchInput"
import { cn } from "@/lib/utils"

interface TradesTableProps {
  trades: Trade[]
  loading: boolean
  onEdit: (trade: Trade) => void
  onRefresh: () => void
}

// ── helpers ───────────────────────────────────────────────────────────────────

function toMonthKey(dateStr: string) { return dateStr.slice(0, 7) }

function currentMonthKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function formatMonthHeading(key: string) {
  const [y, m] = key.split("-")
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("he-IL", {
    month: "long", year: "numeric",
  })
}

function pctColor(pct: number) {
  return pct > 0 ? "text-emerald-600" : pct < 0 ? "text-rose-600" : "text-slate-400"
}

// ── live prices hook ──────────────────────────────────────────────────────────

function useLivePrices(trades: Trade[]) {
  const [prices, setPrices] = useState<Record<string, number>>({})

  useEffect(() => {
    const symbols = [...new Set(trades.map((t) => t.symbol.toUpperCase()))]
    if (symbols.length === 0) return

    Promise.all(
      symbols.map(async (sym) => {
        try {
          const res = await fetch(`/api/stock/quote?symbol=${sym}`)
          const data = await res.json()
          return [sym, data.c as number] as const
        } catch {
          return [sym, 0] as const
        }
      })
    ).then((results) => {
      const map: Record<string, number> = {}
      for (const [sym, price] of results) {
        if (price > 0) map[sym] = price
      }
      setPrices(map)
    })
  }, [trades])

  return prices
}

// ── main component ────────────────────────────────────────────────────────────

export function TradesTable({ trades, loading, onEdit, onRefresh }: TradesTableProps) {
  const [deleteId, setDeleteId]             = useState<string | null>(null)
  const [deleting, setDeleting]             = useState(false)
  const [quickSellTrade, setQuickSellTrade] = useState<Trade | null>(null)
  const [historyTrade, setHistoryTrade]     = useState<Trade | null>(null)

  const livePrices = useLivePrices(trades)

  // Group by month, sort newest-first
  const monthGroups = useMemo(() => {
    const map = new Map<string, Trade[]>()
    for (const t of trades) {
      const key = toMonthKey(t.entry_date)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    for (const g of map.values()) g.sort((a, b) => b.entry_date.localeCompare(a.entry_date))
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a))
  }, [trades])

  const initialOpen = useMemo(() => {
    const cur = currentMonthKey()
    const keys = monthGroups.map(([k]) => k)
    const start = keys.includes(cur) ? cur : (keys[0] ?? "")
    return new Set<string>(start ? [start] : [])
  }, [monthGroups])

  const [openMonths, setOpenMonths] = useState<Set<string>>(initialOpen)

  function toggleMonth(key: string) {
    setOpenMonths((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from("trades").delete().eq("id", deleteId)
    if (error) toast.error("שגיאה במחיקה: " + error.message)
    else { toast.success("העסקה נמחקה"); onRefresh() }
    setDeleting(false)
    setDeleteId(null)
  }

  if (loading) return <TableSkeleton />

  if (trades.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="אין עסקאות עדיין"
        description="הוסף את העסקה הראשונה שלך כדי להתחיל לעקוב אחר המסחר"
      />
    )
  }

  return (
    <>
      <div className="space-y-3">
        {monthGroups.map(([key, monthTrades]) => {
          const isOpen  = openMonths.has(key)
          const monthPnL = monthTrades.reduce<number>((s, t) => s + (tradePnL(t) ?? 0), 0)
          const monthR   = monthTrades.reduce<number>((s, t) => s + (rMultiple(t) ?? 0), 0)
          const hasPnL   = monthTrades.some((t) => tradePnL(t) !== null)
          const hasR     = monthTrades.some((t) => rMultiple(t) !== null)

          return (
            <div key={key} className="rounded-xl border bg-white shadow-sm overflow-hidden">

              {/* ── Accordion header ── */}
              <button
                type="button"
                onClick={() => toggleMonth(key)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                {/* Right side: month + count + summary (RTL: this is visually on the right) */}
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-800 text-sm">
                    {formatMonthHeading(key)}
                  </span>
                  <span className="text-xs text-slate-400">{monthTrades.length} עסקאות</span>

                  {hasPnL && (
                    <span className={cn(
                      "text-sm font-semibold tabular-nums",
                      monthPnL > 0 ? "text-emerald-600" : monthPnL < 0 ? "text-rose-600" : "text-slate-400"
                    )}>
                      {monthPnL >= 0 ? "+" : ""}{formatUSD(monthPnL)}
                    </span>
                  )}
                  {hasR && (
                    <span className={cn(
                      "text-sm font-semibold tabular-nums",
                      monthR >= 0 ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {formatR(monthR)}
                    </span>
                  )}
                </div>

                {/* Left side: chevron only */}
                <ChevronDown className={cn(
                  "h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200",
                  isOpen && "rotate-180"
                )} />
              </button>

              {/* ── Collapsible panel ── */}
              <div style={{
                display: "grid",
                gridTemplateRows: isOpen ? "1fr" : "0fr",
                transition: "grid-template-rows 220ms ease",
              }}>
                <div style={{ overflow: "hidden" }}>
                  <div className="border-t overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 hover:bg-slate-50">
                          {/* Column order: rightmost → leftmost in RTL */}
                          <TableHead className="text-slate-600 font-semibold text-right">סמל</TableHead>
                          <TableHead className="text-slate-600 font-semibold text-left">מחיר חי</TableHead>
                          <TableHead className="text-slate-600 font-semibold text-right">כיוון</TableHead>
                          <TableHead className="text-slate-600 font-semibold text-right">תאריך</TableHead>
                          <TableHead className="text-slate-600 font-semibold text-left">כניסה</TableHead>
                          <TableHead className="text-slate-600 font-semibold text-left">סטופ</TableHead>
                          <TableHead className="text-slate-600 font-semibold text-left">כמות</TableHead>
                          <TableHead className="text-slate-600 font-semibold text-left">סיכון $</TableHead>
                          <TableHead className="w-[84px]" />
                          <TableHead className="text-slate-600 font-semibold text-left">רווח/הפסד</TableHead>
                          <TableHead className="text-slate-600 font-semibold text-left">R×</TableHead>
                          <TableHead className="text-slate-600 font-semibold text-right">סטטוס</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthTrades.map((trade) => {
                          const pnl       = tradePnL(trade)
                          const risk      = riskPerTrade(trade.entry_price, trade.stop_loss, trade.quantity)
                          const rm        = rMultiple(trade)
                          const remaining = remainingQty(trade)
                          const hasPartials = trade.partial_exits?.length > 0
                          const isActive  = remaining > 0
                          const isLong    = (trade.side ?? "long") === "long"

                          const livePrice = livePrices[trade.symbol.toUpperCase()]
                          const liveDiff  = livePrice ? livePrice - trade.entry_price : null
                          const livePct   = liveDiff !== null ? (liveDiff / trade.entry_price) * 100 : null

                          return (
                            <TableRow key={trade.id} className="hover:bg-slate-50/50">

                              {/* Symbol + logo — rightmost column */}
                              <TableCell className="text-right py-3">
                                <div className="flex items-center gap-2 justify-end">
                                  <div>
                                    <div className="font-bold text-slate-900 tracking-wide">
                                      {trade.symbol.toUpperCase()}
                                    </div>
                                    {hasPartials && (
                                      <div className="text-xs text-slate-400 font-normal leading-tight">
                                        {trade.partial_exits.length} יציאות
                                      </div>
                                    )}
                                  </div>
                                  <TickerAvatar symbol={trade.symbol} logoUrl={trade.logo_url} />
                                </div>
                              </TableCell>

                              {/* Live price */}
                              <TableCell className="text-left tabular-nums text-sm">
                                {livePrice ? (
                                  <div>
                                    <div className="font-medium text-slate-800">{formatUSD(livePrice)}</div>
                                    {livePct !== null && (
                                      <div className={cn("text-xs", pctColor(livePct))}>
                                        {livePct >= 0 ? "+" : ""}{livePct.toFixed(2)}%
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-300 text-xs">—</span>
                                )}
                              </TableCell>

                              {/* Side: Long / Short */}
                              <TableCell className="text-right">
                                <span className={cn(
                                  "inline-flex items-center gap-1 text-xs font-semibold",
                                  isLong ? "text-emerald-600" : "text-rose-600"
                                )}>
                                  {isLong
                                    ? <><TrendingUp className="h-3 w-3" /> לונג</>
                                    : <><TrendingDown className="h-3 w-3" /> שורט</>
                                  }
                                </span>
                              </TableCell>

                              {/* Date */}
                              <TableCell className="text-slate-500 text-sm text-right whitespace-nowrap">
                                {new Date(trade.entry_date).toLocaleDateString("he-IL")}
                              </TableCell>

                              {/* Entry price */}
                              <TableCell className="text-left tabular-nums text-sm text-slate-700">
                                {formatUSD(trade.entry_price)}
                              </TableCell>

                              {/* Stop loss */}
                              <TableCell className="text-left tabular-nums text-sm text-rose-500">
                                {formatUSD(trade.stop_loss)}
                              </TableCell>

                              {/* Quantity */}
                              <TableCell className="text-left tabular-nums text-sm text-slate-700">
                                {hasPartials && remaining < trade.quantity ? (
                                  <span>
                                    <span className="font-medium">{remaining}</span>
                                    <span className="text-slate-300 mx-0.5">/</span>
                                    <span className="text-slate-400">{trade.quantity}</span>
                                  </span>
                                ) : trade.quantity}
                              </TableCell>

                              {/* Risk $ */}
                              <TableCell className="text-left tabular-nums text-sm text-amber-600 font-medium">
                                {formatUSD(risk)}
                              </TableCell>

                              {/* Quick-sell button */}
                              <TableCell className="px-2">
                                {isActive && (
                                  <Button
                                    variant="outline" size="sm"
                                    className="h-7 px-2.5 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 gap-1 whitespace-nowrap"
                                    onClick={() => setQuickSellTrade(trade)}
                                  >
                                    <TrendingDown className="h-3 w-3" />
                                    מימוש
                                  </Button>
                                )}
                              </TableCell>

                              {/* P&L */}
                              <TableCell className="text-left tabular-nums text-sm font-semibold">
                                {pnl !== null ? (
                                  <span className={cn(
                                    pnl > 0 ? "text-emerald-600" : pnl < 0 ? "text-rose-600" : "text-slate-500"
                                  )}>
                                    {pnl >= 0 ? "+" : ""}{formatUSD(pnl)}
                                  </span>
                                ) : <span className="text-slate-300">—</span>}
                              </TableCell>

                              {/* R-multiple */}
                              <TableCell className="text-left tabular-nums text-sm font-semibold">
                                {rm !== null ? (
                                  <span className={rm >= 0 ? "text-emerald-600" : "text-rose-600"}>
                                    {formatR(rm)}
                                  </span>
                                ) : <span className="text-slate-300">—</span>}
                              </TableCell>

                              {/* Status badge — red when closed at a loss */}
                              <TableCell className="text-right">
                                {isActive ? (
                                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0 text-xs">
                                    {hasPartials ? "חלקי" : "פעיל"}
                                  </Badge>
                                ) : (
                                  <Badge className={cn(
                                    "border-0 text-xs",
                                    pnl !== null && pnl > 0
                                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                      : pnl !== null && pnl < 0
                                      ? "bg-rose-100 text-rose-700 hover:bg-rose-100"
                                      : "bg-slate-100 text-slate-500 hover:bg-slate-100"
                                  )}>
                                    סגור
                                  </Badge>
                                )}
                              </TableCell>

                              {/* Actions */}
                              <TableCell className="px-1">
                                <DropdownMenu>
                                  <DropdownMenuTrigger
                                    render={<Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600" />}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {hasPartials && (
                                      <>
                                        <DropdownMenuItem onClick={() => setHistoryTrade(trade)}>
                                          <History className="h-4 w-4 ml-2 text-slate-500" />
                                          היסטוריית מימושים
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                      </>
                                    )}
                                    <DropdownMenuItem onClick={() => onEdit(trade)}>
                                      <Pencil className="h-4 w-4 ml-2" />
                                      עריכה
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => setDeleteId(trade.id)}
                                      className="text-rose-600 focus:text-rose-600"
                                    >
                                      <Trash2 className="h-4 w-4 ml-2" />
                                      מחיקה
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>

                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <ExitHistoryDialog trade={historyTrade} onClose={() => setHistoryTrade(null)} />
      <QuickSellDialog trade={quickSellTrade} onClose={() => setQuickSellTrade(null)} onRefresh={onRefresh} />
      <ConfirmDialog
        open={!!deleteId}
        title="מחיקת עסקה"
        description="האם אתה בטוח שברצונך למחוק עסקה זו? פעולה זו בלתי הפיכה."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
    </>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border bg-white shadow-sm p-4 space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  )
}
