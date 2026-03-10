"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FolderOpen,
  Eye,
  Calendar,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  X,
  Download,
  Plus,
  RefreshCw,
  Activity,
  DollarSign,
  BarChart3,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ProjetForm, type ProjetData } from "@/components/projet-form";

interface ProjetListItem {
  id: number;
  nom: string;
  client: string;
  budget: string | number;
  dateDebut: string | null;
  dateFin: string | null;
  statut: "PLANIFIE" | "EN_COURS" | "EN_PAUSE" | "TERMINE";
  couleur?: string;
  etapesTotal: number;
  etapesValidees: number;
  budgetConsomme: number;
  coutReel: number;
  marge: number;
  pctBudget: number;
  prochaineDeadline: string | null;
  alertes: string[];
  // Progression metrics
  progressionBudgetPct?: number;
  progressionRealisationPct?: number;
  progressionEcart?: number;
  progressionHealth?: "bon" | "normal" | "critique";
  progressionHealthLabel?: string;
  progressionDateFinEstimee?: string | null;
}


const STATUTS = [
  { value: "TOUS", label: "Tous" },
  { value: "EN_COURS", label: "En cours" },
  { value: "PLANIFIE", label: "Planifiés" },
  { value: "TERMINE", label: "Terminés" },
] as const;

type SortKey = "nom" | "dateDebut" | "deadline" | "budget" | "pctBudget" | "marge";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "nom", label: "Nom (A-Z)" },
  { value: "dateDebut", label: "Date début (récent)" },
  { value: "deadline", label: "Prochaine deadline" },
  { value: "budget", label: "Budget (décroissant)" },
  { value: "pctBudget", label: "% Budget utilisé" },
  { value: "marge", label: "Marge (décroissant)" },
];

function statutBadge(statut: string) {
  switch (statut) {
    case "PLANIFIE":
      return { variant: "default" as const, label: "Planifié" };
    case "EN_COURS":
      return { variant: "success" as const, label: "En cours" };
    case "EN_PAUSE":
      return { variant: "warning" as const, label: "En pause" };
    case "TERMINE":
      return { variant: "secondary" as const, label: "Terminé" };
    default:
      return { variant: "outline" as const, label: statut };
  }
}

function budgetColor(pct: number) {
  if (pct > 100) return "bg-destructive";
  if (pct >= 80) return "bg-amber-500";
  return "bg-emerald-500";
}

const STORAGE_KEY = "projets-filters";

interface SavedFilters {
  sortKey: SortKey;
  sortAsc: boolean;
}

function exportCsvProjets(projets: ProjetListItem[]) {
  const rows = [
    ["Nom", "Client", "Statut", "Budget (EUR)", "Progression (%)"],
    ...projets.map((p) => [
      p.nom ?? "",
      p.client ?? "",
      p.statut ?? "",
      String(Number(p.budget ?? 0)),
      String(p.pctBudget ?? 0),
    ]),
  ];
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `projets-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ProjetsPage() {
  const router = useRouter();
  const [projets, setProjets] = useState<ProjetListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState("TOUS");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProjet, setEditingProjet] = useState<ProjetData | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  // Search
  const [search, setSearch] = useState("");

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>("nom");
  const [sortAsc, setSortAsc] = useState(true);

  // KPI data for projects
  interface ProjetKpi {
    projetId: number;
    roi: number;
    burnRate: number;
    velocite: number;
  }
  const [projetKpis, setProjetKpis] = useState<Map<number, ProjetKpi>>(new Map());

  useEffect(() => {
    const now = new Date();
    const kpiParams = new URLSearchParams({
      dateDebut: format(startOfMonth(now), "yyyy-MM-dd"),
      dateFin: format(endOfMonth(now), "yyyy-MM-dd"),
    });
    fetch(`/api/kpis?${kpiParams}`)
      .then((r) => r.json())
      .then((data) => {
        const map = new Map<number, ProjetKpi>();
        for (const r of (data.roiParProjet ?? [])) {
          map.set(r.projetId, { projetId: r.projetId, roi: r.roi, burnRate: 0, velocite: 0 });
        }
        for (const b of (data.burnRates ?? [])) {
          const existing = map.get(b.projetId);
          if (existing) {
            existing.burnRate = b.burnRate;
          } else {
            map.set(b.projetId, { projetId: b.projetId, roi: 0, burnRate: b.burnRate, velocite: 0 });
          }
        }
        for (const v of (data.velociteParProjet ?? [])) {
          const existing = map.get(v.projetId);
          if (existing) {
            existing.velocite = v.velocite;
          } else {
            map.set(v.projetId, { projetId: v.projetId, roi: 0, burnRate: 0, velocite: v.velocite });
          }
        }
        setProjetKpis(map);
      })
      .catch(() => {});
  }, []);

  // Load saved filters
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: SavedFilters = JSON.parse(saved);
        if (parsed.sortKey) setSortKey(parsed.sortKey);
        if (typeof parsed.sortAsc === "boolean") setSortAsc(parsed.sortAsc);
      }
    } catch { /* ignore */ }
  }, []);

  // Save filters
  useEffect(() => {
    const toSave: SavedFilters = { sortKey, sortAsc };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [sortKey, sortAsc]);

  const fetchProjets = useCallback(async () => {
    try {
      const qs = filtre !== "TOUS" ? `?statut=${filtre}` : "";
      const res = await fetch(`/api/projets${qs}`);
      const data = await res.json();
      setProjets(data);
    } catch {
      toast.error("Erreur lors du chargement des projets");
    } finally {
      setLoading(false);
    }
  }, [filtre]);

  useEffect(() => {
    setLoading(true);
    fetchProjets();
  }, [fetchProjets]);

  // Filtered + sorted projets
  const filteredProjets = useMemo(() => {
    let result = [...projets];

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.nom.toLowerCase().includes(q) ||
          p.client.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "nom":
          cmp = a.nom.localeCompare(b.nom, "fr");
          break;
        case "dateDebut":
          cmp = (a.dateDebut ?? "").localeCompare(b.dateDebut ?? "");
          if (!sortAsc) cmp = -cmp; // default descending for date
          return cmp;
        case "deadline":
          // null deadlines go last
          if (!a.prochaineDeadline && !b.prochaineDeadline) cmp = 0;
          else if (!a.prochaineDeadline) cmp = 1;
          else if (!b.prochaineDeadline) cmp = -1;
          else cmp = a.prochaineDeadline.localeCompare(b.prochaineDeadline);
          break;
        case "budget":
          cmp = Number(b.budget) - Number(a.budget);
          break;
        case "pctBudget":
          cmp = b.pctBudget - a.pctBudget;
          break;
        case "marge":
          cmp = b.marge - a.marge;
          break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [projets, search, sortKey, sortAsc]);

  function handleAdd() {
    setEditingProjet(null);
    setDialogOpen(true);
  }

  function handleEdit(p: ProjetListItem) {
    setEditingProjet({
      id: p.id,
      nom: p.nom,
      client: p.client,
      budget: Number(p.budget),
      chargeEstimeeTotale: null,
      dateDebut: p.dateDebut ?? "",
      dateFin: p.dateFin ?? "",
      statut: p.statut,
    });
    setDialogOpen(true);
  }

  function handleSuccess() {
    toast.success(
      editingProjet ? "Projet modifié avec succès !" : "Projet créé avec succès !"
    );
    fetchProjets();
    router.refresh();
  }

  function toggleSortOrder() {
    setSortAsc((v) => !v);
  }

  function openDetail(id: number) {
    setSelectedProjectId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="flex h-full overflow-hidden">
    <div className={cn(
      "flex-1 overflow-y-auto p-6 md:p-8 max-w-7xl mx-auto space-y-5 transition-all",
      selectedProjectId ? "xl:max-w-none" : ""
    )}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportCsvProjets(projets)}>
            <Download className="h-4 w-4 mr-1.5" />Exporter
          </Button>
          <Button size="sm" onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1.5" />Nouveau projet
          </Button>
        </div>
      </div>

      {/* Filtres statut */}
      <div className="flex flex-wrap gap-2">
        {STATUTS.map((s) => (
          <Button
            key={s.value}
            variant={filtre === s.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFiltre(s.value)}
          >
            {s.label}
          </Button>
        ))}
      </div>

      {/* Search + Sort + Advanced toggle */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher projet ou client..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <Select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="w-auto min-w-[180px]"
                aria-label="Trier les projets"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={toggleSortOrder}
                title={sortAsc ? "Ordre croissant" : "Ordre décroissant"}
              >
                {sortAsc ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {filteredProjets.length} projet{filteredProjets.length > 1 ? "s" : ""} trouvé{filteredProjets.length > 1 ? "s" : ""}
              {search && ` pour "${search}"`}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Grille de cartes */}
      {loading ? (
        <p className="text-center py-12 text-muted-foreground">Chargement...</p>
      ) : filteredProjets.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">
          {projets.length === 0
            ? "Aucun projet trouvé. Créez-en un pour commencer !"
            : "Aucun projet ne correspond aux filtres"}
        </p>
      ) : (
        <div className={cn(
          "grid gap-4",
          selectedProjectId
            ? "grid-cols-1 md:grid-cols-2"
            : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
        )}>
          {filteredProjets.map((p) => {
            const budgetNum = Number(p.budget);
            const budgetPct = p.progressionBudgetPct ?? p.pctBudget;
            const realisePct = p.progressionRealisationPct ?? 0;
            const ecart = p.progressionEcart ?? 0;
            const projColor = p.couleur ?? "#3b82f6";
            const budgetBarColor = budgetPct > 100 ? "#b91c1c" : budgetPct > 85 ? "#f97316" : "#2563EB";
            const margePct = ecart;
            const margeBadgeClass = margePct >= 20
              ? "bg-destructive/10 text-destructive"
              : margePct >= 10
              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-500"
              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-500";
            const isSelected = selectedProjectId === p.id;

            return (
              <div
                key={p.id}
                onClick={() => router.push(`/projets/${p.id}`)}
                className={cn(
                  "relative rounded-xl border overflow-hidden cursor-pointer",
                  "transition-all hover:-translate-y-0.5 hover:shadow-md",
                  isSelected
                    ? "border-primary ring-2 ring-primary/20 shadow-sm"
                    : "border-border bg-card"
                )}
              >
                {/* Top accent bar */}
                <div className="h-[3px] w-full" style={{ background: projColor }} />

                {/* Tinted header */}
                <div className="px-4 pt-3 pb-2.5" style={{ background: `${projColor}12` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ background: projColor }} />
                      <span className="text-[10.5px] font-semibold" style={{ color: projColor }}>
                        {p.statut === "EN_COURS" ? "En cours" : p.statut === "PLANIFIE" ? "Planifié" : p.statut === "EN_PAUSE" ? "En pause" : "Terminé"}
                      </span>
                    </div>
                    <span className={cn("text-[11.5px] font-semibold px-2 py-0.5 rounded-md", margeBadgeClass)}>
                      Marge {ecart > 0 ? `-${ecart.toFixed(1)}` : `+${Math.abs(ecart).toFixed(1)}`}%
                    </span>
                  </div>
                </div>

                {/* Card body */}
                <div className="px-4 pt-2.5 pb-3.5">
                  <div className="flex items-start justify-between mb-1">
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-bold text-foreground truncate">{p.nom}</div>
                      <div className="text-[12px] text-muted-foreground mt-0.5">{p.client}</div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); openDetail(p.id); }}
                      className="shrink-0 ml-2 mt-0.5 text-muted-foreground hover:text-primary transition-colors"
                      title="Aperçu rapide"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground mb-3">
                    <Calendar className="h-3 w-3" />
                    {p.dateDebut ? format(new Date(p.dateDebut), "dd/MM/yy", { locale: fr }) : "—"}
                    {" → "}
                    {p.dateFin ? format(new Date(p.dateFin), "dd/MM/yy", { locale: fr }) : "—"}
                  </div>

                  {/* Budget bar */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11px] text-muted-foreground w-12 shrink-0">Budget</span>
                    <div className="flex-1 h-[7px] rounded-full bg-border overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(budgetPct, 100)}%`, background: budgetBarColor }} />
                    </div>
                    <span className="text-[11.5px] font-bold w-9 text-right" style={{ color: budgetBarColor }}>{budgetPct.toFixed(1)}%</span>
                  </div>

                  {/* Réalisé bar */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[11px] text-muted-foreground w-12 shrink-0">Réalisé</span>
                    <div className="flex-1 h-[7px] rounded-full bg-border overflow-hidden">
                      <div className="h-full rounded-full bg-[#10b981]" style={{ width: `${realisePct}%` }} />
                    </div>
                    <span className="text-[11.5px] font-bold text-muted-foreground w-9 text-right">{realisePct.toFixed(1)}%</span>
                  </div>

                  <div className="text-[11.5px] text-muted-foreground">
                    {p.budgetConsomme.toLocaleString("fr-FR")}€ / {budgetNum.toLocaleString("fr-FR")}€
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <ProjetForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projet={editingProjet}
        onSuccess={handleSuccess}
        onError={(msg) => toast.error(msg)}
      />
    </div>

    {selectedProjectId && (
      <ProjectDetailPane
        projectId={selectedProjectId}
        onClose={() => setSelectedProjectId(null)}
      />
    )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Project Detail Pane — slide-in from right, 4 tabs
// ══════════════════════════════════════════════════════════════════════

type DetailTab = "kanban" | "financier" | "activites" | "documents";

interface DetailData {
  projet: {
    id: number; nom: string; client: string; statut: string; couleur?: string;
    budget: string | number; dateDebut: string | null; dateFin: string | null;
    description?: string;
  };
  etapes: {
    id: number; nom: string; statut: string; deadline: string | null;
    chargeEstimee: number | null; heuresRealisees?: number;
  }[];
  activites: {
    id: number; date: string; heures: number; description?: string;
    facturable?: boolean;
    consultant: { id: number; nom: string; couleur: string };
    etape: { id: number; nom: string } | null;
  }[];
  progression?: {
    budgetConsommePct: number; realisationPct: number; ecart: number;
    chargeEstimeeTotale: number; chargeEcouleeHeures: number;
  };
}

function ProjectDetailPane({ projectId, onClose }: { projectId: number; onClose: () => void }) {
  const [tab, setTab] = useState<DetailTab>("kanban");
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSaisie, setShowSaisie] = useState(false);

  useEffect(() => {
    setLoading(true);
    setData(null);
    Promise.all([
      fetch(`/api/projets/${projectId}`).then((r) => r.json()),
      fetch(`/api/projets/${projectId}/progression`).then((r) => r.json()).catch(() => null),
    ])
      .then(([proj, progression]) => {
        setData({
          projet: {
            id: proj.id, nom: proj.nom, client: proj.client, statut: proj.statut,
            couleur: proj.couleur, budget: proj.budget,
            dateDebut: proj.dateDebut, dateFin: proj.dateFin,
            description: proj.description,
          },
          etapes: (proj.etapes ?? []).map((e: Record<string, unknown>) => ({
            id: e.id, nom: e.nom, statut: e.statut, deadline: e.deadline,
            chargeEstimee: e.chargeEstimee,
            heuresRealisees: (proj.activites ?? [])
              .filter((a: Record<string, unknown>) => a.etapeId === e.id)
              .reduce((s: number, a: Record<string, unknown>) => s + Number(a.heures), 0),
          })),
          activites: (proj.activites ?? []).map((a: Record<string, unknown>) => ({
            id: a.id, date: a.date as string, heures: Number(a.heures),
            description: a.description as string | undefined,
            facturable: a.facturable as boolean | undefined,
            consultant: a.consultant as { id: number; nom: string; couleur: string },
            etape: a.etape as { id: number; nom: string } | null,
          })),
          progression: progression ?? undefined,
        });
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [projectId]);

  const projColor = data?.projet.couleur ?? "#3b82f6";
  const budgetNum = data ? Number(data.projet.budget) : 0;
  const budgetPct = data?.progression?.budgetConsommePct ?? 0;
  const realisePct = data?.progression?.realisationPct ?? 0;
  const ecart = data?.progression?.ecart ?? 0;
  const budgetBarColor = budgetPct > 100 ? "#b91c1c" : budgetPct > 85 ? "#f97316" : "#2563EB";

  const TABS: { value: DetailTab; label: string }[] = [
    { value: "kanban",     label: "Kanban" },
    { value: "financier",  label: "Financier" },
    { value: "activites",  label: "Activités" },
    { value: "documents",  label: "Documents" },
  ];

  return (
    <div className="w-[520px] min-w-[520px] border-l border-border bg-card flex flex-col h-full overflow-hidden">
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !data ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Impossible de charger le projet
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="shrink-0 px-5 pt-4 pb-0 border-b border-border">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${projColor}20` }}>
                  <div className="w-3.5 h-3.5 rounded-sm" style={{ background: projColor }} />
                </div>
                <div>
                  <div className="text-[16px] font-extrabold text-foreground leading-tight">{data.projet.nom}</div>
                  <div className="text-[12px] text-muted-foreground mt-0.5">
                    {data.projet.client}
                    {data.projet.dateDebut && data.projet.dateFin && (
                      <span className="ml-2">
                        · {format(new Date(data.projet.dateDebut), "dd/MM/yy", { locale: fr })} → {format(new Date(data.projet.dateFin), "dd/MM/yy", { locale: fr })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex -mb-px">
              {TABS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setTab(value)}
                  className={cn(
                    "px-4 py-2 text-[13px] font-medium border-b-2 transition-all",
                    tab === value
                      ? "border-primary text-primary font-semibold"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Saisie activité dialog */}
          {showSaisie && (
            <SaisieActiviteDialog
              projectId={data.projet.id}
              projectName={data.projet.nom}
              etapes={data.etapes}
              onClose={() => setShowSaisie(false)}
              onSaved={() => {
                setShowSaisie(false);
                // Reload activites by re-fetching project data
                setLoading(true);
                setData(null);
                Promise.all([
                  fetch(`/api/projets/${projectId}`).then((r) => r.json()),
                  fetch(`/api/projets/${projectId}/progression`).then((r) => r.json()).catch(() => null),
                ])
                  .then(([proj, progression]) => {
                    setData({
                      projet: {
                        id: proj.id, nom: proj.nom, client: proj.client, statut: proj.statut,
                        couleur: proj.couleur, budget: proj.budget,
                        dateDebut: proj.dateDebut, dateFin: proj.dateFin,
                        description: proj.description,
                      },
                      etapes: (proj.etapes ?? []).map((e: Record<string, unknown>) => ({
                        id: e.id, nom: e.nom, statut: e.statut, deadline: e.deadline,
                        chargeEstimee: e.chargeEstimee,
                        heuresRealisees: (proj.activites ?? [])
                          .filter((a: Record<string, unknown>) => a.etapeId === e.id)
                          .reduce((s: number, a: Record<string, unknown>) => s + Number(a.heures), 0),
                      })),
                      activites: (proj.activites ?? []).map((a: Record<string, unknown>) => ({
                        id: a.id, date: a.date as string, heures: Number(a.heures),
                        description: a.description as string | undefined,
                        facturable: a.facturable as boolean | undefined,
                        consultant: a.consultant as { id: number; nom: string; couleur: string },
                        etape: a.etape as { id: number; nom: string } | null,
                      })),
                      progression: progression ?? undefined,
                    });
                  })
                  .catch(() => { setData(null); setLoading(false); })
                  .finally(() => setLoading(false));
              }}
            />
          )}

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">

            {/* ── Documents ── */}
            {tab === "documents" && (
              <DocumentsTab projectId={data.projet.id} />
            )}

            {/* ── Kanban ── */}
            {tab === "kanban" && (
              <div className="p-4 flex gap-3 h-full">
                {(["A_FAIRE", "EN_COURS", "VALIDEE"] as const).map((statut) => {
                  const cols = { A_FAIRE: "À faire", EN_COURS: "En cours", VALIDEE: "Terminé" };
                  const colEtapes = data.etapes.filter((e) => e.statut === statut);
                  const colBg = { A_FAIRE: "bg-muted/50", EN_COURS: "bg-amber-50 dark:bg-amber-950/20", VALIDEE: "bg-emerald-50 dark:bg-emerald-950/20" }[statut];
                  const countBg = { A_FAIRE: "bg-muted text-muted-foreground", EN_COURS: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500", VALIDEE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-500" }[statut];
                  return (
                    <div key={statut} className={cn("flex-1 rounded-xl p-3", colBg)}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11.5px] font-bold text-muted-foreground">{cols[statut]}</span>
                        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", countBg)}>{colEtapes.length}</span>
                      </div>
                      <div className="space-y-2">
                        {colEtapes.map((e) => (
                          <div key={e.id} className="bg-card border border-border rounded-lg p-2.5" style={{ borderLeft: `3px solid ${projColor}` }}>
                            <div className="text-[12.5px] font-semibold text-foreground mb-1">{e.nom}</div>
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>{e.heuresRealisees ?? 0}h / {e.chargeEstimee ?? 0}h</span>
                              {e.deadline && <span>{format(new Date(e.deadline), "d MMM", { locale: fr })}</span>}
                            </div>
                            {(e.chargeEstimee ?? 0) > 0 && (
                              <div className="mt-1.5 h-1 rounded-full bg-border overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${Math.min(Math.round((e.heuresRealisees ?? 0) / (e.chargeEstimee ?? 1) * 100), 100)}%`, background: projColor }} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Financier ── */}
            {tab === "financier" && (
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Budget total", value: `${budgetNum.toLocaleString("fr-FR")}€`, icon: DollarSign },
                    { label: "Consommé", value: `${(budgetNum * budgetPct / 100).toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€`, icon: BarChart3 },
                    { label: "Écart", value: `${ecart > 0 ? "-" : "+"}${Math.abs(ecart).toFixed(1)}%`, icon: Activity },
                    { label: "Restant", value: `${(100 - budgetPct).toFixed(1)}%`, icon: Eye },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="bg-muted/50 rounded-xl p-3.5">
                      <div className="text-[10px] text-muted-foreground mb-1">{label}</div>
                      <div className="text-[1.3rem] font-extrabold text-foreground">{value}</div>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Heures par étape</div>
                  {data.etapes.map((e) => {
                    const h = e.chargeEstimee ?? 0;
                    const hd = e.heuresRealisees ?? 0;
                    const pct = h > 0 ? Math.min(Math.round(hd / h * 100), 100) : 0;
                    return (
                      <div key={e.id} className="mb-2.5">
                        <div className="flex justify-between text-[12px] text-muted-foreground mb-1">
                          <span className="truncate">{e.nom}</span>
                          <span className="font-semibold shrink-0 ml-2">{hd}h / {h}h</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-border overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: projColor }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Activités ── */}
            {tab === "activites" && (
              <div className="p-5 flex flex-col gap-4">
                <button
                  onClick={() => setShowSaisie(true)}
                  className="flex items-center gap-2 self-start px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-semibold hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Saisir une activité
                </button>

                {data.activites.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Aucune activité saisie sur ce projet
                  </p>
                ) : (
                  <>
                    <div className="space-y-0 divide-y divide-border/50">
                      {data.activites.map((a) => (
                        <div key={a.id} className="flex items-center gap-2.5 py-2.5">
                          <div className="text-[11px] text-muted-foreground w-14 shrink-0">
                            {format(new Date(a.date), "dd/MM", { locale: fr })}
                          </div>
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                            style={{ background: a.consultant.couleur }}>
                            {a.consultant.nom.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                          </div>
                          <span className="flex-1 text-[12.5px] text-foreground truncate">
                            {a.description ?? a.etape?.nom ?? "—"}
                          </span>
                          {a.facturable === false && (
                            <span className="text-[10px] text-muted-foreground shrink-0">NF</span>
                          )}
                          <span className="text-[13px] font-bold text-foreground shrink-0">{Number(a.heures)}h</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-border text-[12.5px]">
                      <span className="text-muted-foreground">{data.activites.length} saisie{data.activites.length > 1 ? "s" : ""}</span>
                      <span className="font-bold text-foreground">
                        {data.activites.reduce((s, a) => s + Number(a.heures), 0)}h total
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Saisie Activité Dialog — lightweight inline form for ProjectDetailPane
// ══════════════════════════════════════════════════════════════════════

interface SaisieActiviteDialogProps {
  projectId: number;
  projectName: string;
  etapes: { id: number; nom: string; statut: string }[];
  onClose: () => void;
  onSaved: () => void;
}

function SaisieActiviteDialog({ projectId, projectName, etapes, onClose, onSaved }: SaisieActiviteDialogProps) {
  const [consultants, setConsultants] = useState<{ id: number; nom: string }[]>([]);
  const [form, setForm] = useState({
    consultantId: "",
    etapeId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    heures: "",
    description: "",
    facturable: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/consultants", { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => setConsultants(Array.isArray(d) ? d : []))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  async function handleSave() {
    if (!form.consultantId || !form.date || !form.heures) {
      toast.error("Consultant, date et heures sont requis");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/activites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultantId: parseInt(form.consultantId),
          projetId: projectId,
          etapeId: form.etapeId ? parseInt(form.etapeId) : null,
          date: form.date,
          heures: parseFloat(form.heures),
          description: form.description || null,
          facturable: form.facturable,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Activité enregistrée");
      onSaved();
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4 p-5 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[14px] font-bold text-foreground">Saisir une activité</div>
            <div className="text-[12px] text-muted-foreground mt-0.5">{projectName}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-[11px] font-medium text-muted-foreground">Consultant</label>
            <select
              value={form.consultantId}
              onChange={(e) => setForm((f) => ({ ...f, consultantId: e.target.value }))}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Choisir...</option>
              {consultants.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>

          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-[11px] font-medium text-muted-foreground">Étape (optionnel)</label>
            <select
              value={form.etapeId}
              onChange={(e) => setForm((f) => ({ ...f, etapeId: e.target.value }))}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Aucune étape spécifique</option>
              {etapes.map((et) => (
                <option key={et.id} value={et.id}>{et.nom}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-muted-foreground">Date</label>
            <input
              type="date"
              value={form.date}
              max={format(new Date(), "yyyy-MM-dd")}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-muted-foreground">Heures</label>
            <input
              type="number"
              step={0.5}
              min={0}
              max={24}
              placeholder="ex: 7.5"
              value={form.heures}
              onChange={(e) => setForm((f) => ({ ...f, heures: e.target.value }))}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-[11px] font-medium text-muted-foreground">Description</label>
            <input
              type="text"
              placeholder="ex: Développement features"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="dialog-facturable"
              checked={form.facturable}
              onChange={(e) => setForm((f) => ({ ...f, facturable: e.target.checked }))}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <label htmlFor="dialog-facturable" className="text-[12px] text-muted-foreground cursor-pointer select-none">
              Facturable
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[12.5px] font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Documents Tab
// ══════════════════════════════════════════════════════════════════════

interface DocumentItem {
  id: number;
  nom: string;
  type: string;
  taille?: number | null;
  createdAt: string;
  uploadedBy?: { nom: string } | null;
}

function DocumentsTab({ projectId }: { projectId: number }) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/documents?projetId=${projectId}`)
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : d.documents ?? [];
        setDocuments(list);
      })
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
        Documents
      </div>
      {documents.length === 0 ? (
        <div className="py-10 text-center space-y-3">
          <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto" />
          <p className="text-sm text-muted-foreground">Aucun document associé</p>
          <a
            href="/documents"
            className="inline-flex items-center gap-1.5 text-[12.5px] text-primary font-medium hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            Uploader un document
          </a>
        </div>
      ) : (
        <div className="space-y-0">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 py-2.5 border-b border-border/50">
              <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-medium text-foreground truncate">{doc.nom}</div>
                <div className="text-[11px] text-muted-foreground">
                  {doc.uploadedBy?.nom ?? "—"}
                  {" · "}
                  {format(new Date(doc.createdAt), "dd/MM/yy", { locale: fr })}
                  {doc.taille != null && ` · ${(doc.taille / 1024).toFixed(0)} Ko`}
                </div>
              </div>
              <span className="text-[10px] font-semibold uppercase text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                {doc.type}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
