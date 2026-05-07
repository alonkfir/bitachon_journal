"use client"

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { SectorAllocation } from "@/lib/types"
import { formatUSD } from "@/lib/calculations"

const COLORS = [
  "#6366f1", // indigo
  "#10b981", // emerald
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
]

interface AllocationChartProps {
  allocations: SectorAllocation[]
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: SectorAllocation }> }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border bg-white px-4 py-3 shadow-lg text-sm">
      <p className="font-semibold text-slate-800 mb-1">{d.sector}</p>
      <p className="text-slate-500">{formatUSD(d.amount)}</p>
      <p className="text-slate-400">{d.percentage.toFixed(1)}% מהתיק</p>
    </div>
  )
}

export function AllocationChart({ allocations }: AllocationChartProps) {
  return (
    <ResponsiveContainer width="100%" height={360}>
      <PieChart>
        <Pie
          data={allocations}
          dataKey="amount"
          nameKey="sector"
          cx="50%"
          cy="50%"
          outerRadius={130}
          innerRadius={60}
          paddingAngle={2}
          label={false}
          labelLine={false}
        >
          {allocations.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="white" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => (
            <span className="text-sm text-slate-600">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
