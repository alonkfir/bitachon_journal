"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { PortfolioHolding, PortfolioInsert } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"

const EMPTY: PortfolioInsert = {
  ticker: "",
  amount: 0,
  sector: "אחר",
  purchase_date: null,
  avg_cost: null,
  shares: null,
  notes: null,
}

interface PortfolioFormProps {
  open: boolean
  holding: PortfolioHolding | null
  originRect?: DOMRect | null
  onClose: () => void
}

export function PortfolioForm({ open, holding, originRect, onClose }: PortfolioFormProps) {
  const [form, setForm] = useState<PortfolioInsert>(EMPTY)
  const [loading, setLoading] = useState(false)
  const isEdit = !!holding

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

  useEffect(() => {
    if (holding) {
      setForm({
        ticker: holding.ticker,
        amount: holding.amount,
        sector: holding.sector,
        purchase_date: holding.purchase_date,
        avg_cost: holding.avg_cost,
        shares: holding.shares,
        notes: holding.notes,
      })
    } else {
      setForm(EMPTY)
    }
  }, [holding, open])

  function set<K extends keyof PortfolioInsert>(key: K, value: PortfolioInsert[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function num(val: string) {
    const n = parseFloat(val)
    return isNaN(n) ? 0 : n
  }

  // ── Supabase logic — unchanged ──────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.ticker.trim()) { toast.error("נא להזין טיקר"); return }
    if (form.amount <= 0) { toast.error("שווי חייב להיות חיובי"); return }

    setLoading(true)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error("לא מחובר — נסה להתחבר מחדש")
      setLoading(false)
      return
    }

    const base = { ...form, ticker: form.ticker.toUpperCase().trim() }

    let error
    if (isEdit && holding) {
      ;({ error } = await supabase.from("portfolio").update(base).eq("id", holding.id))
    } else {
      ;({ error } = await supabase.from("portfolio").insert({ ...base, user_id: user.id }))

      // Mirror into purchase history when price + qty are available
      if (!error && base.avg_cost && base.shares && base.shares > 0) {
        await supabase.from("portfolio_purchases").insert({
          user_id: user.id,
          ticker: base.ticker,
          price: base.avg_cost,
          quantity: base.shares,
          purchase_date: base.purchase_date ?? new Date().toISOString().split("T")[0],
          notes: base.notes ?? null,
        })
      }
    }

    if (error) toast.error("שגיאה: " + error.message)
    else {
      toast.success(isEdit ? "הנייר עודכן בהצלחה" : "הנייר נוסף לתיק")
      onClose()
    }
    setLoading(false)
  }
  // ────────────────────────────────────────────────────────────────────────

  // Transform origin for spring animation — viewport coords on fixed inset-0
  const transformOrigin = originRect
    ? `${originRect.left + originRect.width / 2}px ${originRect.top + originRect.height / 2}px`
    : "50% 50%"

  return (
    <AnimatePresence>
      {open && (
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
            <div className="pointer-events-auto relative w-full max-w-md">
              <div
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/50 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh]"
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
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {isEdit ? "עריכת נייר ערך" : "הוספת נייר ערך"}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {isEdit ? "עדכן את פרטי הנייר בתיק" : "הוסף נייר ערך חדש לתיק ההשקעות שלך"}
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

                {/* ── Scrollable form body ── */}
                <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

                  {/* Ticker */}
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">טיקר</Label>
                    <Input
                      placeholder="MSFT"
                      value={form.ticker}
                      onChange={(e) => set("ticker", e.target.value)}
                      dir="ltr"
                      className="uppercase"
                    />
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      הזן את סמל נייר הערך (לדוגמה: AAPL, BRK.B)
                    </p>
                  </div>

                  {/* Amount */}
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">שווי ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="10000.00"
                      value={form.amount || ""}
                      onChange={(e) => set("amount", num(e.target.value))}
                      dir="ltr"
                    />
                  </div>

                  {/* Avg cost + Shares */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">מחיר וכמות</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-700 dark:text-slate-300">מחיר ממוצע</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={form.avg_cost ?? ""}
                          onChange={(e) => set("avg_cost", e.target.value ? num(e.target.value) : null)}
                          dir="ltr"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-700 dark:text-slate-300">כמות מניות</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0"
                          value={form.shares ?? ""}
                          onChange={(e) => set("shares", e.target.value ? num(e.target.value) : null)}
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Purchase date */}
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">תאריך רכישה (אופציונלי)</Label>
                    <Input
                      type="date"
                      value={form.purchase_date ?? ""}
                      onChange={(e) => set("purchase_date", e.target.value || null)}
                      dir="ltr"
                    />
                  </div>

                  <Separator />

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">הערות (אופציונלי)</Label>
                    <Textarea
                      placeholder="תזת השקעה, אסטרטגיה..."
                      value={form.notes ?? ""}
                      onChange={(e) => set("notes", e.target.value || null)}
                      rows={3}
                    />
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-1 pb-2">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="flex-1 border-0 font-bold shadow-sm"
                      style={{ backgroundColor: "#ffe26f", color: "#1e293b" }}
                    >
                      {loading ? "שומר..." : isEdit ? "שמור שינויים" : "הוסף לתיק"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
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
