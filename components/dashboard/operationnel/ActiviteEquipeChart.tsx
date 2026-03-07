"use client";

import * as React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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

  const entries = payload.filter((p: any) => (Number(p.value) || 0) > 0);

  return (
    <div className="rounded-lg border border-border bg-card shadow-lg p-3 text-sm min-w-[160px]">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {entries.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: entry.stroke }}
            />
            <span className="text-muted-foreground text-xs">{entry.name}</span>
          </div>
          <span className="font-medium tabular-nums text-xs">{entry.value}h</span>
        </div>
      ))}
    </div>
  );
}

// ── Légende compacte ───────────────────────────────────────────────────
function CustomLegend({ consultants }: { consultants: ConsultantChart[] }) {
  return (
    <div className="flex flex-wrap gap-3 justify-center mt-2">
      {consultants.map((c) => (
        <div key={c.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="inline-block h-2 w-4 rounded-sm shrink-0" style={{ backgroundColor: c.couleur }} />
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
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <defs>
            {consultants.map((c) => (
              <linearGradient key={c.id} id={`grad-${c.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={c.couleur} stopOpacity={0.18} />
                <stop offset="95%" stopColor={c.couleur} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
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
            width={32}
          />
          <ReferenceLine
            y={8}
            stroke="var(--color-muted-foreground)"
            strokeDasharray="4 4"
            strokeOpacity={0.35}
            label={{ value: "8h", position: "insideTopRight", fontSize: 10, fill: "var(--color-muted-foreground)" }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--color-border)" }} />
          {consultants.map((c) => (
            <Area
              key={c.id}
              dataKey={c.nom}
              name={c.nom}
              stroke={c.couleur}
              strokeWidth={2}
              fill={`url(#grad-${c.id})`}
              dot={false}
              activeDot={{ r: 4, fill: c.couleur, strokeWidth: 0 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      <CustomLegend consultants={consultants} />
    </div>
  );
}
