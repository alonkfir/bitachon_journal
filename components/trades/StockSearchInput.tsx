"use client"

import { useEffect, useRef, useState } from "react"
import { Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"

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
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<StockResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setQuery(value) }, [value])

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
    if (!val.trim()) { setResults([]); setOpen(false); return }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/stock/search?q=${encodeURIComponent(val)}`)
        const data = await res.json()
        // Only US common stocks, no dots in symbol (filters out foreign listings)
        const filtered: StockResult[] = (data.result ?? [])
          .filter((r: StockResult) => r.symbol && !r.symbol.includes(".") && r.type === "Common Stock")
          .slice(0, 7)
        setResults(filtered)
        setOpen(filtered.length > 0)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 350)
  }

  async function handleSelect(stock: StockResult) {
    setQuery(stock.symbol)
    setOpen(false)
    setResults([])

    const [profileRes, quoteRes] = await Promise.allSettled([
      fetch(`/api/stock/profile?symbol=${stock.symbol}`),
      fetch(`/api/stock/quote?symbol=${stock.symbol}`),
    ])

    let logoUrl: string | null = null
    let livePrice: number | null = null

    if (profileRes.status === "fulfilled") {
      const profile = await profileRes.value.json()
      logoUrl = profile.logo || null
    }
    if (quoteRes.status === "fulfilled") {
      const quote = await quoteRes.value.json()
      livePrice = quote.c ?? null
    }

    onSelect(stock.symbol, logoUrl, livePrice)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="חפש סמל... AAPL, TSLA"
          dir="ltr"
          className="pr-9 uppercase placeholder:normal-case placeholder:text-slate-400"
        />
        {loading && (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-lg border bg-white shadow-xl overflow-hidden">
          {results.map((stock) => (
            <button
              key={stock.symbol}
              type="button"
              onClick={() => handleSelect(stock)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors text-right border-b last:border-0"
            >
              <TickerAvatar symbol={stock.symbol} size="sm" />
              <div className="flex-1 min-w-0 text-right">
                <div className="font-semibold text-sm text-slate-900">{stock.symbol}</div>
                <div className="text-xs text-slate-400 truncate">{stock.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Reusable avatar: shows logo image if available, else colored letter circle
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
      {symbol[0]}
    </div>
  )
}
