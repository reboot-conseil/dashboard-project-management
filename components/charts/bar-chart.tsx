"use client"

import * as React from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

// ── Types ─────────────────────────────────────────────────────────────
export interface BarDef {
  key: string
  label: string
  color: string
}

export interface BarChartWrapperProps {
  data: Record<string, unknown>[] | undefined
  xKey: string
  bars: BarDef[]
  yFormatter?: (v: number) => string
  height?: number
  emptyMessage?: string
}

// ── Component ─────────────────────────────────────────────────────────
export function BarChartWrapper({
  data,
  xKey,
  bars,
  yFormatter,
  height = 280,
  emptyMessage = "Aucune donnée disponible",
}: BarChartWrapperProps) {
  if (!data || data.length === 0) {
    return (
      <p className="text-center py-10 text-muted-foreground text-sm">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div data-testid="bar-chart-container">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            vertical={false}
          />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={yFormatter}
            width={40}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              fontSize: "13px",
            }}
          />
          {bars.map((bar) => (
            <Bar
              key={bar.key}
              dataKey={bar.key}
              fill={bar.color}
              name={bar.label}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
