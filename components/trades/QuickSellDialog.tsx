"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { TrendingDown, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Trade, PartialExit } from "@/lib/types"
import { remainingQty, formatUSD } from "@/lib/calculations"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

interface QuickSellDialogProps {
  trade: Trade | null
  originRect?: DOMRect | null
  onClose: () => void
  onRefresh: () => void
}

export function QuickSellDialog({ trade, originRect, onClose, onRefresh }: QuickSellDialogProps) {
  const [qty, setQty] = useState("")
  const [price, setPrice] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [fees, setFees] = useState("0")
  const [loading, setLoading] = useState(false)

  const open = !!trade
  const remaining = trade ? remainingQty(trade) : 0

  // Reset form whenever a new trade opens
  useEffect(() => {
    if (trade) {
      setQty("")
      setPrice("")
      setDate(new Date().toISOString().split("T")[0])
      setFees("0")
    }
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
      if (e.key === "Escape" && !loading) onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, loading, onClose])

  // ── Supabase logic — unchanged ──────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!trade) return

    const exitQty   = parseFloat(qty)
    const exitPrice = parseFloat(price)
    const exitFees  = parseFloat(fees) || 0

    if (isNaN(exitQty) || exitQty <= 0)    { toast.error("כמות חייבת להיות חיובית"); return }
    if (exitQty > remaining)               { toast.error(`כמות מקסימלית זמינה: ${remaining}`); return }
    if (isNaN(exitPrice) || exitPrice <= 0){ toast.error("מחיר חייב להיות חיובי"); return }

    setLoading(true)
    const supabase = createClient()

    const newExit: PartialExit = { quantity: exitQty, price: exitPrice, date, fees: exitFees }
    const updatedExits = [...(trade.partial_exits ?? []), newExit]
    const totalSold   = updatedExits.reduce((s, e) => s + e.quantity, 0)
    const newStatus   = totalSold >= trade.quantity ? "closed" : "active"

    const { error } = await supabase
      .from("trades")
      .update({ partial_exits: updatedExits, status: newStatus })
      .eq("id", trade.id)

    if (error) {
      toast.error("שגיאה בשמירה: " + error.message)
    } else {
      const pnlForExit = (exitPrice - trade.entry_price) * exitQty - exitFees
      const sign = pnlForExit >= 0 ? "+" : ""
      toast.success(`${trade.symbol}: יצאת מ-${exitQty} יחידות | ${sign}${formatUSD(pnlForExit)}`)
      onRefresh()
      onClose()
    }
    setLoading(false)
  }
  // ────────────────────────────────────────────────────────────────────────

  const pnlPreview =
    trade && price && !isNaN(parseFloat(price)) && qty && !isNaN(parseFloat(qty))
      ? (parseFloat(price) - trade.entry_price) * parseFloat(qty) - (parseFloat(fees) || 0)
      : null

  const isProfit = pnlPreview !== null && pnlPreview > 0
  const isLoss   = pnlPreview !== null && pnlPreview < 0

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
            onClick={() => !loading && onClose()}
          />

          {/* Modal wrapper — scales from button origin */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none"
            style={{ transformOrigin }}
            initial={{ scale: 0.04, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.04, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="pointer-events-auto relative w-full max-w-sm">
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
                      <TrendingDown className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        רשום יציאה
                      </h2>
                      <Badge className="bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-0 text-xs">
                        {trade.symbol}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      כניסה: {formatUSD(trade.entry_price)} · זמין: {remaining} יחידות
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => !loading && onClose()}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 -mt-0.5 -ml-0.5"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>

                {/* ── Form body ── */}
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

                  {/* Qty + Exit price */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      פרטי יציאה
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-700 dark:text-slate-300">כמות למכירה</Label>
                        <Input
                          type="number" step="1" min="1" max={remaining}
                          placeholder={String(remaining)}
                          value={qty}
                          onChange={(e) => setQty(e.target.value)}
                          dir="ltr"
                          autoFocus
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-emerald-600 dark:text-emerald-400">מחיר יציאה</Label>
                        <Input
                          type="number" step="0.01" min="0" placeholder="0.00"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          dir="ltr"
                          className="border-emerald-200 focus-visible:border-emerald-400 dark:border-emerald-800/60"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Date + Fees */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300">תאריך</Label>
                      <Input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300">עמלות</Label>
                      <Input
                        type="number" step="0.01" min="0" placeholder="0.00"
                        value={fees}
                        onChange={(e) => setFees(e.target.value)}
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {/* Live P&L preview */}
                  {pnlPreview !== null && (
                    <div className={`rounded-xl px-4 py-3.5 space-y-1 border ${
                      isProfit
                        ? "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-700/30"
                        : isLoss
                        ? "bg-rose-50/70 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-700/30"
                        : "bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/30"
                    }`}>
                      <p className={`text-xs font-bold uppercase tracking-wide ${
                        isProfit ? "text-emerald-700/80 dark:text-emerald-400/80"
                        : isLoss  ? "text-rose-700/80 dark:text-rose-400/80"
                        : "text-slate-500 dark:text-slate-400"
                      }`}>
                        רווח/הפסד משוער
                      </p>
                      <p className={`text-xl font-bold tabular-nums ${
                        isProfit ? "text-emerald-600 dark:text-emerald-400"
                        : isLoss  ? "text-rose-600 dark:text-rose-400"
                        : "text-slate-500"
                      }`}>
                        {pnlPreview >= 0 ? "+" : ""}{formatUSD(pnlPreview)}
                      </p>
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-3 pt-1 pb-2">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="flex-1 border-0 font-bold shadow-sm"
                      style={{ backgroundColor: "#ffe26f", color: "#1e293b" }}
                    >
                      {loading ? "שומר..." : "רשום יציאה"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => !loading && onClose()}
                      disabled={loading}
                    >
                      ביטול
                    </Button>
                  </div>

                </form>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
