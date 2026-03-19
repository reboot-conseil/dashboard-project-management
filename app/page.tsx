"use client";

import { useEffect, useState } from "react";
import { BarChart3, Users, TrendingUp } from "lucide-react";
import { useSession } from "next-auth/react";
import { DashboardConsultants } from "@/components/dashboard/DashboardConsultants";
import { DashboardOperationnel } from "@/components/dashboard/DashboardOperationnel";
import { DashboardStrategique } from "@/components/dashboard/DashboardStrategique";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────
type VueDashboard = "operationnel" | "consultants" | "strategique";
export type Periode = "jour" | "semaine" | "mois" | "trimestre" | "annee" | "personnalise";

const VALID_VUES: readonly VueDashboard[] = ["operationnel", "consultants", "strategique"];

const PERIODES: { value: Periode; label: string }[] = [
  { value: "jour",         label: "Jour" },
  { value: "semaine",      label: "Semaine" },
  { value: "mois",         label: "Mois" },
  { value: "trimestre",    label: "Trimestre" },
  { value: "annee",        label: "Année" },
  { value: "personnalise", label: "Personnalisé" },
];

const VIEWS = [
  { value: "operationnel" as VueDashboard, label: "Opérationnel", icon: BarChart3, roles: ["ADMIN", "PM"] },
  { value: "consultants"  as VueDashboard, label: "Consultants",  icon: Users,    roles: ["ADMIN", "PM", "CONSULTANT"] },
  { value: "strategique"  as VueDashboard, label: "Stratégique",  icon: TrendingUp, roles: ["ADMIN", "PM"] },
];

// ── Page ──────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data: session } = useSession();
  const role = (session?.user?.role as string) ?? "PM";

  const [storedVue, setVue] = useLocalStorage<string>("dashboard-active-view", "operationnel");
  const [periode, setPeriode] = useLocalStorage<Periode>("dashboard-periode", "semaine");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDebut, setCustomDebut] = useState("");
  const [customFin, setCustomFin] = useState("");
  const [appliedCustomRange, setAppliedCustomRange] = useState<{ dateDebut: string; dateFin: string } | null>(null);

  const vue: VueDashboard = VALID_VUES.includes(storedVue as VueDashboard)
    ? (storedVue as VueDashboard)
    : "operationnel";

  const visibleViews = VIEWS.filter((v) => v.roles.includes(role));

  // Redirect to first allowed view if current one is forbidden
  useEffect(() => {
    const allowed = VIEWS.find((v) => v.value === vue)?.roles.includes(role) ?? false;
    if (!allowed && visibleViews.length > 0) {
      setVue(visibleViews[0].value);
    }
  }, [role, vue, visibleViews, setVue]);

  // Keyboard shortcuts Ctrl+1/2/3
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      const views = visibleViews;
      if (e.key === "1" && views[0]) { e.preventDefault(); setVue(views[0].value); }
      if (e.key === "2" && views[1]) { e.preventDefault(); setVue(views[1].value); }
      if (e.key === "3" && views[2]) { e.preventDefault(); setVue(views[2].value); }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [setVue, visibleViews]);

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* ── Top bar : tabs gauche · période droite ── */}
      <div className="shrink-0 flex items-center justify-between gap-4 px-6 pt-5 pb-3 flex-wrap">

        {/* View tabs */}
        <div className="flex items-center gap-0.5">
          {visibleViews.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setVue(value)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                vue === value
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        {/* Period pills */}
        <div className="relative">
          <div className="flex items-center gap-0.5 bg-background border border-border rounded-full px-1 py-1">
            {PERIODES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => {
                  setPeriode(value);
                  setShowDatePicker(value === "personnalise" ? (v) => !v : false);
                }}
                className={cn(
                  "px-3 py-1 rounded-full text-[12.5px] font-medium transition-all whitespace-nowrap",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  periode === value
                    ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Custom date picker popup */}
          {showDatePicker && (
            <div className="absolute top-full right-0 mt-2 z-50 flex items-center gap-2 bg-background border border-border rounded-xl px-4 py-3 shadow-lg">
              <input
                type="date"
                value={customDebut}
                onChange={(e) => setCustomDebut(e.target.value)}
                className="bg-muted border border-border rounded-lg px-2.5 py-1.5 text-[12.5px] text-foreground outline-none focus:border-primary"
              />
              <span className="text-muted-foreground text-sm">→</span>
              <input
                type="date"
                value={customFin}
                onChange={(e) => setCustomFin(e.target.value)}
                className="bg-muted border border-border rounded-lg px-2.5 py-1.5 text-[12.5px] text-foreground outline-none focus:border-primary"
              />
              <button
                onClick={() => {
                  if (customDebut && customFin) setAppliedCustomRange({ dateDebut: customDebut, dateFin: customFin });
                  setShowDatePicker(false);
                }}
                className="px-3 py-1.5 rounded-lg bg-primary text-white text-[12.5px] font-semibold"
              >
                Appliquer
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Dashboard content ── */}
      <div className="flex-1 overflow-y-auto px-6 pb-8">
        {vue === "operationnel" && <DashboardOperationnel periode={periode} customDateDebut={appliedCustomRange?.dateDebut} customDateFin={appliedCustomRange?.dateFin} />}
        {vue === "consultants"  && <DashboardConsultants  periode={periode} />}
        {vue === "strategique"  && <DashboardStrategique  periode={periode} />}
      </div>

    </div>
  );
}
