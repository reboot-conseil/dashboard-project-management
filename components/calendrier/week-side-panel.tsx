"use client";

import * as React from "react";
import { startOfWeek, endOfWeek, isWithinInterval, parseISO, differenceInDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronRight, AlertCircle, Clock, Calendar } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CalData, EtapeInfo } from "./types";

interface WeekSidePanelProps {
  data: CalData | null;
  currentDate: Date;
  onSelectEtape: (e: EtapeInfo) => void;
}

function urgenceClass(jours: number) {
  if (jours < 0) return "text-destructive";
  if (jours < 3) return "text-destructive";
  if (jours < 7) return "text-amber-600";
  return "text-muted-foreground";
}

function UrgenceIcon({ jours }: { jours: number }) {
  if (jours < 3) return <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />;
  if (jours < 7) return <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />;
  return <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />;
}

export function WeekSidePanel({ data, currentDate, onSelectEtape }: WeekSidePanelProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const etapes = data?.etapes ?? [];

  // Étapes avec deadline cette semaine OU en retard
  const thisWeek = etapes
    .filter((e) => {
      if (!e.deadline) return false;
      const dl = parseISO(e.deadline);
      const jours = differenceInDays(dl, today);
      return isWithinInterval(dl, { start: weekStart, end: weekEnd }) || jours < 0;
    })
    .sort((a, b) => {
      const da = differenceInDays(parseISO(a.deadline!), today);
      const db = differenceInDays(parseISO(b.deadline!), today);
      return da - db;
    });

  // Étapes à venir dans les 14 prochains jours (hors cette semaine)
  const upcoming = etapes
    .filter((e) => {
      if (!e.deadline) return false;
      const dl = parseISO(e.deadline);
      const jours = differenceInDays(dl, today);
      return jours >= 7 && jours <= 14;
    })
    .sort((a, b) =>
      differenceInDays(parseISO(a.deadline!), today) - differenceInDays(parseISO(b.deadline!), today)
    )
    .slice(0, 4);

  return (
    <div className="w-[260px] shrink-0 flex flex-col border-l border-border bg-[var(--color-surface)]">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-border">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
          Cette semaine
        </p>
        <p className="text-[10px] text-muted-foreground/70 mt-0.5">
          {format(weekStart, "d MMM", { locale: fr })} – {format(weekEnd, "d MMM yyyy", { locale: fr })}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {/* Deadlines cette semaine */}
        <div className="py-2">
          {thisWeek.length === 0 ? (
            <p className="text-[11px] text-muted-foreground px-3 py-2">Aucune deadline cette semaine</p>
          ) : (
            thisWeek.map((etape) => {
              const jours = differenceInDays(parseISO(etape.deadline!), today);
              return (
                <button
                  key={etape.id}
                  className="w-full text-left px-3 py-2 hover:bg-muted/40 transition-colors flex items-start gap-2 group"
                  onClick={() => onSelectEtape(etape)}
                >
                  {/* Barre couleur */}
                  <div
                    className="w-0.5 self-stretch rounded-full shrink-0 mt-0.5"
                    style={{ backgroundColor: etape.projet.couleur }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium truncate leading-tight">{etape.nom}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{etape.projet.nom}</p>
                    <div className={cn("flex items-center gap-1 mt-0.5 text-[10px] font-medium", urgenceClass(jours))}>
                      <UrgenceIcon jours={jours} />
                      <span>
                        {jours < 0
                          ? `Retard ${Math.abs(jours)}j`
                          : jours === 0
                          ? "Aujourd'hui"
                          : jours === 1
                          ? "Demain"
                          : `Dans ${jours}j`}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                </button>
              );
            })
          )}
        </div>

        {/* À venir (J+8 à J+14) */}
        {upcoming.length > 0 && (
          <div className="py-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-3 mb-1">
              Prochainement
            </p>
            {upcoming.map((etape) => {
              const jours = differenceInDays(parseISO(etape.deadline!), today);
              return (
                <button
                  key={etape.id}
                  className="w-full text-left px-3 py-1.5 hover:bg-muted/30 transition-colors flex items-center gap-2 group"
                  onClick={() => onSelectEtape(etape)}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: etape.projet.couleur }}
                  />
                  <span className="text-[11px] truncate flex-1">{etape.nom}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">J+{jours}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Lien voir tout */}
        <div className="px-3 py-2">
          <Link
            href="/calendrier"
            className="text-[11px] text-primary hover:underline flex items-center gap-1"
          >
            Voir le calendrier complet
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
