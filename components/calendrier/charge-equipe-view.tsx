"use client";

import { format, startOfWeek, addDays, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { CalData, EtapeInfo } from "./types";

interface ChargeEquipeViewProps {
  currentDate: Date;
  data: CalData | null;
  onSelectEtape: (e: EtapeInfo) => void;
  onContextMenu: (ev: React.MouseEvent, e: EtapeInfo) => void;
}

function chargeColor(pct: number): string {
  if (pct >= 100) return "bg-destructive";
  if (pct >= 80) return "bg-warning";
  return "bg-success";
}

export function ChargeEquipeView({ currentDate, data, onSelectEtape, onContextMenu }: ChargeEquipeViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
  const consultants = data?.consultants ?? [];
  const chargePlanifiee = data?.chargePlanifiee ?? {};

  function caEstimeSemaine(): number {
    if (!data) return 0;
    let total = 0;
    for (const consultant of consultants) {
      const jourMap = chargePlanifiee[consultant.id] ?? {};
      for (const day of weekDays) {
        const key = format(day, "yyyy-MM-dd");
        const heures = jourMap[key] ?? 0;
        if (consultant.tjm && heures > 0) total += (heures / 8) * consultant.tjm;
      }
    }
    return Math.round(total);
  }

  function totalHeuresSemaine(): number {
    if (!data) return 0;
    let total = 0;
    for (const consultant of consultants) {
      const jourMap = chargePlanifiee[consultant.id] ?? {};
      for (const day of weekDays) {
        total += jourMap[format(day, "yyyy-MM-dd")] ?? 0;
      }
    }
    return Math.round(total * 10) / 10;
  }

  function getEtapesConsultantJour(consultantId: number, day: Date): EtapeInfo[] {
    if (!data) return [];
    const key = format(day, "yyyy-MM-dd");
    return data.etapes.filter((e) => {
      const start = e.dateDebut ?? e.deadline;
      const end = e.deadline;
      if (!start || !end) return false;
      return key >= start && key <= end && e.consultants.some((c) => c.id === consultantId);
    });
  }

  return (
    <div className="space-y-3" data-testid="charge-equipe-view">
      <div className="flex gap-3 flex-wrap">
        <div className="bg-card border border-border rounded-lg px-4 py-2 text-sm">
          <span className="text-muted-foreground">Heures planifiées :</span>{" "}
          <strong>{totalHeuresSemaine()}h</strong>
        </div>
        <div className="bg-card border border-border rounded-lg px-4 py-2 text-sm">
          <span className="text-muted-foreground">CA estimé :</span>{" "}
          <strong>{caEstimeSemaine().toLocaleString("fr-FR")} €</strong>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="grid border-b border-border" style={{ gridTemplateColumns: "200px repeat(5, 1fr) 100px" }}>
              <div className="p-2 text-xs font-medium text-muted-foreground border-r border-border">Consultant</div>
              {weekDays.map((day) => (
                <div key={day.toISOString()} className={cn("p-2 text-center text-xs font-medium border-r border-border", isToday(day) && "bg-primary/5 text-primary")}>
                  <div className="capitalize">{format(day, "EEE", { locale: fr })}</div>
                  <div>{format(day, "d MMM", { locale: fr })}</div>
                </div>
              ))}
              <div className="p-2 text-center text-xs font-medium text-muted-foreground">Total</div>
            </div>

            {consultants.map((consultant) => {
              const jourMap = chargePlanifiee[consultant.id] ?? {};
              let totalHeures = 0;
              return (
                <div key={consultant.id} className="grid border-b border-border" style={{ gridTemplateColumns: "200px repeat(5, 1fr) 100px" }}>
                  <div className="p-2 border-r border-border flex items-center gap-2" style={{ borderLeft: `3px solid ${consultant.couleur}` }}>
                    <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: consultant.couleur }} />
                    <div>
                      <div className="text-xs font-medium">{consultant.nom}</div>
                      {consultant.tjm && <div className="text-[10px] text-muted-foreground">{consultant.tjm}€/j</div>}
                    </div>
                  </div>
                  {weekDays.map((day) => {
                    const key = format(day, "yyyy-MM-dd");
                    const heures = Math.round((jourMap[key] ?? 0) * 10) / 10;
                    totalHeures += heures;
                    const etapesJour = getEtapesConsultantJour(consultant.id, day);
                    const surcharge = heures > 8;
                    const dispo = heures > 0 && heures < 6;
                    const libre = heures === 0;
                    return (
                      <div key={key} className={cn("p-1.5 border-r border-border min-h-[64px]", isToday(day) && "bg-primary/5", surcharge && "bg-destructive/5")}>
                        <div className="flex items-center justify-between mb-1">
                          {libre ? <span className="text-[9px] font-medium text-muted-foreground/60 px-1.5 py-0.5 rounded-full bg-muted/50 border border-border/40 leading-tight">Dispo</span>
                            : surcharge ? <span className="text-[10px] font-semibold text-destructive">⚠ {heures}h</span>
                            : dispo ? <span className="text-[10px] font-medium text-emerald-600">{heures}h</span>
                            : <span className="text-[10px] font-medium">{heures}h</span>}
                        </div>
                        {!libre && (
                          <div className="h-1.5 w-full rounded-full bg-muted mb-1 overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", chargeColor(Math.round((heures / 8) * 100)))}
                              style={{ width: `${Math.min(100, Math.round((heures / 8) * 100))}%` }}
                            />
                          </div>
                        )}
                        <div className="space-y-0.5">
                          {etapesJour.slice(0, 2).map((e) => (
                            <button key={e.id} onContextMenu={(ev) => onContextMenu(ev, e)} onClick={() => onSelectEtape(e)}
                              className="w-full text-left text-[9px] rounded px-1 py-0.5 truncate cursor-pointer transition-opacity hover:opacity-80"
                              style={{ backgroundColor: e.projet.couleur + "20", borderLeft: `2px solid ${e.projet.couleur}` }}>
                              {e.projet.nom}
                            </button>
                          ))}
                          {etapesJour.length > 2 && (
                            <div className="text-[9px] text-muted-foreground pl-1">+{etapesJour.length - 2}{etapesJour.length - 2 >= 2 && " ⚠️"}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div className="p-2 text-center">
                    <div className="text-sm font-semibold">{Math.round(totalHeures * 10) / 10}h</div>
                    {consultant.tjm && <div className="text-[10px] text-muted-foreground">{Math.round(totalHeures / 8 * consultant.tjm).toLocaleString("fr-FR")}€</div>}
                  </div>
                </div>
              );
            })}

            {consultants.length === 0 && (
              <div className="py-12 text-center text-muted-foreground text-sm">Aucun consultant actif</div>
            )}

            {consultants.length > 0 && (
              <div className="grid border-t-2 border-border bg-muted/50" style={{ gridTemplateColumns: "200px repeat(5, 1fr) 100px" }}>
                <div className="p-2 text-xs font-semibold text-muted-foreground border-r border-border">TOTAL ÉQUIPE</div>
                {weekDays.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  let total = 0;
                  for (const c of consultants) total += chargePlanifiee[c.id]?.[key] ?? 0;
                  return (
                    <div key={key} className={cn("p-2 text-center border-r border-border", isToday(day) && "bg-primary/5")}>
                      <div className="text-xs font-semibold">{Math.round(total * 10) / 10}h</div>
                    </div>
                  );
                })}
                <div className="p-2 text-center">
                  <div className="text-xs font-semibold">{totalHeuresSemaine()}h</div>
                  <div className="text-[10px] text-muted-foreground">{caEstimeSemaine().toLocaleString("fr-FR")}€</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
