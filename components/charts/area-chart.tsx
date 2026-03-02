"use client"

import * as React from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

// ── Types ─────────────────────────────────────────────────────────────
export interface AreaDef {
  key: string
  label: string
  color: string
}

export interface AreaChartWrapperProps {
  data: Record<string, unknown>[] | undefined
  xKey: string
  areas: AreaDef[]
  yFormatter?: (v: number) => string
  height?: number
  emptyMessage?: string
  showLegend?: boolean
}

// ── Component ─────────────────────────────────────────────────────────
export function AreaChartWrapper({
  data,
  xKey,
  areas,
  yFormatter,
  height = 280,
  emptyMessage = "Aucune donnée disponible",
  showLegend = true,
}: AreaChartWrapperProps) {
  if (!data || data.length === 0) {
    return (
      <p className="text-center py-10 text-muted-foreground text-sm">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div data-testid="area-chart-container">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <defs>
            {areas.map((area) => (
              <linearGradient
                key={`gradient-${area.key}`}
                id={`gradient-${area.key}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={area.color} stopOpacity={0.15} />
                <stop offset="95%" stopColor={area.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
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
            width={44}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              fontSize: "13px",
            }}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              formatter={(value) => (
                <span style={{ color: "var(--color-muted-foreground)" }}>{value}</span>
              )}
            />
          )}
          {areas.map((area) => (
            <Area
              key={area.key}
              type="monotone"
              dataKey={area.key}
              name={area.label}
              stroke={area.color}
              strokeWidth={2.5}
              fill={`url(#gradient-${area.key})`}
              dot={{ r: 3, fill: area.color, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
