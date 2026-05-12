"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Trade, PartialExit } from "@/lib/types"
import { formatUSD } from "@/lib/calculations"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { History, RotateCcw, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ExitHistoryDialogProps {
  trade: Trade | null
  onClose: () => void
  onRefresh: () => void
}

export function ExitHistoryDialog({ trade, onClose, onRefresh }: ExitHistoryDialogProps) {
  const [exits, setExits] = useState<PartialExit[]>([])
  const [confirmIndex, setConfirmIndex] = useState<number | null>(null)
  const [undoing, setUndoing] = useState(false)

  useEffect(() => {
    setExits(trade?.partial_exits ?? [])
    setConfirmIndex(null)
  }, [trade])

  if (!trade) return null

  const totalPnL = exits.reduce(
    (sum, e) => sum + (e.price - trade.entry_price) * e.quantity - e.fees,
    0
  )

  async function handleUndo(index: number) {
    if (!trade) return
    setUndoing(true)
    const supabase = createClient()

    const newExits = exits.filter((_, i) => i !== index)
    const totalSold = newExits.reduce((s, e) => s + e.quantity, 0)
    const newStatus = totalSold >= trade.quantity ? "closed" : "active"

    const { error } = await supabase
      .from("trades")
      .update({ partial_exits: newExits, status: newStatus })
      .eq("id", trade.id)

    if (error) {
      toast.error("שגיאה בביטול: " + error.message)
    } else {
      toast.success("היציאה בוטלה בהצלחה")
      setExits(newExits)
      setConfirmIndex(null)
      onRefresh()
      if (newExits.length === 0) onClose()
    }
    setUndoing(false)
  }

  return (
    <Dialog open={!!trade} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">

        {/* ── Header ── */}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-slate-500" />
            היסטוריית מימושים
            <Badge className="bg-slate-100 text-slate-700 border-0 text-xs font-mono">
              {trade.symbol}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            כניסה: {formatUSD(trade.entry_price)} · {trade.quantity} יחידות
          </DialogDescription>
        </DialogHeader>

        {exits.length === 0 ? (
          <div className="py-10 text-center">
            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <History className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">אין מימושים חלקיים עדיין</p>
            <p className="text-xs text-slate-400 mt-1">
              השתמש בכפתור &quot;מימוש&quot; בשורת העסקה כדי לרשום יציאה חלקית
            </p>
          </div>
        ) : (
          <div className="space-y-4">

            {/* ── Timeline ── */}
            <div className="relative rounded-xl bg-slate-50/80 border border-slate-100 py-2 px-2">

              {/* Vertical connecting line (right side since RTL) — only when >1 exit */}
              {exits.length > 1 && (
                <div
                  className="absolute w-px bg-slate-200/80"
                  style={{ right: "19px", top: "32px", bottom: "32px" }}
                />
              )}

              {exits.map((exit, i) => {
                const pnl = (exit.price - trade.entry_price) * exit.quantity - exit.fees
                const cumulativeSold = exits.slice(0, i + 1).reduce((s, e) => s + e.quantity, 0)
                const isFullExit = cumulativeSold >= trade.quantity
                const isConfirming = confirmIndex === i

                return (
                  <div
                    key={i}
                    className={cn(
                      "relative group flex items-center gap-3 pr-10 pl-2 py-3 rounded-xl transition-all",
                      isConfirming
                        ? "bg-rose-50 border border-rose-100"
                        : "hover:bg-white hover:shadow-sm hover:border-slate-100 border border-transparent"
                    )}
                  >
                    {/* Timeline dot (brand yellow) */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ring-2 ring-slate-50 shrink-0"
                      style={{ right: "13px", backgroundColor: "#ffe26f" }}
                    />

                    {isConfirming ? (
                      /* ── Confirmation state ── */
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-rose-700">לבטל יציאה זו?</p>
                          <p className="text-xs text-rose-400 mt-0.5">
                            {exit.quantity} יחידות יוחזרו לעסקה
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={undoing}
                            onClick={() => handleUndo(i)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-semibold transition-colors disabled:opacity-50"
                          >
                            <Check className="h-3 w-3" />
                            כן
                          </button>
                          <button
                            type="button"
                            disabled={undoing}
                            onClick={() => setConfirmIndex(null)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors"
                          >
                            <X className="h-3 w-3" />
                            לא
                          </button>
                        </div>
                      </>
                    ) : (
                      /* ── Normal state: 4 columns ── */
                      <>
                        {/* Col 1 (rightmost in RTL): Action label + date */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 leading-tight">
                            {isFullExit ? "יציאה מלאה" : "יציאה חלקית"}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                            {new Date(exit.date).toLocaleDateString("he-IL")}
                          </p>
                        </div>

                        {/* Col 2: Qty × Price */}
                        <div className="shrink-0 text-sm tabular-nums whitespace-nowrap text-slate-600">
                          <span className="font-semibold text-slate-800">{exit.quantity}</span>
                          <span className="text-slate-400 mx-1 text-xs">×</span>
                          <span>{formatUSD(exit.price)}</span>
                        </div>

                        {/* Col 3: P/L — prominent, colored */}
                        <div className="shrink-0 w-[80px] text-left">
                          <span className={cn(
                            "text-sm font-bold tabular-nums",
                            pnl > 0 ? "text-emerald-600"
                            : pnl < 0 ? "text-rose-600"
                            : "text-slate-500"
                          )}>
                            {pnl >= 0 ? "+" : ""}{formatUSD(pnl)}
                          </span>
                          {exit.fees > 0 && (
                            <p className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
                              עמלה {formatUSD(exit.fees)}
                            </p>
                          )}
                        </div>

                        {/* Col 4 (leftmost in RTL): Undo — ghost until hover */}
                        <div className="shrink-0 w-7 flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => setConfirmIndex(i)}
                            title="בטל יציאה זו"
                            className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            {/* ── Total row ── */}
            <div className="flex items-center justify-between px-3 py-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-sm font-semibold text-slate-600">
                סה&quot;כ רווח ממומש
              </span>
              <span className={cn(
                "text-base font-bold tabular-nums",
                totalPnL > 0 ? "text-emerald-600"
                : totalPnL < 0 ? "text-rose-600"
                : "text-slate-500"
              )}>
                {totalPnL >= 0 ? "+" : ""}{formatUSD(totalPnL)}
              </span>
            </div>

          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
