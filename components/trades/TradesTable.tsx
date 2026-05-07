"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Pencil, Trash2, BookOpen, MoreHorizontal,
  TrendingDown, History, ChevronDown,
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

// ── helpers ──────────────────────────────────────────────────────────────────

function toMonthKey(dateStr: string) {
  // "YYYY-MM-DD" → "YYYY-MM"
  return dateStr.slice(0, 7)
}

function currentMonthKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function formatMonthHeading(key: string) {
  const [y, m] = key.split("-")
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("he-IL", {
    month: "long",
    year: "numeric",
  })
}

// ── main component ────────────────────────────────────────────────────────────

export function TradesTable({ trades, loading, onEdit, onRefresh }: TradesTableProps) {
  const [deleteId, setDeleteId]         = useState<string | null>(null)
  const [deleting, setDeleting]         = useState(false)
  const [quickSellTrade, setQuickSellTrade] = useState<Trade | null>(null)
  const [historyTrade, setHistoryTrade] = useState<Trade | null>(null)

  // Group + sort ---------------------------------------------------------------
  const monthGroups = useMemo(() => {
    const map = new Map<string, Trade[]>()

    for (const trade of trades) {
      const key = toMonthKey(trade.entry_date)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(trade)
    }

    // Sort trades within each month newest-first
    for (const group of map.values()) {
      group.sort((a, b) => b.entry_date.localeCompare(a.entry_date))
    }

    // Return months newest-first
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a))
  }, [trades])

  // Accordion open state -------------------------------------------------------
  const initialOpen = useMemo(() => {
    const cur = currentMonthKey()
    const keys = monthGroups.map(([k]) => k)
    // Open current month if it has trades, otherwise open the first (most recent)
    const startKey = keys.includes(cur) ? cur : (keys[0] ?? "")
    return new Set<string>(startKey ? [startKey] : [])
  }, [monthGroups])

  const [openMonths, setOpenMonths] = useState<Set<string>>(initialOpen)

  function toggleMonth(key: string) {
    setOpenMonths((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Delete handler -------------------------------------------------------------
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

  // ── guards ─────────────────────────────────────────────────────────────────

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

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-3">
        {monthGroups.map(([key, monthTrades]) => {
          const isOpen = openMonths.has(key)

          // Monthly summary numbers
          const monthPnL = monthTrades.reduce<number>((sum, t) => sum + (tradePnL(t) ?? 0), 0)
          const monthR   = monthTrades.reduce<number>((sum, t) => sum + (rMultiple(t) ?? 0), 0)
          const hasPnL   = monthTrades.some((t) => tradePnL(t) !== null)
          const hasR     = monthTrades.some((t) => rMultiple(t) !== null)

          return (
            <div
              key={key}
              className="rounded-xl border bg-white shadow-sm overflow-hidden"
            >
              {/* ── Month header (click to expand/collapse) ── */}
              <button
                type="button"
                onClick={() => toggleMonth(key)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                {/* Left: month name + count */}
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-800 text-sm">
                    {formatMonthHeading(key)}
                  </span>
                  <span className="text-xs text-slate-400">
                    {monthTrades.length} עסקאות
                  </span>
                </div>

                {/* Right: summary + chevron */}
                <div className="flex items-center gap-4">
                  {hasPnL && (
                    <span className={cn(
                      "text-sm font-semibold tabular-nums",
                      monthPnL > 0 ? "text-emerald-600"
                        : monthPnL < 0 ? "text-rose-600"
                        : "text-slate-500"
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
                  <ChevronDown className={cn(
                    "h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200",
                    isOpen && "rotate-180"
                  )} />
                </div>
              </button>

              {/* ── Collapsible panel ── */}
              <div
                style={{
                  display: "grid",
                  gridTemplateRows: isOpen ? "1fr" : "0fr",
                  transition: "grid-template-rows 220ms ease",
                }}
              >
                <div style={{ overflow: "hidden" }}>
                  <div className="border-t overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 hover:bg-slate-50">
                          <TableHead className="text-slate-600 font-semibold text-right">סמל</TableHead>
                          <TableHead className="text-slate-600 font-semibold text-right">תאריך</TableHead>
                          <TableHead className="text-slate-600 font-semibold text-left">כניסה</TableHead>
                          <TableHead className="text-slate-600 font-semibold text-left">סטופ</TableHead>
                          <TableHead className="text-slate-600 font-semibold text-left">כמות</TableHead>
                          <TableHead className="text-slate-600 font-semibold text-left">סיכון $</TableHead>
                          <TableHead className="w-[90px]" />
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

                          return (
                            <TableRow key={trade.id} className="hover:bg-slate-50/50">

                              {/* Symbol + logo */}
                              <TableCell className="font-bold text-slate-900 tracking-wide text-right py-3">
                                <div className="flex items-center gap-2 justify-end">
                                  <div>
                                    <div>{trade.symbol.toUpperCase()}</div>
                                    {hasPartials && (
                                      <div className="text-xs text-slate-400 font-normal leading-tight">
                                        {trade.partial_exits.length} יציאות
                                      </div>
                                    )}
                                  </div>
                                  <TickerAvatar symbol={trade.symbol} logoUrl={trade.logo_url} />
                                </div>
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

                              {/* Quantity / remaining */}
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
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2.5 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 gap-1 whitespace-nowrap"
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
                                    pnl > 0 ? "text-emerald-600"
                                      : pnl < 0 ? "text-rose-600"
                                      : "text-slate-500"
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

                              {/* Status badge */}
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
                                      : "bg-slate-100 text-slate-500 hover:bg-slate-100"
                                  )}>
                                    סגור
                                  </Badge>
                                )}
                              </TableCell>

                              {/* Actions dropdown */}
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
