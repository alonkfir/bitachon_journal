"use client"

import { Trade, PartialExit } from "@/lib/types"
import { formatUSD } from "@/lib/calculations"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { History } from "lucide-react"
import { cn } from "@/lib/utils"

interface ExitHistoryDialogProps {
  trade: Trade | null
  onClose: () => void
}

export function ExitHistoryDialog({ trade, onClose }: ExitHistoryDialogProps) {
  if (!trade) return null

  const exits: PartialExit[] = trade.partial_exits ?? []
  const totalPnL = exits.reduce(
    (sum, e) => sum + (e.price - trade.entry_price) * e.quantity - e.fees,
    0
  )

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
            {/* Table */}
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b">
                    <th className="text-right text-xs font-semibold text-slate-500 px-3 py-2">
                      תאריך
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-500 px-3 py-2">
                      כמות
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-500 px-3 py-2">
                      מחיר
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-500 px-3 py-2">
                      עמלות
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-500 px-3 py-2">
                      רווח ממומש
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {exits.map((exit, i) => {
                    const pnl = (exit.price - trade.entry_price) * exit.quantity - exit.fees
                    return (
                      <tr
                        key={i}
                        className={cn(
                          "border-b last:border-0 transition-colors",
                          i % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                        )}
                      >
                        <td className="text-right text-slate-600 px-3 py-2.5 tabular-nums whitespace-nowrap">
                          {new Date(exit.date).toLocaleDateString("he-IL")}
                        </td>
                        <td className="text-left tabular-nums px-3 py-2.5 text-slate-700">
                          {exit.quantity}
                        </td>
                        <td className="text-left tabular-nums px-3 py-2.5 text-slate-700">
                          {formatUSD(exit.price)}
                        </td>
                        <td className="text-left tabular-nums px-3 py-2.5 text-slate-400 text-xs">
                          {exit.fees > 0 ? formatUSD(exit.fees) : "—"}
                        </td>
                        <td className="text-left tabular-nums px-3 py-2.5 font-semibold">
                          <span className={pnl >= 0 ? "text-emerald-600" : "text-rose-600"}>
                            {pnl >= 0 ? "+" : ""}
                            {formatUSD(pnl)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <Separator />
            <div className="flex items-center justify-between px-1 pb-1">
              <span className="text-sm font-semibold text-slate-600">
                סה&quot;כ רווח ממומש
              </span>
              <span
                className={cn(
                  "text-lg font-bold tabular-nums",
                  totalPnL > 0
                    ? "text-emerald-600"
                    : totalPnL < 0
                    ? "text-rose-600"
                    : "text-slate-500"
                )}
              >
                {totalPnL >= 0 ? "+" : ""}
                {formatUSD(totalPnL)}
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
