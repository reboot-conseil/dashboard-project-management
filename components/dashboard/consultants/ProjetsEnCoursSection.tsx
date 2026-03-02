import * as React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────
interface ProjetEnCours {
  id: number;
  nom: string;
  client: string;
  statut: string;
  couleur: string;
  heuresConsultant: number;
  budgetConsommePct: number;
  realisationPct: number;
  ecart: number;
  health: "bon" | "normal" | "critique";
}

interface ProjetsEnCoursSectionProps {
  projets: ProjetEnCours[];
}

// ── Helpers ────────────────────────────────────────────────────────────
function statutLabel(s: string) {
  switch (s) {
    case "EN_COURS": return "En cours";
    case "PLANIFIE": return "Planifié";
    default: return s;
  }
}

function statutVariant(s: string): "default" | "secondary" {
  return s === "EN_COURS" ? "default" : "secondary";
}

function HealthIcon({ health }: { health: "bon" | "normal" | "critique" }) {
  if (health === "bon") return <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />;
  if (health === "normal") return <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />;
  return <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />;
}

// ── Component ──────────────────────────────────────────────────────────
export function ProjetsEnCoursSection({ projets }: ProjetsEnCoursSectionProps) {
  if (projets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
        <CheckCircle className="h-8 w-8 text-emerald-500" />
        <p className="text-sm text-muted-foreground">Aucun projet actif cette période</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {projets.map((p) => (
        <Link
          key={p.id}
          href={`/projets/${p.id}`}
          className="block rounded-lg border border-border hover:border-primary/40 hover:bg-muted/30 transition-all p-3 group"
        >
          {/* Header projet */}
          <div className="flex items-start justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
                style={{ backgroundColor: p.couleur }}
              />
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{p.nom}</p>
                <p className="text-xs text-muted-foreground truncate">{p.client}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge variant={statutVariant(p.statut)} className="text-[10px] px-1.5 py-0">
                {statutLabel(p.statut)}
              </Badge>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-2.5">
            {/* Budget */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground">Budget consommé</span>
                <span className="text-[10px] font-medium tabular-nums">{p.budgetConsommePct}%</span>
              </div>
              <Progress
                value={Math.min(p.budgetConsommePct, 100)}
                className="h-1"
                indicatorClassName={
                  p.budgetConsommePct > 100
                    ? "bg-destructive"
                    : p.budgetConsommePct > 80
                    ? "bg-amber-500"
                    : "bg-primary"
                }
              />
            </div>

            {/* Réalisé */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground">Réalisé</span>
                <span className="text-[10px] font-medium tabular-nums">{p.realisationPct}%</span>
              </div>
              <Progress
                value={Math.min(p.realisationPct, 100)}
                className="h-1"
                indicatorClassName="bg-emerald-500"
              />
            </div>
          </div>

          {/* Footer : heures loguées + health + écart */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{p.heuresConsultant}h</span> loguées
            </span>
            <div className="flex items-center gap-1.5">
              <HealthIcon health={p.health} />
              <span
                className={cn(
                  "text-xs font-semibold",
                  p.ecart < -10
                    ? "text-destructive"
                    : p.ecart < 0
                    ? "text-amber-600"
                    : "text-emerald-600"
                )}
              >
                {p.ecart > 0 ? "+" : ""}{p.ecart}%
              </span>
              <span className="text-[10px] text-muted-foreground">
                {p.ecart < -10 ? "Dérive" : p.ecart < 0 ? "Attention" : "On track"}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
