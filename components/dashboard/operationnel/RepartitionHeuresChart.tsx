"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────
interface ProjetHeures {
  nom: string;
  couleur: string;
  heures: number;
  nbConsultants: number;
}

interface RepartitionHeuresChartProps {
  data: ProjetHeures[];
  periodeLabel: string;
}

// ── Custom Tooltip ──────────────────────────────────────────────────────
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload as ProjetHeures;
  return (
    <div className="rounded-lg border border-border bg-card shadow-lg p-3 text-sm min-w-[160px]">
      <p className="font-semibold text-foreground mb-1.5 truncate max-w-[180px]">{d.nom}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Heures</span>
          <span className="font-bold tabular-nums">{d.heures}h</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Etapes</span>
          <span className="font-medium tabular-nums">{d.nbConsultants}</span>
        </div>
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────
export function RepartitionHeuresChart({ data, periodeLabel }: RepartitionHeuresChartProps) {
  if (!data || data.length === 0) {
    return (
      <p className="text-center py-10 text-muted-foreground text-sm">
        Aucune activité enregistrée sur cette période
      </p>
    );
  }

  const maxHeures = Math.max(...data.map((d) => d.heures));
  const yDomain = [0, Math.ceil(maxHeures * 1.15 / 10) * 10];

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={data}
        margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
        barCategoryGap="30%"
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--color-border)"
          vertical={false}
        />
        <XAxis
          dataKey="nom"
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          interval={0}
          tickFormatter={(v: string) => v.length > 14 ? v.slice(0, 13) + "…" : v}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${v}h`}
          width={36}
          domain={yDomain}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
        />
        <Bar dataKey="heures" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.couleur} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
