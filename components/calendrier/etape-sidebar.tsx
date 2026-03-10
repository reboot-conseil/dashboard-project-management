"use client";

import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { X, Play, Check, RotateCcw, ExternalLink, Clock, Timer, Trash2, MousePointer2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EtapeInfo } from "./types";
import { statutBadgeVariant, STATUT_LABELS } from "./types";

interface EtapeSidebarProps {
  etape: EtapeInfo | null;
  onClose: () => void;
  onChangerStatut: (statut: string) => void;
  onReporterDeadline: (deadline: string) => void;
  onSupprimer: () => void;
  onNavigate: (projetId: number) => void;
  onLogHeures: (etape: EtapeInfo) => void;
}

export function EtapeSidebar({ etape, onClose, onChangerStatut, onReporterDeadline, onSupprimer, onNavigate, onLogHeures }: EtapeSidebarProps) {
  const [newDeadline, setNewDeadline] = useState(etape?.deadline ?? "");

  useEffect(() => {
    setNewDeadline(etape?.deadline ?? "");
  }, [etape?.id, etape?.deadline]);

  const progressPct = etape?.chargeEstimeeJours && etape.chargeEstimeeJours > 0
    ? Math.min(100, (etape.tempsPasseJours / etape.chargeEstimeeJours) * 100)
    : 0;

  return (
    <div
      className={cn(
        "w-[320px] shrink-0",
        "flex flex-col border-l border-border bg-[var(--color-surface)]",
        "max-h-[calc(100vh-120px)] sticky top-4"
      )}
      data-testid="etape-sidebar"
    >
      {/* Bande couleur projet */}
      <div
        className="h-1 w-full shrink-0"
        style={{ backgroundColor: etape?.projet.couleur ?? "var(--color-border)" }}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-2 px-4 pt-3 pb-3 border-b border-border">
        <div className="flex-1 min-w-0">
          {etape ? (
            <>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide truncate">
                {etape.projet.nom}
              </p>
              <h3 className="text-sm font-semibold leading-tight mt-0.5 truncate">{etape.nom}</h3>
            </>
          ) : (
            <p className="text-sm font-semibold">Détail</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {etape && (
            <Badge variant={statutBadgeVariant(etape.statut)} className="text-[10px]">
              {STATUT_LABELS[etape.statut]}
            </Badge>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted transition-colors"
            aria-label="Fermer"
            data-testid="sidebar-close"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Hint when no etape selected */}
      {!etape && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <MousePointer2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Cliquez sur une étape pour voir ses détails
          </p>
        </div>
      )}

      {/* Contenu scrollable — only when etape selected */}
      {etape && (
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {/* Section Métriques */}
          <div className="px-4 py-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">Deadline</span>
              <span className="font-medium text-xs">
                {etape.deadline ? format(parseISO(etape.deadline), "d MMM yyyy", { locale: fr }) : "—"}
              </span>
            </div>
            {etape.dateDebut && (
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">Début</span>
                <span className="text-xs">{format(parseISO(etape.dateDebut), "d MMM yyyy", { locale: fr })}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">Charge estimée</span>
              <span className="text-xs">{etape.chargeEstimeeJours ?? "—"} j</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">Temps passé</span>
              <span className={cn(
                "text-xs font-medium",
                progressPct > 120 ? "text-destructive" : progressPct > 100 ? "text-amber-600" : ""
              )}>
                {etape.tempsPasseJours.toFixed(1)} j
              </span>
            </div>

            {etape.joursRestants !== null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">Jours restants</span>
                <span className={cn(
                  "font-semibold text-xs",
                  etape.joursRestants < 0 ? "text-destructive" : etape.joursRestants <= 3 ? "text-amber-600" : "text-foreground"
                )}>
                  {etape.joursRestants < 0
                    ? `Retard ${Math.abs(etape.joursRestants)}j`
                    : etape.joursRestants === 0
                    ? "Aujourd'hui"
                    : `${etape.joursRestants}j`}
                </span>
              </div>
            )}

            {etape.chargeEstimeeJours && (
              <div className="pt-1">
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span>Avancement budget</span>
                  <span>{Math.round(progressPct)}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      progressPct > 120 ? "bg-destructive" : progressPct > 100 ? "bg-amber-400" : "bg-emerald-500"
                    )}
                    style={{ width: `${Math.min(progressPct, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section Consultants */}
          {etape.consultants.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Consultants assignés
              </p>
              <div className="flex flex-wrap gap-1.5">
                {etape.consultants.map((c) => (
                  <span
                    key={c.id}
                    className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: c.couleur + "20", color: c.couleur, border: `1px solid ${c.couleur}40` }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: c.couleur }} />
                    {c.nom}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Section Description */}
          {etape.description && (
            <div className="px-4 py-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Description
              </p>
              <p className="text-xs text-foreground/80 leading-relaxed">{etape.description}</p>
            </div>
          )}

          {/* Section Actions */}
          <div className="px-4 py-3 space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Actions
            </p>

            <div className="grid grid-cols-2 gap-2">
              {etape.statut === "A_FAIRE" && (
                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => onChangerStatut("EN_COURS")}>
                  <Play className="h-3 w-3" aria-hidden="true" />Démarrer
                </Button>
              )}
              {etape.statut === "EN_COURS" && (
                <Button size="sm" className="gap-1 text-xs" onClick={() => onChangerStatut("VALIDEE")}>
                  <Check className="h-3 w-3" aria-hidden="true" />Valider
                </Button>
              )}
              {etape.statut === "VALIDEE" && (
                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => onChangerStatut("EN_COURS")}>
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />Réouvrir
                </Button>
              )}
              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => onNavigate(etape.projet.id)}>
                <ExternalLink className="h-3 w-3" aria-hidden="true" />Voir projet
              </Button>
            </div>

            {/* Reporter deadline */}
            <div className="flex gap-2">
              <input
                type="date"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
                className="flex-1 h-8 px-2 text-xs rounded-md border border-border bg-background"
              />
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-xs shrink-0"
                onClick={() => newDeadline && onReporterDeadline(newDeadline)}
                disabled={!newDeadline || newDeadline === etape.deadline}
              >
                <Timer className="h-3 w-3" aria-hidden="true" />Reporter
              </Button>
            </div>

            <Button size="sm" variant="outline" className="w-full gap-1 text-xs"
              onClick={() => onLogHeures(etape)}>
              <Clock className="h-3 w-3" aria-hidden="true" />Logger des heures
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="w-full gap-1 text-xs text-destructive hover:bg-destructive/10"
              onClick={onSupprimer}
            >
              <Trash2 className="h-3 w-3" aria-hidden="true" />Supprimer l&apos;étape
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
