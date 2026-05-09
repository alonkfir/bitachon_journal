"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { TickerAllocation } from "@/lib/types"
import { formatUSD } from "@/lib/calculations"

const COLORS = [
  "#14b8a6", // teal-500
  "#8b5cf6", // violet-500
  "#f97316", // orange-500
  "#06b6d4", // cyan-500
  "#a855f7", // purple-500
  "#f59e0b", // amber-500
  "#0ea5e9", // sky-500
  "#ec4899", // pink-500
  "#10b981", // emerald-500
  "#6366f1", // indigo-500
]

interface AllocationChartProps {
  allocations: TickerAllocation[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SliceLabel(props: any) {
  const { cx, cy, midAngle, innerRadius, outerRadius, payload, percent } = props as {
    cx: number; cy: number; midAngle: number
    innerRadius: number; outerRadius: number
    payload: TickerAllocation; percent: number
  }
  if (percent < 0.04) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={13}
      fontWeight="800"
      stroke="rgba(0,0,0,0.55)"
      strokeWidth={0.65}
      paintOrder="stroke"
    >
      {`${payload.ticker}: ${payload.percentage.toFixed(1)}%`}
    </text>
  )
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: TickerAllocation }>
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border bg-white px-4 py-3 shadow-lg text-sm">
      <p className="font-semibold text-slate-800 mb-1">{d.ticker}</p>
      <p className="text-slate-500">{formatUSD(d.amount)}</p>
      <p className="text-slate-400">{d.percentage.toFixed(1)}% מהתיק</p>
    </div>
  )
}

export function AllocationChart({ allocations }: AllocationChartProps) {
  return (
    <ResponsiveContainer width="100%" height={440}>
      <PieChart>
        <Pie
          data={allocations}
          dataKey="amount"
          nameKey="ticker"
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={170}
          paddingAngle={2}
          label={SliceLabel}
          labelLine={false}
        >
          {allocations.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="white" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  )
}
