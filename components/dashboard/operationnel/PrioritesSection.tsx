import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  TrendingDown,
  Users,
  Calendar,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────
interface DeadlineCritique {
  id: number;
  nom: string;
  deadline: string;
  joursRestants: number;
  projetId: number;
  projetNom: string;
}

interface ProjetDerive {
  id: number;
  nom: string;
  ecart: number;
}

interface PointClient {
  id: number;
  nom: string;
  pctBudget: number;
}

interface Staffing {
  sousSollicites: { id: number; nom: string }[];
  surSollicites: { id: number; nom: string }[];
}

export interface PrioritesSectionProps {
  deadlinesCritiques: DeadlineCritique[];
  projetsEnDerive: ProjetDerive[];
  pointsClients: PointClient[];
  staffing: Staffing;
}

// ── Component ──────────────────────────────────────────────────────────
export function PrioritesSection({
  deadlinesCritiques,
  projetsEnDerive,
  pointsClients,
  staffing,
}: PrioritesSectionProps) {
  const hasCritical =
    deadlinesCritiques.length > 0 ||
    projetsEnDerive.length > 0;

  const hasWarning =
    !hasCritical &&
    (pointsClients.length > 0 ||
      staffing.sousSollicites.length > 0 ||
      staffing.surSollicites.length > 0);

  const allGood =
    deadlinesCritiques.length === 0 &&
    projetsEnDerive.length === 0 &&
    pointsClients.length === 0 &&
    staffing.sousSollicites.length === 0 &&
    staffing.surSollicites.length === 0;

  const containerClass = cn(
    "rounded-lg border p-4 space-y-3",
    hasCritical
      ? "bg-red-50 border-red-200"
      : hasWarning
      ? "bg-orange-50 border-orange-200"
      : "bg-emerald-50 border-emerald-200"
  );

  if (allGood) {
    return (
      <div className={containerClass}>
        <div className="flex items-center gap-2 text-emerald-700">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">Aucune priorité urgente cette semaine</span>
        </div>
        <p className="text-sm text-emerald-600">
          Tous les projets sont on track, aucune deadline critique, staffing équilibré.
        </p>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <div className="space-y-2">
        {/* Deadlines critiques */}
        {deadlinesCritiques.length > 0 && (
          <PrioriteItem
            icon={<AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
            severity="critique"
            label={
              deadlinesCritiques.length === 1
                ? `1 deadline critique (< 3j)`
                : `${deadlinesCritiques.length} deadlines critiques (< 3j)`
            }
            detail={deadlinesCritiques.map((d) => (
              <Link
                key={d.id}
                href={`/projets/${d.projetId}`}
                className="flex items-center gap-1 hover:underline"
              >
                <span className="font-medium">{d.nom}</span>
                <span className="text-muted-foreground">
                  ({d.projetNom}) —{" "}
                  {format(new Date(d.deadline), "d MMM", { locale: fr })}
                  {d.joursRestants === 0 ? " (aujourd'hui)" : ` dans ${d.joursRestants}j`}
                </span>
              </Link>
            ))}
          />
        )}

        {/* Projets en dérive */}
        {projetsEnDerive.length > 0 && (
          <PrioriteItem
            icon={<TrendingDown className="h-4 w-4 text-destructive shrink-0" />}
            severity="critique"
            label={
              projetsEnDerive.length === 1
                ? `1 projet en dérive`
                : `${projetsEnDerive.length} projets en dérive`
            }
            detail={projetsEnDerive.map((p) => (
              <Link
                key={p.id}
                href={`/projets/${p.id}`}
                className="flex items-center gap-1 hover:underline"
              >
                <span className="font-medium">{p.nom}</span>
                <span className="text-destructive font-medium">
                  ({p.ecart > 0 ? "+" : ""}
                  {p.ecart}%)
                </span>
              </Link>
            ))}
          />
        )}

        {/* Points clients */}
        {pointsClients.length > 0 && (
          <PrioriteItem
            icon={<Calendar className="h-4 w-4 text-orange-600 shrink-0" />}
            severity="warning"
            label={
              pointsClients.length === 1
                ? `1 point client à préparer (budget > 95%)`
                : `${pointsClients.length} points clients à préparer (budget > 95%)`
            }
            detail={pointsClients.map((p) => (
              <Link
                key={p.id}
                href={`/projets/${p.id}`}
                className="flex items-center gap-1 hover:underline"
              >
                <span className="font-medium">{p.nom}</span>
                <span className="text-orange-700 font-medium">({p.pctBudget}%)</span>
              </Link>
            ))}
          />
        )}

        {/* Staffing */}
        {(staffing.sousSollicites.length > 0 || staffing.surSollicites.length > 0) && (
          <PrioriteItem
            icon={<Users className="h-4 w-4 text-orange-600 shrink-0" />}
            severity="warning"
            label={[
              staffing.sousSollicites.length > 0
                ? `${staffing.sousSollicites.length} sous-utilisé${staffing.sousSollicites.length > 1 ? "s" : ""}`
                : null,
              staffing.surSollicites.length > 0
                ? `${staffing.surSollicites.length} surchargé${staffing.surSollicites.length > 1 ? "s" : ""}`
                : null,
            ]
              .filter(Boolean)
              .join(" / ")}
            detail={[
              ...staffing.sousSollicites.map((c) => (
                <span key={`sous-${c.id}`} className="text-orange-700">
                  {c.nom} <span className="opacity-70">(sous-utilisé)</span>
                </span>
              )),
              ...staffing.surSollicites.map((c) => (
                <span key={`sur-${c.id}`} className="text-destructive">
                  {c.nom} <span className="opacity-70">(surchargé)</span>
                </span>
              )),
            ]}
          />
        )}
      </div>

      {/* Lien vers projets */}
      <div className="pt-1">
        <Link
          href="/projets"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Voir tous les projets
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

// ── PrioriteItem helper ────────────────────────────────────────────────
function PrioriteItem({
  icon,
  severity,
  label,
  detail,
}: {
  icon: React.ReactNode;
  severity: "critique" | "warning";
  label: string;
  detail?: React.ReactNode[];
}) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className={cn(
      "text-sm",
      severity === "critique" ? "text-destructive" : "text-orange-700"
    )}>
      <button
        type="button"
        className="flex items-center gap-2 font-medium cursor-pointer hover:opacity-80 w-full text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        {icon}
        <span>{label}</span>
        {detail && detail.length > 0 && (
          <span className="ml-auto text-xs opacity-60">{expanded ? "▲" : "▼"}</span>
        )}
      </button>
      {expanded && detail && detail.length > 0 && (
        <div className="ml-6 mt-1 space-y-1 text-xs">
          {detail.map((item, i) => (
            <div key={i}>{item}</div>
          ))}
        </div>
      )}
    </div>
  );
}
