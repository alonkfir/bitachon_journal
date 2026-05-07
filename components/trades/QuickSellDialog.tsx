"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Trade, PartialExit } from "@/lib/types"
import { remainingQty, formatUSD } from "@/lib/calculations"
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
import { Badge } from "@/components/ui/badge"

interface QuickSellDialogProps {
  trade: Trade | null
  onClose: () => void
  onRefresh: () => void
}

export function QuickSellDialog({ trade, onClose, onRefresh }: QuickSellDialogProps) {
  const [qty, setQty] = useState("")
  const [price, setPrice] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [fees, setFees] = useState("0")
  const [loading, setLoading] = useState(false)

  const open = !!trade
  const remaining = trade ? remainingQty(trade) : 0

  function handleOpenChange(v: boolean) {
    if (!v) {
      setQty("")
      setPrice("")
      setDate(new Date().toISOString().split("T")[0])
      setFees("0")
      onClose()
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!trade) return

    const exitQty = parseFloat(qty)
    const exitPrice = parseFloat(price)
    const exitFees = parseFloat(fees) || 0

    if (isNaN(exitQty) || exitQty <= 0) { toast.error("כמות חייבת להיות חיובית"); return }
    if (exitQty > remaining) { toast.error(`כמות מקסימלית זמינה: ${remaining}`); return }
    if (isNaN(exitPrice) || exitPrice <= 0) { toast.error("מחיר חייב להיות חיובי"); return }

    setLoading(true)
    const supabase = createClient()

    const newExit: PartialExit = {
      quantity: exitQty,
      price: exitPrice,
      date,
      fees: exitFees,
    }

    const updatedExits = [...(trade.partial_exits ?? []), newExit]
    const totalSold = updatedExits.reduce((s, e) => s + e.quantity, 0)
    const newStatus = totalSold >= trade.quantity ? "closed" : "active"

    const { error } = await supabase
      .from("trades")
      .update({ partial_exits: updatedExits, status: newStatus })
      .eq("id", trade.id)

    if (error) {
      toast.error("שגיאה בשמירה: " + error.message)
    } else {
      const pnlForExit = (exitPrice - trade.entry_price) * exitQty - exitFees
      const sign = pnlForExit >= 0 ? "+" : ""
      toast.success(
        `${trade.symbol}: יצאת מ-${exitQty} יחידות | ${sign}${formatUSD(pnlForExit)}`
      )
      onRefresh()
      handleOpenChange(false)
    }
    setLoading(false)
  }

  if (!trade) return null

  const pnlPreview =
    price && !isNaN(parseFloat(price)) && qty && !isNaN(parseFloat(qty))
      ? (parseFloat(price) - trade.entry_price) * parseFloat(qty) - (parseFloat(fees) || 0)
      : null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            יציאה חלקית
            <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">
              {trade.symbol}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            כניסה: {formatUSD(trade.entry_price)} · זמין: {remaining} יחידות
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>כמות למכירה</Label>
              <Input
                type="number"
                step="1"
                min="1"
                max={remaining}
                placeholder={String(remaining)}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                dir="ltr"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>מחיר יציאה</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>תאריך</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
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
                value={fees}
                onChange={(e) => setFees(e.target.value)}
                dir="ltr"
              />
            </div>
          </div>

          {/* Live P&L preview */}
          {pnlPreview !== null && (
            <div className="rounded-lg bg-slate-50 px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-slate-500">רווח/הפסד משוער</span>
              <span
                className={`text-base font-bold tabular-nums ${
                  pnlPreview > 0
                    ? "text-emerald-600"
                    : pnlPreview < 0
                    ? "text-rose-600"
                    : "text-slate-500"
                }`}
              >
                {pnlPreview >= 0 ? "+" : ""}
                {formatUSD(pnlPreview)}
              </span>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "שומר..." : "רשום יציאה"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              ביטול
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
