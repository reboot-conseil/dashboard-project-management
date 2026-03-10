"use client";

import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isToday,
  isWeekend,
} from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { CalData, EtapeInfo } from "./types";
import { healthIcon } from "./types";

interface MonthViewProps {
  currentDate: Date;
  data: CalData | null;
  weekDayLabels: string[];
  onSelectEtape: (e: EtapeInfo) => void;
  onContextMenu: (ev: React.MouseEvent, e: EtapeInfo) => void;
}

export function MonthView({
  currentDate,
  data,
  weekDayLabels,
  onSelectEtape,
  onContextMenu,
}: MonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days: Date[] = [];
  let d = calStart;
  while (d <= calEnd) {
    days.push(d);
    d = addDays(d, 1);
  }

  function getEtapesForDay(day: Date): EtapeInfo[] {
    if (!data) return [];
    const key = format(day, "yyyy-MM-dd");
    return data.etapes.filter((e) => e.deadline === key);
  }

  function getActivitesForDay(day: Date) {
    if (!data) return [];
    const key = format(day, "yyyy-MM-dd");
    return data.activites.filter((a) => a.date === key);
  }

  function getHoursForDay(day: Date): number {
    if (!data) return 0;
    return data.heuresParJour[format(day, "yyyy-MM-dd")] || 0;
  }

  function getEtapesOverlapping(day: Date): EtapeInfo[] {
    if (!data) return [];
    const key = format(day, "yyyy-MM-dd");
    return data.etapes.filter((e) => {
      const start = e.dateDebut ?? e.deadline;
      const end = e.deadline;
      if (!start || !end) return false;
      return key >= start && key <= end;
    });
  }

  return (
    <Card data-testid="month-view">
      <CardContent className="p-0">
        <div className="grid grid-cols-7 border-b border-border">
          {weekDayLabels.map((label, i) => (
            <div
              key={label}
              className={cn(
                "py-2 text-center text-xs font-medium text-muted-foreground",
                i >= 5 && "bg-muted/30"
              )}
            >
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const inMonth = isSameMonth(day, currentDate);
            const today = isToday(day);
            const weekend = isWeekend(day);
            const hours = getHoursForDay(day);
            const dayActivites = getActivitesForDay(day);
            const overlapping = getEtapesOverlapping(day);

            return (
              <div
                key={i}
                className={cn(
                  "relative min-h-[100px] p-1.5 border-b border-r border-border",
                  weekend && "bg-muted/20",
                  !inMonth && "bg-muted/10",
                  today && "ring-2 ring-inset ring-primary"
                )}
              >
                <div className="flex items-start justify-between mb-1">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      !inMonth && "text-muted-foreground",
                      today &&
                        "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {hours > 0 && (
                    <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
                      {hours}h
                    </span>
                  )}
                </div>

                <div className="space-y-0.5">
                  {overlapping.slice(0, 3).map((etape) => {
                    const isDeadlineDay = etape.deadline === format(day, "yyyy-MM-dd");
                    const isFirst =
                      etape.dateDebut === format(day, "yyyy-MM-dd") || !etape.dateDebut;
                    return (
                      <button
                        key={etape.id}
                        onContextMenu={(ev) => onContextMenu(ev, etape)}
                        onClick={() => onSelectEtape(etape)}
                        title={`${etape.nom} (${etape.projet.nom})`}
                        tabIndex={!inMonth ? -1 : undefined}
                        className={cn(
                          "w-full text-left px-1.5 py-1 text-[11px] font-medium leading-tight truncate transition-opacity cursor-pointer min-h-[24px] flex items-center gap-0.5",
                          isFirst && isDeadlineDay ? "rounded-[3px]" : isFirst ? "rounded-l-[3px] rounded-r-none" : isDeadlineDay ? "rounded-r-[3px] rounded-l-none" : "rounded-none",
                          etape.statut === "VALIDEE" && "opacity-50",
                          etape.urgence === "retard" && "ring-1 ring-red-400"
                        )}
                        style={{
                          backgroundColor: etape.projet.couleur + "33",
                          borderLeft: isFirst ? `3px solid ${etape.projet.couleur}` : undefined,
                        }}
                      >
                        {isFirst && (
                          <span className="truncate flex-1">
                            {healthIcon(etape.health)} {etape.nom}
                          </span>
                        )}
                        {!isFirst && <span className="flex-1">&nbsp;</span>}
                        {isDeadlineDay && (
                          <span className="text-red-500 shrink-0">📍</span>
                        )}
                      </button>
                    );
                  })}
                  {overlapping.length > 3 && (
                    <div className="text-[10px] text-muted-foreground pl-1">
                      +{overlapping.length - 3} autres
                    </div>
                  )}
                </div>

                {dayActivites.length > 0 && (() => {
                  const uniq = [
                    ...new Map(dayActivites.map((a) => [a.consultant.id, a.consultant])).values(),
                  ];
                  return (
                    <div className="flex gap-0.5 mt-1 flex-wrap items-center">
                      {uniq.slice(0, 3).map((c) => (
                        <span
                          key={c.id}
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: c.couleur }}
                          title={c.nom}
                        />
                      ))}
                      {uniq.length > 3 && (
                        <span className="text-[9px] text-muted-foreground font-medium">+{uniq.length - 3}</span>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
