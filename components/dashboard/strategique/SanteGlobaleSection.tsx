import * as React from "react";
import { cn } from "@/lib/utils";

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

export function SanteGlobaleSection({ score, label }: SanteGlobaleSectionProps) {
  const gaugeColor =
    score >= 85 ? "#10b981"
    : score >= 70 ? "#22c55e"
    : score >= 55 ? "#eab308"
    : score >= 40 ? "#f97316"
    : "#ef4444";

  const scoreTextColor =
    score >= 70 ? "text-emerald-600"
    : score >= 55 ? "text-amber-600"
    : "text-destructive";

  return (
    <div className="flex flex-col items-center justify-center py-2">
      <div className="relative flex flex-col items-center">
        <svg viewBox="0 0 200 110" className="w-44 h-[88px] overflow-visible">
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={gaugeColor}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * Math.PI * 80} ${Math.PI * 80}`}
          />
        </svg>
        <div className="absolute bottom-1 text-center">
          <span className={cn("text-4xl font-extrabold tabular-nums", scoreTextColor)}>
            {score}
          </span>
          <span className="text-base font-normal text-muted-foreground">/100</span>
        </div>
      </div>
      <p className={cn("text-sm font-semibold mt-2", scoreTextColor)}>{label}</p>
    </div>
  );
}
