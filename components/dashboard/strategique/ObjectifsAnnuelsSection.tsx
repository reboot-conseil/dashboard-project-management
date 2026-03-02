"use client";

import * as React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Settings, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────
export interface ObjectifsAnnuels {
  caObjectif: number;
  margeObjectif: number; // en %
}

interface ObjectifData {
  caAnnuelYTD: number;
  projectionCAannuel: number;
  pctObjectifCA: number;
  pctProjectionObjectif: number;
  tauxMargeYTD: number;
  dayOfYear: number;
  pctAnneEcoulee: number;
}

interface ObjectifsAnnuelsSectionProps {
  data: ObjectifData;
  objectifs: ObjectifsAnnuels;
  onObjectifsChange: (o: ObjectifsAnnuels) => void;
}

const STORAGE_KEY = "objectifs-annuels";

export function loadObjectifsAnnuels(): ObjectifsAnnuels {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return { caObjectif: 0, margeObjectif: 40 };
}

export function saveObjectifsAnnuels(o: ObjectifsAnnuels) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(o));
    // Compatibilité avec clé existante
    localStorage.setItem("executive-objectifs", JSON.stringify({ caObjectif: o.caObjectif }));
  } catch { /* ignore */ }
}

// ── Component ──────────────────────────────────────────────────────────
export function ObjectifsAnnuelsSection({
  data,
  objectifs,
  onObjectifsChange,
}: ObjectifsAnnuelsSectionProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [temp, setTemp] = React.useState<ObjectifsAnnuels>(objectifs);
  const now = new Date();

  function openDialog() {
    setTemp({ ...objectifs });
    setDialogOpen(true);
  }

  function save() {
    saveObjectifsAnnuels(temp);
    onObjectifsChange(temp);
    setDialogOpen(false);
  }

  const formatEuros = (v: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(v);

  // CA progress
  const pctRealise = data.pctObjectifCA;
  const pctProjection = Math.max(0, data.pctProjectionObjectif - pctRealise);
  const hasObjectif = objectifs.caObjectif > 0;

  // Marge status
  const margeOk = data.tauxMargeYTD >= objectifs.margeObjectif;
  const margeEcart = Math.round((data.tauxMargeYTD - objectifs.margeObjectif) * 10) / 10;

  return (
    <>
      <div className="space-y-5">
        {/* Header date + bouton config */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            État au {format(now, "d MMMM yyyy", { locale: fr })} —{" "}
            <span className="font-medium">{data.dayOfYear} jours écoulés</span> /{" "}
            365 ({data.pctAnneEcoulee}% de l&apos;année)
          </p>
          <Button variant="ghost" size="sm" onClick={openDialog} className="gap-1.5 text-muted-foreground shrink-0">
            <Settings className="h-3.5 w-3.5" />
            Objectifs
          </Button>
        </div>

        {/* CA Annuel */}
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-semibold">Chiffre d&apos;affaires annuel</span>
            <div className="text-right">
              <span className="text-sm font-bold">{formatEuros(data.caAnnuelYTD)}</span>
              {hasObjectif && (
                <span className="text-xs text-muted-foreground ml-1.5">
                  / {formatEuros(objectifs.caObjectif)}
                </span>
              )}
            </div>
          </div>

          {hasObjectif ? (
            <>
              {/* Barre de progression avec segments */}
              <div className="relative h-4 w-full rounded-full bg-muted overflow-hidden">
                {/* Réalisé */}
                <div
                  className="absolute left-0 top-0 h-full rounded-l-full bg-primary transition-all"
                  style={{ width: `${Math.min(pctRealise, 100)}%` }}
                />
                {/* Projeté */}
                {pctProjection > 0 && pctRealise < 100 && (
                  <div
                    className="absolute top-0 h-full bg-primary/30 transition-all"
                    style={{
                      left: `${Math.min(pctRealise, 100)}%`,
                      width: `${Math.min(pctProjection, 100 - Math.min(pctRealise, 100))}%`,
                    }}
                  />
                )}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  <span className="font-medium text-primary">{pctRealise}%</span> réalisé
                  {data.projectionCAannuel > 0 && (
                    <span className="ml-2 text-muted-foreground/70">
                      · Proj. {formatEuros(data.projectionCAannuel)} ({data.pctProjectionObjectif}%)
                    </span>
                  )}
                </span>
                <span className={cn(
                  "font-medium",
                  data.pctProjectionObjectif >= 100 ? "text-emerald-600" :
                  data.pctProjectionObjectif >= 80 ? "text-amber-600" : "text-destructive"
                )}>
                  {data.pctProjectionObjectif >= 100 ? "✓ Objectif atteignable" :
                   data.pctProjectionObjectif >= 80 ? "⚡ Effort requis" : "⚠ Objectif risqué"}
                </span>
              </div>
            </>
          ) : (
            <Progress value={Math.min(data.pctAnneEcoulee, 100)} className="h-2" />
          )}
        </div>

        {/* Marge + ligne séparée */}
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            {margeOk ? (
              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : Math.abs(margeEcart) < 5 ? (
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive shrink-0" />
            )}
            <div>
              <span className="text-sm font-medium">Marge </span>
              <span className={cn(
                "text-sm font-bold",
                margeOk ? "text-emerald-600" : Math.abs(margeEcart) < 5 ? "text-amber-600" : "text-destructive"
              )}>
                {data.tauxMargeYTD}%
              </span>
              <span className="text-xs text-muted-foreground ml-1">
                / obj. {objectifs.margeObjectif}%
                {margeEcart !== 0 && (
                  <span className={cn("ml-1", margeOk ? "text-emerald-600" : "text-amber-600")}>
                    ({margeEcart > 0 ? "+" : ""}{margeEcart}pts)
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog configuration objectifs */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Objectifs annuels</DialogTitle>
            <DialogDescription>
              Définissez vos objectifs pour suivre la performance de l&apos;activité.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ca-annuel">Objectif CA annuel (€)</Label>
              <Input
                id="ca-annuel"
                type="number"
                min={0}
                step={10000}
                value={temp.caObjectif || ""}
                onChange={(e) =>
                  setTemp((p) => ({ ...p, caObjectif: parseFloat(e.target.value) || 0 }))
                }
                placeholder="ex : 500 000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="marge-obj">Objectif marge (%)</Label>
              <Input
                id="marge-obj"
                type="number"
                min={0}
                max={100}
                step={1}
                value={temp.margeObjectif || ""}
                onChange={(e) =>
                  setTemp((p) => ({ ...p, margeObjectif: parseFloat(e.target.value) || 0 }))
                }
                placeholder="ex : 40"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={save}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
