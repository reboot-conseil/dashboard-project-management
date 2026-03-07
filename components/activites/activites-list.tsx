"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Pencil, Trash2, Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import type { Activite, Totaux, Consultant, Projet, SavedFilter } from "./types";
import { PERIODES } from "./types";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

interface ActivitesListProps {
  activites: Activite[];
  totaux: Totaux;
  loading: boolean;
  consultants: Consultant[];
  projets: Projet[];
  filtreConsultant: string;
  filtreProjet: string;
  filtrePeriode: string;
  filtreFacturable: string;
  savedFilters: SavedFilter[];
  savedFiltersOpen: boolean;
  onFiltreConsultant: (v: string) => void;
  onFiltreProjet: (v: string) => void;
  onFiltrePeriode: (v: string) => void;
  onFiltreFacturable: (v: string) => void;
  onToggleSavedFilters: () => void;
  onOpenSaveFilterDialog: () => void;
  onApplyFilter: (f: SavedFilter) => void;
  onDeleteFilter: (id: string) => void;
  onEdit: (a: Activite) => void;
  onDelete: (a: Activite) => void;
}

export function ActivitesList({
  activites, totaux, loading, consultants, projets,
  filtreConsultant, filtreProjet, filtrePeriode, filtreFacturable,
  savedFilters, savedFiltersOpen,
  onFiltreConsultant, onFiltreProjet, onFiltrePeriode, onFiltreFacturable,
  onToggleSavedFilters, onOpenSaveFilterDialog,
  onApplyFilter, onDeleteFilter, onEdit, onDelete,
}: ActivitesListProps) {
  const shouldReduce = useReducedMotion();
  return (
    <Card data-testid="activites-list">
      <CardContent className="pt-6">
        {/* Filtres */}
        {/* Ligne 1 : 3 selects côte à côte */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
          <Select value={filtreConsultant} onChange={(e) => onFiltreConsultant(e.target.value)} aria-label="Filtrer par consultant">
            <option value="">Tous les consultants</option>
            {consultants.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </Select>
          <Select value={filtreProjet} onChange={(e) => onFiltreProjet(e.target.value)} aria-label="Filtrer par projet">
            <option value="">Tous les projets</option>
            {projets.map((p) => (
              <option key={p.id} value={p.id}>{p.nom}</option>
            ))}
          </Select>
          <Select value={filtreFacturable} onChange={(e) => onFiltreFacturable(e.target.value)} aria-label="Filtrer par facturation">
            <option value="">Toutes</option>
            <option value="true">Facturables</option>
            <option value="false">Non facturables</option>
          </Select>
        </div>
        {/* Ligne 2 : boutons période */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {PERIODES.map((p) => (
            <Button
              key={p.value}
              variant={filtrePeriode === p.value ? "default" : "outline"}
              size="sm"
              className="flex-none text-xs"
              onClick={() => onFiltrePeriode(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {/* Saved filters bar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Effacer tout si filtres actifs */}
          {(filtreConsultant || filtreProjet || filtreFacturable || filtrePeriode !== "month") && (
            <button
              onClick={() => { onFiltreConsultant(""); onFiltreProjet(""); onFiltreFacturable(""); onFiltrePeriode("month"); }}
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
            >
              <Trash2 className="h-3 w-3" />Effacer filtres
              <span className="ml-0.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold">
                {[filtreConsultant, filtreProjet, filtreFacturable, filtrePeriode !== "month" ? "1" : ""].filter(Boolean).length}
              </span>
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
                  <TableHead>Date</TableHead>
                  <TableHead>Consultant</TableHead>
                  <TableHead>Projet</TableHead>
                  <TableHead>Étape</TableHead>
                  <TableHead className="text-right">Heures</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Fact.</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence initial={false}>
                  {activites.map((a) => (
                    <motion.tr
                      key={a.id}
                      data-testid={`row-${a.id}`}
                      layout
                      initial={false}
                      exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                      transition={{ duration: shouldReduce ? 0 : 0.2 }}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(a.date), "EEE d MMM", { locale: fr })}
                      </TableCell>
                      <TableCell>{a.consultant.nom}</TableCell>
                      <TableCell>{a.projet.nom}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {a.etape ? a.etape.nom : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {Number(a.heures)} h
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[180px] truncate">
                        {a.description || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={a.facturable ? "success" : "secondary"} className="text-xs">
                          {a.facturable ? "Oui" : "Non"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
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
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
            </div>

            {/* Totaux */}
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border" data-testid="totaux">
              <div className="text-sm">
                <span className="text-muted-foreground">Total : </span>
                <span className="font-bold" data-testid="total-heures">{totaux.total}h</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Facturables : </span>
                <span className="font-bold text-emerald-700" data-testid="total-facturable">{totaux.facturable}h</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Non facturables : </span>
                <span className="font-bold text-muted-foreground" data-testid="total-non-facturable">{totaux.nonFacturable}h</span>
              </div>
              <div className="text-sm text-muted-foreground" data-testid="total-count">
                ({activites.length} activité{activites.length > 1 ? "s" : ""})
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
