"use client"

import { useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { Trade } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { MetricsBar } from "@/components/trades/MetricsBar"
import { TradesTable } from "@/components/trades/TradesTable"
import { TradeForm } from "@/components/trades/TradeForm"
import { Button } from "@/components/ui/button"

export default function SwingPage() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editTrade, setEditTrade] = useState<Trade | null>(null)

  async function fetchTrades() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .order("entry_date", { ascending: false })
    if (!error && data) setTrades(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchTrades()
  }, [])

  function handleEdit(trade: Trade) {
    setEditTrade(trade)
    setFormOpen(true)
  }

  function handleFormClose() {
    setFormOpen(false)
    setEditTrade(null)
    fetchTrades()
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">יומן סווינג</h1>
          <p className="text-slate-500 text-sm mt-1">עקוב ונתח את עסקאות הסווינג שלך</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 ml-1" />
          עסקה חדשה
        </Button>
      </div>

      <MetricsBar trades={trades} loading={loading} />

      <TradesTable
        trades={trades}
        loading={loading}
        onEdit={handleEdit}
        onRefresh={fetchTrades}
      />

      <TradeForm open={formOpen} trade={editTrade} onClose={handleFormClose} />
    </div>
  )
}
