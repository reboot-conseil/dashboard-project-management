"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────
interface ConsultantChart {
  id: number;
  nom: string;
  couleur: string;
}

interface ActiviteEquipeChartProps {
  data: Record<string, unknown>[];
  consultants: ConsultantChart[];
}

// ── Custom Tooltip ─────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;

  const total = payload.reduce((s: number, p: any) => s + (Number(p.value) || 0), 0);

  return (
    <div className="rounded-lg border border-border bg-card shadow-lg p-3 text-sm min-w-[180px]">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((entry: any) => (
        entry.value > 0 && (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4 mb-1">
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: entry.fill }}
              />
              <span className="text-muted-foreground">{entry.name}</span>
            </div>
            <span className="font-medium tabular-nums">{entry.value}h</span>
          </div>
        )
      ))}
      <div className="border-t border-border mt-2 pt-2 flex justify-between">
        <span className="text-muted-foreground font-medium">Total</span>
        <span className="font-bold tabular-nums">{Math.round(total * 10) / 10}h</span>
      </div>
    </div>
  );
}

// ── Custom Legend ──────────────────────────────────────────────────────
function CustomLegend({ consultants }: { consultants: ConsultantChart[] }) {
  return (
    <div className="flex flex-wrap gap-3 justify-center mt-2">
      {consultants.map((c) => (
        <div key={c.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className="inline-block h-3 w-3 rounded-sm shrink-0"
            style={{ backgroundColor: c.couleur }}
          />
          {c.nom}
        </div>
      ))}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────
export function ActiviteEquipeChart({ data, consultants }: ActiviteEquipeChartProps) {
  if (!data || data.length === 0 || consultants.length === 0) {
    return (
      <p className="text-center py-10 text-muted-foreground text-sm">
        Aucune activité sur les 7 derniers jours
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="jour"
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}h`}
            width={36}
          />
          {/* Ligne 8h = journée standard */}
          <ReferenceLine
            y={8}
            stroke="var(--color-muted-foreground)"
            strokeDasharray="4 4"
            strokeOpacity={0.4}
            label={{ value: "8h", position: "insideTopRight", fontSize: 10, fill: "var(--color-muted-foreground)" }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-muted)", opacity: 0.4 }} />
          {consultants.map((c) => (
            <Bar
              key={c.id}
              dataKey={c.nom}
              stackId="equipe"
              fill={c.couleur}
              name={c.nom}
              radius={consultants[consultants.length - 1].id === c.id ? [3, 3, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <CustomLegend consultants={consultants} />
    </div>
  );
}
