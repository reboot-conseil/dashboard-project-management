import * as React from "react";
import { cn } from "@/lib/utils";

interface Deadline {
  etapeId: number;
  etapeNom: string;
  statut: string;
  projetId: number;
  projetNom: string;
  projetCouleur: string;
  deadline: string;
  joursRestants: number;
  chargeEstimeeJours: number | null;
}

interface DeadlinesAVenirSectionProps {
  deadlines: Deadline[];
}

export function DeadlinesAVenirSection({ deadlines }: DeadlinesAVenirSectionProps) {
  if (deadlines.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">Aucune deadline à venir</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {deadlines.map((d) => {
        const dotColor = d.projetCouleur ?? "#3b82f6";
        const dateColor = d.joursRestants < 0
          ? "text-destructive"
          : d.joursRestants <= 7
          ? "text-destructive"
          : d.joursRestants <= 14
          ? "text-warning"
          : "text-muted-foreground";
        return (
          <div
            key={d.etapeId}
            className="bg-card rounded-lg px-2.5 py-2 border border-border"
            style={{ borderLeft: `3px solid ${dotColor}` }}
          >
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-[12.5px] font-bold text-foreground truncate">{d.etapeNom}</span>
              <span className={cn("text-[11.5px] font-bold shrink-0", dateColor)}>
                {new Date(d.deadline).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-1.5 h-1.5 rounded-sm shrink-0" style={{ background: dotColor }} />
              <span className="text-[10.5px] text-muted-foreground truncate">{d.projetNom}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
