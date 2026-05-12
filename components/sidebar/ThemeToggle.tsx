"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Skeleton while hydrating to prevent mismatch
  if (!mounted) {
    return (
      <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl">
        <div className="h-7 w-14 rounded-full bg-slate-200/70 animate-pulse shrink-0" />
        <span className="h-3 w-16 rounded bg-slate-200/70 animate-pulse group-data-[collapsible=icon]:hidden" />
      </div>
    )
  }

  const isDark = resolvedTheme === "dark"

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "flex items-center gap-2.5 px-2 py-1.5 rounded-xl w-full transition-colors",
        "hover:bg-black/5 dark:hover:bg-white/5"
      )}
    >
      {/* Track — dir=ltr keeps internal coordinate system LTR so framer x animation is correct in RTL sidebar */}
      <div
        dir="ltr"
        className={cn(
          "relative h-8 w-[60px] rounded-full shrink-0 transition-colors duration-300 border",
          isDark
            ? "bg-slate-800 border-slate-700/60"
            : "bg-slate-200/80 border-slate-300/60"
        )}
      >
        {/* Background icons */}
        <div className="absolute inset-0 flex items-center justify-between px-[6px] pointer-events-none">
          <Moon className={cn(
            "h-4 w-4 transition-opacity",
            isDark ? "opacity-80 text-slate-300" : "opacity-30 text-slate-500"
          )} />
          <Sun className={cn(
            "h-4 w-4 transition-opacity",
            !isDark ? "opacity-90 text-amber-600" : "opacity-25 text-slate-500"
          )} />
        </div>

        {/* Sliding thumb — x:2 = left/dark, x:30 = right/light (for 60px track, 28px thumb) */}
        <motion.div
          className="absolute top-[2px] h-7 w-7 rounded-full shadow-sm flex items-center justify-center"
          style={{ backgroundColor: "#ffe26f" }}
          animate={{ x: isDark ? 2 : 30 }}
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        >
          {isDark
            ? <Moon className="h-3.5 w-3.5 text-slate-800" />
            : <Sun className="h-3.5 w-3.5 text-slate-800" />
          }
        </motion.div>
      </div>

      {/* Label — hidden when sidebar is icon-only */}
      <span className="text-[13px] font-medium text-slate-600 dark:text-slate-400 group-data-[collapsible=icon]:hidden select-none">
        {isDark ? "מצב לילה" : "מצב יום"}
      </span>
    </button>
  )
}
