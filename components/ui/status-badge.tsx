import * as React from "react";
import { CheckCircle, AlertTriangle, XCircle, Clock, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Statut Étape ────────────────────────────────────────────────────
type StatutEtape = "A_FAIRE" | "EN_COURS" | "VALIDEE";

interface StatutBadgeProps {
  statut: StatutEtape;
  className?: string;
}

export function StatutEtapeBadge({ statut, className }: StatutBadgeProps) {
  const config: Record<StatutEtape, { label: string; icon: React.ReactNode; className: string }> = {
    A_FAIRE: {
      label: "À FAIRE",
      icon: <Circle className="h-3 w-3" />,
      className: "border border-border text-muted-foreground bg-transparent",
    },
    EN_COURS: {
      label: "EN COURS",
      icon: <Clock className="h-3 w-3" />,
      className: "bg-primary text-primary-foreground border-transparent",
    },
    VALIDEE: {
      label: "VALIDÉE",
      icon: <CheckCircle className="h-3 w-3" />,
      className: "bg-emerald-100 text-emerald-800 border-transparent",
    },
  };
  const { label, icon, className: variantClass } = config[statut];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        variantClass,
        className
      )}
    >
      {icon}
      {label}
    </span>
  );
}

// ── Health Score ────────────────────────────────────────────────────
type HealthScore = "on-track" | "attention" | "derive";

interface HealthBadgeProps {
  ecart: number; // realisationPct - budgetConsommePct
  className?: string;
  showLabel?: boolean;
}

export function HealthBadge({ ecart, className, showLabel = true }: HealthBadgeProps) {
  let health: HealthScore;
  if (ecart >= 0) health = "on-track";
  else if (ecart > -10) health = "attention";
  else health = "derive";

  const config: Record<HealthScore, { label: string; icon: React.ReactNode; className: string }> = {
    "on-track": {
      label: "On track",
      icon: <CheckCircle className="h-3.5 w-3.5" />,
      className: "text-emerald-700",
    },
    attention: {
      label: "Attention",
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      className: "text-orange-700",
    },
    derive: {
      label: "Dérive",
      icon: <XCircle className="h-3.5 w-3.5" />,
      className: "text-destructive",
    },
  };

  const { label, icon, className: colorClass } = config[health];
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm font-medium", colorClass, className)}>
      {icon}
      {showLabel && label}
    </span>
  );
}

// ── Urgence Deadline ────────────────────────────────────────────────
interface UrgenceBadgeProps {
  joursRestants: number | null;
  className?: string;
}

export function UrgenceBadge({ joursRestants, className }: UrgenceBadgeProps) {
  if (joursRestants === null) return null;

  // Retard
  if (joursRestants < 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-transparent bg-destructive px-2.5 py-0.5 text-xs font-semibold text-white",
          className
        )}
      >
        <XCircle className="h-3 w-3" />
        {Math.abs(joursRestants)}j retard
      </span>
    );
  }

  // Critique (< 3j)
  if (joursRestants < 3) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-transparent bg-destructive px-2.5 py-0.5 text-xs font-semibold text-white",
          className
        )}
      >
        <AlertTriangle className="h-3 w-3" />
        {joursRestants}j
      </span>
    );
  }

  // Proche (< 7j)
  if (joursRestants < 7) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-transparent bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800",
          className
        )}
      >
        <Clock className="h-3 w-3" />
        {joursRestants}j
      </span>
    );
  }

  // Normal : pas de badge
  return null;
}
