"use client";

import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { X, Play, Check, RotateCcw, ExternalLink, Clock, Timer, Trash2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EtapeInfo } from "./types";
import { statutBadgeVariant, STATUT_LABELS, healthIcon } from "./types";

interface EtapeSidebarProps {
  etape: EtapeInfo;
  onClose: () => void;
  onChangerStatut: (statut: string) => void;
  onReporterDeadline: (deadline: string) => void;
  onSupprimer: () => void;
  onNavigate: (projetId: number) => void;
}

export function EtapeSidebar({ etape, onClose, onChangerStatut, onReporterDeadline, onSupprimer, onNavigate }: EtapeSidebarProps) {
  const [newDeadline, setNewDeadline] = useState(etape.deadline ?? "");

  useEffect(() => {
    setNewDeadline(etape.deadline ?? "");
  }, [etape.id, etape.deadline]);

  const progressPct =
    etape.chargeEstimeeJours && etape.chargeEstimeeJours > 0
      ? Math.min(100, (etape.tempsPasseJours / etape.chargeEstimeeJours) * 100)
      : 0;

  return (
    <div className={cn("animate-slide-in-right", "w-[360px] shrink-0")} data-testid="etape-sidebar">
      <Card className="sticky top-4">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base leading-tight">{etape.nom}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{etape.projet.nom}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Badge variant={statutBadgeVariant(etape.statut)} className="text-xs">
                {STATUT_LABELS[etape.statut]}
              </Badge>
              <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors" data-testid="sidebar-close">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Deadline</span>
              <span className="font-medium">
                {etape.deadline ? format(parseISO(etape.deadline), "d MMM yyyy", { locale: fr }) : "—"}
              </span>
            </div>
            {etape.dateDebut && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Début</span>
                <span>{format(parseISO(etape.dateDebut), "d MMM yyyy", { locale: fr })}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Charge estimée</span>
              <span>{etape.chargeEstimeeJours ?? "—"} j</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Temps passé</span>
              <span className={cn(progressPct > 120 ? "text-red-600 font-semibold" : progressPct > 100 ? "text-orange-600 font-semibold" : "")}>
                {etape.tempsPasseJours.toFixed(1)} j
              </span>
            </div>

            {etape.chargeEstimeeJours && (
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Progression budget</span>
                  <span>{healthIcon(etape.health)} {Math.round(progressPct)}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", progressPct > 120 ? "bg-red-500" : progressPct > 100 ? "bg-orange-400" : "bg-emerald-500")}
                    style={{ width: `${Math.min(progressPct, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {etape.joursRestants !== null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Jours restants</span>
                <span className={cn("font-semibold", etape.joursRestants < 0 ? "text-red-600" : etape.joursRestants <= 3 ? "text-orange-600" : "text-foreground")}>
                  {etape.joursRestants < 0 ? `Retard ${Math.abs(etape.joursRestants)}j` : etape.joursRestants === 0 ? "Aujourd'hui" : `${etape.joursRestants}j`}
                </span>
              </div>
            )}
          </div>

          {etape.consultants.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Consultants assignés</p>
              <div className="flex flex-wrap gap-1.5">
                {etape.consultants.map((c) => (
                  <span key={c.id} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                    style={{ backgroundColor: c.couleur + "20", color: c.couleur, border: `1px solid ${c.couleur}40` }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.couleur }} />
                    {c.nom}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Actions rapides</p>
            <div className="grid grid-cols-2 gap-2">
              {etape.statut === "A_FAIRE" && (
                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => onChangerStatut("EN_COURS")}>
                  <Play className="h-3 w-3" />Démarrer
                </Button>
              )}
              {etape.statut === "EN_COURS" && (
                <Button size="sm" className="gap-1 text-xs" onClick={() => onChangerStatut("VALIDEE")}>
                  <Check className="h-3 w-3" />Valider
                </Button>
              )}
              {etape.statut === "VALIDEE" && (
                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => onChangerStatut("EN_COURS")}>
                  <RotateCcw className="h-3 w-3" />Réouvrir
                </Button>
              )}
              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => onNavigate(etape.projet.id)}>
                <ExternalLink className="h-3 w-3" />Voir projet
              </Button>
            </div>

            <div className="flex gap-2">
              <input type="date" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)}
                className="flex-1 h-8 px-2 text-xs rounded-md border border-border bg-background" />
              <Button size="sm" variant="outline" className="gap-1 text-xs shrink-0"
                onClick={() => newDeadline && onReporterDeadline(newDeadline)}
                disabled={!newDeadline || newDeadline === etape.deadline}>
                <Timer className="h-3 w-3" />Reporter
              </Button>
            </div>

            <Link href={`/activites?etapeId=${etape.id}`}>
              <Button size="sm" variant="outline" className="w-full gap-1 text-xs">
                <Clock className="h-3 w-3" />Logger des heures
              </Button>
            </Link>

            <Button size="sm" variant="outline" className="w-full gap-1 text-xs text-destructive hover:bg-destructive/10" onClick={onSupprimer}>
              <Trash2 className="h-3 w-3" />Supprimer l&apos;étape
            </Button>
          </div>

          {etape.description && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
              <p className="text-xs text-foreground/80 leading-relaxed">{etape.description}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
