"use client";

import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Pencil, Trash2, Bookmark, BookmarkCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import type { Activite, Totaux, Consultant, Projet, SavedFilter } from "./types";
import { PERIODES } from "./types";

const PAGE_SIZE = 25;

interface ActivitesListProps {
  activites: Activite[];
  totaux: Totaux;
  loading: boolean;
  consultants: Consultant[];
  projets: Projet[];
  filtreConsultant: string;
  filtreProjet: string;
  filtrePeriode: string;
  savedFilters: SavedFilter[];
  savedFiltersOpen: boolean;
  onFiltreConsultant: (v: string) => void;
  onFiltreProjet: (v: string) => void;
  onFiltrePeriode: (v: string) => void;
  onToggleSavedFilters: () => void;
  onOpenSaveFilterDialog: () => void;
  onApplyFilter: (f: SavedFilter) => void;
  onDeleteFilter: (id: string) => void;
  onEdit: (a: Activite) => void;
  onDelete: (a: Activite) => void;
}

export function ActivitesList({
  activites, totaux, loading, consultants, projets,
  filtreConsultant, filtreProjet, filtrePeriode,
  savedFilters, savedFiltersOpen,
  onFiltreConsultant, onFiltreProjet, onFiltrePeriode,
  onToggleSavedFilters, onOpenSaveFilterDialog,
  onApplyFilter, onDeleteFilter, onEdit, onDelete,
}: ActivitesListProps) {
  const [page, setPage] = useState(1);

  // Reset page when filters change
  const totalPages = Math.max(1, Math.ceil(activites.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedActivites = activites.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Stats
  const nbConsultants = new Set(activites.map((a) => a.consultant.id)).size;
  const nbProjets = new Set(activites.map((a) => a.projet.id)).size;
  const pctFacturable = totaux.total > 0 ? Math.round((totaux.facturable / totaux.total) * 100) : 0;

  // Group paginated activités by day
  const grouped: Record<string, Activite[]> = {};
  for (const a of paginatedActivites) {
    const day = a.date.slice(0, 10);
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(a);
  }
  const sortedDays = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <Card data-testid="activites-list">
      <CardContent className="pt-6">
        {/* Filtres — ligne 1 : selects */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <Select value={filtreConsultant} onChange={(e) => { onFiltreConsultant(e.target.value); setPage(1); }} aria-label="Filtrer par consultant">
            <option value="">Tous les consultants</option>
            {consultants.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </Select>
          <Select value={filtreProjet} onChange={(e) => { onFiltreProjet(e.target.value); setPage(1); }} aria-label="Filtrer par projet">
            <option value="">Tous les projets</option>
            {projets.map((p) => (
              <option key={p.id} value={p.id}>{p.nom}</option>
            ))}
          </Select>
        </div>

        {/* Filtres — ligne 2 : pills période */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {PERIODES.map((p) => (
            <Button
              key={p.value}
              variant={filtrePeriode === p.value ? "default" : "outline"}
              size="sm"
              className="flex-none text-xs"
              onClick={() => { onFiltrePeriode(p.value); setPage(1); }}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {/* Stats bar */}
        {!loading && activites.length > 0 && (
          <div className="flex flex-wrap items-center gap-4 mb-4 px-3 py-2 rounded-lg bg-muted/40 text-sm">
            <span className="font-semibold">{totaux.total}h</span>
            <span className="text-muted-foreground">
              Facturables <span className="font-medium text-foreground">{totaux.facturable}h</span>
              {" "}<span className="text-xs">({pctFacturable}%)</span>
            </span>
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">{nbConsultants}</span> consultant{nbConsultants > 1 ? "s" : ""}
            </span>
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">{nbProjets}</span> projet{nbProjets > 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* Saved filters bar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {(filtreConsultant || filtreProjet || filtrePeriode !== "month") && (
            <button
              onClick={() => { onFiltreConsultant(""); onFiltreProjet(""); onFiltrePeriode("month"); setPage(1); }}
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
            >
              <Trash2 className="h-3 w-3" />Effacer filtres
            </button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenSaveFilterDialog}
            className="gap-1.5 text-xs"
            data-testid="btn-save-filter"
          >
            <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
            Sauvegarder filtre
          </Button>
          {savedFilters.length > 0 && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleSavedFilters}
                className="gap-1.5 text-xs"
                data-testid="btn-saved-filters"
              >
                <BookmarkCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Filtres sauvegardés ({savedFilters.length})
              </Button>
              {savedFiltersOpen && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-lg min-w-[250px]">
                  <div className="p-2 space-y-1">
                    {savedFilters.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-md hover:bg-muted transition-colors"
                      >
                        <button
                          onClick={() => onApplyFilter(f)}
                          className="text-sm font-medium text-left flex-1 truncate cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
                          data-testid={`apply-filter-${f.id}`}
                        >
                          {f.nom}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteFilter(f.id); }}
                          className="shrink-0 text-muted-foreground hover:text-destructive transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
                          aria-label="Supprimer le filtre"
                          data-testid={`delete-filter-${f.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-center py-8 text-muted-foreground" data-testid="loading">Chargement...</p>
        ) : activites.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground" data-testid="empty">
            Aucune activité pour cette période
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table data-testid="activites-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Projet</TableHead>
                    <TableHead>Étape</TableHead>
                    <TableHead>Consultant</TableHead>
                    <TableHead className="text-right">Heures</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Fact.</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedDays.map((day) => {
                    const dayActivites = grouped[day];
                    const dayTotal = dayActivites.reduce((s, a) => s + Number(a.heures), 0);
                    return [
                      // Group header
                      <TableRow key={`day-${day}`} className="bg-muted/60 hover:bg-muted/60 border-t-2 border-border">
                        <TableCell colSpan={6} className="py-1.5 font-semibold text-[12.5px] text-foreground capitalize">
                          {format(new Date(day), "EEEE d MMMM yyyy", { locale: fr })}
                        </TableCell>
                        <TableCell className="py-1.5 text-right text-[12.5px] font-semibold text-muted-foreground pr-4">
                          {dayTotal}h
                        </TableCell>
                      </TableRow>,
                      // Activity rows
                      ...dayActivites.map((a) => (
                        <TableRow
                          key={a.id}
                          data-testid={`row-${a.id}`}
                          className="group border-b transition-colors hover:bg-muted/50"
                        >
                          <TableCell className="py-1">
                            <div className="flex items-center gap-1.5">
                              {a.projet.couleur && (
                                <span className="w-2 h-2 shrink-0" style={{ background: a.projet.couleur, borderRadius: "3px" }} />
                              )}
                              <span className="text-[12.5px]">{a.projet.nom}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-1 text-muted-foreground text-[12px]">
                            {a.etape ? a.etape.nom : "—"}
                          </TableCell>
                          <TableCell className="py-1 text-[12.5px]">{a.consultant.nom}</TableCell>
                          <TableCell className="py-1 text-right font-medium text-[12.5px]">
                            {Number(a.heures)}h
                          </TableCell>
                          <TableCell className="py-1 text-muted-foreground text-[12px] max-w-[180px] truncate">
                            {a.description || "—"}
                          </TableCell>
                          <TableCell className="py-1">
                            <Badge variant={a.facturable ? "success" : "secondary"} className="text-xs">
                              {a.facturable ? "Oui" : "Non"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-1 text-right">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onEdit(a)}
                                title="Modifier"
                                aria-label="Modifier"
                                data-testid={`btn-edit-${a.id}`}
                              >
                                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => onDelete(a)}
                                title="Supprimer"
                                aria-label="Supprimer l'activité"
                                data-testid={`btn-delete-${a.id}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )),
                    ];
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Footer : totaux + pagination */}
            <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-border bg-background" data-testid="totaux">
              <div className="flex flex-wrap gap-4">
                <div className="text-sm">
                  <span className="text-muted-foreground">Total : </span>
                  <span className="font-bold" data-testid="total-heures">{totaux.total}h</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Facturables : </span>
                  <span className="font-bold text-emerald-700" data-testid="total-facturable">{totaux.facturable}h</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Non fact. : </span>
                  <span className="font-bold text-muted-foreground" data-testid="total-non-facturable">{totaux.nonFacturable}h</span>
                </div>
                <div className="text-sm text-muted-foreground" data-testid="total-count">
                  ({activites.length} activité{activites.length > 1 ? "s" : ""})
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    aria-label="Page précédente"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    aria-label="Page suivante"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
