import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

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

export function ProjetsEnCoursSection({ projets }: ProjetsEnCoursSectionProps) {
  if (projets.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">Aucun projet actif cette période</p>;
  }

  return (
    <div className="space-y-3">
      {projets.map((p) => {
        const budgetBarColor = p.budgetConsommePct > 100 ? "#b91c1c" : p.budgetConsommePct > 85 ? "#f97316" : "#2563EB";
        const margeLabel = p.health === "bon" ? "Bon" : p.health === "normal" ? "Moyen" : "Faible";
        const margeBadgeClasses = p.health === "bon"
          ? "bg-success/10 text-success"
          : p.health === "normal"
          ? "bg-warning/10 text-warning-foreground"
          : "bg-destructive/10 text-destructive";

        return (
          <div key={p.id} className="relative rounded-xl border border-border overflow-hidden hover:-translate-y-px hover:shadow-sm transition-all">
            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ background: p.couleur }} />
            <div className="pl-4 pr-4 py-3.5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-[14px] font-bold text-foreground leading-tight">{p.nom}</div>
                  <div className="text-[12px] text-muted-foreground mt-0.5">{p.client}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3 mt-0.5">
                  <span className={cn("text-[11.5px] font-semibold px-2 py-0.5 rounded-md", margeBadgeClasses)}>
                    {margeLabel}
                  </span>
                  <Link
                    href={`/projets/${p.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="text-[11px] text-muted-foreground w-12 shrink-0">Budget</span>
                <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(p.budgetConsommePct, 100)}%`, background: budgetBarColor }} />
                </div>
                <span className="text-[11.5px] font-bold w-9 text-right" style={{ color: budgetBarColor }}>{p.budgetConsommePct.toFixed(1)}%</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] text-muted-foreground w-12 shrink-0">Réalisé</span>
                <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                  <div className="h-full rounded-full bg-[#10b981]" style={{ width: `${p.realisationPct}%` }} />
                </div>
                <span className="text-[11.5px] font-bold text-muted-foreground w-9 text-right">{p.realisationPct.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
