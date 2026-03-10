"use client";

import { format, isToday, isYesterday, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Edit2, Trash2 } from "lucide-react";
import type { Activite } from "./types";

interface ActivitesFeedProps {
  activites: Activite[];
  onEdit: (a: Activite) => void;
  onDelete: (a: Activite) => void;
}

function getDateLabel(dateStr: string): string {
  const d = parseISO(dateStr);
  if (isToday(d)) return "Aujourd'hui";
  if (isYesterday(d)) return "Hier";
  const label = format(d, "EEEE d MMMM", { locale: fr });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function ActivitesFeed({ activites, onEdit, onDelete }: ActivitesFeedProps) {
  const sorted = [...activites].sort((a, b) => b.date.localeCompare(a.date));

  const groups = new Map<string, Activite[]>();
  for (const a of sorted) {
    if (!groups.has(a.date)) groups.set(a.date, []);
    groups.get(a.date)!.push(a);
  }

  if (sorted.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground text-sm">
        Aucune activité sur cette période
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {Array.from(groups.entries()).map(([date, items]) => (
        <div key={date}>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              {getDateLabel(date)}
            </span>
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] text-muted-foreground">
              {items.reduce((s, a) => s + Number(a.heures), 0).toFixed(1)}h
            </span>
          </div>
          <div className="space-y-1">
            {items.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-card border border-border/60 hover:border-border transition-colors group"
              >
                {/* Consultant */}
                <div className="flex items-center gap-1.5 w-[130px] shrink-0">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: a.consultant.couleur }}
                  />
                  <span className="text-[11px] font-medium text-muted-foreground truncate">
                    {a.consultant.nom}
                  </span>
                </div>

                {/* Projet + étape + description */}
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span
                    className="h-2 w-2 rounded-[2px] shrink-0"
                    style={{ backgroundColor: a.projet.couleur }}
                  />
                  <span className="text-[12px] font-medium truncate">{a.projet.nom}</span>
                  {a.etape && (
                    <span className="text-[11px] text-muted-foreground truncate hidden sm:block">
                      · {a.etape.nom}
                    </span>
                  )}
                  {a.description && (
                    <span className="text-[11px] text-muted-foreground/60 truncate hidden md:block">
                      — {a.description}
                    </span>
                  )}
                </div>

                {/* Heures + facturable + actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {a.facturable && (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                      title="Facturable"
                    />
                  )}
                  <span className="text-[12px] font-semibold tabular-nums w-10 text-right">
                    {Number(a.heures)}h
                  </span>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEdit(a)}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                      aria-label="Modifier"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => onDelete(a)}
                      className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
