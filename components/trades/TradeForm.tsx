"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { TrendingUp, TrendingDown, X } from "lucide-react"
import { Trade, TradeInsert } from "@/lib/types"
import { riskPerTrade, riskRewardRatio, formatUSD } from "@/lib/calculations"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { StockSearchInput } from "./StockSearchInput"
import { cn } from "@/lib/utils"

interface TradeFormProps {
  open: boolean
  trade: Trade | null
  onClose: () => void
}

const EMPTY: TradeInsert = {
  symbol: "",
  strategy_type: "technical",
  entry_date: new Date().toISOString().split("T")[0],
  entry_price: 0,
  exit_price: null,
  stop_loss: 0,
  target_price: null,
  quantity: 0,
  fees: 0,
  status: "active",
  side: "long",
  notes: null,
  logo_url: null,
}

export function TradeForm({ open, trade, onClose }: TradeFormProps) {
  const [form, setForm] = useState<TradeInsert>(EMPTY)
  const [loading, setLoading] = useState(false)
  const isEdit = !!trade

  // Lock body scroll + Escape key while open
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = "hidden"
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", onKey)
    }
  }, [open, loading, onClose])

  useEffect(() => {
    if (trade) {
      setForm({
        symbol: trade.symbol,
        strategy_type: trade.strategy_type,
        entry_date: trade.entry_date,
        entry_price: trade.entry_price,
        exit_price: trade.exit_price,
        stop_loss: trade.stop_loss,
        target_price: trade.target_price,
        quantity: trade.quantity,
        fees: trade.fees,
        status: trade.status,
        side: trade.side ?? "long",
        notes: trade.notes,
        logo_url: trade.logo_url,
      })
    } else {
      setForm(EMPTY)
    }
  }, [trade, open])

  function set<K extends keyof TradeInsert>(key: K, value: TradeInsert[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function num(val: string) {
    const n = parseFloat(val)
    return isNaN(n) ? 0 : n
  }

  function handleStockSelect(symbol: string, logoUrl: string | null, livePrice: number | null) {
    setForm((prev) => ({
      ...prev,
      symbol: symbol.toUpperCase(),
      logo_url: logoUrl,
      entry_price: livePrice !== null && prev.entry_price === 0 ? livePrice : prev.entry_price,
    }))
  }

  const risk = useMemo(
    () => riskPerTrade(form.entry_price, form.stop_loss, form.quantity),
    [form.entry_price, form.stop_loss, form.quantity]
  )

  const rrr = useMemo(() => {
    if (!form.target_price || form.entry_price === 0) return null
    return riskRewardRatio(form.entry_price, form.target_price, form.stop_loss)
  }, [form.entry_price, form.target_price, form.stop_loss])

  // ── Supabase logic — unchanged ──────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.symbol.trim()) { toast.error("נא להזין סמל נייר ערך"); return }
    if (form.entry_price <= 0) { toast.error("מחיר כניסה חייב להיות חיובי"); return }
    if (form.stop_loss <= 0) { toast.error("סטופ לוס חייב להיות חיובי"); return }
    if (form.quantity <= 0) { toast.error("כמות חייבת להיות חיובית"); return }

    setLoading(true)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error("לא מחובר — נסה להתחבר מחדש")
      setLoading(false)
      return
    }

    const base = {
      ...form,
      symbol: form.symbol.toUpperCase().trim(),
      status: form.exit_price ? "closed" : "active",
    }

    let error
    if (isEdit && trade) {
      ;({ error } = await supabase.from("trades").update(base).eq("id", trade.id))
    } else {
      ;({ error } = await supabase.from("trades").insert({ ...base, user_id: user.id }))
    }

    if (error) toast.error("שגיאה בשמירה: " + error.message)
    else {
      toast.success(isEdit ? "העסקה עודכנה בהצלחה" : "העסקה נוספה בהצלחה")
      onClose()
    }
    setLoading(false)
  }
  // ────────────────────────────────────────────────────────────────────────

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">

      {/* Blurred backdrop */}
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-md animate-backdrop-in"
        onClick={() => !loading && onClose()}
      />

      {/*
        .dark wrapper → activates shadcn dark CSS-variable tokens for all
        child components (Input, Textarea, Label, Separator, etc.)
        without needing to override each one individually.
      */}
      <div className="dark relative w-full max-w-2xl animate-trade-modal">
        <div
          className="rounded-2xl bg-slate-900 border border-amber-400/[0.12] overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh]"
          style={{
            boxShadow:
              "0 25px 60px -10px rgba(0,0,0,0.85), " +
              "0 0 0 1px rgba(245,158,11,0.07), " +
              "inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >

          {/* ── Header ── */}
          <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-white/[0.07] shrink-0">
            <div>
              <h2 className="text-lg font-bold text-white">
                {isEdit ? "עריכת עסקה" : "עסקה חדשה"}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isEdit ? "עדכן את פרטי העסקה" : "הזן את פרטי עסקת הסווינג החדשה"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => !loading && onClose()}
              className="text-slate-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/[0.06] -mt-0.5 -ml-0.5"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* ── Scrollable form body ── */}
          <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

            {/* Long / Short */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                כיוון עסקה
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => set("side", "long")}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-all",
                    form.side === "long"
                      ? "bg-emerald-500/15 border-emerald-400/60 text-emerald-400"
                      : "border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-400"
                  )}
                >
                  <TrendingUp className="h-4 w-4" />
                  לונג (קנייה)
                </button>
                <button
                  type="button"
                  onClick={() => set("side", "short")}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-all",
                    form.side === "short"
                      ? "bg-rose-500/15 border-rose-400/60 text-rose-400"
                      : "border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-400"
                  )}
                >
                  <TrendingDown className="h-4 w-4" />
                  שורט (מכירה)
                </button>
              </div>
            </div>

            {/* Symbol + Date */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-start">
              <div className="space-y-2">
                <Label className="text-slate-300">סמל נייר ערך</Label>
                <StockSearchInput value={form.symbol} onSelect={handleStockSelect} />
                <p className="text-xs text-slate-500">
                  הקלד לחיפוש · Enter לסמלים כמו METU, ETF וכו׳
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">תאריך כניסה</Label>
                <Input
                  type="date"
                  value={form.entry_date}
                  onChange={(e) => set("entry_date", e.target.value)}
                  dir="ltr"
                  className="sm:w-40"
                />
              </div>
            </div>

            {/* Entry | Stop Loss | Target */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">מחירים</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-slate-300">מחיר כניסה</Label>
                  <Input
                    type="number" step="0.01" min="0" placeholder="0.00" dir="ltr"
                    value={form.entry_price || ""}
                    onChange={(e) => set("entry_price", num(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-rose-400">סטופ לוס</Label>
                  <Input
                    type="number" step="0.01" min="0" placeholder="0.00" dir="ltr"
                    value={form.stop_loss || ""}
                    onChange={(e) => set("stop_loss", num(e.target.value))}
                    className="border-rose-900/50 focus-visible:border-rose-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-emerald-400">יעד (אופציונלי)</Label>
                  <Input
                    type="number" step="0.01" min="0" placeholder="0.00" dir="ltr"
                    value={form.target_price ?? ""}
                    onChange={(e) => set("target_price", e.target.value ? num(e.target.value) : null)}
                    className="border-emerald-900/50 focus-visible:border-emerald-500/50"
                  />
                </div>
              </div>
            </div>

            {/* Quantity + Fees */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">כמות</Label>
                <Input
                  type="number" step="1" min="0" placeholder="100" dir="ltr"
                  value={form.quantity || ""}
                  onChange={(e) => set("quantity", num(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">עמלות</Label>
                <Input
                  type="number" step="0.01" min="0" placeholder="0.00" dir="ltr"
                  value={form.fees || ""}
                  onChange={(e) => set("fees", num(e.target.value))}
                />
              </div>
            </div>

            {/* Live calculations */}
            {(risk > 0 || rrr !== null) && (
              <div className="rounded-xl bg-slate-800/70 border border-slate-700/60 px-4 py-3.5 space-y-2.5">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-400/80">
                  חישוב בזמן אמת
                </p>
                {risk > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">סיכון (R)</span>
                    <span className="font-semibold text-amber-400">{formatUSD(risk)}</span>
                  </div>
                )}
                {rrr !== null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">יחס סיכון/תגמול</span>
                    <span className={`font-semibold ${rrr >= 2 ? "text-emerald-400" : "text-amber-400"}`}>
                      {rrr.toFixed(2)}{rrr < 2 && " ⚠ מתחת ל-2:1"}
                    </span>
                  </div>
                )}
              </div>
            )}

            <Separator className="bg-white/[0.07]" />

            {/* Exit price */}
            <div className="space-y-2">
              <Label className="text-slate-300">מחיר יציאה (לסגירת עסקה)</Label>
              <Input
                type="number" step="0.01" min="0"
                placeholder="השאר ריק לעסקה פעילה" dir="ltr"
                value={form.exit_price ?? ""}
                onChange={(e) => set("exit_price", e.target.value ? num(e.target.value) : null)}
              />
              <p className="text-xs text-slate-500">
                הזנת מחיר יציאה תסמן את העסקה כ&quot;סגורה&quot; אוטומטית
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-slate-300">הערות (אופציונלי)</Label>
              <Textarea
                placeholder="ניתוח, סיבה לכניסה, לקחים..."
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
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold border-0 shadow-lg shadow-amber-500/20"
              >
                {loading ? "שומר..." : isEdit ? "שמור שינויים" : "הוסף עסקה"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-600"
              >
                ביטול
              </Button>
            </div>

          </form>
        </div>
      </div>
    </div>
  )
}
