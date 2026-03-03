"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FolderOpen,
  Eye,
  Pencil,
  Calendar,
  AlertTriangle,
  Timer,
  DollarSign,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  X,
  Download,
  Plus,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ProjetForm, type ProjetData } from "@/components/projet-form";

interface ProjetListItem {
  id: number;
  nom: string;
  client: string;
  budget: string | number;
  dateDebut: string | null;
  dateFin: string | null;
  statut: "PLANIFIE" | "EN_COURS" | "EN_PAUSE" | "TERMINE";
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

function alertBadgeInfo(type: string) {
  switch (type) {
    case "budget_depasse":
      return { label: "Budget dépassé", icon: DollarSign, color: "text-destructive bg-destructive/10" };
    case "budget_eleve":
      return { label: "Budget >80%", icon: DollarSign, color: "text-amber-700 bg-amber-500/10" };
    case "marge_negative":
      return { label: "Marge négative", icon: AlertTriangle, color: "text-destructive bg-destructive/10" };
    case "deadline_depassee":
      return { label: "Deadline dépassée", icon: Timer, color: "text-destructive bg-destructive/10" };
    case "deadline_proche":
      return { label: "Deadline proche", icon: Timer, color: "text-amber-700 bg-amber-500/10" };
    default:
      return null;
  }
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
  showAdvanced: boolean;
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

  // Search
  const [search, setSearch] = useState("");

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>("nom");
  const [sortAsc, setSortAsc] = useState(true);

  // Advanced filters
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [dateRangeDebut, setDateRangeDebut] = useState("");
  const [dateRangeFin, setDateRangeFin] = useState("");
  const [consultantFilter, setConsultantFilter] = useState("all");
  const [onlyWithAlertes, setOnlyWithAlertes] = useState(false);

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

  // Consultant options for filter
  const [consultantOptions, setConsultantOptions] = useState<{ id: number; nom: string }[]>([]);
  useEffect(() => {
    fetch("/api/consultants")
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : d.consultants ?? [];
        setConsultantOptions(list.filter((c: { actif?: boolean }) => c.actif !== false));
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
        if (typeof parsed.showAdvanced === "boolean") setShowAdvanced(parsed.showAdvanced);
      }
    } catch { /* ignore */ }
  }, []);

  // Save filters
  useEffect(() => {
    const toSave: SavedFilters = { sortKey, sortAsc, showAdvanced };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [sortKey, sortAsc, showAdvanced]);

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

    // Budget range
    if (budgetMin) {
      const min = parseFloat(budgetMin);
      if (!isNaN(min)) result = result.filter((p) => Number(p.budget) >= min);
    }
    if (budgetMax) {
      const max = parseFloat(budgetMax);
      if (!isNaN(max)) result = result.filter((p) => Number(p.budget) <= max);
    }

    // Date range
    if (dateRangeDebut) {
      result = result.filter((p) => p.dateDebut && p.dateDebut >= dateRangeDebut);
    }
    if (dateRangeFin) {
      result = result.filter((p) => p.dateFin && p.dateFin <= dateRangeFin);
    }

    // Consultant assigné — we don't have consultantId on ProjetListItem, but we can filter
    // by checking if project has activities for that consultant (requires API enhancement).
    // For now, this is a client-side placeholder; consultant filter is handled server-side
    // if the API supports it. We keep the UI filter state.

    // Only with alertes
    if (onlyWithAlertes) {
      result = result.filter((p) => p.alertes && p.alertes.length > 0);
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
  }, [projets, search, sortKey, sortAsc, budgetMin, budgetMax, dateRangeDebut, dateRangeFin, consultantFilter, onlyWithAlertes]);

  // Count active advanced filters
  const advancedFilterCount = [
    !!budgetMin,
    !!budgetMax,
    !!dateRangeDebut,
    !!dateRangeFin,
    consultantFilter !== "all",
    onlyWithAlertes,
  ].filter(Boolean).length;

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

  function resetAdvanced() {
    setBudgetMin("");
    setBudgetMax("");
    setDateRangeDebut("");
    setDateRangeFin("");
    setConsultantFilter("all");
    setOnlyWithAlertes(false);
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Projets"
        subtitle={`${projets.length} projet${projets.length > 1 ? "s" : ""}`}
        icon={<FolderOpen className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportCsvProjets(projets)}>
              <Download className="h-4 w-4 mr-1.5" />
              Exporter
            </Button>
            <Button size="sm" onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-1.5" />
              Nouveau projet
            </Button>
          </div>
        }
      />

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

            {/* Advanced toggle */}
            <Button
              variant={showAdvanced ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAdvanced((v) => !v)}
              className="gap-1.5"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtres avancés
              {advancedFilterCount > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 ml-1">
                  {advancedFilterCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Advanced filters panel */}
          {showAdvanced && (
            <div className="border border-border rounded-lg p-4 space-y-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Filtres avancés</p>
                {advancedFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={resetAdvanced} className="text-xs">
                    Réinitialiser
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Budget min (€)</Label>
                  <Input
                    type="number"
                    placeholder="ex: 10000"
                    value={budgetMin}
                    onChange={(e) => setBudgetMin(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Budget max (€)</Label>
                  <Input
                    type="number"
                    placeholder="ex: 100000"
                    value={budgetMax}
                    onChange={(e) => setBudgetMax(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Consultant assigné</Label>
                  <Select
                    value={consultantFilter}
                    onChange={(e) => setConsultantFilter(e.target.value)}
                  >
                    <option value="all">Tous</option>
                    {consultantOptions.map((c) => (
                      <option key={c.id} value={String(c.id)}>{c.nom}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Date début (à partir de)</Label>
                  <Input
                    type="date"
                    value={dateRangeDebut}
                    onChange={(e) => setDateRangeDebut(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Date fin (jusqu&apos;à)</Label>
                  <Input
                    type="date"
                    value={dateRangeFin}
                    onChange={(e) => setDateRangeFin(e.target.value)}
                  />
                </div>
                <div className="flex items-end pb-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={onlyWithAlertes}
                      onCheckedChange={(v) => setOnlyWithAlertes(!!v)}
                    />
                    <Label className="text-xs cursor-pointer">
                      Uniquement projets avec alertes
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          )}

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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProjets.map((p) => {
            const budgetNum = Number(p.budget);
            const pctBudget = p.pctBudget;
            const badge = statutBadge(p.statut);
            const kpi = projetKpis.get(p.id);

            return (
              <Card
                key={p.id}
                className="transition-shadow hover:shadow-md flex flex-col"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/projets/${p.id}`}
                        className="hover:text-primary transition-colors"
                      >
                        <CardTitle className="text-lg truncate">
                          {p.nom}
                        </CardTitle>
                      </Link>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {p.client}
                      </p>
                    </div>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 space-y-4">
                  {/* Dates */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {p.dateDebut
                        ? format(new Date(p.dateDebut), "dd/MM/yyyy", { locale: fr })
                        : "—"}
                      {" → "}
                      {p.dateFin
                        ? format(new Date(p.dateFin), "dd/MM/yyyy", { locale: fr })
                        : "—"}
                    </span>
                  </div>

                  {/* Budget */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Budget</span>
                      <span className="font-medium">
                        {p.budgetConsomme.toLocaleString("fr-FR")} € / {budgetNum.toLocaleString("fr-FR")} €
                      </span>
                    </div>
                    <Progress
                      value={pctBudget}
                      indicatorClassName={budgetColor(pctBudget)}
                    />
                    <p className="text-xs text-right text-muted-foreground">
                      {pctBudget}% consommé
                    </p>
                  </div>

                  {/* Étapes + Health Score */}
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {p.etapesValidees}/{p.etapesTotal} étapes validées
                    </Badge>
                    {p.progressionHealth && (
                      <Badge
                        variant={
                          p.progressionHealth === "bon" ? "success" :
                          p.progressionHealth === "normal" ? "default" :
                          "destructive"
                        }
                        className="text-xs"
                      >
                        {p.progressionHealth === "bon" ? "🟢" : p.progressionHealth === "normal" ? "🟡" : "🔴"}{" "}
                        {Math.abs(p.progressionEcart ?? 0).toFixed(0)}%
                      </Badge>
                    )}
                  </div>

                  {/* Mini Progress Bars (Budget vs Réalisation) */}
                  {p.progressionBudgetPct !== undefined && (p.progressionBudgetPct > 0 || p.progressionRealisationPct !== undefined && p.progressionRealisationPct > 0) && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="text-blue-700 font-medium w-14">Budget</span>
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${Math.min(p.progressionBudgetPct, 100)}%` }}
                          />
                        </div>
                        <span className="text-muted-foreground w-8 text-right">{p.progressionBudgetPct}%</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="text-emerald-700 font-medium w-14">Réalisé</span>
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${Math.min(p.progressionRealisationPct ?? 0, 100)}%` }}
                          />
                        </div>
                        <span className="text-muted-foreground w-8 text-right">{p.progressionRealisationPct ?? 0}%</span>
                      </div>
                    </div>
                  )}

                  {/* KPI Badges */}
                  {kpi && (
                    <div className="flex flex-wrap gap-1.5">
                      {/* ROI */}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${
                        kpi.roi > 50 ? "text-emerald-700 bg-emerald-500/10" : kpi.roi > 20 ? "text-amber-700 bg-amber-500/10" : "text-destructive bg-destructive/10"
                      }`}>
                        ROI {kpi.roi}%
                      </span>
                      {/* Burn Rate */}
                      {kpi.burnRate > 0 && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${
                          kpi.burnRate > 1.2 ? "text-destructive bg-destructive/10" : kpi.burnRate > 1 ? "text-amber-700 bg-amber-500/10" : "text-emerald-700 bg-emerald-500/10"
                        }`}>
                          Burn {kpi.burnRate}x
                        </span>
                      )}
                      {/* Vélocité */}
                      {kpi.velocite > 0 && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${
                          kpi.velocite >= 1 ? "text-emerald-700 bg-emerald-500/10" : kpi.velocite >= 0.7 ? "text-amber-700 bg-amber-500/10" : "text-destructive bg-destructive/10"
                        }`}>
                          {kpi.velocite >= 1 ? "\u26A1" : "\uD83D\uDC0C"} {kpi.velocite}x
                        </span>
                      )}
                    </div>
                  )}

                  {/* Alertes */}
                  {p.alertes && p.alertes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {[...new Set(p.alertes)].map((alertType, index) => {
                        const info = alertBadgeInfo(alertType);
                        if (!info) return null;
                        const Icon = info.icon;
                        return (
                          <span
                            key={`${p.id}-${alertType}-${index}`}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${info.color}`}
                          >
                            <Icon className="h-3 w-3" />
                            {info.label}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEdit(p)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Modifier
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      asChild
                    >
                      <Link href={`/projets/${p.id}`}>
                        <Eye className="h-3.5 w-3.5" />
                        Voir détail
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
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
  );
}
