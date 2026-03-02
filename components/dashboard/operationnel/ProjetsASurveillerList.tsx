import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowRight, CheckCircle } from "lucide-react";
import { HealthBadge, UrgenceBadge } from "@/components/ui/status-badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────
export interface ProjetASurveiller {
  id: number;
  nom: string;
  client: string;
  statut: string;
  budget: number;
  pctBudget: number;
  budgetConsommePct: number;
  realisationPct: number;
  ecart: number;
  health: "bon" | "normal" | "critique";
  healthLabel: string;
  dateFinEstimee: string | null;
  prochainDeadline: {
    nom: string;
    deadline: string | null;
    joursRestants: number | null;
  } | null;
}

interface ProjetsASurveillerListProps {
  projets: ProjetASurveiller[];
}

// ── Component ──────────────────────────────────────────────────────────
export function ProjetsASurveillerList({ projets }: ProjetsASurveillerListProps) {
  if (projets.length === 0) {
    return (
      <div className="flex items-center gap-2 py-6 text-emerald-600">
        <CheckCircle className="h-5 w-5" />
        <span className="text-sm font-medium">
          Tous les projets sont on track
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {projets.map((projet) => (
        <ProjetCard key={projet.id} projet={projet} />
      ))}
    </div>
  );
}

// ── ProjetCard ─────────────────────────────────────────────────────────
function ProjetCard({ projet }: { projet: ProjetASurveiller }) {
  const isDerive = projet.ecart < -10;
  const isBudgetCritique = projet.pctBudget > 95;
  const joursD = projet.prochainDeadline?.joursRestants;
  const isDeadlineCritique = joursD !== null && joursD !== undefined && joursD < 3;

  const borderClass = cn(
    "rounded-lg border p-3 transition-colors hover:bg-muted/30",
    projet.health === "critique" || isDeadlineCritique
      ? "border-destructive/30 bg-destructive/[0.02]"
      : isBudgetCritique
      ? "border-amber-400/40 bg-amber-50/50"
      : "border-border"
  );

  return (
    <div className={borderClass}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 space-y-2">
          {/* Nom + client */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "text-sm font-semibold",
                projet.health === "critique" ? "text-destructive" : "text-foreground"
              )}
            >
              {projet.nom}
            </span>
            <span className="text-xs text-muted-foreground">{projet.client}</span>
          </div>

          {/* Barres budget / réalisation */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-20 shrink-0">Budget</span>
              <Progress
                value={Math.min(projet.budgetConsommePct, 100)}
                className="h-1.5 flex-1"
                indicatorClassName={
                  projet.budgetConsommePct > 100
                    ? "bg-destructive"
                    : projet.budgetConsommePct > 80
                    ? "bg-amber-500"
                    : "bg-primary"
                }
              />
              <span className="text-xs font-medium tabular-nums w-10 text-right">
                {projet.budgetConsommePct}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-20 shrink-0">Réalisé</span>
              <Progress
                value={Math.min(projet.realisationPct, 100)}
                className="h-1.5 flex-1"
                indicatorClassName="bg-emerald-500"
              />
              <span className="text-xs font-medium tabular-nums w-10 text-right">
                {projet.realisationPct}%
              </span>
            </div>
          </div>

          {/* Health + deadline */}
          <div className="flex items-center gap-3 flex-wrap">
            <HealthBadge ecart={projet.ecart} />
            <span className="text-xs text-muted-foreground">
              Écart :{" "}
              <span
                className={cn(
                  "font-medium",
                  projet.ecart < -10
                    ? "text-destructive"
                    : projet.ecart < 0
                    ? "text-amber-700"
                    : "text-emerald-600"
                )}
              >
                {projet.ecart > 0 ? "+" : ""}
                {projet.ecart}%
              </span>
            </span>

            {projet.prochainDeadline?.deadline && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>
                  {format(new Date(projet.prochainDeadline.deadline), "d MMM", { locale: fr })}
                </span>
                <UrgenceBadge joursRestants={joursD ?? null} />
              </div>
            )}
          </div>
        </div>

        {/* Bouton voir */}
        <Link href={`/projets/${projet.id}`} className="shrink-0">
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-primary hover:underline font-medium px-2 py-1 rounded hover:bg-primary/5 transition-colors"
          >
            Voir
            <ArrowRight className="h-3 w-3" />
          </button>
        </Link>
      </div>
    </div>
  );
}
