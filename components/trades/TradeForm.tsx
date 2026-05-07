"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Trade, TradeInsert } from "@/lib/types"
import { riskPerTrade, riskRewardRatio, formatUSD } from "@/lib/calculations"
import { createClient } from "@/lib/supabase/client"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { StockSearchInput } from "./StockSearchInput"

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
  notes: null,
  logo_url: null,
}

export function TradeForm({ open, trade, onClose }: TradeFormProps) {
  const [form, setForm] = useState<TradeInsert>(EMPTY)
  const [loading, setLoading] = useState(false)
  const isEdit = !!trade

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

  // Called when user picks a stock from the autocomplete
  function handleStockSelect(symbol: string, logoUrl: string | null, livePrice: number | null) {
    setForm((prev) => ({
      ...prev,
      symbol: symbol.toUpperCase(),
      logo_url: logoUrl,
      // Pre-fill entry price only if field is still empty
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

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="left" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{isEdit ? "עריכת עסקה" : "עסקה חדשה"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "עדכן את פרטי העסקה" : "הזן את פרטי עסקת הסווינג החדשה"}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Symbol — autocomplete search */}
          <div className="space-y-2">
            <Label>סמל נייר ערך</Label>
            <StockSearchInput
              value={form.symbol}
              onSelect={handleStockSelect}
            />
            <p className="text-xs text-slate-400">
              הקלד לחיפוש חי — מחיר הכניסה יתמלא אוטומטית
            </p>
          </div>

          {/* Entry date */}
          <div className="space-y-2">
            <Label>תאריך כניסה</Label>
            <Input
              type="date"
              value={form.entry_date}
              onChange={(e) => set("entry_date", e.target.value)}
              dir="ltr"
            />
          </div>

          {/* Prices */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>מחיר כניסה</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.entry_price || ""}
                onChange={(e) => set("entry_price", num(e.target.value))}
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-rose-600">סטופ לוס</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.stop_loss || ""}
                onChange={(e) => set("stop_loss", num(e.target.value))}
                dir="ltr"
                className="border-rose-200 focus-visible:ring-rose-400"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-emerald-600">יעד (אופציונלי)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.target_price ?? ""}
                onChange={(e) =>
                  set("target_price", e.target.value ? num(e.target.value) : null)
                }
                dir="ltr"
                className="border-emerald-200 focus-visible:ring-emerald-400"
              />
            </div>
          </div>

          {/* Quantity + Fees */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>כמות</Label>
              <Input
                type="number"
                step="1"
                min="0"
                placeholder="100"
                value={form.quantity || ""}
                onChange={(e) => set("quantity", num(e.target.value))}
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>עמלות</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.fees || ""}
                onChange={(e) => set("fees", num(e.target.value))}
                dir="ltr"
              />
            </div>
          </div>

          {/* Live calculations */}
          {(risk > 0 || rrr !== null) && (
            <div className="rounded-lg bg-slate-50 p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                חישוב בזמן אמת
              </p>
              {risk > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">סיכון (R)</span>
                  <span className="font-semibold text-amber-600">{formatUSD(risk)}</span>
                </div>
              )}
              {rrr !== null && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">יחס סיכון/תגמול (RRR)</span>
                  <span className={`font-semibold ${rrr >= 2 ? "text-emerald-600" : "text-amber-600"}`}>
                    {rrr.toFixed(2)}{rrr < 2 && " ⚠ מתחת ל-2:1"}
                  </span>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Exit price */}
          <div className="space-y-2">
            <Label>מחיר יציאה (לסגירת עסקה)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="השאר ריק לעסקה פעילה"
              value={form.exit_price ?? ""}
              onChange={(e) =>
                set("exit_price", e.target.value ? num(e.target.value) : null)
              }
              dir="ltr"
            />
            <p className="text-xs text-slate-400">
              הזנת מחיר יציאה תסמן את העסקה כ"סגורה" אוטומטית
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>הערות (אופציונלי)</Label>
            <Textarea
              placeholder="ניתוח, סיבה לכניסה, לקחים..."
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value || null)}
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "שומר..." : isEdit ? "שמור שינויים" : "הוסף עסקה"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              ביטול
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
