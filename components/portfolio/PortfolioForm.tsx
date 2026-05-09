"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { PortfolioHolding, PortfolioInsert } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

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
  onClose: () => void
}

export function PortfolioForm({ open, holding, onClose }: PortfolioFormProps) {
  const [form, setForm] = useState<PortfolioInsert>(EMPTY)
  const [loading, setLoading] = useState(false)
  const isEdit = !!holding

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
    }

    if (error) toast.error("שגיאה: " + error.message)
    else {
      toast.success(isEdit ? "הנייר עודכן בהצלחה" : "הנייר נוסף לתיק")
      onClose()
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "עריכת נייר ערך" : "הוספת נייר ערך"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "עדכן את פרטי הנייר בתיק" : "הוסף נייר ערך חדש לתיק ההשקעות שלך"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>טיקר</Label>
            <Input
              placeholder="MSFT"
              value={form.ticker}
              onChange={(e) => set("ticker", e.target.value)}
              dir="ltr"
              className="uppercase"
            />
          </div>

          <div className="space-y-2">
            <Label>שווי ($)</Label>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>מחיר ממוצע (אופציונלי)</Label>
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
              <Label>כמות מניות (אופציונלי)</Label>
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

          <div className="space-y-2">
            <Label>תאריך רכישה (אופציונלי)</Label>
            <Input
              type="date"
              value={form.purchase_date ?? ""}
              onChange={(e) => set("purchase_date", e.target.value || null)}
              dir="ltr"
            />
          </div>

          <div className="space-y-2">
            <Label>הערות (אופציונלי)</Label>
            <Textarea
              placeholder="תזת השקעה, אסטרטגיה..."
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value || null)}
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "שומר..." : isEdit ? "שמור" : "הוסף לתיק"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              ביטול
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
