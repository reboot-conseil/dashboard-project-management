"use client";

import * as React from "react";
import { TrendingUp, RefreshCw, Target, BarChart3, Users, Activity, ShieldAlert } from "lucide-react";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { KpiCard } from "@/components/dashboard/KpiCard";
import {
  loadFilters,
  saveFilters,
  type DashboardFiltersValue,
} from "@/components/dashboard/DashboardFilters";
import { cn } from "@/lib/utils";
import { ObjectifsAnnuelsSection, loadObjectifsAnnuels } from "@/components/dashboard/strategique/ObjectifsAnnuelsSection";
import { DonutChartSection } from "@/components/dashboard/strategique/DonutChartSection";
import { CapaciteEquipeSection } from "@/components/dashboard/strategique/CapaciteEquipeSection";
import { DecompositionConsultantsSection } from "@/components/dashboard/strategique/DecompositionConsultantsSection";
import { SanteGlobaleSection } from "@/components/dashboard/strategique/SanteGlobaleSection";
import { TendancesPrevisionsChart } from "@/components/dashboard/strategique/TendancesPrevisionsChart";
import { TousProjetsTable, type ProjetTableRow } from "@/components/dashboard/strategique/TousProjetsTable";
import { RisquesSection } from "@/components/dashboard/strategique/RisquesSection";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

// ── Types ──────────────────────────────────────────────────────────────
interface StrategiqueData {
  kpis: {
    caTotal: number;
    coutTotal: number;
    margeBrute: number;
    tauxMarge: number;
    variationCA: number;
    variationMarge: number;
    variationCout: number;
    roiMoyen: number;
  };
  objectifsAnnuels: {
    caAnnuelYTD: number;
    coutAnnuelYTD: number;
    margeAnnuelleYTD: number;
    tauxMargeYTD: number;
    projectionCAannuel: number;
    pctObjectifCA: number;
    pctProjectionObjectif: number;
    dayOfYear: number;
    pctAnneEcoulee: number;
  };
  projets: ProjetTableRow[];
  donutData: { id: number; nom: string; client: string; ca: number; cout: number; marge: number; couleur: string }[];
  decompositionConsultants: { id: number; nom: string; couleur: string; heures: number; ca: number }[];
  totalCAConsultants: number;
  capacite: {
    tauxOccupationMoyen: number;
    consultants: { id: number; nom: string; heures: number; capacite: number; taux: number }[];
    joursHommeDisponibles: number;
    capaciteDisponibleHeures: number;
    besoinRecrutement: boolean;
    pipelineCA: number;
  };
  santéGlobale: {
    score: number;
    label: string;
    color: string;
    detail: {
      rentabilite: { score: number; max: number; ratioMoyen: number };
      delais: { score: number; max: number; projetsEvalues: number };
      performance: { score: number; max: number; tauxMarge: number };
      occupation: { score: number; max: number; tauxOccupation: number };
    };
  };
  tendances: {
    mois: string;
    ca: number | null;
    marge: number | null;
    caPrevu: number | null;
    margePrevu: number | null;
    objectif: number | null;
    isFutur: boolean;
  }[];
  projectionQ2: number;
  moyenneCA3Mois: number;
  stats: {
    nbProjetsTotal: number;
    nbProjetsEnCours: number;
    nbProjetsPlanifie: number;
    nbProjetsTermine: number;
    nbConsultants: number;
  };
}

const STORAGE_KEY = "dashboard-strategique-filters";

// ── Helpers ────────────────────────────────────────────────────────────
function formatEuros(v: number) {
  if (Math.abs(v) >= 1_000_000) return `${Math.round(v / 100_000) / 10}M€`;
  if (Math.abs(v) >= 1_000) return `${Math.round(v / 100) / 10}k€`;
  return `${Math.round(v)}€`;
}

// ── Skeleton ───────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 bg-muted rounded-lg w-1/3" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 bg-muted rounded-xl" />
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    </div>
  );
}

// ── Error state ────────────────────────────────────────────────────────
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <p className="text-muted-foreground text-sm">Impossible de charger les données stratégiques.</p>
      <button
        type="button"
        className="flex items-center gap-2 text-sm text-primary hover:underline"
        onClick={onRetry}
      >
        <RefreshCw className="h-4 w-4" /> Réessayer
      </button>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────
interface DashboardStrategiqueProps {
  /** Period selected in the parent top bar */
  periode?: string;
}

export function DashboardStrategique({ periode: _periodeProp }: DashboardStrategiqueProps = {}) {
  const [filters, setFilters] = React.useState<DashboardFiltersValue>(() =>
    loadFilters(STORAGE_KEY, "month")
  );
  const [data, setData] = React.useState<StrategiqueData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);

  // Objectifs configurables (localStorage)
  const objectifsAnnuels = React.useMemo(() => {
    if (!hydrated) return { caObjectif: 0, margeObjectif: 40 };
    return loadObjectifsAnnuels();
  }, [hydrated]);

  // Hydration guard
  React.useEffect(() => {
    setHydrated(true);
  }, []);

  const fetchData = React.useCallback(
    async (f: DashboardFiltersValue, refreshing = false) => {
      if (refreshing) setIsRefreshing(true);
      else setLoading(true);
      setError(false);
      try {
        const obj = loadObjectifsAnnuels();
        const params = new URLSearchParams({
          dateDebut: f.dateDebut,
          dateFin: f.dateFin,
          ...(f.projetId && f.projetId !== "all" ? { projetId: f.projetId } : {}),
          objectifCA: String(obj.caObjectif),
          objectifMarge: String(obj.margeObjectif),
        });
        const res = await fetch(`/api/dashboard/strategique?${params}`);
        if (!res.ok) throw new Error("Fetch error");
        const json = await res.json();
        setData(json);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  React.useEffect(() => {
    if (hydrated) fetchData(filters);
  }, [filters, hydrated, fetchData]);

  function handleFilterChange(f: DashboardFiltersValue) {
    saveFilters(STORAGE_KEY, f);
    setFilters(f);
  }

  if (!hydrated) return null;
  if (loading) return <Skeleton />;
  if (error || !data) return <ErrorState onRetry={() => fetchData(filters)} />;

  const { kpis, stats } = data;

  // KPI trend helper
  function variationLabel(v: number): { value: number; label: string } {
    return { value: v, label: "vs mois préc." };
  }

  // projets compatibles avec ProjetTableRow
  const projetsTable: ProjetTableRow[] = data.projets.map((p) => ({
    id: p.id,
    nom: p.nom,
    client: p.client,
    statut: p.statut,
    budget: p.budget,
    pctBudget: p.pctBudget,
    budgetConsommePct: p.budgetConsommePct,
    realisationPct: p.realisationPct,
    ecart: p.ecart,
    health: p.health,
    ca: p.ca,
    marge: p.marge,
    tauxMarge: p.tauxMarge,
    prochainDeadline: p.prochainDeadline
      ? {
          deadline: p.prochainDeadline.deadline
            ? new Date(p.prochainDeadline.deadline as unknown as string).toISOString()
            : null,
          joursRestants: p.prochainDeadline.joursRestants ?? null,
        }
      : null,
  }));

  return (
    <div className="space-y-5">
      {/* ── Inline filter bar (no header) ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => fetchData(filters, true)}
          disabled={isRefreshing}
          className="p-1.5 rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ml-auto"
          title="Rafraîchir"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
        </button>
      </div>

      {/* 4 KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-4">
        <KpiCard
          title="CA (période)"
          value={formatEuros(kpis.caTotal)}
          icon={<TrendingUp className="h-4 w-4" />}
          trend={variationLabel(kpis.variationCA)}
          isHero
          subtitle={`${stats.nbProjetsEnCours} projets en cours`}
          style={{ animationDelay: "0ms" }}
        />
        <KpiCard
          title="Marge globale"
          value={`${kpis.tauxMarge}%`}
          icon={<BarChart3 className="h-4 w-4" />}
          trend={variationLabel(kpis.variationMarge)}
          variant={
            kpis.tauxMarge >= 40 ? "success" : kpis.tauxMarge >= 30 ? "warning" : "danger"
          }
          subtitle={formatEuros(kpis.margeBrute)}
          style={{ animationDelay: "50ms" }}
        />
        <KpiCard
          title="Coûts totaux"
          value={formatEuros(kpis.coutTotal)}
          icon={<Activity className="h-4 w-4" />}
          trend={variationLabel(kpis.variationCout)}
          variant={kpis.variationCout <= 0 ? "success" : "warning"}
          subtitle="Charges employeur"
          style={{ animationDelay: "100ms" }}
        />
        <KpiCard
          title="ROI moyen"
          value={`${kpis.roiMoyen}%`}
          icon={<Target className="h-4 w-4" />}
          variant={kpis.roiMoyen >= 50 ? "success" : kpis.roiMoyen >= 20 ? "warning" : "danger"}
          subtitle={`${stats.nbConsultants} consultant${stats.nbConsultants > 1 ? "s" : ""}`}
          style={{ animationDelay: "150ms" }}
        />
      </div>

      {/* Row 1: Objectifs annuels + Score santé */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SectionCard
            title="Objectifs annuels"
            icon={<Target className="h-4 w-4" />}
          >
            <ObjectifsAnnuelsSection
              data={{
                caAnnuelYTD: data.objectifsAnnuels.caAnnuelYTD,
                projectionCAannuel: data.objectifsAnnuels.projectionCAannuel,
                pctObjectifCA: data.objectifsAnnuels.pctObjectifCA,
                pctProjectionObjectif: data.objectifsAnnuels.pctProjectionObjectif,
                pctAnneEcoulee: data.objectifsAnnuels.pctAnneEcoulee,
                tauxMargeYTD: data.objectifsAnnuels.tauxMargeYTD,
                dayOfYear: data.objectifsAnnuels.dayOfYear,
              }}
              objectifs={objectifsAnnuels}
              onObjectifsChange={(_o) => fetchData(filters, true)}
            />
          </SectionCard>
        </div>
        <div>
          <SectionCard
            title="Santé globale"
            icon={<Activity className="h-4 w-4" />}
          >
            <SanteGlobaleSection
              score={data.santéGlobale.score}
              label={data.santéGlobale.label}
              color={data.santéGlobale.color}
              detail={data.santéGlobale.detail}
            />
          </SectionCard>
        </div>
      </div>

      {/* Row 2: Donut + Décomposition consultants */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard
          title="Répartition par projet"
          icon={<BarChart3 className="h-4 w-4" />}
        >
          <DonutChartSection data={data.donutData} />
        </SectionCard>

        <SectionCard
          title="Décomposition consultants"
          icon={<Users className="h-4 w-4" />}
        >
          <DecompositionConsultantsSection
            consultants={data.decompositionConsultants}
            totalCA={data.totalCAConsultants}
          />
        </SectionCard>
      </div>

      {/* Row 3: Capacité équipe */}
      <SectionCard
        title="Capacité équipe"
        icon={<Users className="h-4 w-4" />}
      >
        <CapaciteEquipeSection
          tauxOccupationMoyen={data.capacite.tauxOccupationMoyen}
          consultants={data.capacite.consultants}
          joursHommeDisponibles={data.capacite.joursHommeDisponibles}
          capaciteDisponibleHeures={data.capacite.capaciteDisponibleHeures}
          besoinRecrutement={data.capacite.besoinRecrutement}
          pipelineCA={data.capacite.pipelineCA}
        />
      </SectionCard>

      {/* Row 4: Tendances + prévisions */}
      <SectionCard
        title="Tendances & Prévisions"
        icon={<TrendingUp className="h-4 w-4" />}
      >
        <TendancesPrevisionsChart
          data={data.tendances}
          projectionQ2={data.projectionQ2}
          moyenneCA3Mois={data.moyenneCA3Mois}
        />
      </SectionCard>

      {/* Row 5: Tous les projets (accordion) */}
      <Accordion type="single" collapsible defaultValue="projets">
        <AccordionItem value="projets">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span>
                Tous les projets
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({stats.nbProjetsTotal} · {stats.nbProjetsEnCours} en cours · {stats.nbProjetsPlanifie} planifiés)
                </span>
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <TousProjetsTable projets={projetsTable} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Row 6: Risques (accordion, fermé par défaut) */}
      <Accordion type="single" collapsible>
        <AccordionItem value="risques">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              <span>Analyse des risques</span>
              <span className="ml-2 text-[10px] font-normal bg-muted text-muted-foreground rounded px-1.5 py-0.5">
                V2
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <RisquesSection />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
