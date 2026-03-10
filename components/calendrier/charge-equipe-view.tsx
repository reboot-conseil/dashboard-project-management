"use client";

import { format, startOfWeek, addDays, isToday, isWeekend } from "date-fns";
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
  // 7 days Mon→Sun
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const consultants = data?.consultants ?? [];
  const chargePlanifiee = data?.chargePlanifiee ?? {};

  function totalHeuresSemaine(): number {
    if (!data) return 0;
    let total = 0;
    for (const consultant of consultants) {
      const jourMap = chargePlanifiee[consultant.id] ?? {};
      for (const day of weekDays) {
        if (!isWeekend(day)) total += jourMap[format(day, "yyyy-MM-dd")] ?? 0;
      }
    }
    return Math.round(total * 10) / 10;
  }

  function caEstimeSemaine(): number {
    if (!data) return 0;
    let total = 0;
    for (const consultant of consultants) {
      const jourMap = chargePlanifiee[consultant.id] ?? {};
      for (const day of weekDays) {
        if (isWeekend(day)) continue;
        const key = format(day, "yyyy-MM-dd");
        const heures = jourMap[key] ?? 0;
        if (consultant.tjm && heures > 0) total += (heures / 8) * consultant.tjm;
      }
    }
    return Math.round(total);
  }

  function getHeuresLogueesConsultantJour(consultantId: number, day: Date): number {
    if (!data) return 0;
    const key = format(day, "yyyy-MM-dd");
    return Math.round(
      data.activites
        .filter((a) => a.consultant.id === consultantId && a.date === key)
        .reduce((s, a) => s + Number(a.heures), 0) * 10
    ) / 10;
  }

  function getHeuresLogueesEtapeJour(etapeId: number, consultantId: number, day: Date): number {
    if (!data) return 0;
    const key = format(day, "yyyy-MM-dd");
    return Math.round(
      data.activites
        .filter((a) => a.consultant.id === consultantId && a.date === key && a.etape?.id === etapeId)
        .reduce((s, a) => s + Number(a.heures), 0) * 10
    ) / 10;
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
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Header */}
            <div
              className="grid border-b border-border"
              style={{ gridTemplateColumns: "180px repeat(7, 1fr) 90px" }}
            >
              <div className="p-2 text-xs font-medium text-muted-foreground border-r border-border">
                Consultant
              </div>
              {weekDays.map((day) => {
                const weekend = isWeekend(day);
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "p-2 text-center text-xs font-medium border-r border-border",
                      isToday(day) && "bg-primary/5 text-primary",
                      weekend && "opacity-50"
                    )}
                    style={weekend ? { background: "var(--color-surface-raised, var(--muted))" } : undefined}
                  >
                    <div className="capitalize">{format(day, "EEE", { locale: fr })}</div>
                    <div>{format(day, "d MMM", { locale: fr })}</div>
                  </div>
                );
              })}
              <div className="p-2 text-center text-xs font-medium text-muted-foreground">Total</div>
            </div>

            {/* Rows */}
            {consultants.map((consultant) => {
              const jourMap = chargePlanifiee[consultant.id] ?? {};
              let totalHeures = 0;
              return (
                <div
                  key={consultant.id}
                  className="grid border-b border-border"
                  style={{ gridTemplateColumns: "180px repeat(7, 1fr) 90px" }}
                >
                  <div
                    className="p-2 border-r border-border flex items-center gap-2"
                    style={{ borderLeft: `3px solid ${consultant.couleur}` }}
                  >
                    <span
                      className="h-6 w-6 rounded-full shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ backgroundColor: consultant.couleur }}
                    >
                      {consultant.nom.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <div className="text-xs font-medium truncate max-w-[110px]">{consultant.nom}</div>
                      {consultant.tjm && (
                        <div className="text-[10px] text-muted-foreground">{consultant.tjm}€/j</div>
                      )}
                    </div>
                  </div>

                  {weekDays.map((day) => {
                    const key = format(day, "yyyy-MM-dd");
                    const weekend = isWeekend(day);
                    const heuresLoguees = weekend ? 0 : getHeuresLogueesConsultantJour(consultant.id, day);
                    if (!weekend) totalHeures += heuresLoguees;
                    const etapesJour = weekend ? [] : getEtapesConsultantJour(consultant.id, day);
                    const surcharge = !weekend && heuresLoguees > 8;

                    return (
                      <div
                        key={key}
                        className={cn(
                          "p-1.5 border-r border-border min-h-[60px]",
                          isToday(day) && "bg-primary/5",
                          surcharge && "bg-destructive/10",
                        )}
                        style={weekend ? { background: "var(--color-surface-raised, var(--muted))" } : undefined}
                      >
                        {!weekend && (
                          <>
                            <div className="flex items-center justify-between mb-1">
                              {heuresLoguees === 0 ? (
                                <span className="text-[10px] text-muted-foreground">—</span>
                              ) : (
                                <span className={cn("text-[10px] font-bold", surcharge ? "text-destructive" : "text-foreground")}>
                                  {heuresLoguees}h
                                </span>
                              )}
                            </div>
                            {heuresLoguees > 0 && (
                              <div className="h-1 w-full rounded-full bg-muted mb-1 overflow-hidden">
                                <div
                                  className={cn("h-full rounded-full", chargeColor(Math.round((heuresLoguees / 8) * 100)))}
                                  style={{ width: `${Math.min(100, Math.round((heuresLoguees / 8) * 100))}%` }}
                                />
                              </div>
                            )}
                            <div className="space-y-0.5">
                              {etapesJour.slice(0, 3).map((e) => {
                                const h = getHeuresLogueesEtapeJour(e.id, consultant.id, day);
                                return (
                                  <button
                                    key={e.id}
                                    onContextMenu={(ev) => onContextMenu(ev, e)}
                                    onClick={() => onSelectEtape(e)}
                                    className="w-full text-left text-[9px] rounded px-1 py-0.5 truncate cursor-pointer transition-opacity hover:opacity-80 flex items-center justify-between gap-1"
                                    style={{
                                      backgroundColor: e.projet.couleur + "20",
                                      borderLeft: `2px solid ${e.projet.couleur}`,
                                    }}
                                  >
                                    <span className="truncate">{e.projet.nom}</span>
                                    {h > 0 && <span className="shrink-0 font-semibold">{h}h</span>}
                                  </button>
                                );
                              })}
                              {etapesJour.length > 3 && (
                                <div className="text-[9px] text-muted-foreground pl-1">
                                  +{etapesJour.length - 3}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}

                  <div className="p-2 text-center">
                    <div className="text-sm font-semibold">{Math.round(totalHeures * 10) / 10}h</div>
                    {consultant.tjm && (
                      <div className="text-[10px] text-muted-foreground">
                        {Math.round((totalHeures / 8) * consultant.tjm).toLocaleString("fr-FR")}€
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {consultants.length === 0 && (
              <div className="py-12 text-center text-muted-foreground text-sm">
                Aucun consultant actif
              </div>
            )}

            {/* Footer totals */}
            {consultants.length > 0 && (
              <div
                className="grid border-t-2 border-border bg-muted/20"
                style={{ gridTemplateColumns: "180px repeat(7, 1fr) 90px" }}
              >
                <div className="p-2 text-xs font-semibold text-muted-foreground border-r border-border">
                  TOTAL
                </div>
                {weekDays.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const weekend = isWeekend(day);
                  let total = 0;
                  if (!weekend) {
                    for (const c of consultants) total += chargePlanifiee[c.id]?.[key] ?? 0;
                  }
                  return (
                    <div
                      key={key}
                      className={cn(
                        "p-2 text-center border-r border-border",
                        isToday(day) && "bg-primary/5",
                        weekend && "opacity-40"
                      )}
                      style={weekend ? { background: "var(--color-surface-raised, var(--muted))" } : undefined}
                    >
                      {!weekend && (
                        <div className="text-xs font-semibold">
                          {Math.round(total * 10) / 10}h
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="p-2 text-center">
                  <div className="text-xs font-semibold">{totalHeuresSemaine()}h</div>
                  <div className="text-[10px] text-muted-foreground">
                    {caEstimeSemaine().toLocaleString("fr-FR")}€
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
