"use client";

import { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  differenceInDays,
  isToday,
  isWeekend,
  parseISO,
  addDays,
  format as dateFnsFormat,
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
  onEtapeDatesChange?: (etapeId: number, dateDebut: string | null, deadline: string | null) => void;
}

const COL_WIDTH = 44;

function pxToJours(px: number): number {
  return Math.round(px / COL_WIDTH);
}

function shiftDate(dateStr: string | null, delta: number): string | null {
  if (!dateStr) return null;
  return dateFnsFormat(addDays(parseISO(dateStr), delta), "yyyy-MM-dd");
}

export function GanttView({
  currentDate,
  data,
  onSelectEtape,
  onContextMenu,
  onEtapeDatesChange,
}: GanttViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [drag, setDrag] = useState<{
    etapeId: number;
    type: "move" | "resize";
    startX: number;
    origDateDebut: string | null;
    origDeadline: string | null;
    deltaJours: number;
  } | null>(null);

  const [dragPreview, setDragPreview] = useState<{
    etapeId: number;
    dateDebut: string | null;
    deadline: string | null;
  } | null>(null);

  const projetMap = new Map<number, { projet: ProjetInfo; etapes: EtapeInfo[] }>();
  for (const etape of data?.etapes ?? []) {
    if (!projetMap.has(etape.projet.id)) {
      projetMap.set(etape.projet.id, { projet: etape.projet, etapes: [] });
    }
    projetMap.get(etape.projet.id)!.etapes.push(etape);
  }

  const totalDays = days.length;

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
          {/* En-tête mois */}
          <div className="flex border-b border-border" style={{ paddingLeft: "200px" }}>
            <div
              className="flex-shrink-0 px-2 py-1 text-xs font-semibold text-muted-foreground capitalize bg-muted/50"
              style={{ width: `${totalDays * COL_WIDTH}px` }}
            >
              {format(monthStart, "MMMM yyyy", { locale: fr })}
            </div>
          </div>

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
                {isToday(day) && <div className="h-1 w-1 rounded-full bg-primary mx-auto mt-0.5" />}
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
                {etapes.map((etape) => {
                  const barStart = dayPercent(etape.dateDebut ?? etape.deadline);
                  const bw = barWidth(etape.dateDebut, etape.deadline);
                  const barWidthPx = Math.max(bw, 1) * COL_WIDTH - 2;

                  return (
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
                            onClick={() => {
                              if (!drag || drag.deltaJours === 0) onSelectEtape(etape);
                            }}
                            onPointerDown={(e) => {
                              e.preventDefault();
                              e.currentTarget.setPointerCapture(e.pointerId);
                              const isResize = e.nativeEvent.offsetX > (barWidthPx - 12);
                              setDrag({
                                etapeId: etape.id,
                                type: isResize ? "resize" : "move",
                                startX: e.clientX,
                                origDateDebut: etape.dateDebut ?? null,
                                origDeadline: etape.deadline ?? null,
                                deltaJours: 0,
                              });
                            }}
                            onPointerMove={(e) => {
                              if (!drag || drag.etapeId !== etape.id) return;
                              const delta = pxToJours(e.clientX - drag.startX);
                              if (delta === drag.deltaJours) return;
                              setDrag((d) => d ? { ...d, deltaJours: delta } : null);

                              if (drag.type === "move") {
                                setDragPreview({
                                  etapeId: etape.id,
                                  dateDebut: shiftDate(drag.origDateDebut, delta),
                                  deadline: shiftDate(drag.origDeadline, delta),
                                });
                              } else {
                                setDragPreview({
                                  etapeId: etape.id,
                                  dateDebut: drag.origDateDebut,
                                  deadline: shiftDate(drag.origDeadline, delta),
                                });
                              }
                            }}
                            onPointerUp={() => {
                              if (!drag || !dragPreview || drag.deltaJours === 0) {
                                setDrag(null);
                                setDragPreview(null);
                                return;
                              }
                              onEtapeDatesChange?.(
                                drag.etapeId,
                                dragPreview.dateDebut,
                                dragPreview.deadline,
                              );
                              setDrag(null);
                              setDragPreview(null);
                            }}
                            onPointerCancel={() => {
                              setDrag(null);
                              setDragPreview(null);
                            }}
                            className={cn(
                              "absolute top-2 h-7 rounded transition-opacity hover:opacity-90 flex items-center px-1.5 text-[10px] font-medium text-white overflow-hidden",
                              etape.urgence === "retard" && "ring-1 ring-red-500"
                            )}
                            style={{
                              left: drag?.etapeId === etape.id && drag?.type === "move"
                                ? `${(barStart + drag.deltaJours) * COL_WIDTH}px`
                                : `${barStart * COL_WIDTH}px`,
                              width: `${barWidthPx}px`,
                              backgroundColor: etape.projet.couleur ?? "#3b82f6",
                              opacity: drag?.etapeId === etape.id ? 0.7 : etape.statut === "VALIDEE" ? 0.5 : 1,
                              cursor: drag?.etapeId === etape.id && drag?.type === "resize" ? "ew-resize" : "grab",
                            }}
                          >
                            <span className="text-[10px] font-medium text-white truncate leading-none flex-1">
                              {etape.nom}
                            </span>
                            {etape.dateDebut && etape.deadline && barWidthPx > 48 && (
                              <span className="text-[9px] text-white/70 shrink-0 ml-1">
                                J+{differenceInDays(parseISO(etape.deadline), parseISO(etape.dateDebut))}
                              </span>
                            )}
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
                            className="absolute bottom-0.5 flex z-20"
                            style={{
                              left: `${dayPercent(etape.dateDebut ?? etape.deadline) * COL_WIDTH + 2}px`,
                            }}
                          >
                            {etape.consultants.slice(0, 3).map((c, ci) => (
                              <span
                                key={c.id}
                                className="h-3.5 w-3.5 rounded-full border-2 border-background block shrink-0"
                                style={{ backgroundColor: c.couleur, marginLeft: ci > 0 ? "-4px" : undefined }}
                                title={c.nom}
                              />
                            ))}
                            {etape.consultants.length > 3 && (
                              <span
                                className="h-3.5 w-3.5 rounded-full border-2 border-background bg-muted text-[7px] font-bold flex items-center justify-center shrink-0"
                                style={{ marginLeft: "-4px" }}
                              >
                                +{etape.consultants.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
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
