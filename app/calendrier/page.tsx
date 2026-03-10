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
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  GanttChart,
  Users,
  PanelRight,
  Plus,
  Clock,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import type { CalData, EtapeInfo, Filtres, VueType } from "@/components/calendrier/types";
import { buildParams } from "@/components/calendrier/types";
import { MonthView } from "@/components/calendrier/month-view";
import { GanttView } from "@/components/calendrier/gantt-view";
import { ChargeEquipeView } from "@/components/calendrier/charge-equipe-view";
import { EtapeSidebar } from "@/components/calendrier/etape-sidebar";
import { ContextMenu } from "@/components/calendrier/context-menu";

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

const VUE_LABELS: Record<VueType, string> = {
  mois: "Mois",
  gantt: "Timeline",
  charge: "Équipe",
};

const VUE_ICONS: Record<VueType, React.ReactNode> = {
  mois: <LayoutGrid className="h-3.5 w-3.5" />,
  gantt: <GanttChart className="h-3.5 w-3.5" />,
  charge: <Users className="h-3.5 w-3.5" />,
};

export default function CalendrierPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [vue, setVue] = useState<VueType>("mois");
  const [data, setData] = useState<CalData | null>(null);
  const [loading, setLoading] = useState(true);

  // Simplified 3-filter state
  const [filtreProjetId, setFiltreProjetId] = useState("");
  const [filtreConsultantId, setFiltreConsultantId] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("");

  const [selectedEtape, setSelectedEtape] = useState<EtapeInfo | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showLogHeures, setShowLogHeures] = useState(false);
  const [showNouvelleEtape, setShowNouvelleEtape] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; etape: EtapeInfo } | null>(null);
  const [showConfirmReport, setShowConfirmReport] = useState<{ etape: EtapeInfo; newDeadline: string } | null>(null);

  // Hydration guard + persistence
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
    try {
      const savedVue = localStorage.getItem("calendrier-vue-active") as VueType | null;
      if (savedVue) setVue(savedVue);
      const savedProjet = localStorage.getItem("calendrier-filtreProjet");
      if (savedProjet) setFiltreProjetId(savedProjet);
      const savedConsultant = localStorage.getItem("calendrier-filtreConsultant");
      if (savedConsultant) setFiltreConsultantId(savedConsultant);
      const savedStatut = localStorage.getItem("calendrier-filtreStatut");
      if (savedStatut) setFiltreStatut(savedStatut);
    } catch {}
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("calendrier-vue-active", vue);
  }, [vue, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("calendrier-filtreProjet", filtreProjetId);
    localStorage.setItem("calendrier-filtreConsultant", filtreConsultantId);
    localStorage.setItem("calendrier-filtreStatut", filtreStatut);
  }, [filtreProjetId, filtreConsultantId, filtreStatut, hydrated]);

  useEffect(() => {
    function handleClick() { setContextMenu(null); }
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  // Compute Filtres object from simplified state
  const filtres: Filtres = {
    projetIds: filtreProjetId ? [parseInt(filtreProjetId)] : [],
    consultantIds: filtreConsultantId ? [parseInt(filtreConsultantId)] : [],
    statuts: filtreStatut ? [filtreStatut] : ["A_FAIRE", "EN_COURS", "VALIDEE"],
    urgences: [],
    masquerPassees: false,
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getDateRange, filtreProjetId, filtreConsultantId, filtreStatut]);

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
  function goToday() { setCurrentDate(new Date()); }

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

  async function handleEtapeDatesChange(etapeId: number, dateDebut: string | null, deadline: string | null) {
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

  function handleSelectEtape(etape: EtapeInfo) {
    setSelectedEtape(etape);
    setShowDetailPanel(true);
  }

  function getHeaderTitle() {
    if (vue === "charge") {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(weekStart, "d", { locale: fr })} – ${format(weekEnd, "d MMM yyyy", { locale: fr })}`;
    }
    return format(currentDate, "MMMM yyyy", { locale: fr });
  }

  return (
    <div className="p-6 space-y-4">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Left: view tabs */}
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
              {VUE_ICONS[v]}
              <span className="hidden sm:inline">{VUE_LABELS[v]}</span>
            </button>
          ))}
        </div>

        {/* Centre: navigation */}
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={navigatePrev} className="h-8 w-8" aria-label="Période précédente">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[160px] text-center capitalize">
            {getHeaderTitle()}
          </span>
          <Button variant="outline" size="icon" onClick={navigateNext} className="h-8 w-8" aria-label="Période suivante">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Button variant="outline" size="sm" onClick={goToday} className="text-xs">
          Aujourd&apos;hui
        </Button>

        {/* Right: Détail + Nouvelle étape */}
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant={showDetailPanel ? "default" : "outline"}
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setShowDetailPanel((v) => !v)}
          >
            <PanelRight className="h-3.5 w-3.5" />Détail
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowLogHeures(true)}>
            <Clock className="h-3.5 w-3.5" />Logger des heures
          </Button>
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowNouvelleEtape(true)}>
            <Plus className="h-3.5 w-3.5" />Nouvelle étape
          </Button>
        </div>
      </div>

      {/* ── Filter bar ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filtreProjetId}
          onChange={(e) => setFiltreProjetId(e.target.value)}
          className="h-8 px-2 text-xs rounded-md border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label="Filtrer par projet"
        >
          <option value="">Tous les projets</option>
          {(data?.projets ?? []).map((p) => (
            <option key={p.id} value={p.id}>{p.nom}</option>
          ))}
        </select>

        <select
          value={filtreConsultantId}
          onChange={(e) => setFiltreConsultantId(e.target.value)}
          className="h-8 px-2 text-xs rounded-md border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label="Filtrer par consultant"
        >
          <option value="">Tous les consultants</option>
          {(data?.consultants ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.nom}</option>
          ))}
        </select>

        <select
          value={filtreStatut}
          onChange={(e) => setFiltreStatut(e.target.value)}
          className="h-8 px-2 text-xs rounded-md border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label="Filtrer par statut"
        >
          <option value="">Tous les statuts</option>
          <option value="A_FAIRE">À faire</option>
          <option value="EN_COURS">En cours</option>
          <option value="VALIDEE">Validée</option>
        </select>

        {/* Légende */}
        <div className="flex items-center gap-3 ml-auto text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />Réalisé
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-4 rounded-sm bg-primary/40" />Planifié
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-destructive" />Deadline
          </span>
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────────── */}
      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mb-3" />
              Chargement...
            </div>
          ) : vue === "mois" ? (
            <MonthView
              currentDate={currentDate}
              data={data}
              onSelectEtape={handleSelectEtape}
              onContextMenu={handleContextMenu}
            />
          ) : vue === "gantt" ? (
            <GanttView
              currentDate={currentDate}
              data={data}
              onSelectEtape={handleSelectEtape}
              onContextMenu={handleContextMenu}
              onEtapeDatesChange={handleEtapeDatesChange}
            />
          ) : (
            <ChargeEquipeView
              currentDate={currentDate}
              data={data}
              onSelectEtape={handleSelectEtape}
              onContextMenu={handleContextMenu}
            />
          )}
        </div>

        {/* Détail panel */}
        {showDetailPanel && (
          <EtapeSidebar
            etape={selectedEtape}
            onClose={() => { setShowDetailPanel(false); setSelectedEtape(null); }}
            onChangerStatut={(s) => selectedEtape && changerStatut(selectedEtape, s)}
            onReporterDeadline={(d) => selectedEtape && setShowConfirmReport({ etape: selectedEtape, newDeadline: d })}
            onSupprimer={() => selectedEtape && supprimerEtape(selectedEtape)}
            onNavigate={(id) => router.push(`/projets/${id}`)}
          />
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          etape={contextMenu.etape}
          onClose={() => setContextMenu(null)}
          onOpenDetail={() => { setSelectedEtape(contextMenu.etape); setShowDetailPanel(true); setContextMenu(null); }}
          onChangerStatut={(s) => changerStatut(contextMenu.etape, s)}
          onNavigate={(id) => router.push(`/projets/${id}`)}
          onSupprimer={() => supprimerEtape(contextMenu.etape)}
        />
      )}

      {/* Modal confirmation report deadline */}
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
              <Button variant="outline" onClick={() => setShowConfirmReport(null)}>Annuler</Button>
              <Button onClick={() => reporterDeadline(showConfirmReport.etape, showConfirmReport.newDeadline)}>
                Confirmer
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* ── Dialog Logger des heures ── */}
      {showLogHeures && (
        <LoggerHeuresDialog
          onClose={() => setShowLogHeures(false)}
          onSuccess={() => { setShowLogHeures(false); refresh(); }}
          defaultDate={format(currentDate, "yyyy-MM-dd")}
        />
      )}

      {/* ── Dialog Nouvelle étape ── */}
      {showNouvelleEtape && (
        <NouvelleEtapeDialog
          onClose={() => setShowNouvelleEtape(false)}
          onSuccess={() => { setShowNouvelleEtape(false); refresh(); }}
          defaultDate={format(currentDate, "yyyy-MM-dd")}
        />
      )}
    </div>
  );
}

// ── Self-contained dialog : Logger des heures ──────────────────────────────
function LoggerHeuresDialog({ onClose, onSuccess, defaultDate }: {
  onClose: () => void;
  onSuccess: () => void;
  defaultDate: string;
}) {
  const [consultants, setConsultants] = useState<{ id: number; nom: string }[]>([]);
  const [projets, setProjets] = useState<{ id: number; nom: string }[]>([]);
  const [etapes, setEtapes] = useState<{ id: number; nom: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: defaultDate,
    consultantId: "",
    projetId: "",
    etapeId: "",
    heures: "",
    description: "",
    facturable: true,
  });

  useEffect(() => {
    const ac = new AbortController();
    Promise.all([
      fetch("/api/consultants", { signal: ac.signal }).then((r) => r.json()),
      fetch("/api/projets", { signal: ac.signal }).then((r) => r.json()),
    ]).then(([c, p]) => {
      setConsultants(Array.isArray(c) ? c : []);
      setProjets(Array.isArray(p) ? p : []);
    }).catch(() => {});
    return () => ac.abort();
  }, []);

  useEffect(() => {
    if (!form.projetId) { setEtapes([]); return; }
    const ac = new AbortController();
    fetch(`/api/etapes?projetId=${form.projetId}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((d) => setEtapes(d.etapes ?? []))
      .catch(() => {});
    return () => ac.abort();
  }, [form.projetId]);

  async function handleSave() {
    if (!form.consultantId || !form.projetId || !form.heures) {
      toast.error("Consultant, projet et heures sont requis");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/activites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: form.date,
          consultantId: parseInt(form.consultantId),
          projetId: parseInt(form.projetId),
          etapeId: form.etapeId ? parseInt(form.etapeId) : null,
          heures: parseFloat(form.heures),
          description: form.description || null,
          facturable: form.facturable,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Activité enregistrée");
      onSuccess();
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md" onClose={onClose}>
        <DialogHeader>
          <DialogTitle>Logger des heures</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Heures</Label>
              <Input type="number" min={0.5} step={0.5} placeholder="ex: 4" value={form.heures}
                onChange={(e) => setForm((f) => ({ ...f, heures: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Consultant</Label>
            <select className="w-full h-9 px-2 text-sm rounded-md border border-border bg-background"
              value={form.consultantId} onChange={(e) => setForm((f) => ({ ...f, consultantId: e.target.value }))}>
              <option value="">Sélectionner...</option>
              {consultants.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Projet</Label>
            <select className="w-full h-9 px-2 text-sm rounded-md border border-border bg-background"
              value={form.projetId} onChange={(e) => setForm((f) => ({ ...f, projetId: e.target.value, etapeId: "" }))}>
              <option value="">Sélectionner...</option>
              {projets.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
            </select>
          </div>
          {etapes.length > 0 && (
            <div className="space-y-1">
              <Label>Étape (optionnel)</Label>
              <select className="w-full h-9 px-2 text-sm rounded-md border border-border bg-background"
                value={form.etapeId} onChange={(e) => setForm((f) => ({ ...f, etapeId: e.target.value }))}>
                <option value="">Aucune</option>
                {etapes.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
              </select>
            </div>
          )}
          <div className="space-y-1">
            <Label>Description (optionnel)</Label>
            <Input placeholder="Ex: Réunion client..." value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.facturable}
              onChange={(e) => setForm((f) => ({ ...f, facturable: e.target.checked }))} />
            Facturable
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "..." : "Enregistrer"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Self-contained dialog : Nouvelle étape ─────────────────────────────────
function NouvelleEtapeDialog({ onClose, onSuccess, defaultDate }: {
  onClose: () => void;
  onSuccess: () => void;
  defaultDate: string;
}) {
  const [projets, setProjets] = useState<{ id: number; nom: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    projetId: "",
    nom: "",
    dateDebut: defaultDate,
    deadline: "",
    statut: "A_FAIRE",
    chargeEstimee: "",
  });

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/projets", { signal: ac.signal }).then((r) => r.json())
      .then((d) => setProjets(Array.isArray(d) ? d : []))
      .catch(() => {});
    return () => ac.abort();
  }, []);

  async function handleSave() {
    if (!form.projetId || !form.nom) {
      toast.error("Projet et nom sont requis");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/etapes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projetId: parseInt(form.projetId),
          nom: form.nom,
          dateDebut: form.dateDebut || null,
          deadline: form.deadline || null,
          statut: form.statut,
          chargeEstimee: form.chargeEstimee ? parseFloat(form.chargeEstimee) : null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Étape créée");
      onSuccess();
    } catch {
      toast.error("Erreur lors de la création");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md" onClose={onClose}>
        <DialogHeader>
          <DialogTitle>Nouvelle étape</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="space-y-1">
            <Label>Projet *</Label>
            <select className="w-full h-9 px-2 text-sm rounded-md border border-border bg-background"
              value={form.projetId} onChange={(e) => setForm((f) => ({ ...f, projetId: e.target.value }))}>
              <option value="">Sélectionner...</option>
              {projets.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Nom de l&apos;étape *</Label>
            <Input placeholder="Ex: Développement frontend" value={form.nom}
              onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Date début</Label>
              <Input type="date" value={form.dateDebut}
                onChange={(e) => setForm((f) => ({ ...f, dateDebut: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Deadline</Label>
              <Input type="date" value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Statut</Label>
              <select className="w-full h-9 px-2 text-sm rounded-md border border-border bg-background"
                value={form.statut} onChange={(e) => setForm((f) => ({ ...f, statut: e.target.value }))}>
                <option value="A_FAIRE">À faire</option>
                <option value="EN_COURS">En cours</option>
                <option value="VALIDEE">Validée</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Charge estimée (j)</Label>
              <Input type="number" min={0} step={0.5} placeholder="ex: 5" value={form.chargeEstimee}
                onChange={(e) => setForm((f) => ({ ...f, chargeEstimee: e.target.value }))} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "..." : "Créer l'étape"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
