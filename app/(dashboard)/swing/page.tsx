"use client"

import { useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { Trade } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { StatsStrip } from "@/components/trades/StatsStrip"
import { TradesTable } from "@/components/trades/TradesTable"
import { TradeForm } from "@/components/trades/TradeForm"
import { Button } from "@/components/ui/button"

export default function SwingPage() {
  const [trades, setTrades]                 = useState<Trade[]>([])
  const [loading, setLoading]               = useState(true)
  const [formOpen, setFormOpen]             = useState(false)
  const [editTrade, setEditTrade]           = useState<Trade | null>(null)
  const [initialBalance, setInitialBalance] = useState(0)

  async function fetchAll() {
    const supabase = createClient()
    const [tradesRes, settingsRes] = await Promise.all([
      supabase.from("trades").select("*").order("entry_date", { ascending: false }),
      supabase.from("user_settings").select("initial_balance").maybeSingle(),
    ])
    if (!tradesRes.error && tradesRes.data) setTrades(tradesRes.data)
    if (!settingsRes.error && settingsRes.data)
      setInitialBalance(Number(settingsRes.data.initial_balance))
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  async function handleUpdateBalance(value: number) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase
      .from("user_settings")
      .upsert({ user_id: user.id, initial_balance: value }, { onConflict: "user_id" })
    setInitialBalance(value)
  }

  function handleEdit(trade: Trade) {
    setEditTrade(trade)
    setFormOpen(true)
  }

  function handleFormClose() {
    setFormOpen(false)
    setEditTrade(null)
    fetchAll()
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

      <StatsStrip
        trades={trades}
        loading={loading}
        initialBalance={initialBalance}
        onUpdateBalance={handleUpdateBalance}
      />

      <TradesTable
        trades={trades}
        loading={loading}
        onEdit={handleEdit}
        onRefresh={fetchAll}
      />

      <TradeForm open={formOpen} trade={editTrade} onClose={handleFormClose} />
    </div>
  )
}
