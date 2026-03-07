"use client";

import { useState, useEffect, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  parseISO,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flag,
  LayoutGrid,
  GanttChart,
  Users,
  PanelRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import type { CalData, EtapeInfo, Filtres, VueType } from "@/components/calendrier/types";
import { buildParams } from "@/components/calendrier/types";
import { FiltresBar } from "@/components/calendrier/filtres-bar";
import { MonthView } from "@/components/calendrier/month-view";
import { GanttView } from "@/components/calendrier/gantt-view";
import { ChargeEquipeView } from "@/components/calendrier/charge-equipe-view";
import { EtapeSidebar } from "@/components/calendrier/etape-sidebar";
import { WeekSidePanel } from "@/components/calendrier/week-side-panel";
import { ContextMenu } from "@/components/calendrier/context-menu";

const WEEK_DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const EMPTY_DATA: CalData = {
  activites: [],
  deadlines: [],
  heuresParJour: {},
  etapes: [],
  consultants: [],
  projets: [],
  chargePlanifiee: {},
  stats: { totalEtapes: 0, enRetard: 0, critiques: 0, surcharges: 0, capaciteDisponible: 0 },
};

export default function CalendrierPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [vue, setVue] = useState<VueType>("mois");
  const [data, setData] = useState<CalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtres, setFiltres] = useState<Filtres>({
    projetIds: [],
    consultantIds: [],
    statuts: ["A_FAIRE", "EN_COURS"],
    urgences: [],
    masquerPassees: true,
  });
  const [selectedEtape, setSelectedEtape] = useState<EtapeInfo | null>(null);
  const [showWeekPanel, setShowWeekPanel] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; etape: EtapeInfo } | null>(null);
  const [showConfirmReport, setShowConfirmReport] = useState<{ etape: EtapeInfo; newDeadline: string } | null>(null);
  const [filtresOpen, setFiltresOpen] = useState<Record<string, boolean>>({});

  // Hydration guard + persistence
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
    try {
      const savedVue = localStorage.getItem("calendrier-vue-active") as VueType | null;
      if (savedVue) setVue(savedVue);
      const savedFiltres = localStorage.getItem("calendrier-filtres");
      if (savedFiltres) setFiltres(JSON.parse(savedFiltres));
    } catch {}
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("calendrier-vue-active", vue);
  }, [vue, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("calendrier-filtres", JSON.stringify(filtres));
  }, [filtres, hydrated]);

  useEffect(() => {
    function handleClick() {
      setContextMenu(null);
    }
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  const getDateRange = useCallback(() => {
    if (vue === "gantt") {
      return {
        dateDebut: format(startOfMonth(currentDate), "yyyy-MM-dd"),
        dateFin: format(endOfMonth(currentDate), "yyyy-MM-dd"),
      };
    } else if (vue === "charge") {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return {
        dateDebut: format(weekStart, "yyyy-MM-dd"),
        dateFin: format(weekEnd, "yyyy-MM-dd"),
      };
    } else {
      const calStart = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
      const calEnd = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
      return {
        dateDebut: format(calStart, "yyyy-MM-dd"),
        dateFin: format(calEnd, "yyyy-MM-dd"),
      };
    }
  }, [currentDate, vue]);

  useEffect(() => {
    setLoading(true);
    const { dateDebut, dateFin } = getDateRange();
    const params = buildParams(dateDebut, dateFin, filtres);
    fetch(`/api/calendrier?${params}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(EMPTY_DATA))
      .finally(() => setLoading(false));
  }, [getDateRange, filtres]);

  async function refresh() {
    const { dateDebut, dateFin } = getDateRange();
    const params = buildParams(dateDebut, dateFin, filtres);
    try {
      const r = await fetch(`/api/calendrier?${params}`);
      setData(await r.json());
    } catch {}
  }

  function navigatePrev() {
    setCurrentDate((d) => (vue === "charge" ? subWeeks(d, 1) : subMonths(d, 1)));
  }
  function navigateNext() {
    setCurrentDate((d) => (vue === "charge" ? addWeeks(d, 1) : addMonths(d, 1)));
  }
  function goToday() {
    setCurrentDate(new Date());
  }

  function applyRetroplanning() {
    setVue("gantt");
    setFiltres({ projetIds: [], consultantIds: [], statuts: ["A_FAIRE", "EN_COURS"], urgences: [], masquerPassees: true });
  }
  function applyActivitesConsultants() {
    setVue("charge");
    setCurrentDate(new Date());
    setFiltres({ projetIds: [], consultantIds: [], statuts: ["A_FAIRE", "EN_COURS"], urgences: [], masquerPassees: false });
  }

  async function changerStatut(etape: EtapeInfo, statut: string) {
    await fetch(`/api/etapes/${etape.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut }),
    });
    await refresh();
    if (selectedEtape?.id === etape.id) {
      setSelectedEtape({ ...selectedEtape, statut: statut as "A_FAIRE" | "EN_COURS" | "VALIDEE" });
    }
    setContextMenu(null);
  }

  async function reporterDeadline(etape: EtapeInfo, newDeadline: string) {
    await fetch(`/api/etapes/${etape.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deadline: newDeadline }),
    });
    await refresh();
    setShowConfirmReport(null);
    setSelectedEtape(null);
  }

  async function supprimerEtape(etape: EtapeInfo) {
    if (!confirm(`Supprimer "${etape.nom}" ?`)) return;
    await fetch(`/api/etapes/${etape.id}`, { method: "DELETE" });
    await refresh();
    setSelectedEtape(null);
    setContextMenu(null);
  }

  async function handleEtapeDatesChange(
    etapeId: number,
    dateDebut: string | null,
    deadline: string | null
  ) {
    try {
      await fetch(`/api/etapes/${etapeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateDebut, deadline }),
      });
      toast.success("Étape mise à jour");
      await refresh();
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
  }

  function handleContextMenu(e: React.MouseEvent, etape: EtapeInfo) {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, etape });
  }

  function getHeaderTitle() {
    if (vue === "charge") {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(weekStart, "d", { locale: fr })} - ${format(weekEnd, "d MMM yyyy", { locale: fr })}`;
    }
    return format(currentDate, "MMMM yyyy", { locale: fr });
  }

  return (
    <div className="p-6 space-y-4">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
            {/* Sélecteur de vue */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(["mois", "gantt", "charge"] as VueType[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setVue(v)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5",
                    vue === v
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:bg-muted"
                  )}
                >
                  {v === "mois" && <LayoutGrid className="h-3.5 w-3.5" />}
                  {v === "gantt" && <GanttChart className="h-3.5 w-3.5" />}
                  {v === "charge" && <Users className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">
                    {v === "mois" ? "Mois" : v === "gantt" ? "Gantt" : "Charge équipe"}
                  </span>
                </button>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={navigatePrev} className="h-8 w-8" aria-label="Période précédente">
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
              <span className="text-sm font-medium min-w-[150px] text-center capitalize">
                {getHeaderTitle()}
              </span>
              <Button variant="outline" size="icon" onClick={navigateNext} className="h-8 w-8" aria-label="Période suivante">
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            <Button variant="outline" size="sm" onClick={goToday} className="text-xs">
              Aujourd&apos;hui
            </Button>

            {/* Vues rapides — dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs gap-1">
                  <ChevronDown className="h-3 w-3" />Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={applyRetroplanning} className="text-xs gap-2 cursor-pointer">
                  <Flag className="h-3 w-3" />Rétroplanning
                </DropdownMenuItem>
                <DropdownMenuItem onClick={applyActivitesConsultants} className="text-xs gap-2 cursor-pointer">
                  <Users className="h-3 w-3" />Staffing hebdo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Toggle WeekSidePanel */}
            <Button
              variant={showWeekPanel ? "default" : "outline"}
              size="icon"
              className="h-8 w-8 ml-auto"
              onClick={() => setShowWeekPanel((v) => !v)}
              title={showWeekPanel ? "Masquer le panneau semaine" : "Afficher le panneau semaine"}
            >
              <PanelRight className="h-4 w-4" aria-hidden="true" />
            </Button>
        </div>

        <FiltresBar
          filtres={filtres}
          setFiltres={setFiltres}
          consultants={data?.consultants ?? []}
          projets={data?.projets ?? []}
          filtresOpen={filtresOpen}
          setFiltresOpen={setFiltresOpen}
        />
      </div>

      {/* Stats alertes */}
      {data && (data.stats.enRetard > 0 || data.stats.surcharges > 0) && (
        <div className="flex flex-wrap gap-2">
          {data.stats.enRetard > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4" />
              {data.stats.enRetard} deadline{data.stats.enRetard > 1 ? "s" : ""} en retard
            </div>
          )}
          {data.stats.critiques > 0 && (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-sm text-orange-700">
              <Clock className="h-4 w-4" />
              {data.stats.critiques} deadline{data.stats.critiques > 1 ? "s" : ""} critique{data.stats.critiques > 1 ? "s" : ""}
            </div>
          )}
          {data.stats.surcharges > 0 && (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-sm text-orange-700">
              <AlertTriangle className="h-4 w-4" />
              {data.stats.surcharges} surcharge{data.stats.surcharges > 1 ? "s" : ""} consultant
            </div>
          )}
          {data.stats.capaciteDisponible > 0 && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              {data.stats.capaciteDisponible}j disponibles équipe
            </div>
          )}
        </div>
      )}

      {/* Contenu principal */}
      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="card py-20 text-center text-[var(--color-muted-foreground)]">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
              Chargement...
            </div>
          ) : vue === "mois" ? (
            <MonthView
              currentDate={currentDate}
              data={data}
              weekDayLabels={WEEK_DAY_LABELS}
              onSelectEtape={setSelectedEtape}
              onContextMenu={handleContextMenu}
            />
          ) : vue === "gantt" ? (
            <GanttView
              currentDate={currentDate}
              data={data}
              onSelectEtape={setSelectedEtape}
              onContextMenu={handleContextMenu}
              onEtapeDatesChange={handleEtapeDatesChange}
            />
          ) : (
            <ChargeEquipeView
              currentDate={currentDate}
              data={data}
              onSelectEtape={setSelectedEtape}
              onContextMenu={handleContextMenu}
            />
          )}
        </div>

        {selectedEtape ? (
          <EtapeSidebar
            etape={selectedEtape}
            onClose={() => setSelectedEtape(null)}
            onChangerStatut={(s) => changerStatut(selectedEtape, s)}
            onReporterDeadline={(d) => setShowConfirmReport({ etape: selectedEtape, newDeadline: d })}
            onSupprimer={() => supprimerEtape(selectedEtape)}
            onNavigate={(id) => router.push(`/projets/${id}`)}
          />
        ) : showWeekPanel ? (
          <WeekSidePanel
            data={data}
            currentDate={currentDate}
            onSelectEtape={setSelectedEtape}
          />
        ) : null}
      </div>

      {/* Légende */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-[var(--color-muted-foreground)] px-1 py-2 border-t border-[var(--color-border-muted)]">
        <span className="font-medium text-[var(--color-foreground)] text-[13px]">Consultants :</span>
        {(data?.consultants ?? []).map((c) => (
          <span key={c.id} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: c.couleur }} />
            {c.nom}
          </span>
        ))}
        <span className="text-[var(--color-border)]" aria-hidden="true">|</span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full shrink-0 bg-[var(--color-success)]" aria-hidden="true" />
          On track
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full shrink-0 bg-[var(--color-warning)]" aria-hidden="true" />
          Attention
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full shrink-0 bg-[var(--color-destructive)]" aria-hidden="true" />
          Dérive
        </span>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          etape={contextMenu.etape}
          onClose={() => setContextMenu(null)}
          onOpenDetail={() => {
            setSelectedEtape(contextMenu.etape);
            setContextMenu(null);
          }}
          onChangerStatut={(s) => changerStatut(contextMenu.etape, s)}
          onNavigate={(id) => router.push(`/projets/${id}`)}
          onSupprimer={() => supprimerEtape(contextMenu.etape)}
        />
      )}

      {/* Modal confirmation report */}
      {showConfirmReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowConfirmReport(null)} />
          <div className="relative bg-background rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 z-50">
            <h3 className="text-lg font-semibold mb-2">Reporter la deadline</h3>
            <p className="text-sm text-muted-foreground mb-1">
              Étape : <strong>{showConfirmReport.etape.nom}</strong>
            </p>
            <p className="text-sm text-muted-foreground mb-1">
              Deadline actuelle :{" "}
              <strong>
                {showConfirmReport.etape.deadline
                  ? format(parseISO(showConfirmReport.etape.deadline), "d MMM yyyy", { locale: fr })
                  : "—"}
              </strong>
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Nouvelle deadline :{" "}
              <strong>
                {format(parseISO(showConfirmReport.newDeadline), "d MMM yyyy", { locale: fr })}
              </strong>
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowConfirmReport(null)}>
                Annuler
              </Button>
              <Button onClick={() => reporterDeadline(showConfirmReport.etape, showConfirmReport.newDeadline)}>
                Confirmer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
