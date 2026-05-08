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
    // Always trim + uppercase so the key in the map always matches
    // the lookup in both desktop rows and mobile cards.
    const symbols = [...new Set(trades.map((t) => t.symbol.trim().toUpperCase()))]
    if (symbols.length === 0) return

    Promise.all(
      symbols.map(async (sym) => {
        try {
          const res = await fetch(`/api/stock/quote?symbol=${encodeURIComponent(sym)}`)
          const data = await res.json()
          return [sym, typeof data.c === "number" ? data.c : 0] as const
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

// ── mobile trade card ─────────────────────────────────────────────────────────

interface MobileCardProps {
  trade: Trade
  livePrices: Record<string, number>
  onEdit: (t: Trade) => void
  onHistory: (t: Trade) => void
  onQuickSell: (t: Trade) => void
  onDelete: (id: string) => void
}

function MobileTradeCard({ trade, livePrices, onEdit, onHistory, onQuickSell, onDelete }: MobileCardProps) {
  const pnl         = tradePnL(trade)
  const risk        = riskPerTrade(trade.entry_price, trade.stop_loss, trade.quantity)
  const rm          = rMultiple(trade)
  const remaining   = remainingQty(trade)
  const hasPartials = trade.partial_exits?.length > 0
  const isActive    = remaining > 0
  const isLong      = (trade.side ?? "long") === "long"

  // Use same trim+uppercase normalization as the hook so keys always match
  const symKey    = trade.symbol.trim().toUpperCase()
  const rawPrice  = livePrices[symKey]
  const livePrice: number | null = rawPrice && rawPrice > 0 ? rawPrice : null
  const liveDiff  = livePrice !== null ? livePrice - trade.entry_price : null
  const livePct   = liveDiff !== null ? (liveDiff / trade.entry_price) * 100 : null

  return (
    <div className="p-4 border-t first:border-t-0">

      {/* Row 1: Logo + Symbol + direction | Status + P&L */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <TickerAvatar symbol={trade.symbol} logoUrl={trade.logo_url} />
          <div>
            <div className="font-bold text-slate-900 text-base tracking-wide leading-tight">
              {trade.symbol.toUpperCase()}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={cn(
                "flex items-center gap-0.5 text-xs font-semibold",
                isLong ? "text-emerald-600" : "text-rose-600"
              )}>
                {isLong ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {isLong ? "לונג" : "שורט"}
              </span>
              <span className="text-slate-300 text-xs">·</span>
              <span className="text-slate-400 text-xs">
                {new Date(trade.entry_date).toLocaleDateString("he-IL")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          {isActive ? (
            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0 text-xs">
              {hasPartials ? "חלקי" : "פעיל"}
            </Badge>
          ) : (
            <Badge className={cn(
              "border-0 text-xs",
              pnl !== null && pnl > 0  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
              : pnl !== null && pnl < 0 ? "bg-rose-100 text-rose-700 hover:bg-rose-100"
              : "bg-slate-100 text-slate-500 hover:bg-slate-100"
            )}>
              סגור
            </Badge>
          )}
          {pnl !== null && (
            <span className={cn(
              "text-sm font-bold tabular-nums",
              pnl > 0 ? "text-emerald-600" : pnl < 0 ? "text-rose-600" : "text-slate-500"
            )}>
              {pnl >= 0 ? "+" : ""}{formatUSD(pnl)}
            </span>
          )}
          {rm !== null && (
            <span className={cn("text-xs font-semibold tabular-nums", rm >= 0 ? "text-emerald-600" : "text-rose-600")}>
              {formatR(rm)}
            </span>
          )}
        </div>
      </div>

      {/* Row 2: Data grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mb-3 bg-slate-50 rounded-lg px-3 py-2.5">
        <div>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-0.5">כניסה</p>
          <p className="text-sm font-semibold text-slate-800 tabular-nums">{formatUSD(trade.entry_price)}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-0.5">מחיר חי</p>
          {livePrice !== null ? (
            <p className="text-sm font-semibold tabular-nums">
              <span className="text-slate-800">{formatUSD(livePrice)}</span>
              {livePct !== null && (
                <span className={cn("text-xs mr-1", pctColor(livePct))}>
                  {livePct >= 0 ? "+" : ""}{livePct.toFixed(1)}%
                </span>
              )}
            </p>
          ) : <p className="text-slate-300 text-sm">—</p>}
        </div>
        <div>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-0.5">סטופ</p>
          <p className="text-sm font-semibold text-rose-500 tabular-nums">{formatUSD(trade.stop_loss)}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-0.5">סיכון</p>
          <p className="text-sm font-semibold text-amber-600 tabular-nums">{formatUSD(risk)}</p>
        </div>
      </div>

      {/* Row 3: Action buttons */}
      <div className="flex gap-2">
        {isActive && (
          <Button
            variant="outline" size="sm"
            className="flex-1 h-10 text-sm border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 gap-1.5"
            onClick={() => onQuickSell(trade)}
          >
            <TrendingDown className="h-4 w-4" />
            מימוש
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline" size="sm"
                className={cn(
                  "h-10 text-slate-500 gap-1.5 text-sm",
                  isActive ? "w-10 px-0 justify-center" : "flex-1"
                )}
              />
            }
          >
            <MoreHorizontal className="h-4 w-4" />
            {!isActive && <span>ניהול</span>}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {hasPartials && (
              <>
                <DropdownMenuItem onClick={() => onHistory(trade)}>
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
              onClick={() => onDelete(trade.id)}
              className="text-rose-600 focus:text-rose-600"
            >
              <Trash2 className="h-4 w-4 ml-2" />
              מחיקה
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

    </div>
  )
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
          const isOpen   = openMonths.has(key)
          const monthPnL = monthTrades.reduce<number>((s, t) => s + (tradePnL(t) ?? 0), 0)
          const monthR   = monthTrades.reduce<number>((s, t) => s + (rMultiple(t) ?? 0), 0)
          const hasPnL   = monthTrades.some((t) => tradePnL(t) !== null)
          const hasR     = monthTrades.some((t) => rMultiple(t) !== null)

          return (
            <div key={key} className="rounded-xl border bg-white shadow-sm overflow-hidden">

              {/* ── Accordion header — larger touch target on mobile ── */}
              <button
                type="button"
                onClick={() => toggleMonth(key)}
                className="w-full flex items-center justify-between px-5 py-5 md:py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-wrap">
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

                <ChevronDown className={cn(
                  "h-5 w-5 text-slate-400 shrink-0 transition-transform duration-200",
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

                  {/* Desktop table */}
                  <div className="border-t overflow-x-auto hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 hover:bg-slate-50">
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

                          const _symKey   = trade.symbol.trim().toUpperCase()
                          const _raw      = livePrices[_symKey]
                          const livePrice: number | null = _raw && _raw > 0 ? _raw : null
                          const liveDiff  = livePrice !== null ? livePrice - trade.entry_price : null
                          const livePct   = liveDiff !== null ? (liveDiff / trade.entry_price) * 100 : null

                          return (
                            <TableRow key={trade.id} className="hover:bg-slate-50/50">

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

                              <TableCell className="text-left tabular-nums text-sm">
                                {livePrice !== null ? (
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

                              <TableCell className="text-slate-500 text-sm text-right whitespace-nowrap">
                                {new Date(trade.entry_date).toLocaleDateString("he-IL")}
                              </TableCell>

                              <TableCell className="text-left tabular-nums text-sm text-slate-700">
                                {formatUSD(trade.entry_price)}
                              </TableCell>

                              <TableCell className="text-left tabular-nums text-sm text-rose-500">
                                {formatUSD(trade.stop_loss)}
                              </TableCell>

                              <TableCell className="text-left tabular-nums text-sm text-slate-700">
                                {hasPartials && remaining < trade.quantity ? (
                                  <span>
                                    <span className="font-medium">{remaining}</span>
                                    <span className="text-slate-300 mx-0.5">/</span>
                                    <span className="text-slate-400">{trade.quantity}</span>
                                  </span>
                                ) : trade.quantity}
                              </TableCell>

                              <TableCell className="text-left tabular-nums text-sm text-amber-600 font-medium">
                                {formatUSD(risk)}
                              </TableCell>

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

                              <TableCell className="text-left tabular-nums text-sm font-semibold">
                                {pnl !== null ? (
                                  <span className={cn(
                                    pnl > 0 ? "text-emerald-600" : pnl < 0 ? "text-rose-600" : "text-slate-500"
                                  )}>
                                    {pnl >= 0 ? "+" : ""}{formatUSD(pnl)}
                                  </span>
                                ) : <span className="text-slate-300">—</span>}
                              </TableCell>

                              <TableCell className="text-left tabular-nums text-sm font-semibold">
                                {rm !== null ? (
                                  <span className={rm >= 0 ? "text-emerald-600" : "text-rose-600"}>
                                    {formatR(rm)}
                                  </span>
                                ) : <span className="text-slate-300">—</span>}
                              </TableCell>

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

                  {/* Mobile cards */}
                  <div className="border-t md:hidden">
                    {monthTrades.map((trade) => (
                      <MobileTradeCard
                        key={trade.id}
                        trade={trade}
                        livePrices={livePrices}
                        onEdit={onEdit}
                        onHistory={(t) => setHistoryTrade(t)}
                        onQuickSell={(t) => setQuickSellTrade(t)}
                        onDelete={(id) => setDeleteId(id)}
                      />
                    ))}
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
