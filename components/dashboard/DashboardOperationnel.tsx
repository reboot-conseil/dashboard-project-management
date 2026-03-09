"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart3,
  AlertCircle,
  Target,
  Clock,
  DollarSign,
  TrendingUp,
  Activity,
  LineChart,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SectionCard } from "@/components/dashboard/SectionCard";
import {
  getDefaultFilters,
  loadFilters,
  saveFilters,
  type DashboardFiltersValue,
} from "@/components/dashboard/DashboardFilters";
import { PrioritesSection } from "@/components/dashboard/operationnel/PrioritesSection";
import { ProjetsASurveillerList } from "@/components/dashboard/operationnel/ProjetsASurveillerList";
import { ActiviteEquipeChart } from "@/components/dashboard/operationnel/ActiviteEquipeChart";
import { TendancesChart } from "@/components/dashboard/operationnel/TendancesChart";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────
interface ProjetOption {
  id: number;
  nom: string;
  client: string;
  statut?: string;
}

interface OperationnelData {
  kpis: {
    caTotal: number;
    coutTotal: number;
    margeBrute: number;
    tauxMarge: number;
    totalHeures: number;
    tauxOccupation: number;
    nbProjetsEnRetard: number;
    nbProjetsCritiquesPlanning: number;
    nbProjetsBudgetDepasse: number;
    nbProjetsBudgetCritique: number;
  };
  priorites: {
    deadlinesCritiques: {
      id: number;
      nom: string;
      deadline: string;
      joursRestants: number;
      projetId: number;
      projetNom: string;
    }[];
    projetsEnDerive: { id: number; nom: string; ecart: number }[];
    pointsClients: { id: number; nom: string; pctBudget: number }[];
    staffing: {
      sousSollicites: { id: number; nom: string }[];
      surSollicites: { id: number; nom: string }[];
    };
  };
  projetsASurveiller: {
    id: number;
    nom: string;
    client: string;
    statut: string;
    budget: number;
    pctBudget: number;
    budgetConsommePct: number;
    realisationPct: number;
    ecart: number;
    health: "bon" | "normal" | "critique";
    healthLabel: string;
    dateFinEstimee: string | null;
    prochainDeadline: {
      nom: string;
      deadline: string | null;
      joursRestants: number | null;
    } | null;
  }[];
  activiteEquipe: {
    data: Record<string, unknown>[];
    consultants: { id: number; nom: string; couleur: string }[];
  };
  tendances6Mois: { mois: string; ca: number; marge: number; heures: number }[];
  consultants: {
    id: number;
    nom: string;
    couleur: string;
    heuresPeriode: number;
    tauxOccupation: number;
  }[];
}

const STORAGE_KEY = "dashboard-operationnel-filters";
const OBJECTIFS_KEY = "dashboard-objectifs";

// ── Formatters ─────────────────────────────────────────────────────────
function formatEuros(v: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);
}

// ── Component ──────────────────────────────────────────────────────────
interface DashboardOperationnelProps {
  /** Period selected in the parent top bar — overrides internal filter when provided */
  periode?: string;
}

export function DashboardOperationnel({ periode: periodeProp }: DashboardOperationnelProps = {}) {
  const [hydrated, setHydrated] = useState(false);
  const [filters, setFilters] = useState<DashboardFiltersValue>(getDefaultFilters("week"));
  const [projets, setProjets] = useState<ProjetOption[]>([]);
  const [data, setData] = useState<OperationnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [objectifCA, setObjectifCA] = useState(0);

  // Hydration + load saved filters
  useEffect(() => {
    const saved = loadFilters(STORAGE_KEY, "week");
    setFilters(saved);
    try {
      const savedObj = localStorage.getItem(OBJECTIFS_KEY);
      if (savedObj) {
        const parsed = JSON.parse(savedObj);
        setObjectifCA(parsed.caObjectif ?? 0);
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  // Fetch projets list (pour le filtre)
  useEffect(() => {
    fetch("/api/projets")
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setProjets(
          list
            .filter((p: ProjetOption & Record<string, unknown>) => p.statut !== "TERMINE")
            .map((p: ProjetOption & Record<string, unknown>) => ({
              id: p.id,
              nom: p.nom,
              client: p.client,
              statut: p.statut,
            }))
        );
      })
      .catch(() => {});
  }, []);

  // Fetch dashboard data
  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const params = new URLSearchParams({
        dateDebut: filters.dateDebut,
        dateFin: filters.dateFin,
      });
      if (filters.projetId !== "all") params.set("projetId", filters.projetId);

      try {
        const res = await fetch(`/api/dashboard/operationnel?${params}`);
        if (!res.ok) throw new Error("Erreur API");
        const json = await res.json();
        setData(json);
      } catch {
        toast.error("Impossible de charger les données du dashboard");
        setData(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filters]
  );

  // Fetch on filter change
  useEffect(() => {
    if (hydrated) fetchData();
  }, [fetchData, hydrated]);

  // Save filters on change
  function handleFiltersChange(newFilters: DashboardFiltersValue) {
    setFilters(newFilters);
    saveFilters(STORAGE_KEY, newFilters);
  }

  if (!hydrated) return null;

  // ── KPIs dérivés ───────────────────────────────────────────────────
  const kpis = data?.kpis;

  const nbProjetsSurveilles =
    (kpis?.nbProjetsEnRetard ?? 0) + (kpis?.nbProjetsCritiquesPlanning ?? 0);

  const planningVariant =
    (kpis?.nbProjetsEnRetard ?? 0) > 0
      ? ("danger" as const)
      : nbProjetsSurveilles > 0
      ? ("warning" as const)
      : ("default" as const);

  const budgetVariant =
    (kpis?.nbProjetsBudgetDepasse ?? 0) > 0
      ? ("danger" as const)
      : (kpis?.nbProjetsBudgetCritique ?? 0) > 0
      ? ("warning" as const)
      : ("default" as const);

  const margeVariant =
    (kpis?.tauxMarge ?? 0) >= 40
      ? ("success" as const)
      : (kpis?.tauxMarge ?? 0) >= 30
      ? ("warning" as const)
      : ("danger" as const);

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <DashboardHeader
        viewName="Vue Opérationnelle"
        icon={<BarChart3 className="h-5 w-5" />}
        onRefresh={() => fetchData(true)}
        isRefreshing={refreshing}
      >
        <DashboardFilters
          value={filters}
          onChange={handleFiltersChange}
          projets={projets}
          defaultPeriode="week"
        />
      </DashboardHeader>

      {loading && !data ? (
        <LoadingState />
      ) : data ? (
        <>
          {/* ── Section 1 : Priorités ─────────────────────────────── */}
          <SectionCard
            title="Priorités Cette Semaine"
            icon={<AlertCircle className="h-4 w-4" />}
          >
            <PrioritesSection
              deadlinesCritiques={data.priorites.deadlinesCritiques}
              projetsEnDerive={data.priorites.projetsEnDerive}
              pointsClients={data.priorites.pointsClients}
              staffing={data.priorites.staffing}
            />
          </SectionCard>

          {/* ── Section 2 : KPIs ──────────────────────────────────── */}
          <section className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-4">
            {/* KPI 1 : Heures / Occupation — hero card */}
            <KpiCard
              title="Heures Équipe"
              value={`${kpis?.totalHeures ?? 0}h`}
              icon={<Target className="h-4 w-4" />}
              subtitle={`${kpis?.tauxOccupation ?? 0}% taux d'occupation`}
              isHero
              variant={
                (kpis?.tauxOccupation ?? 0) >= 80
                  ? "success"
                  : (kpis?.tauxOccupation ?? 0) >= 60
                  ? "default"
                  : "warning"
              }
              style={{ animationDelay: "0ms" }}
            />

            {/* KPI 2 : Décalage Planning */}
            <KpiCard
              title="Décalage Planning"
              value={
                nbProjetsSurveilles === 0
                  ? "On track"
                  : `${nbProjetsSurveilles} projet${nbProjetsSurveilles > 1 ? "s" : ""}`
              }
              icon={<Clock className="h-4 w-4" />}
              subtitle={
                (kpis?.nbProjetsEnRetard ?? 0) > 0
                  ? `${kpis?.nbProjetsEnRetard} en retard`
                  : (kpis?.nbProjetsCritiquesPlanning ?? 0) > 0
                  ? `${kpis?.nbProjetsCritiquesPlanning} deadline < 7j`
                  : "Aucun retard détecté"
              }
              variant={planningVariant}
              style={{ animationDelay: "50ms" }}
            />

            {/* KPI 3 : Budget Alert */}
            <KpiCard
              title="Budget Alert"
              value={
                (kpis?.nbProjetsBudgetDepasse ?? 0) === 0 &&
                (kpis?.nbProjetsBudgetCritique ?? 0) === 0
                  ? "Sous contrôle"
                  : (kpis?.nbProjetsBudgetDepasse ?? 0) > 0
                  ? `${kpis?.nbProjetsBudgetDepasse} dépassé${(kpis?.nbProjetsBudgetDepasse ?? 0) > 1 ? "s" : ""}`
                  : `${kpis?.nbProjetsBudgetCritique} critique${(kpis?.nbProjetsBudgetCritique ?? 0) > 1 ? "s" : ""}`
              }
              icon={<DollarSign className="h-4 w-4" />}
              subtitle={
                (kpis?.nbProjetsBudgetDepasse ?? 0) > 0
                  ? "Budget consommé > 100%"
                  : (kpis?.nbProjetsBudgetCritique ?? 0) > 0
                  ? "Budget consommé > 95%"
                  : "Tous les budgets sont OK"
              }
              variant={budgetVariant}
              style={{ animationDelay: "100ms" }}
            />

            {/* KPI 4 : Marge Globale */}
            <KpiCard
              title="Marge Globale"
              value={`${kpis?.tauxMarge ?? 0}%`}
              icon={<TrendingUp className="h-4 w-4" />}
              subtitle={formatEuros(kpis?.margeBrute ?? 0)}
              variant={margeVariant}
              style={{ animationDelay: "150ms" }}
            />
          </section>

          {/* ── Section 3 : Projets à Surveiller ─────────────────── */}
          <section className="grid grid-cols-1 gap-6">
            <SectionCard
              title="Projets à Surveiller"
              icon={<AlertCircle className="h-4 w-4" />}
              actions={
                data.projetsASurveiller.length > 0 ? (
                  <span className="text-xs text-muted-foreground">
                    {data.projetsASurveiller.length} projet{data.projetsASurveiller.length > 1 ? "s" : ""}
                  </span>
                ) : undefined
              }
            >
              <ProjetsASurveillerList projets={data.projetsASurveiller} />
            </SectionCard>
          </section>

          {/* ── Section 4 : Activité Équipe ───────────────────────── */}
          <SectionCard
            title="Activité Équipe — 7 derniers jours"
            icon={<Activity className="h-4 w-4" />}
            actions={
              data.consultants.length > 0 ? (
                <span className="text-xs text-muted-foreground">
                  {data.consultants.length} consultant{data.consultants.length > 1 ? "s" : ""}
                </span>
              ) : undefined
            }
          >
            <ActiviteEquipeChart
              data={data.activiteEquipe.data}
              consultants={data.activiteEquipe.consultants}
            />
          </SectionCard>

          {/* ── Section 5 : Tendances ─────────────────────────────── */}
          <SectionCard
            title="Tendances 6 mois — CA & Marge"
            icon={<LineChart className="h-4 w-4" />}
            actions={
              objectifCA > 0 ? (
                <span className="text-xs text-muted-foreground">
                  Objectif mensuel :{" "}
                  {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(objectifCA)}
                </span>
              ) : undefined
            }
          >
            <TendancesChart
              data={data.tendances6Mois}
              objectifCA={objectifCA > 0 ? objectifCA : undefined}
            />
          </SectionCard>
        </>
      ) : (
        <ErrorState onRetry={() => fetchData()} />
      )}
    </div>
  );
}

// ── Loading skeleton ───────────────────────────────────────────────────
function LoadingState() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-32 rounded-lg bg-muted" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-lg bg-muted" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="h-56 rounded-lg bg-muted" />
        <div className="h-56 rounded-lg bg-muted" />
      </div>
      <div className="h-72 rounded-lg bg-muted" />
    </div>
  );
}

// ── Error state ────────────────────────────────────────────────────────
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
        <p className="text-muted-foreground">Impossible de charger les données</p>
        <button
          type="button"
          onClick={onRetry}
          className="text-sm text-primary hover:underline"
        >
          Réessayer
        </button>
      </CardContent>
    </Card>
  );
}
