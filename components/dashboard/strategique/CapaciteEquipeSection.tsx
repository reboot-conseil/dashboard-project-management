import * as React from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────
interface ConsultantOccupation {
  id: number;
  nom: string;
  heures: number;
  capacite: number;
  taux: number;
}

interface CapaciteEquipeSectionProps {
  tauxOccupationMoyen: number;
  consultants: ConsultantOccupation[];
  joursHommeDisponibles: number;
  capaciteDisponibleHeures: number;
  besoinRecrutement: boolean;
  pipelineCA: number;
}

function formatEuros(v: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);
}

// ── Component ──────────────────────────────────────────────────────────
export function CapaciteEquipeSection({
  tauxOccupationMoyen,
  consultants,
  joursHommeDisponibles,
  capaciteDisponibleHeures,
  besoinRecrutement,
  pipelineCA,
}: CapaciteEquipeSectionProps) {
  const occupationLabel =
    tauxOccupationMoyen >= 95
      ? "Surchargé"
      : tauxOccupationMoyen >= 80
      ? "Optimal"
      : tauxOccupationMoyen >= 60
      ? "Sous-chargé"
      : "Très sous-chargé";

  const occupationColor =
    tauxOccupationMoyen >= 80 && tauxOccupationMoyen <= 95
      ? "text-emerald-600"
      : tauxOccupationMoyen > 95
      ? "text-destructive"
      : "text-amber-600";

  const occupationBarColor =
    tauxOccupationMoyen >= 80 && tauxOccupationMoyen <= 95
      ? "bg-emerald-500"
      : tauxOccupationMoyen > 95
      ? "bg-destructive"
      : "bg-amber-500";

  return (
    <div className="space-y-4">
      {/* Taux global */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Utilisation équipe</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{tauxOccupationMoyen}%</span>
            <span className={cn("text-xs font-medium", occupationColor)}>
              {occupationLabel}
            </span>
          </div>
        </div>
        <Progress
          value={Math.min(tauxOccupationMoyen, 100)}
          className="h-2.5"
          indicatorClassName={occupationBarColor}
        />
      </div>

      {/* Par consultant */}
      {consultants.length > 0 && (
        <div className="space-y-2">
          {consultants.map((c) => {
            const barColor =
              c.taux >= 80 && c.taux <= 95
                ? "bg-emerald-500"
                : c.taux > 95
                ? "bg-destructive"
                : "bg-amber-500";
            return (
              <div key={c.id} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">{c.nom}</span>
                  <span className="font-medium tabular-nums">
                    {c.heures}h / {c.capacite}h ({c.taux}%)
                  </span>
                </div>
                <Progress
                  value={Math.min(c.taux, 100)}
                  className="h-1.5"
                  indicatorClassName={barColor}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Capacité disponible */}
      <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-1">
        <p className="text-xs font-medium text-foreground">
          Disponible ce mois
        </p>
        <p className="text-lg font-bold">
          {joursHommeDisponibles} j/h
          <span className="text-sm font-normal text-muted-foreground ml-1.5">
            ({Math.round(capaciteDisponibleHeures)}h)
          </span>
        </p>
      </div>

      {/* Projection / besoin */}
      <div className="text-sm">
        {besoinRecrutement ? (
          <div className="flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <span className="text-base shrink-0">⚡</span>
            <div>
              <p className="font-medium">Besoin de renfort</p>
              <p className="text-xs mt-0.5">
                Pipeline {formatEuros(pipelineCA)} avec occupation &gt;85%.
                Envisager +1 consultant.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <span className="text-base">✓</span>
            <p className="text-sm font-medium">Capacité suffisante pour le pipeline</p>
          </div>
        )}
      </div>
    </div>
  );
}
