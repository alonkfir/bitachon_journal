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
import { Separator } from "@/components/ui/separator"
import { History, Undo2, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ExitHistoryDialogProps {
  trade: Trade | null
  onClose: () => void
  onRefresh: () => void
}

export function ExitHistoryDialog({ trade, onClose, onRefresh }: ExitHistoryDialogProps) {
  // Mirror partial_exits locally so the dialog reflects undo changes immediately
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
      <DialogContent className="max-w-lg">
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
          <div className="space-y-3">
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b">
                    <th className="text-right text-xs font-semibold text-slate-500 px-3 py-2">תאריך</th>
                    <th className="text-left text-xs font-semibold text-slate-500 px-3 py-2">כמות</th>
                    <th className="text-left text-xs font-semibold text-slate-500 px-3 py-2">מחיר</th>
                    <th className="text-left text-xs font-semibold text-slate-500 px-3 py-2">עמלות</th>
                    <th className="text-left text-xs font-semibold text-slate-500 px-3 py-2">רווח</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {exits.map((exit, i) => {
                    const pnl = (exit.price - trade.entry_price) * exit.quantity - exit.fees
                    const isConfirming = confirmIndex === i

                    return (
                      <tr
                        key={i}
                        className={cn(
                          "border-b last:border-0 transition-colors",
                          isConfirming
                            ? "bg-rose-50"
                            : i % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                        )}
                      >
                        {isConfirming ? (
                          // Inline confirmation row
                          <td colSpan={5} className="px-3 py-2.5">
                            <div className="flex items-center gap-2 text-sm text-slate-700">
                              <span className="font-medium text-rose-600">לבטל יציאה זו?</span>
                              <span className="text-slate-400 text-xs">הפעולה תשחזר את הכמות לעסקה</span>
                            </div>
                          </td>
                        ) : (
                          <>
                            <td className="text-right text-slate-600 px-3 py-2.5 tabular-nums whitespace-nowrap">
                              {new Date(exit.date).toLocaleDateString("he-IL")}
                            </td>
                            <td className="text-left tabular-nums px-3 py-2.5 text-slate-700">{exit.quantity}</td>
                            <td className="text-left tabular-nums px-3 py-2.5 text-slate-700">{formatUSD(exit.price)}</td>
                            <td className="text-left tabular-nums px-3 py-2.5 text-slate-400 text-xs">
                              {exit.fees > 0 ? formatUSD(exit.fees) : "—"}
                            </td>
                            <td className="text-left tabular-nums px-3 py-2.5 font-semibold">
                              <span className={pnl >= 0 ? "text-emerald-600" : "text-rose-600"}>
                                {pnl >= 0 ? "+" : ""}{formatUSD(pnl)}
                              </span>
                            </td>
                          </>
                        )}

                        {/* Undo / Confirm buttons */}
                        <td className="px-2 py-2.5">
                          {isConfirming ? (
                            <div className="flex gap-1">
                              <button
                                type="button"
                                disabled={undoing}
                                onClick={() => handleUndo(i)}
                                className="w-6 h-6 rounded flex items-center justify-center bg-rose-100 hover:bg-rose-200 text-rose-600 transition-colors disabled:opacity-50"
                                title="אשר ביטול"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={undoing}
                                onClick={() => setConfirmIndex(null)}
                                className="w-6 h-6 rounded flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors disabled:opacity-50"
                                title="ביטול"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmIndex(i)}
                              className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                              title="בטל יציאה זו"
                            >
                              <Undo2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <Separator />
            <div className="flex items-center justify-between px-1 pb-1">
              <span className="text-sm font-semibold text-slate-600">סה&quot;כ רווח ממומש</span>
              <span className={cn(
                "text-lg font-bold tabular-nums",
                totalPnL > 0 ? "text-emerald-600" : totalPnL < 0 ? "text-rose-600" : "text-slate-500"
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
