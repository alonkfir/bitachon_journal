"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { Trade, PartialExit } from "@/lib/types"
import { formatUSD } from "@/lib/calculations"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { History, RotateCcw, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ExitHistoryDialogProps {
  trade: Trade | null
  originRect?: DOMRect | null
  onClose: () => void
  onRefresh: () => void
}

export function ExitHistoryDialog({ trade, originRect, onClose, onRefresh }: ExitHistoryDialogProps) {
  const [exits, setExits]               = useState<PartialExit[]>([])
  const [confirmIndex, setConfirmIndex] = useState<number | null>(null)
  const [undoing, setUndoing]           = useState(false)

  const open = !!trade

  useEffect(() => {
    setExits(trade?.partial_exits ?? [])
    setConfirmIndex(null)
  }, [trade])

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  // Escape key
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !undoing) onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, undoing, onClose])

  const totalPnL = exits.reduce(
    (sum, e) => sum + (e.price - (trade?.entry_price ?? 0)) * e.quantity - e.fees,
    0
  )

  async function handleUndo(index: number) {
    if (!trade) return
    setUndoing(true)
    const supabase = createClient()

    const newExits  = exits.filter((_, i) => i !== index)
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

  const transformOrigin = originRect
    ? `${originRect.left + originRect.width / 2}px ${originRect.top + originRect.height / 2}px`
    : "50% 50%"

  return (
    <AnimatePresence>
      {open && trade && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => !undoing && onClose()}
          />

          {/* Modal wrapper */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none"
            style={{ transformOrigin }}
            initial={{ scale: 0.04, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.04, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="pointer-events-auto relative w-full max-w-md">
              <div
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/50 overflow-hidden flex flex-col"
                style={{
                  boxShadow:
                    "0 24px 64px -10px rgba(0,0,0,0.13), " +
                    "0 8px 24px -4px rgba(0,0,0,0.07), " +
                    "0 0 0 1px rgba(0,0,0,0.04)",
                }}
              >

                {/* ── Header ── */}
                <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-700/60 shrink-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0" />
                      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        היסטוריית מימושים
                      </h2>
                      <Badge className="bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-0 text-xs">
                        {trade.symbol}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      כניסה: {formatUSD(trade.entry_price)} · {trade.quantity} יחידות
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => !undoing && onClose()}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 -mt-0.5 -ml-0.5"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>

                {/* ── Body ── */}
                <div className="px-6 py-5 space-y-4">

                  {exits.length === 0 ? (
                    <div className="py-10 text-center">
                      <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                        <History className="h-5 w-5 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">אין מימושים חלקיים עדיין</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        השתמש בכפתור &quot;מימוש&quot; בשורת העסקה כדי לרשום יציאה חלקית
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* ── Timeline ── */}
                      <div className="relative rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 py-2 px-2">

                        {exits.length > 1 && (
                          <div
                            className="absolute w-px bg-slate-200/80 dark:bg-slate-700/60"
                            style={{ right: "19px", top: "32px", bottom: "32px" }}
                          />
                        )}

                        {exits.map((exit, i) => {
                          const pnl = (exit.price - trade.entry_price) * exit.quantity - exit.fees
                          const cumulativeSold = exits.slice(0, i + 1).reduce((s, e) => s + e.quantity, 0)
                          const isFullExit  = cumulativeSold >= trade.quantity
                          const isConfirming = confirmIndex === i

                          return (
                            <div
                              key={i}
                              className={cn(
                                "relative group flex items-center gap-3 pr-10 pl-2 py-3 rounded-xl transition-all",
                                isConfirming
                                  ? "bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-800/40"
                                  : "hover:bg-white dark:hover:bg-slate-700/50 hover:shadow-sm border border-transparent"
                              )}
                            >
                              {/* Timeline dot */}
                              <div
                                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ring-2 ring-slate-50 dark:ring-slate-800 shrink-0"
                                style={{ right: "13px", backgroundColor: "#ffe26f" }}
                              />

                              {isConfirming ? (
                                <>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">לבטל יציאה זו?</p>
                                    <p className="text-xs text-rose-400 dark:text-rose-500 mt-0.5">
                                      {exit.quantity} יחידות יוחזרו לעסקה
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      disabled={undoing}
                                      onClick={() => handleUndo(i)}
                                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/40 hover:bg-rose-200 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-400 text-xs font-semibold transition-colors disabled:opacity-50"
                                    >
                                      <Check className="h-3 w-3" />
                                      {undoing ? "מבטל..." : "כן"}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={undoing}
                                      onClick={() => setConfirmIndex(null)}
                                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors"
                                    >
                                      <X className="h-3 w-3" />
                                      לא
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                                      {isFullExit ? "יציאה מלאה" : "יציאה חלקית"}
                                    </p>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 tabular-nums">
                                      {new Date(exit.date).toLocaleDateString("he-IL")}
                                    </p>
                                  </div>

                                  <div className="shrink-0 text-sm tabular-nums whitespace-nowrap text-slate-600 dark:text-slate-300">
                                    <span className="font-semibold text-slate-800 dark:text-slate-100">{exit.quantity}</span>
                                    <span className="text-slate-400 mx-1 text-xs">×</span>
                                    <span>{formatUSD(exit.price)}</span>
                                  </div>

                                  <div className="shrink-0 w-[80px] text-left">
                                    <span className={cn(
                                      "text-sm font-bold tabular-nums",
                                      pnl > 0 ? "text-emerald-600 dark:text-emerald-400"
                                      : pnl < 0 ? "text-rose-600 dark:text-rose-400"
                                      : "text-slate-500"
                                    )}>
                                      {pnl >= 0 ? "+" : ""}{formatUSD(pnl)}
                                    </span>
                                    {exit.fees > 0 && (
                                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 tabular-nums">
                                        עמלה {formatUSD(exit.fees)}
                                      </p>
                                    )}
                                  </div>

                                  <div className="shrink-0 w-7 flex items-center justify-center">
                                    <button
                                      type="button"
                                      onClick={() => setConfirmIndex(i)}
                                      title="בטל יציאה זו"
                                      className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
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
                      <div className={cn(
                        "flex items-center justify-between px-4 py-3 rounded-xl border",
                        totalPnL > 0
                          ? "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-700/30"
                          : totalPnL < 0
                          ? "bg-rose-50/70 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-700/30"
                          : "bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/30"
                      )}>
                        <span className={cn(
                          "text-xs font-bold uppercase tracking-wide",
                          totalPnL > 0 ? "text-emerald-700/80 dark:text-emerald-400/80"
                          : totalPnL < 0 ? "text-rose-700/80 dark:text-rose-400/80"
                          : "text-slate-500 dark:text-slate-400"
                        )}>
                          סה&quot;כ רווח ממומש
                        </span>
                        <span className={cn(
                          "text-xl font-bold tabular-nums",
                          totalPnL > 0 ? "text-emerald-600 dark:text-emerald-400"
                          : totalPnL < 0 ? "text-rose-600 dark:text-rose-400"
                          : "text-slate-500"
                        )}>
                          {totalPnL >= 0 ? "+" : ""}{formatUSD(totalPnL)}
                        </span>
                      </div>
                    </>
                  )}

                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
