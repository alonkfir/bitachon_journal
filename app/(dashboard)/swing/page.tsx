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
    <div className="space-y-6 w-full pb-24 md:pb-0">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 truncate">יומן סווינג</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-0.5">עקוב ונתח את עסקאות הסווינג שלך</p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="shrink-0 hidden md:flex">
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

      {/* Floating action button — mobile only */}
      <button
        onClick={() => setFormOpen(true)}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:hidden flex items-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-full shadow-lg hover:bg-slate-700 active:scale-95 transition-all text-sm font-semibold"
        aria-label="עסקה חדשה"
      >
        <Plus className="h-5 w-5" />
        עסקה חדשה
      </button>
    </div>
  )
}
