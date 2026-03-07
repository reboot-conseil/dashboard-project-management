"use client";

import * as React from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────
interface TendancePoint {
  mois: string;
  ca: number | null;
  marge: number | null;
  caPrevu: number | null;
  margePrevu: number | null;
  objectif: number | null;
  isFutur: boolean;
}

interface TendancesPrevisionsChartProps {
  data: TendancePoint[];
  projectionQ2: number;
  moyenneCA3Mois: number;
  objectifMensuel?: number;
}

// ── Formatters ─────────────────────────────────────────────────────────
function formatK(v: number) {
  if (Math.abs(v) >= 1000) return `${Math.round(v / 1000)}k€`;
  return `${Math.round(v)}€`;
}

function formatEuros(v: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);
}

// ── Custom Tooltip ─────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;

  const entries = payload.filter((p: any) => p.value !== null && p.value !== undefined);

  return (
    <div className="rounded-lg border border-border bg-card shadow-lg p-3 text-sm min-w-[170px]">
      <p className="font-semibold capitalize mb-2">{label}</p>
      {entries.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-4 rounded-sm shrink-0"
              style={{
                backgroundColor: entry.stroke || entry.fill,
                opacity: entry.strokeDasharray ? 0.7 : 1,
              }}
            />
            <span className="text-muted-foreground text-xs">{entry.name}</span>
          </div>
          <span className="font-medium tabular-nums text-xs">
            {formatEuros(Number(entry.value))}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────
export function TendancesPrevisionsChart({
  data,
  projectionQ2,
  moyenneCA3Mois,
}: TendancesPrevisionsChartProps) {
  if (!data || data.length === 0) {
    return (
      <p className="text-center py-10 text-muted-foreground text-sm">
        Données insuffisantes pour les prévisions
      </p>
    );
  }

  // Index de séparation passé/futur
  const dernierReelIndex = data.findLastIndex((d) => !d.isFutur);
  const premierFuturMois = data.find((d) => d.isFutur)?.mois;

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.ca ?? 0, d.caPrevu ?? 0, d.objectif ?? 0, 0))
  );

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />

          {/* Zone future (fond gris léger) */}
          {premierFuturMois && data[data.length - 1]?.mois && (
            <ReferenceArea
              x1={premierFuturMois}
              x2={data[data.length - 1].mois}
              fill="var(--color-muted)"
              fillOpacity={0.25}
            />
          )}

          {/* Ligne "Aujourd'hui" */}
          {dernierReelIndex >= 0 && dernierReelIndex < data.length - 1 && (
            <ReferenceLine
              x={data[dernierReelIndex]?.mois}
              stroke="var(--color-muted-foreground)"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
              label={{
                value: "Aujourd'hui",
                position: "insideTopRight",
                fontSize: 10,
                fill: "var(--color-muted-foreground)",
              }}
            />
          )}

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
            tickFormatter={formatK}
            width={44}
            domain={[0, Math.ceil(maxVal * 1.15)]}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--color-border)" }} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            formatter={(value) => (
              <span style={{ color: "var(--color-muted-foreground)" }}>{value}</span>
            )}
          />

          {/* Objectif mensuel */}
          <Line
            dataKey="objectif"
            name="Objectif"
            stroke="var(--color-muted-foreground)"
            strokeWidth={1}
            strokeDasharray="6 4"
            dot={false}
            connectNulls
          />

          {/* CA réalisé (plein) */}
          <Line
            dataKey="ca"
            name="CA réalisé"
            stroke="#2563eb"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#2563eb", strokeWidth: 0 }}
            activeDot={{ r: 6 }}
            connectNulls={false}
          />

          {/* CA prévu (pointillé) */}
          <Line
            dataKey="caPrevu"
            name="CA prévu"
            stroke="#2563eb"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 3, fill: "#2563eb", strokeWidth: 0, opacity: 0.7 }}
            connectNulls={false}
          />

          {/* Marge réalisée */}
          <Line
            dataKey="marge"
            name="Marge réalisée"
            stroke="#16a34a"
            strokeWidth={2}
            dot={{ r: 3, fill: "#16a34a", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />

          {/* Marge prévue (pointillé) */}
          <Line
            dataKey="margePrevu"
            name="Marge prévue"
            stroke="#16a34a"
            strokeWidth={1.5}
            strokeDasharray="5 5"
            dot={{ r: 2, fill: "#16a34a", strokeWidth: 0, opacity: 0.7 }}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Légende réel vs prévision + stats */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs px-1 pt-1 border-t border-border">
        {/* Légende visuelle */}
        <div className="flex items-center gap-4 text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <svg width="24" height="10" aria-hidden="true">
              <line x1="0" y1="5" x2="24" y2="5" stroke="#2563eb" strokeWidth="2.5" />
            </svg>
            <span>Données réelles</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg width="24" height="10" aria-hidden="true">
              <line x1="0" y1="5" x2="24" y2="5" stroke="#2563eb" strokeWidth="2" strokeDasharray="5 4" opacity="0.8" />
            </svg>
            <span>Prévisions</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-muted-foreground">Projection 3 mois</p>
            <p className="font-semibold text-foreground text-sm">{formatEuros(projectionQ2)}</p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground">Moy. CA / mois</p>
            <p className="font-semibold text-foreground text-sm">{formatEuros(moyenneCA3Mois)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
