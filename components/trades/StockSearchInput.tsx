"use client"

import { useEffect, useRef, useState } from "react"
import { Search, Loader2, CornerDownLeft } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface StockResult {
  symbol: string
  description: string
  type: string
}

interface StockSearchInputProps {
  value: string
  onSelect: (symbol: string, logoUrl: string | null, livePrice: number | null) => void
}

export function StockSearchInput({ value, onSelect }: StockSearchInputProps) {
  const [query, setQuery]       = useState(value)
  const [results, setResults]   = useState<StockResult[]>([])
  const [loading, setLoading]   = useState(false)
  const [open, setOpen]         = useState(false)
  const [searched, setSearched] = useState(false)  // true after at least one API call completes
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef  = useRef<HTMLDivElement>(null)

  useEffect(() => { setQuery(value) }, [value])

  // Close dropdown on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => document.removeEventListener("mousedown", onMouseDown)
  }, [])

  function handleChange(val: string) {
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!val.trim()) {
      setResults([])
      setOpen(false)
      setSearched(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/stock/search?q=${encodeURIComponent(val)}`)
        if (!res.ok) { setResults([]); return }
        const data = await res.json()

        // Accept Common Stock AND ETP (Finnhub's type for all ETFs including leveraged)
        // Keep the no-dot filter to exclude foreign listings (e.g. "AAPL.DE")
        const filtered: StockResult[] = (data.result ?? [])
          .filter((r: StockResult) =>
            r.symbol &&
            !r.symbol.includes(".") &&
            (r.type === "Common Stock" || r.type === "ETP"),
          )
          .slice(0, 7)

        setResults(filtered)
        setOpen(filtered.length > 0)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
        setSearched(true)
      }
    }, 500)
  }

  // Select a ticker found by the API: fetch logo + live price
  async function handleSelect(stock: StockResult) {
    setQuery(stock.symbol)
    setOpen(false)
    setResults([])
    setSearched(false)

    const [profileRes, quoteRes] = await Promise.allSettled([
      fetch(`/api/stock/profile?symbol=${encodeURIComponent(stock.symbol)}`),
      fetch(`/api/stock/quote?symbol=${encodeURIComponent(stock.symbol)}`),
    ])

    let logoUrl: string | null = null
    let livePrice: number | null = null

    if (profileRes.status === "fulfilled") {
      const profile = await profileRes.value.json()
      logoUrl = profile.logo || null
    }
    if (quoteRes.status === "fulfilled") {
      const quote = await quoteRes.value.json()
      livePrice = typeof quote.c === "number" && quote.c > 0 ? quote.c : null
    }

    onSelect(stock.symbol, logoUrl, livePrice)
  }

  // Manual entry: best-effort API fetch, then always calls onSelect
  async function handleManualSelect(rawSymbol: string) {
    const sym = rawSymbol.trim().toUpperCase()
    if (!sym) return

    setQuery(sym)
    setOpen(false)
    setResults([])
    setSearched(false)

    let logoUrl: string | null = null
    let livePrice: number | null = null

    try {
      const [profileRes, quoteRes] = await Promise.allSettled([
        fetch(`/api/stock/profile?symbol=${encodeURIComponent(sym)}`),
        fetch(`/api/stock/quote?symbol=${encodeURIComponent(sym)}`),
      ])
      if (profileRes.status === "fulfilled") {
        const profile = await profileRes.value.json()
        logoUrl = profile.logo || null
      }
      if (quoteRes.status === "fulfilled") {
        const quote = await quoteRes.value.json()
        livePrice = typeof quote.c === "number" && quote.c > 0 ? quote.c : null
      }
    } catch {
      // Silently ignore — manual entry succeeds regardless
    }

    onSelect(sym, logoUrl, livePrice)
  }

  const trimmedQuery = query.trim()
  const hasResults   = results.length > 0
  // Show the dropdown panel once a search has completed (with or without results)
  const showPanel    = trimmedQuery.length > 0 && !loading && searched

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              // First result gets priority; otherwise use what was typed
              if (hasResults && open) {
                handleSelect(results[0])
              } else if (trimmedQuery) {
                handleManualSelect(trimmedQuery)
              }
            }
            if (e.key === "Escape") {
              setOpen(false)
            }
          }}
          placeholder="חפש סמל... AAPL, TSLA, METU"
          dir="ltr"
          className="pr-9 uppercase placeholder:normal-case placeholder:text-slate-400"
        />
        {loading && (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />
        )}
      </div>

      {showPanel && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-lg border bg-white shadow-xl overflow-hidden">

          {/* API results */}
          {hasResults && results.map((stock) => (
            <button
              key={stock.symbol}
              type="button"
              onClick={() => handleSelect(stock)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors text-right border-b last:border-b-0"
            >
              <TickerAvatar symbol={stock.symbol} size="sm" />
              <div className="flex-1 min-w-0 text-right">
                <div className="font-semibold text-sm text-slate-900">{stock.symbol}</div>
                <div className="text-xs text-slate-400 truncate">{stock.description}</div>
              </div>
            </button>
          ))}

          {/* Manual entry fallback — always shown after a search */}
          <button
            type="button"
            onClick={() => handleManualSelect(trimmedQuery)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-right hover:bg-slate-50",
              hasResults ? "border-t bg-slate-50/60" : "",
            )}
          >
            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              <CornerDownLeft className="h-3.5 w-3.5 text-slate-500" />
            </div>
            <div className="flex-1 min-w-0 text-right">
              <div className="font-semibold text-sm text-slate-800">
                השתמש ב-{trimmedQuery.toUpperCase()} ישירות
              </div>
              <div className="text-xs text-slate-400">
                {hasResults ? "הכנסה ידנית" : "לא נמצאו תוצאות — הכנסה ידנית"}
              </div>
            </div>
          </button>

        </div>
      )}
    </div>
  )
}

// ── TickerAvatar ──────────────────────────────────────────────────────────────

const COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
]

function letterColor(symbol: string) {
  return COLORS[symbol.charCodeAt(0) % COLORS.length]
}

interface TickerAvatarProps {
  symbol: string
  logoUrl?: string | null
  size?: "sm" | "md"
}

export function TickerAvatar({ symbol, logoUrl, size = "md" }: TickerAvatarProps) {
  const [imgError, setImgError] = useState(false)
  const dim = size === "sm" ? "w-7 h-7 text-xs" : "w-8 h-8 text-sm"

  if (logoUrl && !imgError) {
    return (
      <img
        src={logoUrl}
        alt={symbol}
        onError={() => setImgError(true)}
        className={`${dim} rounded-full object-contain border border-slate-100 bg-white shrink-0`}
      />
    )
  }

  return (
    <div className={`${dim} rounded-full flex items-center justify-center font-bold shrink-0 ${letterColor(symbol)}`}>
      {symbol[0]?.toUpperCase() ?? "?"}
    </div>
  )
}
