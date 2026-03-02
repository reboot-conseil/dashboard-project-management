import * as React from "react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────
interface ProjetJour {
  nom: string;
  couleur: string;
  heures: number;
  etape: string | null;
}

interface JourPlanning {
  date: string;
  jourLabel: string;
  isWeekend: boolean;
  totalHeures: number;
  projets: ProjetJour[];
}

interface PlanningSemaineSectionProps {
  jours: JourPlanning[];
}

// ── Component ──────────────────────────────────────────────────────────
export function PlanningSemaineSection({ jours }: PlanningSemaineSectionProps) {
  const MAX_H = 10; // max heures pour la barre

  return (
    <div className="space-y-2">
      {jours.map((jour) => {
        const isSurcharge = jour.totalHeures > 8;
        const isDisponible = !jour.isWeekend && jour.totalHeures < 6 && jour.totalHeures >= 0;
        const isVide = jour.totalHeures === 0;

        return (
          <div
            key={jour.date}
            className={cn(
              "rounded-lg border p-3 transition-colors",
              jour.isWeekend
                ? "bg-muted/20 border-border/40 opacity-60"
                : isSurcharge
                ? "border-amber-200 bg-amber-50/50"
                : "border-border bg-background"
            )}
          >
            <div className="flex items-start gap-3">
              {/* Label jour */}
              <div className="w-32 shrink-0">
                <p className={cn(
                  "text-xs font-semibold capitalize",
                  jour.isWeekend ? "text-muted-foreground" : "text-foreground"
                )}>
                  {jour.jourLabel}
                </p>
                {!jour.isWeekend && (
                  <p className={cn(
                    "text-[10px] font-medium mt-0.5",
                    isSurcharge
                      ? "text-amber-700"
                      : isDisponible && !isVide
                      ? "text-emerald-600"
                      : isVide
                      ? "text-muted-foreground"
                      : "text-foreground/60"
                  )}>
                    {isSurcharge
                      ? `⚠️ ${jour.totalHeures}h`
                      : isVide
                      ? "Libre"
                      : isDisponible
                      ? `🟢 ${8 - jour.totalHeures}h dispo`
                      : `${jour.totalHeures}h`}
                  </p>
                )}
              </div>

              {/* Barres projets */}
              <div className="flex-1 space-y-1.5">
                {jour.isWeekend || isVide ? (
                  <div className="h-5 rounded bg-muted/30 border border-dashed border-border/50" />
                ) : (
                  <>
                    {/* Barre de charge globale */}
                    <div className="relative h-5 rounded overflow-hidden bg-muted/30">
                      {jour.projets.map((p, idx) => {
                        const pct = Math.min((p.heures / MAX_H) * 100, 100);
                        const offset = jour.projets
                          .slice(0, idx)
                          .reduce((s, pp) => s + Math.min((pp.heures / MAX_H) * 100, 100), 0);
                        return (
                          <div
                            key={idx}
                            className="absolute top-0 h-full transition-all"
                            style={{
                              left: `${Math.min(offset, 100)}%`,
                              width: `${pct}%`,
                              backgroundColor: p.couleur,
                              opacity: 0.85,
                            }}
                          />
                        );
                      })}
                      {/* Repère 8h */}
                      <div
                        className="absolute top-0 bottom-0 w-px bg-foreground/20"
                        style={{ left: `${(8 / MAX_H) * 100}%` }}
                      />
                    </div>

                    {/* Détail par projet */}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                      {jour.projets.map((p, idx) => (
                        <div key={idx} className="flex items-center gap-1">
                          <div
                            className="w-2 h-2 rounded-sm shrink-0"
                            style={{ backgroundColor: p.couleur }}
                          />
                          <span className="text-[10px] text-muted-foreground">
                            <span className="font-medium text-foreground">{p.heures}h</span>
                            {" "}{p.nom}
                            {p.etape && (
                              <span className="text-muted-foreground/70"> ({p.etape})</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
