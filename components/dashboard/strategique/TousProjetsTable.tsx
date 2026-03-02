"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { UrgenceBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────
export interface ProjetTableRow {
  id: number;
  nom: string;
  client: string;
  statut: string;
  budget: number;
  pctBudget: number;
  budgetConsommePct: number;
  realisationPct: number;
  ecart: number;
  health: "bon" | "normal" | "critique";
  ca: number;
  marge: number;
  tauxMarge: number;
  prochainDeadline: {
    deadline: string | null;
    joursRestants: number | null;
  } | null;
}

interface TousProjetsTableProps {
  projets: ProjetTableRow[];
}

type SortKey = "nom" | "statut" | "ecart" | "ca" | "tauxMarge" | "deadline";
type SortDir = "asc" | "desc";

type FiltreStatut = "TOUS" | "EN_COURS" | "PLANIFIE" | "TERMINE" | "EN_PAUSE";

// ── Helpers ────────────────────────────────────────────────────────────
function formatEuros(v: number) {
  if (Math.abs(v) >= 1000) {
    return `${Math.round(v / 100) / 10}k€`;
  }
  return `${Math.round(v)}€`;
}

function statutLabel(s: string) {
  switch (s) {
    case "EN_COURS": return "En cours";
    case "PLANIFIE": return "Planifié";
    case "TERMINE": return "Terminé";
    case "EN_PAUSE": return "En pause";
    default: return s;
  }
}

function statutVariant(s: string): "default" | "success" | "secondary" | "warning" | "outline" {
  switch (s) {
    case "EN_COURS": return "default";
    case "TERMINE": return "success";
    case "PLANIFIE": return "secondary";
    case "EN_PAUSE": return "warning";
    default: return "outline";
  }
}

// ── Component ──────────────────────────────────────────────────────────
export function TousProjetsTable({ projets }: TousProjetsTableProps) {
  const [sortKey, setSortKey] = React.useState<SortKey>("ecart");
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");
  const [filtreStatut, setFiltreStatut] = React.useState<FiltreStatut>("TOUS");

  const FILTRES: { key: FiltreStatut; label: string }[] = [
    { key: "TOUS", label: "Tous" },
    { key: "EN_COURS", label: "En cours" },
    { key: "PLANIFIE", label: "Planifié" },
    { key: "TERMINE", label: "Terminé" },
    { key: "EN_PAUSE", label: "En pause" },
  ];

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 ml-1 text-primary" />
      : <ArrowDown className="h-3 w-3 ml-1 text-primary" />;
  }

  const filtered = projets.filter(
    (p) => filtreStatut === "TOUS" || p.statut === filtreStatut
  );

  const sorted = [...filtered].sort((a, b) => {
    let va: number | string = 0;
    let vb: number | string = 0;
    switch (sortKey) {
      case "nom": va = a.nom; vb = b.nom; break;
      case "statut": va = a.statut; vb = b.statut; break;
      case "ecart": va = a.ecart; vb = b.ecart; break;
      case "ca": va = a.ca; vb = b.ca; break;
      case "tauxMarge": va = a.tauxMarge; vb = b.tauxMarge; break;
      case "deadline":
        va = a.prochainDeadline?.joursRestants ?? 9999;
        vb = b.prochainDeadline?.joursRestants ?? 9999;
        break;
    }
    if (typeof va === "string" && typeof vb === "string") {
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    }
    return sortDir === "asc" ? Number(va) - Number(vb) : Number(vb) - Number(va);
  });

  // Totaux
  const totalCA = filtered.reduce((s, p) => s + p.ca, 0);
  const totalMarge = filtered.reduce((s, p) => s + p.marge, 0);
  const moyenneMarge =
    filtered.filter((p) => p.ca > 0).length > 0
      ? Math.round(
          (filtered.filter((p) => p.ca > 0).reduce((s, p) => s + p.tauxMarge, 0) /
            filtered.filter((p) => p.ca > 0).length) *
            10
        ) / 10
      : 0;

  const nbEnCours = projets.filter((p) => p.statut === "EN_COURS").length;
  const nbPlanifie = projets.filter((p) => p.statut === "PLANIFIE").length;
  const nbTermine = projets.filter((p) => p.statut === "TERMINE").length;

  return (
    <div className="space-y-3">
      {/* Filtres statut */}
      <div className="flex flex-wrap gap-1.5">
        {FILTRES.map((f) => (
          <Button
            key={f.key}
            variant={filtreStatut === f.key ? "default" : "outline"}
            size="sm"
            onClick={() => setFiltreStatut(f.key)}
            className="h-7 text-xs px-2.5"
          >
            {f.label}
            <span className="ml-1 text-xs opacity-60">
              ({f.key === "TOUS"
                ? projets.length
                : projets.filter((p) => p.statut === f.key).length})
            </span>
          </Button>
        ))}
      </div>

      {/* Table scroll */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="text-left px-3 py-2 font-semibold text-xs text-muted-foreground">
                <button
                  type="button"
                  className="flex items-center hover:text-foreground"
                  onClick={() => toggleSort("nom")}
                >
                  Projet <SortIcon col="nom" />
                </button>
              </th>
              <th className="text-left px-3 py-2 font-semibold text-xs text-muted-foreground">
                <button
                  type="button"
                  className="flex items-center hover:text-foreground"
                  onClick={() => toggleSort("statut")}
                >
                  Statut <SortIcon col="statut" />
                </button>
              </th>
              <th className="text-right px-3 py-2 font-semibold text-xs text-muted-foreground hidden sm:table-cell">
                Budget
              </th>
              <th className="text-right px-3 py-2 font-semibold text-xs text-muted-foreground hidden sm:table-cell">
                Réalisé
              </th>
              <th className="text-right px-3 py-2 font-semibold text-xs text-muted-foreground">
                <button
                  type="button"
                  className="flex items-center ml-auto hover:text-foreground"
                  onClick={() => toggleSort("ecart")}
                >
                  Écart <SortIcon col="ecart" />
                </button>
              </th>
              <th className="text-right px-3 py-2 font-semibold text-xs text-muted-foreground">
                <button
                  type="button"
                  className="flex items-center ml-auto hover:text-foreground"
                  onClick={() => toggleSort("ca")}
                >
                  CA <SortIcon col="ca" />
                </button>
              </th>
              <th className="text-right px-3 py-2 font-semibold text-xs text-muted-foreground">
                <button
                  type="button"
                  className="flex items-center ml-auto hover:text-foreground"
                  onClick={() => toggleSort("tauxMarge")}
                >
                  Marge <SortIcon col="tauxMarge" />
                </button>
              </th>
              <th className="text-right px-3 py-2 font-semibold text-xs text-muted-foreground">
                <button
                  type="button"
                  className="flex items-center ml-auto hover:text-foreground"
                  onClick={() => toggleSort("deadline")}
                >
                  Deadline <SortIcon col="deadline" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((p) => {
              const joursD = p.prochainDeadline?.joursRestants;
              return (
                <tr
                  key={p.id}
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => window.location.href = `/projets/${p.id}`}
                >
                  {/* Projet + client */}
                  <td className="px-3 py-2.5">
                    <p className="font-medium truncate max-w-[160px]">{p.nom}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[160px]">{p.client}</p>
                  </td>

                  {/* Statut */}
                  <td className="px-3 py-2.5">
                    <Badge variant={statutVariant(p.statut)} className="text-[10px] px-1.5 py-0 whitespace-nowrap">
                      {statutLabel(p.statut)}
                    </Badge>
                  </td>

                  {/* Budget consommé */}
                  <td className="px-3 py-2.5 text-right hidden sm:table-cell">
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="w-12">
                        <Progress
                          value={Math.min(p.budgetConsommePct, 100)}
                          className="h-1"
                          indicatorClassName={
                            p.budgetConsommePct > 100
                              ? "bg-destructive"
                              : p.budgetConsommePct > 80
                              ? "bg-amber-500"
                              : "bg-primary"
                          }
                        />
                      </div>
                      <span className="text-xs tabular-nums">{p.budgetConsommePct}%</span>
                    </div>
                  </td>

                  {/* Réalisation */}
                  <td className="px-3 py-2.5 text-right hidden sm:table-cell">
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="w-12">
                        <Progress
                          value={Math.min(p.realisationPct, 100)}
                          className="h-1"
                          indicatorClassName="bg-emerald-500"
                        />
                      </div>
                      <span className="text-xs tabular-nums">{p.realisationPct}%</span>
                    </div>
                  </td>

                  {/* Écart */}
                  <td className="px-3 py-2.5 text-right">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                        p.ecart < -10
                          ? "bg-destructive/10 text-destructive"
                          : p.ecart < 0
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      )}
                    >
                      {p.ecart > 0 ? "+" : ""}
                      {p.ecart}%
                    </span>
                  </td>

                  {/* CA */}
                  <td className="px-3 py-2.5 text-right">
                    <span className="text-xs font-medium tabular-nums">{formatEuros(p.ca)}</span>
                  </td>

                  {/* Marge */}
                  <td className="px-3 py-2.5 text-right">
                    <span
                      className={cn(
                        "text-xs font-semibold tabular-nums",
                        p.tauxMarge >= 40
                          ? "text-emerald-600"
                          : p.tauxMarge >= 30
                          ? "text-amber-600"
                          : p.tauxMarge > 0
                          ? "text-destructive"
                          : "text-muted-foreground"
                      )}
                    >
                      {p.ca > 0 ? `${p.tauxMarge}%` : "—"}
                    </span>
                  </td>

                  {/* Deadline */}
                  <td className="px-3 py-2.5 text-right">
                    {p.prochainDeadline?.deadline ? (
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(p.prochainDeadline.deadline), "dd/MM", { locale: fr })}
                        </span>
                        <UrgenceBadge joursRestants={joursD ?? null} />
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                  Aucun projet pour ce filtre
                </td>
              </tr>
            )}
          </tbody>
          {/* Footer totaux */}
          {filtered.length > 0 && (
            <tfoot>
              <tr className="bg-muted/30 border-t-2 border-border font-semibold">
                <td className="px-3 py-2 text-xs text-muted-foreground" colSpan={5}>
                  {filtered.length} projet{filtered.length > 1 ? "s" : ""}
                  {nbEnCours > 0 && ` · ${nbEnCours} en cours`}
                  {nbPlanifie > 0 && ` · ${nbPlanifie} planifié${nbPlanifie > 1 ? "s" : ""}`}
                  {nbTermine > 0 && ` · ${nbTermine} terminé${nbTermine > 1 ? "s" : ""}`}
                </td>
                <td className="px-3 py-2 text-right text-xs tabular-nums">
                  {formatEuros(totalCA)}
                </td>
                <td className="px-3 py-2 text-right text-xs tabular-nums">
                  {moyenneMarge > 0 ? `${moyenneMarge}%` : "—"}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
