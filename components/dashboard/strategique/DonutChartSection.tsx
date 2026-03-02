"use client";

import * as React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────
type DonutMode = "ca" | "cout" | "marge";

interface DonutEntry {
  id: number;
  nom: string;
  client: string;
  ca: number;
  cout: number;
  marge: number;
  couleur: string;
}

interface DonutChartSectionProps {
  data: DonutEntry[];
}

// ── Formatters ─────────────────────────────────────────────────────────
function formatEuros(v: number) {
  if (Math.abs(v) >= 1000) {
    return `${Math.round(v / 100) / 10}k€`;
  }
  return `${Math.round(v)}€`;
}

function formatEurosFull(v: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);
}

// ── Custom Tooltip ─────────────────────────────────────────────────────
function CustomTooltip({ active, payload, total }: any) {
  if (!active || !payload || !payload[0]) return null;
  const entry = payload[0].payload;
  const pct = total > 0 ? Math.round((entry.value / total) * 1000) / 10 : 0;
  return (
    <div className="rounded-lg border border-border bg-card shadow-lg p-3 text-sm max-w-[200px]">
      <p className="font-semibold truncate">{entry.nom}</p>
      <p className="text-xs text-muted-foreground mb-1">{entry.client}</p>
      <p className="font-bold">{formatEurosFull(entry.value)}</p>
      <p className="text-xs text-muted-foreground">{pct}% du total</p>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────
export function DonutChartSection({ data }: DonutChartSectionProps) {
  const [mode, setMode] = React.useState<DonutMode>("ca");

  const getValue = (entry: DonutEntry) => {
    if (mode === "ca") return entry.ca;
    if (mode === "cout") return entry.cout;
    return Math.max(entry.marge, 0); // marge négative → 0 dans donut
  };

  const chartData = data
    .map((d) => ({ ...d, value: getValue(d) }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const total = chartData.reduce((s, d) => s + d.value, 0);
  const top5 = chartData.slice(0, 5);

  const MODES: { key: DonutMode; label: string }[] = [
    { key: "ca", label: "CA" },
    { key: "cout", label: "Coûts" },
    { key: "marge", label: "Marge" },
  ];

  if (data.length === 0) {
    return (
      <p className="text-center py-10 text-sm text-muted-foreground">
        Aucune donnée financière disponible
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex gap-1">
        {MODES.map((m) => (
          <Button
            key={m.key}
            variant={mode === m.key ? "default" : "outline"}
            size="sm"
            onClick={() => setMode(m.key)}
            className="text-xs h-7 px-3"
          >
            {m.label}
          </Button>
        ))}
      </div>

      {/* Donut chart */}
      <div className="flex flex-col items-center">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              dataKey="value"
              paddingAngle={2}
            >
              {chartData.map((entry) => (
                <Cell key={entry.id} fill={entry.couleur} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip
              content={<CustomTooltip total={total} />}
              wrapperStyle={{ zIndex: 50 }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Total au centre (simulé sous le graphique) */}
        <p className="text-xs text-muted-foreground -mt-2">
          Total : <span className="font-semibold text-foreground">{formatEurosFull(total)}</span>
        </p>
      </div>

      {/* Légende top 5 */}
      <div className="space-y-2">
        {top5.map((entry) => {
          const pct = total > 0 ? Math.round((entry.value / total) * 1000) / 10 : 0;
          return (
            <div key={entry.id} className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-sm shrink-0"
                style={{ backgroundColor: entry.couleur }}
              />
              <span className="text-xs text-muted-foreground flex-1 truncate">
                {entry.nom}
              </span>
              <span className="text-xs font-medium tabular-nums">
                {formatEuros(entry.value)}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
                {pct}%
              </span>
            </div>
          );
        })}
        {chartData.length > 5 && (
          <p className="text-xs text-muted-foreground text-center">
            +{chartData.length - 5} autres projets
          </p>
        )}
      </div>
    </div>
  );
}
