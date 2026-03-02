"use client";

import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  differenceInDays,
  isToday,
  isWeekend,
  parseISO,
} from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { CalData, EtapeInfo, ProjetInfo } from "./types";
import { healthIcon } from "./types";

interface GanttViewProps {
  currentDate: Date;
  data: CalData | null;
  onSelectEtape: (e: EtapeInfo) => void;
  onContextMenu: (ev: React.MouseEvent, e: EtapeInfo) => void;
}

export function GanttView({
  currentDate,
  data,
  onSelectEtape,
  onContextMenu,
}: GanttViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const projetMap = new Map<number, { projet: ProjetInfo; etapes: EtapeInfo[] }>();
  for (const etape of data?.etapes ?? []) {
    if (!projetMap.has(etape.projet.id)) {
      projetMap.set(etape.projet.id, { projet: etape.projet, etapes: [] });
    }
    projetMap.get(etape.projet.id)!.etapes.push(etape);
  }

  const totalDays = days.length;
  const COL_WIDTH = 36;

  function dayPercent(dateStr: string | null): number {
    if (!dateStr) return 0;
    const d = parseISO(dateStr);
    const idx = differenceInDays(d, monthStart);
    return Math.max(0, Math.min(idx, totalDays - 1));
  }

  function barWidth(dateDebut: string | null, deadline: string | null): number {
    if (!deadline) return 0;
    const startIdx = dateDebut ? dayPercent(dateDebut) : 0;
    const endIdx = dayPercent(deadline);
    return Math.max(1, endIdx - startIdx + 1);
  }

  return (
    <Card data-testid="gantt-view">
      <CardContent className="p-0 overflow-x-auto">
        <div style={{ minWidth: `${200 + totalDays * COL_WIDTH}px` }}>
          {/* Header jours */}
          <div className="flex border-b border-border" style={{ paddingLeft: "200px" }}>
            {days.map((day, i) => (
              <div
                key={i}
                className={cn(
                  "flex-shrink-0 text-center border-l border-border py-1",
                  isToday(day) && "bg-primary/10",
                  isWeekend(day) && "bg-muted/30"
                )}
                style={{ width: `${COL_WIDTH}px` }}
              >
                <div className="text-[10px] text-muted-foreground">
                  {format(day, "d", { locale: fr })}
                </div>
                <div className="text-[9px] text-muted-foreground/60 capitalize">
                  {format(day, "EEE", { locale: fr })}
                </div>
              </div>
            ))}
          </div>

          <div className="relative">
            {Array.from(projetMap.values()).map(({ projet, etapes }) => (
              <div key={projet.id}>
                {/* Ligne projet */}
                <div className="flex items-center border-b border-border" style={{ minHeight: "32px" }}>
                  <div
                    className="shrink-0 px-3 py-1 font-semibold text-xs flex items-center gap-2"
                    style={{ width: "200px" }}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: projet.couleur }}
                    />
                    <span className="truncate">{projet.nom}</span>
                  </div>
                  <div className="relative flex-1" style={{ height: "32px" }}>
                    {today >= monthStart && today <= monthEnd && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                        style={{
                          left: `${differenceInDays(today, monthStart) * COL_WIDTH + COL_WIDTH / 2}px`,
                        }}
                      />
                    )}
                    {days.map((day, i) =>
                      isWeekend(day) ? (
                        <div
                          key={i}
                          className="absolute top-0 bottom-0 bg-muted/30"
                          style={{ left: `${i * COL_WIDTH}px`, width: `${COL_WIDTH}px` }}
                        />
                      ) : null
                    )}
                  </div>
                </div>

                {/* Lignes étapes */}
                {etapes.map((etape) => (
                  <div
                    key={etape.id}
                    className="flex items-center border-b border-border/50"
                    style={{ minHeight: "40px" }}
                  >
                    <div
                      className="shrink-0 px-3 py-1 text-xs text-muted-foreground pl-8 flex items-center gap-1"
                      style={{ width: "200px" }}
                    >
                      <span>{healthIcon(etape.health)}</span>
                      <span className="truncate">{etape.nom}</span>
                    </div>

                    <div className="relative flex-1" style={{ height: "40px" }}>
                      {days.map((day, i) =>
                        isWeekend(day) ? (
                          <div
                            key={i}
                            className="absolute top-0 bottom-0 bg-muted/30"
                            style={{ left: `${i * COL_WIDTH}px`, width: `${COL_WIDTH}px` }}
                          />
                        ) : null
                      )}
                      {today >= monthStart && today <= monthEnd && (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-red-500/50 z-10"
                          style={{
                            left: `${differenceInDays(today, monthStart) * COL_WIDTH + COL_WIDTH / 2}px`,
                          }}
                        />
                      )}

                      {etape.deadline && (
                        <button
                          onContextMenu={(ev) => onContextMenu(ev, etape)}
                          onClick={() => onSelectEtape(etape)}
                          className={cn(
                            "absolute top-3 h-5 rounded cursor-pointer transition-opacity hover:opacity-90 flex items-center px-1 text-[10px] font-medium text-white overflow-hidden",
                            etape.statut === "VALIDEE" && "opacity-50",
                            etape.urgence === "retard" && "ring-1 ring-red-500"
                          )}
                          style={{
                            left: `${dayPercent(etape.dateDebut ?? etape.deadline) * COL_WIDTH}px`,
                            width: `${barWidth(etape.dateDebut, etape.deadline) * COL_WIDTH - 2}px`,
                            backgroundColor: etape.projet.couleur,
                          }}
                        >
                          <span className="truncate">{etape.nom}</span>
                        </button>
                      )}

                      {etape.deadline && (
                        <div
                          className={cn(
                            "absolute top-2 h-3 w-3 rounded-full border-2 border-white z-20",
                            etape.urgence === "retard"
                              ? "bg-red-600"
                              : etape.urgence === "critique"
                                ? "bg-orange-500"
                                : "bg-red-400"
                          )}
                          style={{
                            left: `${dayPercent(etape.deadline) * COL_WIDTH + COL_WIDTH / 2 - 6}px`,
                          }}
                          title={`Deadline: ${etape.deadline}`}
                        />
                      )}

                      {etape.consultants.length > 0 && etape.deadline && (
                        <div
                          className="absolute bottom-1 flex gap-0.5 z-20"
                          style={{
                            left: `${dayPercent(etape.dateDebut ?? etape.deadline) * COL_WIDTH}px`,
                          }}
                        >
                          {etape.consultants.slice(0, 3).map((c) => (
                            <span
                              key={c.id}
                              className="h-2 w-2 rounded-full border border-white"
                              style={{ backgroundColor: c.couleur }}
                              title={c.nom}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {projetMap.size === 0 && (
              <div className="py-16 text-center text-muted-foreground text-sm">
                Aucune étape sur cette période avec ces filtres
              </div>
            )}
          </div>

          <div className="px-4 py-2 text-xs text-muted-foreground flex items-center gap-2">
            <div className="h-3 w-0.5 bg-red-500" />
            <span>Aujourd&apos;hui</span>
            <div className="h-2.5 w-2.5 rounded-full bg-red-400 border-2 border-white shadow ml-3" />
            <span>Deadline</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
