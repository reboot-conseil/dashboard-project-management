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

// Returns bar continuation type for a workday cell
function barType(etape: EtapeInfo, key: string): "standalone" | "right" | "left" | "both" {
  const start = etape.dateDebut;
  const end = etape.deadline;
  if (!end) return "standalone";
  const comesLeft = start !== null && start < key;
  const goesRight = end > key;
  if (comesLeft && goesRight) return "both";
  if (comesLeft && !goesRight) return "left";
  if (!comesLeft && goesRight) return "right";
  return "standalone";
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

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const inMonth = isSameMonth(day, currentDate);
            const today = isToday(day);
            const weekend = isWeekend(day);
            const key = format(day, "yyyy-MM-dd");
            const overlapping = weekend ? [] : getEtapesOverlapping(day);
            const dayActivites = weekend ? [] : getActivitesForDay(day);

            return (
              <div
                key={i}
                className={cn(
                  "relative min-h-[90px] p-1 border-b border-r border-border",
                  !inMonth && "opacity-50",
                  today && "ring-2 ring-inset ring-primary"
                )}
                style={weekend ? { background: "var(--color-surface-raised, var(--muted))" } : undefined}
              >
                {/* Date number */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      "text-xs font-medium leading-none",
                      weekend && "text-muted-foreground",
                      today &&
                        "bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {/* Heures loguées */}
                  {(data?.heuresParJour?.[key] ?? 0) > 0 && (
                    <span className="text-[10px] text-emerald-600 font-medium">
                      {data!.heuresParJour[key]}h
                    </span>
                  )}
                </div>

                {/* Etape bars (workdays only) */}
                {!weekend && (
                  <div className="space-y-0.5">
                    {overlapping.slice(0, 3).map((etape) => {
                      const type = barType(etape, key);
                      const isDeadline = etape.deadline === key;
                      const extendsRight = type === "right" || type === "both";
                      const extendsLeft = type === "left" || type === "both";
                      return (
                        <button
                          key={etape.id}
                          onContextMenu={(ev) => onContextMenu(ev, etape)}
                          onClick={() => onSelectEtape(etape)}
                          title={`${etape.nom} — ${etape.projet.nom}`}
                          tabIndex={!inMonth ? -1 : undefined}
                          className={cn(
                            "w-full text-left px-1 py-0.5 text-[10px] leading-tight truncate transition-opacity cursor-pointer h-[18px] relative z-10",
                            etape.statut === "VALIDEE" && "opacity-50",
                            type === "standalone" && "rounded",
                            type === "right" && "rounded-l",
                            type === "left" && "rounded-r",
                            type === "both" && "rounded-none",
                          )}
                          style={{
                            backgroundColor: etape.projet.couleur + "30",
                            borderLeft: !extendsLeft ? `3px solid ${etape.projet.couleur}` : "none",
                            marginRight: extendsRight ? "-5px" : undefined,
                            marginLeft: extendsLeft ? "-5px" : undefined,
                            paddingLeft: extendsLeft ? "4px" : undefined,
                          }}
                        >
                          {(type === "standalone" || type === "right") && (
                            <span className="truncate flex items-center gap-1">
                              {isDeadline && (
                                <span
                                  className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: etape.joursRestants !== null && etape.joursRestants < 0 ? "var(--color-destructive)" : etape.projet.couleur }}
                                />
                              )}
                              {etape.nom}
                            </span>
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
                )}

                {/* Activity dots */}
                {dayActivites.length > 0 && (
                  <div className="flex gap-0.5 mt-1 flex-wrap">
                    {[
                      ...new Map(dayActivites.map((a) => [a.consultant.id, a.consultant])).values(),
                    ]
                      .slice(0, 4)
                      .map((c) => (
                        <span
                          key={c.id}
                          className="h-1.5 w-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: c.couleur }}
                          title={c.nom}
                        />
                      ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
