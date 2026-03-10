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

const WEEK_DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

interface MonthViewProps {
  currentDate: Date;
  data: CalData | null;
  weekDayLabels?: string[];
  onSelectEtape: (e: EtapeInfo) => void;
  onContextMenu: (ev: React.MouseEvent, e: EtapeInfo) => void;
}

export function MonthView({
  currentDate,
  data,
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

  function getActivitesForDay(day: Date) {
    if (!data) return [];
    const key = format(day, "yyyy-MM-dd");
    return data.activites.filter((a) => a.date === key);
  }

  // Group days into weeks and compute per-week bars in a separate overlay layer
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  function getWeekBars(week: Date[]) {
    if (!data) return [];
    const etapeMap = new Map<number, { etape: EtapeInfo; startCol: number; endCol: number }>();
    week.forEach((day, col) => {
      if (isWeekend(day)) return;
      getEtapesOverlapping(day).forEach((etape) => {
        const ex = etapeMap.get(etape.id);
        if (!ex) etapeMap.set(etape.id, { etape, startCol: col, endCol: col });
        else { ex.startCol = Math.min(ex.startCol, col); ex.endCol = Math.max(ex.endCol, col); }
      });
    });
    const entries = Array.from(etapeMap.values()).sort((a, b) => a.startCol - b.startCol);
    const laneEnds = [-1, -1, -1];
    return entries.flatMap(({ etape, startCol, endCol }) => {
      const lane = laneEnds.findIndex((e) => e < startCol);
      if (lane === -1) return [];
      laneEnds[lane] = endCol;
      return [{ etape, startCol, endCol, lane }];
    });
  }

  return (
    <Card data-testid="month-view">
      <CardContent className="p-0">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {WEEK_DAY_LABELS.map((label, i) => (
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

        {/* Calendar grid — one row per week */}
        <div>
          {weeks.map((week, wi) => (
            <div key={wi} className="relative grid grid-cols-7">
              {/* Day cells — date number + activity dots only */}
              {week.map((day, col) => {
                const inMonth = isSameMonth(day, currentDate);
                const today = isToday(day);
                const weekend = isWeekend(day);
                const key = format(day, "yyyy-MM-dd");
                const dayActivites = weekend ? [] : getActivitesForDay(day);
                return (
                  <div
                    key={col}
                    className={cn(
                      "relative min-h-[90px] p-1 border-b border-r border-border",
                      !inMonth && "opacity-50",
                      today && "ring-2 ring-inset ring-primary"
                    )}
                    style={weekend ? { background: "var(--color-surface-raised, var(--muted))" } : undefined}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn(
                        "text-xs font-medium leading-none",
                        weekend && "text-muted-foreground",
                        today && "bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center"
                      )}>
                        {format(day, "d")}
                      </span>
                      {(data?.heuresParJour?.[key] ?? 0) > 0 && (
                        <span className="text-[10px] text-emerald-600 font-medium">
                          {data!.heuresParJour[key]}h
                        </span>
                      )}
                    </div>
                    {dayActivites.length > 0 && (
                      <div className="absolute bottom-1 left-1 flex gap-0.5 flex-wrap">
                        {[...new Map(dayActivites.map((a) => [a.consultant.id, a.consultant])).values()]
                          .slice(0, 4)
                          .map((c) => (
                            <span key={c.id} className="h-1.5 w-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: c.couleur }} title={c.nom} />
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Bars overlay — absolutely positioned above cells, no border clipping */}
              <div className="absolute inset-x-0 overflow-hidden pointer-events-none" style={{ top: "26px", bottom: 0 }}>
                {getWeekBars(week).map(({ etape, startCol, endCol, lane }) => {
                  const weekKey0 = format(week[0], "yyyy-MM-dd");
                  const weekKeys = week.map((d) => format(d, "yyyy-MM-dd"));
                  const etapeStart = etape.dateDebut ?? etape.deadline;
                  const startsHere = etapeStart !== null && etapeStart >= weekKey0;
                  const endsHere = etape.deadline !== null && weekKeys.includes(etape.deadline);
                  const borderRadius =
                    startsHere && endsHere ? "3px" :
                    startsHere ? "3px 0 0 3px" :
                    endsHere ? "0 3px 3px 0" : "0";
                  return (
                    <button
                      key={etape.id}
                      onClick={() => onSelectEtape(etape)}
                      onContextMenu={(ev) => onContextMenu(ev, etape)}
                      title={`${etape.nom} — ${etape.projet.nom}`}
                      className={cn(
                        "absolute h-[18px] text-[10px] leading-tight pointer-events-auto overflow-hidden flex items-center",
                        etape.statut === "VALIDEE" && "opacity-50",
                      )}
                      style={{
                        left: `${(startCol / 7) * 100}%`,
                        width: `${((endCol - startCol + 1) / 7) * 100}%`,
                        top: `${lane * 20}px`,
                        backgroundColor: etape.projet.couleur + "30",
                        borderLeft: startsHere ? `3px solid ${etape.projet.couleur}` : "none",
                        borderRight: endsHere ? `3px solid ${etape.projet.couleur}` : "none",
                        borderRadius,
                        paddingLeft: startsHere ? "4px" : "2px",
                        paddingRight: endsHere ? "4px" : "2px",
                      }}
                    >
                      <span className="truncate flex-1 block">{etape.nom}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
