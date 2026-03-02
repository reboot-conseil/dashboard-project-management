import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────
interface ConsultantDecomp {
  id: number;
  nom: string;
  couleur: string;
  heures: number;
  ca: number;
}

interface DecompositionConsultantsSectionProps {
  consultants: ConsultantDecomp[];
  totalCA: number;
}

function formatEuros(v: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);
}

// ── Component ──────────────────────────────────────────────────────────
export function DecompositionConsultantsSection({
  consultants,
  totalCA,
}: DecompositionConsultantsSectionProps) {
  if (consultants.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Aucune activité sur la période
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {consultants.map((c) => {
        const pct = totalCA > 0 ? Math.round((c.ca / totalCA) * 1000) / 10 : 0;
        const badgeColor =
          pct >= 30
            ? "bg-emerald-100 text-emerald-800"
            : pct >= 15
            ? "bg-blue-100 text-blue-800"
            : "bg-amber-100 text-amber-800";

        return (
          <div key={c.id} className="flex items-center gap-3">
            {/* Pastille couleur */}
            <span
              className="inline-block h-3 w-3 rounded-full shrink-0 border border-border/50"
              style={{ backgroundColor: c.couleur }}
            />

            {/* Nom */}
            <span className="text-sm font-medium flex-1 truncate">{c.nom}</span>

            {/* CA */}
            <span className="text-sm font-semibold tabular-nums">
              {formatEuros(c.ca)}
            </span>

            {/* Badge % */}
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums w-14 justify-center",
                badgeColor
              )}
            >
              {pct}%
            </span>
          </div>
        );
      })}

      {/* Total */}
      <div className="pt-2 border-t border-border flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground">Total équipe</span>
        <span className="text-base font-bold">{formatEuros(totalCA)}</span>
      </div>

      {/* Lien */}
      <div className="pt-1">
        <Link
          href="/consultants"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Voir les consultants
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
