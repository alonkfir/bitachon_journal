"use client"

import { useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { PortfolioHolding } from "@/lib/types"
import { sectorAllocations, formatUSD } from "@/lib/calculations"
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

  const allocations = sectorAllocations(holdings)
  const totalValue = holdings.reduce((s, h) => s + h.amount, 0)

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">תיק השקעות</h1>
          <p className="text-slate-500 text-sm mt-1">פיזור ארוך-טווח לפי מגזרים</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 ml-1" />
          הוסף נייר ערך
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-700">פיזור לפי מגזרים</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Skeleton className="h-52 w-52 rounded-full" />
              </div>
            ) : allocations.length > 0 ? (
              <AllocationChart allocations={allocations} />
            ) : (
              <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
                אין נתונים להצגה
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="space-y-4">
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                שווי תיק כולל
              </p>
              {loading ? (
                <Skeleton className="h-8 w-36 mt-1" />
              ) : (
                <p className="text-3xl font-bold text-slate-900 tabular-nums">
                  {formatUSD(totalValue)}
                </p>
              )}
              <p className="text-xs text-slate-400 mt-1">{holdings.length} ניירות ערך</p>
            </CardContent>
          </Card>

          {/* Sector breakdown list */}
          {!loading && allocations.length > 0 && (
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700">פירוט מגזרים</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {allocations.map((a, i) => (
                    <div key={a.sector} className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{
                          background: [
                            "#6366f1","#10b981","#f59e0b","#3b82f6",
                            "#8b5cf6","#06b6d4","#ec4899","#84cc16",
                          ][i % 8],
                        }}
                      />
                      <span className="text-sm text-slate-600 flex-1">{a.sector}</span>
                      <span className="text-sm font-medium text-slate-700 tabular-nums">
                        {a.percentage.toFixed(1)}%
                      </span>
                      <span className="text-xs text-slate-400 tabular-nums w-24 text-left">
                        {formatUSD(a.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Holdings Table */}
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
