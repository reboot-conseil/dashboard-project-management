"use client";

import { differenceInDays } from "date-fns";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { Plus, ChevronLeft, ChevronRight, Eye, Pencil, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Etape } from "./types";

export const KANBAN_COLS: {
  statut: "A_FAIRE" | "EN_COURS" | "VALIDEE";
  label: string;
  color: string;
}[] = [
  { statut: "A_FAIRE", label: "À faire", color: "bg-slate-100" },
  { statut: "EN_COURS", label: "En cours", color: "bg-blue-50" },
  { statut: "VALIDEE", label: "Validée", color: "bg-emerald-50" },
];

interface KanbanBoardProps {
  etapes: Etape[];
  heuresParEtape: Map<number, number>;
  filtreEtapeId: number | null;
  onFiltreEtapeId: (id: number | null) => void;
  onAddEtape: (statut: "A_FAIRE" | "EN_COURS" | "VALIDEE") => void;
  onEditEtape: (e: Etape) => void;
  onDeleteEtape: (e: Etape) => void;
  onMoveEtape: (e: Etape, direction: "forward" | "backward") => void;
}

export function KanbanBoard({
  etapes,
  heuresParEtape,
  filtreEtapeId,
  onFiltreEtapeId,
  onAddEtape,
  onEditEtape,
  onDeleteEtape,
  onMoveEtape,
}: KanbanBoardProps) {
  const shouldReduce = useReducedMotion();

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Étapes du projet</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {KANBAN_COLS.map((col) => {
          const colEtapes = etapes.filter((e) => e.statut === col.statut);
          return (
            <motion.div
              key={col.statut}
              layout={!shouldReduce}
              className={`rounded-lg p-4 ${col.color} min-h-[200px]`}
              data-testid={`kanban-col-${col.statut}`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">
                  {col.label}{" "}
                  <span className="text-muted-foreground">({colEtapes.length})</span>
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onAddEtape(col.statut)}
                  title="Ajouter une étape"
                  aria-label="Ajouter une étape"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              <div className="space-y-2">
                <AnimatePresence initial={false}>
                  {colEtapes.map((e) => (
                    <motion.div
                      key={e.id}
                      layout={!shouldReduce}
                      layoutId={`kanban-card-${e.id}`}
                      initial={false}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                      <KanbanCard
                        etape={e}
                        heures={heuresParEtape.get(e.id) ?? 0}
                        filtreEtapeId={filtreEtapeId}
                        onFiltreEtapeId={onFiltreEtapeId}
                        onEditEtape={onEditEtape}
                        onDeleteEtape={onDeleteEtape}
                        onMoveEtape={onMoveEtape}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

interface KanbanCardProps {
  etape: Etape;
  heures: number;
  filtreEtapeId: number | null;
  onFiltreEtapeId: (id: number | null) => void;
  onEditEtape: (e: Etape) => void;
  onDeleteEtape: (e: Etape) => void;
  onMoveEtape: (e: Etape, direction: "forward" | "backward") => void;
}

function KanbanCard({
  etape: e,
  heures,
  filtreEtapeId,
  onFiltreEtapeId,
  onEditEtape,
  onDeleteEtape,
  onMoveEtape,
}: KanbanCardProps) {
  const joursRestants = e.deadline
    ? differenceInDays(new Date(e.deadline), new Date())
    : null;
  const deadlineColor =
    joursRestants !== null && joursRestants < 0
      ? "text-destructive"
      : joursRestants !== null && joursRestants < 7
        ? "text-amber-600"
        : "text-muted-foreground";

  return (
    <div
      className="bg-card rounded-md border border-border p-3 space-y-2 shadow-sm"
      data-testid={`kanban-card-${e.id}`}
    >
      <div className="flex items-start justify-between gap-1">
        <div>
          <p className="font-medium text-sm">
            <span className="text-muted-foreground mr-1">#{e.ordre}</span>
            {e.nom}
          </p>
          {(heures > 0 || e.chargeEstimeeJours) && (
            <p className="text-xs text-muted-foreground mt-0.5">
              <Clock className="inline h-3 w-3 mr-0.5 -mt-0.5" aria-hidden="true" />
              {heures > 0 ? `${heures}h` : "0h"}
              {e.chargeEstimeeJours && (
                <span className="ml-1">
                  / {e.chargeEstimeeJours}j est.
                  {heures / 8 > e.chargeEstimeeJours && (
                    <span className="text-destructive ml-0.5">⚠️</span>
                  )}
                </span>
              )}
            </p>
          )}
        </div>
      </div>
      {e.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">
          {e.description}
        </p>
      )}
      {e.deadline && (
        <p className={`text-xs font-medium ${deadlineColor}`}>
          {format(new Date(e.deadline), "dd/MM/yyyy", { locale: fr })}
          {joursRestants !== null && (
            <span className="ml-1">
              ({joursRestants < 0
                ? `${Math.abs(joursRestants)}j en retard`
                : `${joursRestants}j`})
            </span>
          )}
        </p>
      )}
      <div className="flex items-center gap-1 pt-1">
        {e.statut !== "A_FAIRE" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onMoveEtape(e, "backward")}
            title="Reculer l'étape"
            aria-label="Reculer l'étape"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        )}
        {e.statut !== "VALIDEE" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onMoveEtape(e, "forward")}
            title="Avancer l'étape"
            aria-label="Avancer l'étape"
          >
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        )}
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onFiltreEtapeId(filtreEtapeId === e.id ? null : e.id)}
          title="Voir activités"
          aria-label="Voir activités"
          data-testid={`btn-filtre-${e.id}`}
        >
          <Eye className={`h-3 w-3 ${filtreEtapeId === e.id ? "text-primary" : ""}`} aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onEditEtape(e)}
          title="Modifier"
          aria-label="Modifier"
          data-testid={`btn-edit-${e.id}`}
        >
          <Pencil className="h-3 w-3" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive hover:text-destructive"
          onClick={() => onDeleteEtape(e)}
          title="Supprimer l'étape"
          aria-label="Supprimer l'étape"
          data-testid={`btn-delete-${e.id}`}
        >
          <Trash2 className="h-3 w-3" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
