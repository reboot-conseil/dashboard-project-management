import * as React from "react";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────
interface SanteDetail {
  rentabilite: { score: number; max: number; ratioMoyen: number };
  delais: { score: number; max: number; projetsEvalues: number };
  performance: { score: number; max: number; tauxMarge: number };
  occupation: { score: number; max: number; tauxOccupation: number };
}

interface SanteGlobaleSectionProps {
  score: number;
  label: string;
  color: string;
  detail: SanteDetail;
}

// ── Helpers ────────────────────────────────────────────────────────────
function scoreColor(score: number, max: number) {
  const pct = max > 0 ? score / max : 0;
  if (pct >= 0.8) return "text-emerald-600";
  if (pct >= 0.6) return "text-amber-600";
  return "text-destructive";
}

function scoreBarColor(score: number, max: number) {
  const pct = max > 0 ? score / max : 0;
  if (pct >= 0.8) return "bg-emerald-500";
  if (pct >= 0.6) return "bg-amber-500";
  return "bg-destructive";
}

function ScoreIcon({ score, max }: { score: number; max: number }) {
  const pct = max > 0 ? score / max : 0;
  if (pct >= 0.8) return <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />;
  if (pct >= 0.5) return <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />;
  return <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />;
}

// ── Component ──────────────────────────────────────────────────────────
export function SanteGlobaleSection({ score, label, color, detail }: SanteGlobaleSectionProps) {
  const gaugeColor =
    score >= 85
      ? "bg-emerald-500"
      : score >= 70
      ? "bg-green-500"
      : score >= 55
      ? "bg-yellow-500"
      : score >= 40
      ? "bg-orange-500"
      : "bg-destructive";

  const scoreTextColor =
    score >= 70
      ? "text-emerald-600"
      : score >= 55
      ? "text-amber-600"
      : "text-destructive";

  const items = [
    {
      key: "rentabilite",
      label: "Rentabilité",
      score: detail.rentabilite.score,
      max: detail.rentabilite.max,
      description: `CA moyen = ${detail.rentabilite.ratioMoyen}% des coûts`,
    },
    {
      key: "delais",
      label: "Respect des délais",
      score: detail.delais.score,
      max: detail.delais.max,
      description:
        detail.delais.projetsEvalues === 0
          ? "Aucun projet en cours"
          : `${detail.delais.projetsEvalues} projet${detail.delais.projetsEvalues > 1 ? "s" : ""} évalué${detail.delais.projetsEvalues > 1 ? "s" : ""}`,
    },
    {
      key: "performance",
      label: "Performance financière",
      score: detail.performance.score,
      max: detail.performance.max,
      description: `Taux de marge : ${detail.performance.tauxMarge}%`,
    },
    {
      key: "occupation",
      label: "Occupation équipe",
      score: detail.occupation.score,
      max: detail.occupation.max,
      description: `${detail.occupation.tauxOccupation}% moyen`,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Score global */}
      <div className="text-center space-y-2">
        <div className={cn("text-5xl font-extrabold tabular-nums", scoreTextColor)}>
          {score}
          <span className="text-2xl font-normal text-muted-foreground">/100</span>
        </div>
        <p
          className={cn(
            "text-sm font-semibold uppercase tracking-wide",
            scoreTextColor
          )}
        >
          {label}
        </p>
        <Progress
          value={score}
          className="h-3 mx-auto max-w-xs"
          indicatorClassName={gaugeColor}
        />
      </div>

      {/* Détail par composante */}
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.key} className="space-y-1">
            <div className="flex items-center gap-2">
              <ScoreIcon score={item.score} max={item.max} />
              <span className="text-sm font-medium flex-1">{item.label}</span>
              <span
                className={cn(
                  "text-sm font-bold tabular-nums",
                  scoreColor(item.score, item.max)
                )}
              >
                {item.score}/{item.max}
              </span>
            </div>
            <div className="pl-5">
              <Progress
                value={(item.score / item.max) * 100}
                className="h-1.5"
                indicatorClassName={scoreBarColor(item.score, item.max)}
              />
              <p className="text-[11px] text-muted-foreground mt-0.5">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
