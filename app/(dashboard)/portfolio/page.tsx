"use client"

import { useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { PortfolioHolding, PortfolioPurchase } from "@/lib/types"
import { tickerAllocations, formatUSD } from "@/lib/calculations"
import { createClient } from "@/lib/supabase/client"
import { AllocationChart } from "@/components/portfolio/AllocationChart"
import { PortfolioTable } from "@/components/portfolio/PortfolioTable"
import { PortfolioForm } from "@/components/portfolio/PortfolioForm"
import { PurchaseHistoryPanel } from "@/components/portfolio/PurchaseHistoryPanel"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

const CHART_COLORS = [
  "#14b8a6","#8b5cf6","#f97316","#06b6d4",
  "#a855f7","#f59e0b","#0ea5e9","#ec4899",
  "#10b981","#6366f1",
]

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([])
  const [purchases, setPurchases] = useState<PortfolioPurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editHolding, setEditHolding] = useState<PortfolioHolding | null>(null)

  async function fetchAll() {
    setLoading(true)
    const supabase = createClient()

    const [holdingsRes, purchasesRes] = await Promise.all([
      supabase.from("portfolio").select("*").order("amount", { ascending: false }),
      supabase.from("portfolio_purchases").select("*").order("purchase_date", { ascending: false }),
    ])

    if (!holdingsRes.error && holdingsRes.data) setHoldings(holdingsRes.data)
    if (!purchasesRes.error && purchasesRes.data) setPurchases(purchasesRes.data)
    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
  }, [])

  function handleEdit(h: PortfolioHolding) {
    setEditHolding(h)
    setFormOpen(true)
  }

  function handleFormClose() {
    setFormOpen(false)
    setEditHolding(null)
    fetchAll()
  }

  const allocations = tickerAllocations(holdings)
  const totalValue = holdings.reduce((s, h) => s + h.amount, 0)

  return (
    <div className="space-y-5 w-full">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">תיק השקעות</h1>
          <p className="text-slate-500 text-sm mt-0.5">פיזור ארוך-טווח לפי ניירות ערך</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 ml-1" />
          הוסף נייר ערך
        </Button>
      </div>

      {/* Split-panel dashboard — 65 / 35 */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,13fr)_minmax(0,7fr)] items-start">

        {/* ── LEFT COLUMN (65%) ── */}
        <div className="space-y-5">

          {/* Total Portfolio Value */}
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="px-6 py-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">
                שווי תיק כולל
              </p>
              {loading ? (
                <Skeleton className="h-10 w-48 mt-1" />
              ) : (
                <p className="text-4xl font-bold text-slate-900 tabular-nums leading-none">
                  {formatUSD(totalValue)}
                </p>
              )}
              <p className="text-xs text-slate-400 mt-1.5">{holdings.length} ניירות ערך</p>
            </CardContent>
          </Card>

          {/* Pie Chart */}
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-1 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-slate-700">פיזור לפי ניירות ערך</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {loading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <Skeleton className="h-52 w-52 rounded-full" />
                </div>
              ) : allocations.length > 0 ? (
                <>
                  <AllocationChart allocations={allocations} />
                  {/* Compact legend */}
                  <div className="mt-3 pt-3 border-t grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-1.5">
                    {allocations.map((a, i) => (
                      <div key={a.ticker} className="flex items-center gap-1.5 min-w-0">
                        <div
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                        <span className="text-xs font-medium text-slate-600 truncate">{a.ticker}</span>
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

          {/* Holdings Table */}
          <PortfolioTable
            holdings={holdings}
            purchases={purchases}
            onEdit={handleEdit}
            onRefresh={fetchAll}
          />
        </div>

        {/* ── RIGHT COLUMN (35%) ── */}
        <PurchaseHistoryPanel purchases={purchases} loading={loading} />
      </div>

      <PortfolioForm
        open={formOpen}
        holding={editHolding}
        onClose={handleFormClose}
      />
    </div>
  )
}
