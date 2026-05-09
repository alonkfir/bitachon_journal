"use client"

import { useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { PortfolioHolding } from "@/lib/types"
import { tickerAllocations, formatUSD } from "@/lib/calculations"
import { createClient } from "@/lib/supabase/client"
import { AllocationChart } from "@/components/portfolio/AllocationChart"
import { PortfolioTable } from "@/components/portfolio/PortfolioTable"
import { PortfolioForm } from "@/components/portfolio/PortfolioForm"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editHolding, setEditHolding] = useState<PortfolioHolding | null>(null)

  async function fetchHoldings() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("portfolio")
      .select("*")
      .order("amount", { ascending: false })
    if (!error && data) setHoldings(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchHoldings()
  }, [])

  function handleEdit(h: PortfolioHolding) {
    setEditHolding(h)
    setFormOpen(true)
  }

  function handleFormClose() {
    setFormOpen(false)
    setEditHolding(null)
    fetchHoldings()
  }

  const allocations = tickerAllocations(holdings)
  const totalValue = holdings.reduce((s, h) => s + h.amount, 0)

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">תיק השקעות</h1>
          <p className="text-slate-500 text-sm mt-1">פיזור ארוך-טווח לפי ניירות ערך</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 ml-1" />
          הוסף נייר ערך
        </Button>
      </div>

      {/* Total Account Size */}
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
            שווי תיק כולל
          </p>
          {loading ? (
            <Skeleton className="h-9 w-44 mt-1" />
          ) : (
            <p className="text-4xl font-bold text-slate-900 tabular-nums">
              {formatUSD(totalValue)}
            </p>
          )}
          <p className="text-xs text-slate-400 mt-1">{holdings.length} ניירות ערך</p>
        </CardContent>
      </Card>

      {/* Pie Chart — full width */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-slate-700">פיזור לפי ניירות ערך</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-[300px]">
              <Skeleton className="h-52 w-52 rounded-full" />
            </div>
          ) : allocations.length > 0 ? (
            <>
              <AllocationChart allocations={allocations} />
              {/* Compact legend below chart */}
              <div className="mt-4 pt-4 border-t grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-2">
                {allocations.map((a, i) => (
                  <div key={a.ticker} className="flex items-center gap-2 min-w-0">
                    <div
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{
                        background: [
                          "#14b8a6","#8b5cf6","#f97316","#06b6d4",
                          "#a855f7","#f59e0b","#0ea5e9","#ec4899",
                          "#10b981","#6366f1",
                        ][i % 10],
                      }}
                    />
                    <span className="text-xs text-slate-600 font-medium truncate">{a.ticker}</span>
                    <span className="text-xs text-slate-400 tabular-nums mr-auto shrink-0">
                      {a.percentage.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
              אין נתונים להצגה
            </div>
          )}
        </CardContent>
      </Card>

      {/* Holdings Table — full width */}
      <PortfolioTable
        holdings={holdings}
        onEdit={handleEdit}
        onRefresh={fetchHoldings}
      />

      <PortfolioForm
        open={formOpen}
        holding={editHolding}
        onClose={handleFormClose}
      />
    </div>
  )
}
