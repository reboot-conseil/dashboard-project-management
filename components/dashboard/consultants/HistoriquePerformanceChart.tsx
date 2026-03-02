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
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────
interface MoisData {
  mois: string;
  heures: number;
  ca: number;
  occupation: number;
}

interface HistoriquePerformanceChartProps {
  data: MoisData[];
  moy6Heures: number;
  moy6CA: number;
  moy6Occ: number;
  tendanceGlobale: "hausse" | "baisse" | "stable";
}

// ── Formatters ─────────────────────────────────────────────────────────
function formatEuros(v: number) {
  if (Math.abs(v) >= 1000) return `${Math.round(v / 1000)}k€`;
  return `${Math.round(v)}€`;
}

// ── Custom Tooltip ─────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;

  const heures = payload.find((p: any) => p.dataKey === "heures")?.value;
  const ca = payload.find((p: any) => p.dataKey === "ca")?.value;
  const occupation = payload.find((p: any) => p.dataKey === "occupation")?.value;

  return (
    <div className="rounded-lg border border-border bg-card shadow-lg p-3 text-sm min-w-[180px]">
      <p className="font-semibold capitalize mb-2">{label}</p>
      {heures !== undefined && (
        <div className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 rounded-sm bg-[#2563eb]" />
            <span className="text-xs text-muted-foreground">Heures</span>
          </div>
          <span className="font-medium text-xs tabular-nums">{heures}h</span>
        </div>
      )}
      {ca !== undefined && (
        <div className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 rounded-sm bg-[#16a34a]" />
            <span className="text-xs text-muted-foreground">CA</span>
          </div>
          <span className="font-medium text-xs tabular-nums">{formatEuros(ca)}</span>
        </div>
      )}
      {occupation !== undefined && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 rounded-sm bg-[#ea580c]" />
            <span className="text-xs text-muted-foreground">Occupation</span>
          </div>
          <span className="font-medium text-xs tabular-nums">{occupation}%</span>
        </div>
      )}
    </div>
  );
}

// ── Tendance icon ──────────────────────────────────────────────────────
function TendanceIcon({ t }: { t: "hausse" | "baisse" | "stable" }) {
  if (t === "hausse") return <span className="text-emerald-600">↗ En progression</span>;
  if (t === "baisse") return <span className="text-destructive">↘ En baisse</span>;
  return <span className="text-amber-600">→ Stable</span>;
}

// ── Component ──────────────────────────────────────────────────────────
export function HistoriquePerformanceChart({
  data,
  moy6Heures,
  moy6CA,
  moy6Occ,
  tendanceGlobale,
}: HistoriquePerformanceChartProps) {
  if (!data || data.length === 0) {
    return (
      <p className="text-center py-10 text-muted-foreground text-sm">
        Données insuffisantes pour l'historique
      </p>
    );
  }

  const maxCA = Math.max(...data.map((d) => d.ca), 1);
  const maxH = Math.max(...data.map((d) => d.heures), 1);

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            vertical={false}
          />
          <XAxis
            dataKey="mois"
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />

          {/* Axe gauche : heures + occupation */}
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            width={36}
            domain={[0, Math.ceil(Math.max(maxH, 100) * 1.1)]}
            tickFormatter={(v) => `${v}`}
          />

          {/* Axe droit : CA */}
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            width={48}
            domain={[0, Math.ceil(maxCA * 1.15)]}
            tickFormatter={formatEuros}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--color-border)" }} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            formatter={(value) => (
              <span style={{ color: "var(--color-muted-foreground)" }}>{value}</span>
            )}
          />

          <Line
            yAxisId="left"
            type="monotone"
            dataKey="heures"
            name="Heures"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ r: 4, fill: "#2563eb", strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="ca"
            name="CA"
            stroke="#16a34a"
            strokeWidth={2}
            dot={{ r: 4, fill: "#16a34a", strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="occupation"
            name="Occupation %"
            stroke="#ea580c"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={{ r: 3, fill: "#ea580c", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Résumé */}
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-semibold mb-1">
              Tendance globale : <TendanceIcon t={tendanceGlobale} />
            </p>
            <p className="text-xs text-muted-foreground">Moyenne 6 mois</p>
          </div>
          <div className="flex gap-4 text-xs">
            <div className="text-center">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="inline-block w-2 h-2 rounded-sm bg-[#2563eb]" />
                <span className="text-muted-foreground">Heures</span>
              </div>
              <span className="font-semibold tabular-nums">{moy6Heures}h/mois</span>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="inline-block w-2 h-2 rounded-sm bg-[#16a34a]" />
                <span className="text-muted-foreground">CA</span>
              </div>
              <span className="font-semibold tabular-nums">{formatEuros(moy6CA)}/mois</span>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="inline-block w-2 h-2 rounded-sm bg-[#ea580c]" />
                <span className="text-muted-foreground">Occupation</span>
              </div>
              <span className="font-semibold tabular-nums">{moy6Occ}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
