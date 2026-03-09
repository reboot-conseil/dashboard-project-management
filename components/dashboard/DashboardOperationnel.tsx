"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  RefreshCw,
  TrendingUp,
  Clock,
  FolderOpen,
  Activity,
  LineChart,
  CalendarDays,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ActiviteEquipeChart } from "@/components/dashboard/operationnel/ActiviteEquipeChart";
import { TendancesChart } from "@/components/dashboard/operationnel/TendancesChart";
import {
  getDefaultFilters,
  loadFilters,
  saveFilters,
  type DashboardFiltersValue,
} from "@/components/dashboard/DashboardFilters";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────
interface ProjetOption { id: number; nom: string; client: string; statut?: string }

interface ProjetASurveiller {
  id: number; nom: string; client: string; statut: string;
  budget: number; pctBudget: number; budgetConsommePct: number; realisationPct: number;
  ecart: number; health: "bon" | "normal" | "critique"; healthLabel: string;
  dateFinEstimee: string | null;
  prochainDeadline: { nom: string; deadline: string | null; joursRestants: number | null } | null;
}

interface OperationnelData {
  kpis: {
    caTotal: number; coutTotal: number; margeBrute: number; tauxMarge: number;
    totalHeures: number; tauxOccupation: number;
    nbProjetsEnRetard: number; nbProjetsCritiquesPlanning: number;
    nbProjetsBudgetDepasse: number; nbProjetsBudgetCritique: number;
  };
  priorites: {
    deadlinesCritiques: { id: number; nom: string; deadline: string; joursRestants: number; projetId: number; projetNom: string }[];
    projetsEnDerive: { id: number; nom: string; ecart: number }[];
    pointsClients: { id: number; nom: string; pctBudget: number }[];
    staffing: { sousSollicites: { id: number; nom: string }[]; surSollicites: { id: number; nom: string }[] };
  };
  projetsASurveiller: ProjetASurveiller[];
  activiteEquipe: { data: Record<string, unknown>[]; consultants: { id: number; nom: string; couleur: string }[] };
  tendances6Mois: { mois: string; ca: number; marge: number; heures: number }[];
  consultants: { id: number; nom: string; couleur: string; heuresPeriode: number; tauxOccupation: number }[];
}

// ── Constants ──────────────────────────────────────────────────────────
const STORAGE_KEY = "dashboard-operationnel-filters";
const OBJECTIFS_KEY = "dashboard-objectifs";
const PROJET_COLORS = ["#3b82f6", "#6366f1", "#14b8a6", "#f43f5e", "#84cc16", "#f97316"];

// ── Formatters ─────────────────────────────────────────────────────────
function formatCA(v: number) {
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}k€`;
  return `${Math.round(v)}€`;
}
function formatEuros(v: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}

// ── Component ──────────────────────────────────────────────────────────
interface DashboardOperationnelProps { periode?: string }

export function DashboardOperationnel({ periode: periodeProp }: DashboardOperationnelProps = {}) {
  const [hydrated, setHydrated] = useState(false);
  const [filters, setFilters] = useState<DashboardFiltersValue>(getDefaultFilters("week"));
  const [projets, setProjets] = useState<ProjetOption[]>([]);
  const [data, setData] = useState<OperationnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [objectifCA, setObjectifCA] = useState(0);

  // Hydration + saved filters
  useEffect(() => {
    const saved = loadFilters(STORAGE_KEY, "week");
    setFilters(saved);
    try {
      const o = localStorage.getItem(OBJECTIFS_KEY);
      if (o) setObjectifCA(JSON.parse(o)?.caObjectif ?? 0);
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  // Projet list for filter select
  useEffect(() => {
    fetch("/api/projets")
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setProjets(list.filter((p: ProjetOption & Record<string, unknown>) => p.statut !== "TERMINE")
          .map((p: ProjetOption & Record<string, unknown>) => ({ id: p.id, nom: p.nom, client: p.client, statut: p.statut })));
      })
      .catch(() => {});
  }, []);

  // Fetch dashboard data
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const params = new URLSearchParams({ dateDebut: filters.dateDebut, dateFin: filters.dateFin });
    if (filters.projetId !== "all") params.set("projetId", filters.projetId);
    try {
      const res = await fetch(`/api/dashboard/operationnel?${params}`);
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      toast.error("Impossible de charger les données du dashboard");
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  useEffect(() => { if (hydrated) fetchData(); }, [fetchData, hydrated]);

  function handleProjetChange(projetId: string) {
    const newFilters = { ...filters, projetId };
    setFilters(newFilters);
    saveFilters(STORAGE_KEY, newFilters);
  }

  if (!hydrated) return null;

  const kpis = data?.kpis;
  const nbAlertes = (kpis?.nbProjetsEnRetard ?? 0) + (kpis?.nbProjetsBudgetDepasse ?? 0) + (kpis?.nbProjetsBudgetCritique ?? 0);
  const margeVariant = (kpis?.tauxMarge ?? 0) >= 40 ? "success" as const : (kpis?.tauxMarge ?? 0) >= 30 ? "warning" as const : "danger" as const;

  // Period label for chart titles
  const periodeLabel = periodeProp === "jour" ? "Aujourd'hui" : periodeProp === "mois" ? `${filters.dateFin?.slice(0,7) ?? "Ce mois"}` : periodeProp === "annee" ? "Cette année" : `${filters.dateDebut} – ${filters.dateFin}`;

  return (
    <div className="space-y-5">

      {/* ── Filter bar : project select + refresh ── */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <select
            value={filters.projetId}
            onChange={(e) => handleProjetChange(e.target.value)}
            className="appearance-none bg-background border border-border rounded-xl px-3 py-1.5 pr-8 text-[12.5px] font-medium text-muted-foreground focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value="all">Tous les projets</option>
            {projets.map((p) => (
              <option key={p.id} value={String(p.id)}>{p.nom}</option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="6 9 12 15 18 9" /></svg>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="p-1.5 rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Rafraîchir"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
        </button>
      </div>

      {loading && !data ? (
        <LoadingState />
      ) : data ? (
        <>
          {/* ── KPI Cards ── */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Hero : CA Période */}
            <KpiCard
              title="CA généré"
              value={formatCA(kpis?.caTotal ?? 0)}
              icon={<TrendingUp className="h-4 w-4" />}
              subtitle={`TJM moyen : —`}
              isHero
              variant="default"
              style={{ animationDelay: "0ms" }}
            />

            {/* Heures Équipe */}
            <KpiCard
              title="Heures équipe"
              value={`${kpis?.totalHeures ?? 0}h`}
              icon={<Clock className="h-4 w-4" />}
              subtitle={`${kpis?.tauxOccupation ?? 0}% taux d'occupation`}
              variant={
                (kpis?.tauxOccupation ?? 0) >= 80 ? "success"
                : (kpis?.tauxOccupation ?? 0) >= 60 ? "default"
                : "warning"
              }
              style={{ animationDelay: "50ms" }}
            />

            {/* Marge Globale */}
            <KpiCard
              title="Marge globale"
              value={`${kpis?.tauxMarge ?? 0}%`}
              icon={<TrendingUp className="h-4 w-4" />}
              subtitle={formatEuros(kpis?.margeBrute ?? 0)}
              variant={margeVariant}
              style={{ animationDelay: "100ms" }}
            />

            {/* Projets Gérés */}
            <KpiCard
              title="Projets gérés"
              value={String(data.projetsASurveiller.length)}
              icon={<FolderOpen className="h-4 w-4" />}
              subtitle={`projets actifs sur la période`}
              variant={nbAlertes > 0 ? "warning" : "success"}
              style={{ animationDelay: "150ms" }}
            />
          </section>

          {/* ── Two-column middle ── */}
          <section className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5">

            {/* LEFT: Projets actifs */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-[12.5px] font-semibold text-muted-foreground">
                    <FolderOpen className="h-3.5 w-3.5" />
                    Projets actifs
                    <span className="text-[11px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      {data.projetsASurveiller.length}
                    </span>
                  </div>
                  <Link href="/projets" className="text-[12px] text-primary font-medium hover:underline">
                    Tous →
                  </Link>
                </div>

                <div className="space-y-3">
                  {data.projetsASurveiller.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Aucun projet actif</p>
                  ) : (
                    data.projetsASurveiller.map((proj, i) => {
                      const color = PROJET_COLORS[i % PROJET_COLORS.length];
                      const ecart = proj.ecart;
                      const margeBadgeVariant = ecart >= 20 ? "danger" : ecart >= 10 ? "warning" : "success";
                      const margeBadgeClasses = {
                        danger: "bg-destructive/10 text-destructive",
                        warning: "bg-warning/10 text-warning",
                        success: "bg-success/10 text-success",
                      }[margeBadgeVariant];
                      const budgetBarColor = proj.budgetConsommePct > 100 ? "#b91c1c" : proj.budgetConsommePct > 85 ? "#f97316" : "#2563EB";
                      const joursLabel = proj.prochainDeadline?.joursRestants != null
                        ? proj.prochainDeadline.joursRestants < 0
                          ? `J${proj.prochainDeadline.joursRestants} retard`
                          : `J+${proj.prochainDeadline.joursRestants}`
                        : null;
                      const joursColor = proj.prochainDeadline?.joursRestants != null
                        ? proj.prochainDeadline.joursRestants < 0 ? "text-destructive" : proj.prochainDeadline.joursRestants <= 7 ? "text-destructive" : proj.prochainDeadline.joursRestants <= 14 ? "text-warning" : "text-muted-foreground"
                        : "";

                      return (
                        <div key={proj.id} className="relative rounded-xl border border-border overflow-hidden hover:-translate-y-px hover:shadow-sm transition-all">
                          {/* Accent left */}
                          <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ background: color }} />
                          <div className="pl-4 pr-4 py-3.5">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="text-[14px] font-bold text-foreground leading-tight">{proj.nom}</div>
                                <div className="text-[12px] text-muted-foreground mt-0.5">{proj.client}</div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-3 mt-0.5">
                                <span className={cn("text-[11.5px] font-semibold px-2 py-0.5 rounded-md", margeBadgeClasses)}>
                                  Marge {ecart > 0 ? `-${ecart.toFixed(1)}` : `+${Math.abs(ecart).toFixed(1)}`}%
                                </span>
                                <Link href={`/projets/${proj.id}`} className="text-muted-foreground hover:text-primary transition-colors">
                                  <ArrowUpRight className="h-4 w-4" />
                                </Link>
                              </div>
                            </div>
                            {/* Budget bar */}
                            <div className="flex items-center gap-2.5 mb-1.5">
                              <span className="text-[11px] text-muted-foreground w-12 shrink-0">Budget</span>
                              <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${Math.min(proj.budgetConsommePct, 100)}%`, background: budgetBarColor }} />
                              </div>
                              <span className="text-[11.5px] font-bold w-9 text-right" style={{ color: budgetBarColor }}>{proj.budgetConsommePct.toFixed(1)}%</span>
                            </div>
                            {/* Réalisé bar */}
                            <div className="flex items-center gap-2.5">
                              <span className="text-[11px] text-muted-foreground w-12 shrink-0">Réalisé</span>
                              <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                                <div className="h-full rounded-full bg-[#10b981]" style={{ width: `${proj.realisationPct}%` }} />
                              </div>
                              <span className="text-[11.5px] font-bold text-muted-foreground w-9 text-right">{proj.realisationPct.toFixed(1)}%</span>
                            </div>
                            {joursLabel && (
                              <div className={cn("text-right text-[11px] font-semibold mt-1.5", joursColor)}>
                                {joursLabel}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* RIGHT: Deadlines + Synthèse équipe */}
            <div className="flex flex-col gap-5">

              {/* Deadlines grid 2×3 */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4 text-[12.5px] font-semibold text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Deadlines à venir
                    <span className="text-[11px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      {data.priorites.deadlinesCritiques.length}
                    </span>
                  </div>
                  {data.priorites.deadlinesCritiques.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2 text-center">Aucune deadline imminente</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5">
                      {data.priorites.deadlinesCritiques.slice(0, 6).map((dl) => {
                        const dateColor = dl.joursRestants < 0 ? "text-destructive" : dl.joursRestants <= 7 ? "text-destructive" : dl.joursRestants <= 14 ? "text-warning" : "text-muted-foreground";
                        const projIdx = data.projetsASurveiller.findIndex((p) => p.id === dl.projetId);
                        const dotColor = PROJET_COLORS[projIdx >= 0 ? projIdx % PROJET_COLORS.length : 0];
                        return (
                          <div key={dl.id} className="bg-muted/50 rounded-lg px-2.5 py-2">
                            <div className="flex items-baseline justify-between gap-1">
                              <span className="text-[12.5px] font-bold text-foreground truncate">{dl.nom}</span>
                              <span className={cn("text-[11.5px] font-bold shrink-0", dateColor)}>
                                {new Date(dl.deadline).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <div className="w-1.5 h-1.5 rounded-sm shrink-0" style={{ background: dotColor }} />
                              <span className="text-[10.5px] text-muted-foreground truncate">{dl.projetNom}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Synthèse équipe */}
              <Card className="flex-1">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-[12.5px] font-semibold text-muted-foreground">
                      <Activity className="h-3.5 w-3.5" />
                      Synthèse équipe
                    </div>
                    <span className="text-[11.5px] text-muted-foreground">
                      {data.consultants.reduce((s, c) => s + c.heuresPeriode, 0)}h total
                    </span>
                  </div>
                  <div className="space-y-3">
                    {data.consultants.map((c) => {
                      const totalH = data.consultants.reduce((s, x) => s + x.heuresPeriode, 0) || 1;
                      const pct = Math.round((c.heuresPeriode / totalH) * 100);
                      return (
                        <div key={c.id}>
                          <div className="flex items-center gap-2.5 mb-1">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                              style={{ background: c.couleur }}>
                              {c.nom.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <span className="flex-1 text-[12.5px] font-600 text-foreground">{c.nom}</span>
                            <span className="text-[13px] font-bold text-foreground">{c.heuresPeriode}h</span>
                            <span className="text-[11px] text-muted-foreground w-7 text-right">{pct}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-border overflow-hidden ml-8">
                            <div className="h-full rounded-full opacity-75" style={{ width: `${pct}%`, background: c.couleur }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {data.consultants.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-border/50 flex justify-between items-center">
                      <span className="text-[11.5px] text-muted-foreground">100% facturables</span>
                      <span className="text-[12.5px] font-bold text-foreground">{data.consultants.reduce((s, c) => s + c.heuresPeriode, 0)}h</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          {/* ── Charts ── */}
          <Card>
            <CardContent className="p-5 pb-3">
              <div className="flex items-center gap-2 mb-4 text-[12.5px] font-semibold text-muted-foreground">
                <Activity className="h-3.5 w-3.5" />
                Activité Équipe — <span className="text-foreground">{periodeLabel}</span>
              </div>
              <ActiviteEquipeChart
                data={data.activiteEquipe.data}
                consultants={data.activiteEquipe.consultants}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 pb-3">
              <div className="flex items-center gap-2 mb-4 text-[12.5px] font-semibold text-muted-foreground">
                <LineChart className="h-3.5 w-3.5" />
                Tendances CA &amp; Marge — 6 derniers mois
              </div>
              <TendancesChart
                data={data.tendances6Mois}
                objectifCA={objectifCA > 0 ? objectifCA : undefined}
              />
            </CardContent>
          </Card>
        </>
      ) : (
        <ErrorState onRetry={() => fetchData()} />
      )}
    </div>
  );
}

// ── Loading skeleton ────────────────────────────────────────────────────
function LoadingState() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-32 rounded-xl bg-muted" />)}
      </div>
      <div className="grid grid-cols-[3fr_2fr] gap-5">
        <div className="h-72 rounded-xl bg-muted" />
        <div className="space-y-5">
          <div className="h-40 rounded-xl bg-muted" />
          <div className="h-28 rounded-xl bg-muted" />
        </div>
      </div>
      <div className="h-56 rounded-xl bg-muted" />
      <div className="h-56 rounded-xl bg-muted" />
    </div>
  );
}

// ── Error state ─────────────────────────────────────────────────────────
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
        <p className="text-muted-foreground">Impossible de charger les données</p>
        <button type="button" onClick={onRetry} className="text-sm text-primary hover:underline">Réessayer</button>
      </CardContent>
    </Card>
  );
}
