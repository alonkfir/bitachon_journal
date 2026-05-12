"use client"

import { ShoppingCart } from "lucide-react"
import { PortfolioPurchase } from "@/lib/types"
import { formatUSD } from "@/lib/calculations"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

interface PurchaseHistoryPanelProps {
  purchases: PortfolioPurchase[]
  loading: boolean
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  })
}

export function PurchaseHistoryPanel({ purchases, loading }: PurchaseHistoryPanelProps) {
  return (
    <div className="rounded-xl border dark:border-slate-700/50 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col sticky top-6">
      <div className="px-4 py-3 border-b dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">היסטוריית קניות</h2>
        {!loading && (
          <span className="text-xs text-slate-400 dark:text-slate-500">{purchases.length} עסקאות</span>
        )}
      </div>

      {loading ? (
        <div className="p-4 space-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-full rounded" />
          ))}
        </div>
      ) : purchases.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-14 px-6 text-center">
          <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <ShoppingCart className="h-5 w-5 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">אין היסטוריית קניות</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            הוסף נייר ערך עם מחיר וכמות כדי לרשום קנייה
          </p>
        </div>
      ) : (
        <div className="overflow-y-auto max-h-[70vh]">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <TableHead className="text-slate-600 dark:text-slate-400 font-semibold text-xs py-2.5">תאריך</TableHead>
                <TableHead className="text-slate-600 dark:text-slate-400 font-semibold text-xs py-2.5">טיקר</TableHead>
                <TableHead className="text-slate-600 dark:text-slate-400 font-semibold text-xs py-2.5 text-left">מחיר</TableHead>
                <TableHead className="text-slate-600 dark:text-slate-400 font-semibold text-xs py-2.5 text-left">כמות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.map((p) => (
                <TableRow key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                  <TableCell className="text-xs text-slate-500 dark:text-slate-400 tabular-nums py-2.5">
                    {formatDate(p.purchase_date)}
                  </TableCell>
                  <TableCell className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-wide py-2.5">
                    {p.ticker}
                  </TableCell>
                  <TableCell className="text-xs font-medium text-slate-800 dark:text-slate-200 tabular-nums py-2.5 text-left">
                    {formatUSD(p.price)}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 dark:text-slate-400 tabular-nums py-2.5 text-left">
                    {p.quantity.toLocaleString("he-IL")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
