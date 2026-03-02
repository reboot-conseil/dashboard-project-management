"use client";

import * as React from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
} from "date-fns";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────
export type PeriodeKey = "today" | "week" | "month" | "quarter" | "year" | "custom";

export interface DashboardFiltersValue {
  periode: PeriodeKey;
  dateDebut: string; // YYYY-MM-DD
  dateFin: string;   // YYYY-MM-DD
  projetId: string;  // 'all' ou ID
}

interface ProjetOption {
  id: number;
  nom: string;
  statut?: string;
  client?: string;
}

interface DashboardFiltersProps {
  value: DashboardFiltersValue;
  onChange: (filters: DashboardFiltersValue) => void;
  projets?: ProjetOption[];
  showProjetFilter?: boolean;
  defaultPeriode?: PeriodeKey;
  className?: string;
}

// ── Constants ──────────────────────────────────────────────────────────
const now = new Date();

const PERIODES: { key: PeriodeKey; label: string }[] = [
  { key: "today", label: "Aujourd'hui" },
  { key: "week", label: "Cette semaine" },
  { key: "month", label: "Ce mois" },
  { key: "quarter", label: "Ce trimestre" },
  { key: "year", label: "Cette année" },
];

// ── Helper ─────────────────────────────────────────────────────────────
export function getPeriodDates(key: PeriodeKey): { dateDebut: string; dateFin: string } {
  switch (key) {
    case "today":
      return {
        dateDebut: format(now, "yyyy-MM-dd"),
        dateFin: format(now, "yyyy-MM-dd"),
      };
    case "week":
      return {
        dateDebut: format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
        dateFin: format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      };
    case "month":
      return {
        dateDebut: format(startOfMonth(now), "yyyy-MM-dd"),
        dateFin: format(endOfMonth(now), "yyyy-MM-dd"),
      };
    case "quarter":
      return {
        dateDebut: format(startOfQuarter(now), "yyyy-MM-dd"),
        dateFin: format(endOfQuarter(now), "yyyy-MM-dd"),
      };
    case "year":
      return {
        dateDebut: format(startOfYear(now), "yyyy-MM-dd"),
        dateFin: format(endOfYear(now), "yyyy-MM-dd"),
      };
    default:
      return {
        dateDebut: format(startOfMonth(now), "yyyy-MM-dd"),
        dateFin: format(endOfMonth(now), "yyyy-MM-dd"),
      };
  }
}

export function getDefaultFilters(defaultPeriode: PeriodeKey = "week"): DashboardFiltersValue {
  return {
    periode: defaultPeriode,
    ...getPeriodDates(defaultPeriode),
    projetId: "all",
  };
}

// ── Persistence ────────────────────────────────────────────────────────
export function loadFilters(storageKey: string, defaultPeriode: PeriodeKey = "week"): DashboardFiltersValue {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved) as DashboardFiltersValue;
      if (parsed.periode && parsed.dateDebut && parsed.dateFin) {
        return parsed;
      }
    }
  } catch { /* ignore */ }
  return getDefaultFilters(defaultPeriode);
}

export function saveFilters(storageKey: string, filters: DashboardFiltersValue): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(filters));
  } catch { /* ignore */ }
}

// ── Component ──────────────────────────────────────────────────────────
export function DashboardFilters({
  value,
  onChange,
  projets = [],
  showProjetFilter = true,
  defaultPeriode = "week",
  className,
}: DashboardFiltersProps) {
  const isDefault =
    value.periode === defaultPeriode && value.projetId === "all";

  function selectPeriode(key: PeriodeKey) {
    const dates = getPeriodDates(key);
    onChange({ ...value, periode: key, ...dates });
  }

  function handleCustomDateDebut(v: string) {
    onChange({ ...value, periode: "custom", dateDebut: v });
  }

  function handleCustomDateFin(v: string) {
    onChange({ ...value, periode: "custom", dateFin: v });
  }

  function handleProjetChange(projetId: string) {
    onChange({ ...value, projetId });
  }

  function reset() {
    onChange(getDefaultFilters(defaultPeriode));
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Période buttons */}
      <div className="flex flex-wrap gap-2">
        {PERIODES.map((p) => (
          <Button
            key={p.key}
            variant={value.periode === p.key ? "default" : "outline"}
            size="sm"
            onClick={() => selectPeriode(p.key)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* Custom dates + projet + reset */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="date"
          value={value.dateDebut}
          onChange={(e) => handleCustomDateDebut(e.target.value)}
          className="w-auto"
          aria-label="Date de début"
        />
        <span className="text-muted-foreground text-sm">&rarr;</span>
        <Input
          type="date"
          value={value.dateFin}
          onChange={(e) => handleCustomDateFin(e.target.value)}
          className="w-auto"
          aria-label="Date de fin"
        />

        {showProjetFilter && (
          <Select
            value={value.projetId}
            onChange={(e) => handleProjetChange(e.target.value)}
            className="w-[200px]"
            aria-label="Filtrer par projet"
          >
            <option value="all">Tous les projets</option>
            {projets.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.nom}
                {p.client ? ` — ${p.client}` : ""}
              </option>
            ))}
          </Select>
        )}

        {!isDefault && (
          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            className="gap-1.5 text-muted-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Réinitialiser
          </Button>
        )}
      </div>
    </div>
  );
}
