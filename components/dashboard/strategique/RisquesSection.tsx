import * as React from "react";
import { ShieldAlert, Clock, TrendingDown, Users } from "lucide-react";

// ── Component ──────────────────────────────────────────────────────────
export function RisquesSection() {
  const risques = [
    {
      icon: <Clock className="h-4 w-4 text-amber-600" />,
      label: "Suivi des délais",
      description: "Alertes automatiques pour les projets proches des deadlines",
    },
    {
      icon: <TrendingDown className="h-4 w-4 text-destructive" />,
      label: "Dérive budgétaire",
      description: "Détection précoce des projets dépassant 80% de leur budget",
    },
    {
      icon: <Users className="h-4 w-4 text-blue-600" />,
      label: "Surcharge équipe",
      description: "Identification des consultants surchargés (>100% occupation)",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
        <ShieldAlert className="h-5 w-5 text-muted-foreground shrink-0" />
        <div>
          <p className="text-sm font-medium">Analyse des risques — Bientôt disponible</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Matrice de risques projets avec scoring automatique et recommandations
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {risques.map((r) => (
          <div
            key={r.label}
            className="flex items-start gap-3 p-2.5 rounded-md border border-border/60 bg-background"
          >
            <div className="mt-0.5 shrink-0">{r.icon}</div>
            <div>
              <p className="text-xs font-medium">{r.label}</p>
              <p className="text-[11px] text-muted-foreground">{r.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
