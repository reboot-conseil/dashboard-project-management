import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CheckCircle, ArrowRight, AlertCircle, Clock, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────
interface Deadline {
  etapeId: number;
  etapeNom: string;
  statut: string;
  projetId: number;
  projetNom: string;
  projetCouleur: string;
  deadline: string;
  joursRestants: number;
  chargeEstimeeJours: number | null;
}

interface DeadlinesAVenirSectionProps {
  deadlines: Deadline[];
}

// ── Helpers ────────────────────────────────────────────────────────────
interface UrgenceConfig {
  label: string;
  badgeClass: string;
  Icon: React.ElementType;
  level: "critique" | "urgent" | "normal";
}

function urgenceConfig(jours: number): UrgenceConfig {
  if (jours < 0)
    return { label: "En retard", badgeClass: "bg-destructive/10 text-destructive border-destructive/30", Icon: AlertCircle, level: "critique" };
  if (jours < 3)
    return { label: "Urgent", badgeClass: "bg-destructive/10 text-destructive border-destructive/30", Icon: AlertCircle, level: "urgent" };
  if (jours < 7)
    return { label: "Proche", badgeClass: "bg-amber-100 text-amber-800 border-amber-200", Icon: Clock, level: "normal" };
  return { label: "À venir", badgeClass: "bg-blue-50 text-blue-700 border-blue-200", Icon: Calendar, level: "normal" };
}

// ── Component ──────────────────────────────────────────────────────────
export function DeadlinesAVenirSection({ deadlines }: DeadlinesAVenirSectionProps) {
  if (deadlines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
        <CheckCircle className="h-8 w-8 text-emerald-500" />
        <p className="text-sm text-muted-foreground">Aucune deadline à venir</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {deadlines.map((d) => {
        const urgence = urgenceConfig(d.joursRestants);
        return (
          <Link
            key={d.etapeId}
            href={`/projets/${d.projetId}`}
            className="flex items-start gap-3 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/30 transition-all p-3 group"
          >
            {/* Couleur projet */}
            <div
              className="w-1 rounded-full shrink-0 self-stretch"
              style={{ backgroundColor: d.projetCouleur }}
            />

            <div className="flex-1 min-w-0">
              {/* Étape + badge urgence */}
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-sm font-medium truncate">{d.etapeNom}</span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border",
                    urgence.badgeClass
                  )}
                >
                  <urgence.Icon className="h-3 w-3" aria-hidden="true" />
                  {urgence.label}
                </span>
              </div>

              {/* Projet */}
              <p className="text-xs text-muted-foreground mb-1.5">
                Projet : <span className="font-medium text-foreground">{d.projetNom}</span>
              </p>

              {/* Deadline + charge */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>
                  {d.joursRestants < 0
                    ? `Retard de ${Math.abs(d.joursRestants)}j`
                    : d.joursRestants === 0
                    ? "Aujourd'hui"
                    : `Dans ${d.joursRestants} jour${d.joursRestants > 1 ? "s" : ""}`}{" "}
                  <span className="text-foreground/60">
                    ({format(new Date(d.deadline), "dd/MM", { locale: fr })})
                  </span>
                </span>
                {d.chargeEstimeeJours && (
                  <span>· Charge : {d.chargeEstimeeJours}j</span>
                )}
              </div>
            </div>

            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        );
      })}
    </div>
  );
}
