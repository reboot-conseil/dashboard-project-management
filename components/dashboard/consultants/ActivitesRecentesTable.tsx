"use client";

import * as React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────
interface Activite {
  id: number;
  date: string;
  projetId: number;
  projetNom: string;
  projetCouleur: string;
  etapeNom: string | null;
  heures: number;
  facturable: boolean;
  description: string | null;
}

interface ActivitesRecentesTableProps {
  activites: Activite[];
  totalHeuresToutes: number;
  totalHeuresBill: number;
}

const PAGE_SIZE = 20;

// ── Component ──────────────────────────────────────────────────────────
export function ActivitesRecentesTable({
  activites,
  totalHeuresToutes,
  totalHeuresBill,
}: ActivitesRecentesTableProps) {
  const [page, setPage] = React.useState(0);

  const totalPages = Math.ceil(activites.length / PAGE_SIZE);
  const slice = activites.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const pctBill = totalHeuresToutes > 0
    ? Math.round((totalHeuresBill / totalHeuresToutes) * 100)
    : 0;

  if (activites.length === 0) {
    return (
      <p className="text-center py-8 text-muted-foreground text-sm">
        Aucune activité enregistrée
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">
                Date
              </th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">
                Projet
              </th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground hidden md:table-cell">
                Étape
              </th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">
                Heures
              </th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground hidden lg:table-cell">
                Description
              </th>
              <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground">
                Fact.
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {slice.map((a) => (
              <tr
                key={a.id}
                className="hover:bg-muted/30 transition-colors"
              >
                <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(a.date), "dd/MM/yy", { locale: fr })}
                </td>

                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: a.projetCouleur }}
                    />
                    <span className="text-xs font-medium truncate max-w-[120px]">
                      {a.projetNom}
                    </span>
                  </div>
                </td>

                <td className="px-3 py-2 hidden md:table-cell">
                  <span className="text-xs text-muted-foreground truncate max-w-[100px] block">
                    {a.etapeNom ?? "—"}
                  </span>
                </td>

                <td className="px-3 py-2 text-right">
                  <span className="text-xs font-semibold tabular-nums">{a.heures}h</span>
                </td>

                <td className="px-3 py-2 hidden lg:table-cell">
                  <span className="text-xs text-muted-foreground truncate max-w-[180px] block">
                    {a.description ?? "—"}
                  </span>
                </td>

                <td className="px-3 py-2 text-center">
                  {a.facturable ? (
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" title="Facturable" />
                  ) : (
                    <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground/40" title="Non facturable" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          {/* Footer totaux */}
          <tfoot>
            <tr className="bg-muted/30 border-t-2 border-border font-semibold">
              <td colSpan={3} className="px-3 py-2 text-xs text-muted-foreground">
                {activites.length} activité{activites.length > 1 ? "s" : ""}
              </td>
              <td className="px-3 py-2 text-right text-xs tabular-nums">
                {totalHeuresToutes}h
              </td>
              <td className="px-3 py-2 hidden lg:table-cell text-xs text-muted-foreground">
                {totalHeuresBill}h facturables ({pctBill}%)
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Page {page + 1} / {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Résumé facturables (mobile) */}
      <p className="lg:hidden text-xs text-muted-foreground text-center">
        {totalHeuresBill}h facturables / {totalHeuresToutes}h totales ({pctBill}%)
      </p>
    </div>
  );
}
