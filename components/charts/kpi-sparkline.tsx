"use client"

import * as React from "react"
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
} from "recharts"

// ── Types ─────────────────────────────────────────────────────────────
export interface KpiSparklineProps {
  data: number[]
  color?: string
  height?: number
}

// ── Component ─────────────────────────────────────────────────────────
export function KpiSparkline({
  data,
  color = "var(--color-primary)",
  height = 40,
}: KpiSparklineProps) {
  // Recharts veut un tableau d'objets
  const chartData = data.map((v, i) => ({ i, v }))

  return (
    <div data-testid="kpi-sparkline" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Tooltip
            contentStyle={{ display: "none" }}
            cursor={false}
          />
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
