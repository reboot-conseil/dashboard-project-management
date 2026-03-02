"use client";

import { useRef, useEffect } from "react";
import { CheckCircle2, RotateCcw, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Filtres, ConsultantInfo, ProjetInfo } from "./types";
import { STATUT_LABELS, URGENCE_LABELS } from "./types";

interface FiltresBarProps {
  filtres: Filtres;
  setFiltres: (f: Filtres) => void;
  consultants: ConsultantInfo[];
  projets: ProjetInfo[];
  filtresOpen: Record<string, boolean>;
  setFiltresOpen: (o: Record<string, boolean>) => void;
}

export function FiltresBar({ filtres, setFiltres, consultants, projets, filtresOpen, setFiltresOpen }: FiltresBarProps) {
  const hasActiveFilters =
    filtres.projetIds.length > 0 || filtres.consultantIds.length > 0 ||
    filtres.urgences.length > 0 || filtres.statuts.length !== 2 || !filtres.masquerPassees;

  function toggleDropdown(key: string) {
    setFiltresOpen({ ...filtresOpen, [key]: !filtresOpen[key] });
  }

  function resetFiltres() {
    setFiltres({ projetIds: [], consultantIds: [], statuts: ["A_FAIRE", "EN_COURS"], urgences: [], masquerPassees: true });
  }

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="filtres-bar">
      <FilterDropdown
        label={filtres.projetIds.length > 0 ? `📁 Projets (${filtres.projetIds.length})` : "📁 Projets"}
        open={!!filtresOpen.projets} onToggle={() => toggleDropdown("projets")} active={filtres.projetIds.length > 0}
      >
        <div className="space-y-1">
          <button className="w-full text-left text-xs px-2 py-1 rounded hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1" onClick={() => setFiltres({ ...filtres, projetIds: [] })}>☑ Tous</button>
          {projets.map((p) => (
            <label key={p.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer text-xs">
              <input type="checkbox" checked={filtres.projetIds.includes(p.id)}
                onChange={() => {
                  const ids = filtres.projetIds.includes(p.id) ? filtres.projetIds.filter((x) => x !== p.id) : [...filtres.projetIds, p.id];
                  setFiltres({ ...filtres, projetIds: ids });
                }} className="rounded" />
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.couleur }} />
              {p.nom}
            </label>
          ))}
        </div>
      </FilterDropdown>

      <FilterDropdown
        label={filtres.consultantIds.length > 0 ? `👤 Consultants (${filtres.consultantIds.length})` : "👤 Consultants"}
        open={!!filtresOpen.consultants} onToggle={() => toggleDropdown("consultants")} active={filtres.consultantIds.length > 0}
      >
        <div className="space-y-1">
          <button className="w-full text-left text-xs px-2 py-1 rounded hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1" onClick={() => setFiltres({ ...filtres, consultantIds: [] })}>☑ Tous</button>
          {consultants.map((c) => (
            <label key={c.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer text-xs">
              <input type="checkbox" checked={filtres.consultantIds.includes(c.id)}
                onChange={() => {
                  const ids = filtres.consultantIds.includes(c.id) ? filtres.consultantIds.filter((x) => x !== c.id) : [...filtres.consultantIds, c.id];
                  setFiltres({ ...filtres, consultantIds: ids });
                }} className="rounded" />
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: c.couleur }} />
              {c.nom}
            </label>
          ))}
        </div>
      </FilterDropdown>

      <FilterDropdown label="📊 Statut" open={!!filtresOpen.statuts} onToggle={() => toggleDropdown("statuts")} active={filtres.statuts.length !== 2}>
        <div className="space-y-1">
          {["A_FAIRE", "EN_COURS", "VALIDEE"].map((s) => (
            <label key={s} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer text-xs">
              <input type="checkbox" checked={filtres.statuts.includes(s)}
                onChange={() => {
                  const statuts = filtres.statuts.includes(s) ? filtres.statuts.filter((x) => x !== s) : [...filtres.statuts, s];
                  setFiltres({ ...filtres, statuts });
                }} className="rounded" />
              {STATUT_LABELS[s]}
            </label>
          ))}
        </div>
      </FilterDropdown>

      <FilterDropdown
        label={filtres.urgences.length > 0 ? `🚨 Urgence (${filtres.urgences.length})` : "🚨 Urgence"}
        open={!!filtresOpen.urgences} onToggle={() => toggleDropdown("urgences")} active={filtres.urgences.length > 0}
      >
        <div className="space-y-1">
          {["retard", "critique", "proche", "normal"].map((u) => (
            <label key={u} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer text-xs">
              <input type="checkbox" checked={filtres.urgences.includes(u)}
                onChange={() => {
                  const urgences = filtres.urgences.includes(u) ? filtres.urgences.filter((x) => x !== u) : [...filtres.urgences, u];
                  setFiltres({ ...filtres, urgences });
                }} className="rounded" />
              {URGENCE_LABELS[u]}
            </label>
          ))}
        </div>
      </FilterDropdown>

      <button
        onClick={() => setFiltres({ ...filtres, masquerPassees: !filtres.masquerPassees })}
        className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          filtres.masquerPassees ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground hover:bg-muted")}
      >
        <CheckCircle2 className="h-3 w-3" />Masquer deadlines passées
      </button>

      {hasActiveFilters && (
        <button onClick={resetFiltres} className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-md">
          <RotateCcw className="h-3 w-3" />Réinitialiser
        </button>
      )}
    </div>
  );
}

function FilterDropdown({ label, open, onToggle, active, children }: {
  label: string; open: boolean; onToggle: () => void; active?: boolean; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onToggle();
    }
    window.addEventListener("mousedown", handle);
    return () => window.removeEventListener("mousedown", handle);
  }, [open, onToggle]);

  return (
    <div ref={ref} className="relative">
      <button onClick={onToggle}
        className={cn("flex items-center gap-1 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          active ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground hover:bg-muted")}>
        {label}<ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-background border border-border rounded-lg shadow-lg p-2 min-w-[180px]">
          {children}
        </div>
      )}
    </div>
  );
}
