import * as React from "react";
import { ClipboardList } from "lucide-react";

// ── Placeholder pour V2 ────────────────────────────────────────────────
export function MesTachesSection() {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
      <div className="rounded-full bg-muted p-3">
        <ClipboardList className="h-6 w-6 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">Tâches — Version 2</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
          Cette section affichera vos tâches auto-générées et manuelles pour la semaine.
        </p>
      </div>
      <ul className="text-xs text-muted-foreground space-y-1 text-left mt-1">
        <li className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
          Tâches auto-générées (deadlines, relances)
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
          Tâches manuelles avec priorité
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
          Suivi de complétion semaine
        </li>
      </ul>
    </div>
  );
}
