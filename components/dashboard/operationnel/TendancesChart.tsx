"use client";

import * as React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────
interface TendancePoint {
  mois: string;
  ca: number;
  marge: number;
  heures: number;
}

interface TendancesChartProps {
  data: TendancePoint[];
  objectifCA?: number; // Optionnel : ligne de référence objectif mensuel
}

// ── Formatters ─────────────────────────────────────────────────────────
function formatEuros(v: number) {
  if (v >= 1000) return `${Math.round(v / 1000)}k€`;
  return `${v}€`;
}

// ── Custom Tooltip ─────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;

  const ca = payload.find((p: any) => p.dataKey === "ca")?.value ?? 0;
  const marge = payload.find((p: any) => p.dataKey === "marge")?.value ?? 0;
  const tauxMarge = ca > 0 ? Math.round((marge / ca) * 1000) / 10 : 0;

  return (
    <div className="rounded-lg border border-border bg-card shadow-lg p-3 text-sm min-w-[180px]">
      <p className="font-semibold text-foreground mb-2 capitalize">{label}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-4 rounded-full bg-primary" />
            <span className="text-muted-foreground">CA</span>
          </div>
          <span className="font-medium tabular-nums">
            {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(ca)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-4 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Marge</span>
          </div>
          <span className="font-medium tabular-nums text-emerald-600">
            {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(marge)}
            {ca > 0 && <span className="text-xs ml-1 opacity-70">({tauxMarge}%)</span>}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────
export function TendancesChart({ data, objectifCA }: TendancesChartProps) {
  if (!data || data.length === 0) {
    return (
      <p className="text-center py-10 text-muted-foreground text-sm">
        Aucune donnée de tendance disponible
      </p>
    );
  }

  const maxCA = Math.max(...data.map((d) => d.ca), objectifCA ?? 0);

  return (
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="mois"
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatEuros}
            width={44}
            domain={[0, Math.ceil(maxCA * 1.1)]}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(value) => (
              <span style={{ color: "var(--color-muted-foreground)" }}>{value}</span>
            )}
          />

          {/* Ligne objectif (pointillée) */}
          {objectifCA && objectifCA > 0 && (
            <ReferenceLine
              y={objectifCA}
              stroke="var(--color-muted-foreground)"
              strokeDasharray="6 4"
              strokeOpacity={0.6}
              label={{
                value: `Objectif ${formatEuros(objectifCA)}`,
                position: "insideTopRight",
                fontSize: 10,
                fill: "var(--color-muted-foreground)",
              }}
            />
          )}

          <Line
            type="monotone"
            dataKey="ca"
            name="CA"
            stroke="#2563eb"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#2563eb", strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="marge"
            name="Marge"
            stroke="#16a34a"
            strokeWidth={2}
            dot={{ r: 3, fill: "#16a34a", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
