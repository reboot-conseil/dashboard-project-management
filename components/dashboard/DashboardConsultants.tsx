"use client";

import * as React from "react";
import {
  Users,
  Clock,
  DollarSign,
  Activity,
  Briefcase,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ProjetsEnCoursSection } from "@/components/dashboard/consultants/ProjetsEnCoursSection";
import { DeadlinesAVenirSection } from "@/components/dashboard/consultants/DeadlinesAVenirSection";
import { PlanningSemaineSection } from "@/components/dashboard/consultants/PlanningSemaineSection";
import { HistoriquePerformanceChart } from "@/components/dashboard/consultants/HistoriquePerformanceChart";
import { ActivitesRecentesTable } from "@/components/dashboard/consultants/ActivitesRecentesTable";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────
type Periode = "mois" | "trimestre" | "annee";

interface ConsultantItem {
  id: number;
  nom: string;
  couleur: string;
  tjm: number | null;
}

interface ConsultantData {
  id: number;
  nom: string;
  email: string;
  tjm: number;
  coutJournalierEmployeur: number;
  couleur: string;
  competences: string | null;
}

interface ApiResponse {
  consultants: ConsultantItem[];
  consultant: ConsultantData | null;
  kpis: {
    heuresTotal: number;
    heuresBill: number;
    caGenere: number;
    tauxOccupation: number;
    joursOuvrables: number;
    variationHeures: number;
    variationCA: number;
    nbProjetsActifs: number;
    projetsActifsList: { id: number; nom: string; heures: number }[];
  };
  projetsEnCours: {
    id: number;
    nom: string;
    client: string;
    statut: string;
    couleur: string;
    heuresConsultant: number;
    budgetConsommePct: number;
    realisationPct: number;
    ecart: number;
    health: "bon" | "normal" | "critique";
  }[];
  deadlines: {
    etapeId: number;
    etapeNom: string;
    statut: string;
    projetId: number;
    projetNom: string;
    projetCouleur: string;
    deadline: string;
    joursRestants: number;
    chargeEstimeeJours: number | null;
  }[];
  planningSemaine: {
    date: string;
    jourLabel: string;
    isWeekend: boolean;
    totalHeures: number;
    projets: { nom: string; couleur: string; heures: number; etape: string | null }[];
  }[];
  historique: {
    data: { mois: string; heures: number; ca: number; occupation: number }[];
    moy6Heures: number;
    moy6CA: number;
    moy6Occ: number;
    tendanceGlobale: "hausse" | "baisse" | "stable";
  };
  activitesRecentes: {
    id: number;
    date: string;
    projetId: number;
    projetNom: string;
    projetCouleur: string;
    etapeNom: string | null;
    heures: number;
    facturable: boolean;
    description: string | null;
  }[];
  totalHeuresToutes: number;
  totalHeuresBill: number;
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
      <p className="text-muted-foreground text-sm">
        Impossible de charger les données consultant.
      </p>
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

// ── Helpers ────────────────────────────────────────────────────────────
function formatEuros(v: number) {
  if (Math.abs(v) >= 1_000_000) return `${Math.round(v / 100_000) / 10}M€`;
  if (Math.abs(v) >= 1_000) return `${Math.round(v / 100) / 10}k€`;
  return `${Math.round(v)}€`;
}

function tauxLabel(t: number): string {
  if (t > 100) return "🔴 Surcharge";
  if (t >= 95) return "🟡 Pleine charge";
  if (t >= 80) return "🟢 Optimal";
  if (t >= 70) return "🟢 Bon";
  return "🟡 Sous-utilisé";
}

function tauxVariant(t: number): "success" | "warning" | "danger" | "default" {
  if (t >= 80 && t <= 95) return "success";
  if (t > 95) return "warning";
  return "default";
}

// ── Main component ──────────────────────────────────────────────────────
export function DashboardConsultants() {
  const [consultantId, setConsultantId] = React.useState<number | null>(null);
  const [periode, setPeriode] = React.useState<Periode>("mois");
  const [data, setData] = React.useState<ApiResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setHydrated(true);
  }, []);

  const fetchData = React.useCallback(
    async (cId: number | null, per: Periode, refreshing = false) => {
      if (refreshing) setIsRefreshing(true);
      else setLoading(true);
      setError(false);
      try {
        const params = new URLSearchParams({ periode: per });
        if (cId !== null) params.set("consultantId", String(cId));
        const res = await fetch(`/api/dashboard/consultants?${params}`);
        if (!res.ok) throw new Error("Fetch error");
        const json: ApiResponse = await res.json();
        setData(json);
        // Premier chargement → on fixe l'id
        if (cId === null && json.consultants.length > 0) {
          setConsultantId(json.consultants[0].id);
        }
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
    if (hydrated) fetchData(consultantId, periode);
  }, [hydrated, consultantId, periode, fetchData]);

  // Navigation clavier
  React.useEffect(() => {
    if (!data?.consultants) return;
    function handleKey(e: KeyboardEvent) {
      if (
        (e.target as HTMLElement)?.tagName === "INPUT" ||
        (e.target as HTMLElement)?.tagName === "SELECT"
      ) return;
      if (!data) return;
      const idx = data.consultants.findIndex((c) => c.id === consultantId);
      if (e.key === "ArrowLeft" && idx > 0) {
        setConsultantId(data.consultants[idx - 1].id);
      } else if (e.key === "ArrowRight" && idx < data.consultants.length - 1) {
        setConsultantId(data.consultants[idx + 1].id);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [data, consultantId]);

  if (!hydrated) return null;
  if (loading) return <Skeleton />;
  if (error || !data) return <ErrorState onRetry={() => fetchData(consultantId, periode)} />;

  const consultants = data.consultants;
  const selectedIdx = consultants.findIndex((c) => c.id === consultantId);
  const selectedConsultant = consultants[selectedIdx] ?? consultants[0];
  const { kpis, historique } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <DashboardHeader
        viewName="Analyse par Consultant"
        icon={<Users className="h-5 w-5" />}
        isRefreshing={isRefreshing}
        onRefresh={() => fetchData(consultantId, periode, true)}
      >
        <div className="flex items-center gap-3 flex-wrap">
          {/* Navigation précédent/suivant */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={selectedIdx <= 0}
              onClick={() => setConsultantId(consultants[selectedIdx - 1].id)}
              title="Consultant précédent (←)"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={selectedIdx >= consultants.length - 1}
              onClick={() => setConsultantId(consultants[selectedIdx + 1].id)}
              title="Consultant suivant (→)"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Sélecteur consultant */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground whitespace-nowrap">
              Consultant :
            </label>
            <div className="relative">
              <Select
                value={consultantId?.toString() ?? ""}
                onChange={(e) => setConsultantId(parseInt(e.target.value))}
                className="h-8 text-xs pl-6 pr-3 w-[180px]"
              >
                {consultants.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </Select>
              {/* Dot couleur consultant */}
              {selectedConsultant && (
                <span
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full pointer-events-none"
                  style={{ backgroundColor: selectedConsultant.couleur }}
                />
              )}
            </div>
          </div>

          {/* Sélecteur période */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground whitespace-nowrap">
              Période :
            </label>
            <Select
              value={periode}
              onChange={(e) => setPeriode(e.target.value as Periode)}
              className="h-8 text-xs w-[140px]"
            >
              <option value="mois">Ce mois</option>
              <option value="trimestre">Ce trimestre</option>
              <option value="annee">Cette année</option>
            </Select>
          </div>
        </div>
      </DashboardHeader>

      {/* Pas de consultant = état vide */}
      {!data.consultant ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Aucun consultant actif trouvé.
        </div>
      ) : (
        <>
          {/* Section 1 : 4 KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Heures ce mois"
              value={`${kpis.heuresTotal}h`}
              icon={<Clock className="h-4 w-4" />}
              trend={{
                value: kpis.variationHeures,
                label: `${kpis.variationHeures > 0 ? "+" : ""}${kpis.variationHeures}h vs mois préc.`,
              }}
              subtitle={`${kpis.heuresBill}h facturables`}
            />
            <KpiCard
              title="CA généré"
              value={formatEuros(kpis.caGenere)}
              icon={<DollarSign className="h-4 w-4" />}
              trend={{
                value: kpis.variationCA,
                label: `${kpis.variationCA > 0 ? "+" : ""}${kpis.variationCA}% vs mois préc.`,
              }}
              variant={kpis.variationCA >= 0 ? "success" : "danger"}
              subtitle={`TJM : ${formatEuros(data.consultant.tjm)}/j`}
            />
            <KpiCard
              title="Taux occupation"
              value={`${kpis.tauxOccupation}%`}
              icon={<Activity className="h-4 w-4" />}
              variant={tauxVariant(kpis.tauxOccupation)}
              subtitle={tauxLabel(kpis.tauxOccupation)}
            />
            <KpiCard
              title="Projets actifs"
              value={String(kpis.nbProjetsActifs)}
              icon={<Briefcase className="h-4 w-4" />}
              subtitle={
                kpis.projetsActifsList.length > 0
                  ? kpis.projetsActifsList
                      .slice(0, 2)
                      .map((p) => p.nom)
                      .join(", ") +
                    (kpis.projetsActifsList.length > 2
                      ? ` +${kpis.projetsActifsList.length - 2}`
                      : "")
                  : "Aucun projet"
              }
            />
          </div>

          {/* Section 2 : Projets en cours + Deadlines */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard
              title="Projets en cours"
              icon={<Briefcase className="h-4 w-4" />}
            >
              <ProjetsEnCoursSection projets={data.projetsEnCours} />
            </SectionCard>

            <SectionCard
              title="Deadlines à venir"
              icon={<Clock className="h-4 w-4" />}
            >
              <DeadlinesAVenirSection deadlines={data.deadlines} />
            </SectionCard>
          </div>

          {/* Section 3 : Planning semaine */}
          <SectionCard
            title="Planning semaine"
            icon={<Activity className="h-4 w-4" />}
          >
            <PlanningSemaineSection jours={data.planningSemaine} />
          </SectionCard>

          {/* Section 4 : Historique performance */}
          <SectionCard
            title="Évolution performance (6 derniers mois)"
            icon={<Activity className="h-4 w-4" />}
          >
            <HistoriquePerformanceChart
              data={historique.data}
              moy6Heures={historique.moy6Heures}
              moy6CA={historique.moy6CA}
              moy6Occ={historique.moy6Occ}
              tendanceGlobale={historique.tendanceGlobale}
            />
          </SectionCard>

          {/* Section 5 : Activités récentes */}
          <SectionCard
            title="Activités récentes"
            icon={<Clock className="h-4 w-4" />}
          >
            <ActivitesRecentesTable
              activites={data.activitesRecentes}
              totalHeuresToutes={data.totalHeuresToutes}
              totalHeuresBill={data.totalHeuresBill}
            />
          </SectionCard>
        </>
      )}
    </div>
  );
}
