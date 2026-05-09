"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Pencil, Trash2, MoreHorizontal, BarChart3 } from "lucide-react"
import { PortfolioHolding } from "@/lib/types"
import { formatUSD, formatPercent } from "@/lib/calculations"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { EmptyState } from "@/components/shared/EmptyState"


interface PortfolioTableProps {
  holdings: PortfolioHolding[]
  onEdit: (h: PortfolioHolding) => void
  onRefresh: () => void
}

export function PortfolioTable({ holdings, onEdit, onRefresh }: PortfolioTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const total = holdings.reduce((s, h) => s + h.amount, 0)

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from("portfolio").delete().eq("id", deleteId)
    if (error) toast.error("שגיאה במחיקה: " + error.message)
    else {
      toast.success("הנייר נמחק מהתיק")
      onRefresh()
    }
    setDeleting(false)
    setDeleteId(null)
  }

  if (holdings.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="תיק ריק"
        description="הוסף ניירות ערך לתיק כדי לראות את הפיזור"
      />
    )
  }

  return (
    <>
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="text-slate-600 font-semibold">טיקר</TableHead>
              <TableHead className="text-slate-600 font-semibold text-left">שווי</TableHead>
              <TableHead className="text-slate-600 font-semibold text-left">% מהתיק</TableHead>
              <TableHead className="text-slate-600 font-semibold text-left">מחיר ממוצע</TableHead>
              <TableHead className="text-slate-600 font-semibold text-left">כמות מניות</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {holdings.map((h) => (
              <TableRow key={h.id} className="hover:bg-slate-50/50">
                <TableCell className="font-bold text-slate-900 tracking-wide">
                  {h.ticker.toUpperCase()}
                </TableCell>
                <TableCell className="text-left tabular-nums font-medium">
                  {formatUSD(h.amount)}
                </TableCell>
                <TableCell className="text-left tabular-nums text-slate-500">
                  {total > 0 ? formatPercent((h.amount / total) * 100) : "—"}
                </TableCell>
                <TableCell className="text-left tabular-nums text-sm text-slate-500">
                  {h.avg_cost ? formatUSD(h.avg_cost) : "—"}
                </TableCell>
                <TableCell className="text-left tabular-nums text-sm text-slate-500">
                  {h.shares ? h.shares.toLocaleString("he-IL") : "—"}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(h)}>
                        <Pencil className="h-4 w-4 ml-2" />
                        עריכה
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleteId(h.id)}
                        className="text-rose-600 focus:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4 ml-2" />
                        מחיקה
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="px-4 py-3 border-t bg-slate-50 flex justify-between items-center">
          <span className="text-sm text-slate-500">
            {holdings.length} ניירות ערך
          </span>
          <span className="font-bold text-slate-800">{formatUSD(total)} סה"כ</span>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="מחיקת נייר ערך"
        description="האם אתה בטוח שברצונך למחוק נייר ערך זה מהתיק?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
    </>
  )
}
