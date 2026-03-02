"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  Users,
  FolderOpen,
  Clock,
  Calendar,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  Timer,
  DollarSign,
  Bell,
  RotateCcw,
  Target,
  Settings,
  X,
  Percent,
  Activity,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  HeuresParConsultantChart,
  EvolutionHeuresChart,
} from "@/components/dashboard-charts";
import { AlertToaster } from "@/components/alert-toaster";

// ── Types ─────────────────────────────────────────────────────────
type AlerteSeverite = "critique" | "attention" | "info";
type AlerteType = "budget_depasse" | "budget_eleve" | "deadline_depassee" | "deadline_proche" | "marge_negative";

interface Alerte {
  id: string;
  type: AlerteType;
  severite: AlerteSeverite;
  titre: string;
  description: string;
  projetId: number;
  projetNom: string;
  valeur?: number;
}

interface DashboardData {
  consultantsActifs: number;
  projetsEnCours: number;
  totalHeures: number;
  caFacturable: number;
  coutReel: number;
  marge: number;
  tauxMarge: number;
  prochaineEtape: {
    nom: string;
    projetNom: string;
    deadline: string;
    joursRestants: number;
  } | null;
  chartConsultants: { nom: string; heures: number }[];
  chartEvolution: { date: string; heures: number }[];
  dernieresActivites: {
    id: number;
    date: string;
    heures: number;
    consultant: string;
    projet: string;
  }[];
  prochainesDeadlines: {
    id: number;
    nom: string;
    statut: string;
    deadline: string;
    projetNom: string;
    joursRestants: number | null;
  }[];
  alertes: Alerte[];
  projetsDerive?: {
    id: number;
    nom: string;
    budgetPct: number;
    realisationPct: number;
    ecart: number;
    health: "bon" | "normal" | "critique";
    healthLabel: string;
    dateFinEstimee: string | null;
  }[];
}

interface KpisData {
  tauxFacturation: number;
  tauxOccupation: number;
  projetsDepassementBudget: number;
  deadlinesProches: number;
  pctObjectifCA: number;
  pctObjectifHeures: number;
  caTotal: number;
  totalHeures: number;
}

interface ConsultantOption {
  id: number;
  nom: string;
  actif?: boolean;
}

interface ProjetOption {
  id: number;
  nom: string;
}

interface Objectifs {
  caObjectif: number;
  heuresObjectif: number;
}

// ── Periods ───────────────────────────────────────────────────────
type PeriodeKey = "today" | "week" | "month" | "quarter" | "year" | "custom";

const now = new Date();

function getPeriodDates(key: PeriodeKey): { dateDebut: string; dateFin: string } {
  switch (key) {
    case "today":
      return { dateDebut: format(now, "yyyy-MM-dd"), dateFin: format(now, "yyyy-MM-dd") };
    case "week":
      return {
        dateDebut: format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
        dateFin: format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      };
    case "month":
      return {
        dateDebut: format(startOfMonth(now), "yyyy-MM-dd"),
        dateFin: format(endOfMonth(now), "yyyy-MM-dd"),
      };
    case "quarter":
      return {
        dateDebut: format(startOfQuarter(now), "yyyy-MM-dd"),
        dateFin: format(endOfQuarter(now), "yyyy-MM-dd"),
      };
    case "year":
      return {
        dateDebut: format(startOfYear(now), "yyyy-MM-dd"),
        dateFin: format(endOfYear(now), "yyyy-MM-dd"),
      };
    default:
      return {
        dateDebut: format(startOfMonth(now), "yyyy-MM-dd"),
        dateFin: format(endOfMonth(now), "yyyy-MM-dd"),
      };
  }
}

const PERIODES: { key: PeriodeKey; label: string }[] = [
  { key: "today", label: "Aujourd'hui" },
  { key: "week", label: "Cette semaine" },
  { key: "month", label: "Ce mois" },
  { key: "quarter", label: "Ce trimestre" },
  { key: "year", label: "Année" },
];

const STORAGE_KEY = "dashboard-filters";
const OBJECTIFS_KEY = "dashboard-objectifs";
const DISMISSED_ALERTES_KEY = "dashboard-dismissed-alertes";

interface SavedFilters {
  periode: PeriodeKey;
  dateDebut: string;
  dateFin: string;
  consultantId: string;
  projetId: string;
}

// ── Helpers ───────────────────────────────────────────────────────
function statutBadgeVariant(statut: string) {
  switch (statut) {
    case "VALIDEE": return "success" as const;
    case "EN_COURS": return "default" as const;
    case "A_FAIRE": return "secondary" as const;
    default: return "outline" as const;
  }
}

function statutLabel(statut: string) {
  switch (statut) {
    case "VALIDEE": return "Validée";
    case "EN_COURS": return "En cours";
    case "A_FAIRE": return "À faire";
    default: return statut;
  }
}

function formatEuros(montant: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(montant);
}

// ── Component ──────────────────────────────────────────────────────
export function DashboardChefProjet() {
  // Filters state
  const [periode, setPeriode] = useState<PeriodeKey>("month");
  const [dateDebut, setDateDebut] = useState(() => getPeriodDates("month").dateDebut);
  const [dateFin, setDateFin] = useState(() => getPeriodDates("month").dateFin);
  const [consultantId, setConsultantId] = useState("all");
  const [projetId, setProjetId] = useState("all");

  // Options
  const [consultants, setConsultants] = useState<ConsultantOption[]>([]);
  const [projets, setProjets] = useState<ProjetOption[]>([]);

  // Data
  const [data, setData] = useState<DashboardData | null>(null);
  const [kpis, setKpis] = useState<KpisData | null>(null);
  const [loading, setLoading] = useState(true);

  // Objectifs
  const [objectifs, setObjectifs] = useState<Objectifs>({ caObjectif: 0, heuresObjectif: 0 });
  const [objectifsDialogOpen, setObjectifsDialogOpen] = useState(false);
  const [tempObjectifs, setTempObjectifs] = useState<Objectifs>({ caObjectif: 0, heuresObjectif: 0 });

  // Dismissed alerts
  const [dismissedAlertes, setDismissedAlertes] = useState<Set<string>>(new Set());

  // Hydration guard for localStorage
  const [hydrated, setHydrated] = useState(false);

  // Load saved filters + objectifs from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: SavedFilters = JSON.parse(saved);
        if (parsed.periode) setPeriode(parsed.periode);
        if (parsed.dateDebut) setDateDebut(parsed.dateDebut);
        if (parsed.dateFin) setDateFin(parsed.dateFin);
        if (parsed.consultantId) setConsultantId(parsed.consultantId);
        if (parsed.projetId) setProjetId(parsed.projetId);
      }
    } catch { /* ignore */ }
    try {
      const savedObj = localStorage.getItem(OBJECTIFS_KEY);
      if (savedObj) {
        const parsed: Objectifs = JSON.parse(savedObj);
        setObjectifs(parsed);
      }
    } catch { /* ignore */ }
    try {
      const savedDismissed = localStorage.getItem(DISMISSED_ALERTES_KEY);
      if (savedDismissed) {
        setDismissedAlertes(new Set(JSON.parse(savedDismissed)));
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  // Save filters
  useEffect(() => {
    if (!hydrated) return;
    const toSave: SavedFilters = { periode, dateDebut, dateFin, consultantId, projetId };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [hydrated, periode, dateDebut, dateFin, consultantId, projetId]);

  // Fetch options
  useEffect(() => {
    Promise.all([
      fetch("/api/consultants").then((r) => r.json()),
      fetch("/api/projets").then((r) => r.json()),
    ]).then(([cData, pData]) => {
      const cList = Array.isArray(cData) ? cData : cData.consultants ?? [];
      setConsultants(cList.filter((c: ConsultantOption) => c.actif !== false));
      const pList = Array.isArray(pData) ? pData : [];
      setProjets(pList.map((p: ProjetOption & Record<string, unknown>) => ({ id: p.id, nom: p.nom })));
    }).catch(() => {});
  }, []);

  // Fetch dashboard data + KPIs
  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ dateDebut, dateFin });
    if (consultantId !== "all") params.set("consultantId", consultantId);
    if (projetId !== "all") params.set("projetId", projetId);

    const kpiParams = new URLSearchParams({ dateDebut, dateFin });
    if (objectifs.caObjectif > 0) kpiParams.set("objectifCA", String(objectifs.caObjectif));
    if (objectifs.heuresObjectif > 0) kpiParams.set("objectifHeures", String(objectifs.heuresObjectif));

    try {
      const [dashRes, kpiRes] = await Promise.all([
        fetch(`/api/dashboard?${params}`),
        fetch(`/api/kpis?${kpiParams}`),
      ]);
      const [d, k] = await Promise.all([dashRes.json(), kpiRes.json()]);
      setData(d);
      setKpis(k);
    } catch {
      setData(null);
      setKpis(null);
    } finally {
      setLoading(false);
    }
  }, [dateDebut, dateFin, consultantId, projetId, objectifs]);

  useEffect(() => {
    if (hydrated) fetchData();
  }, [fetchData, hydrated]);

  // Period selection
  function selectPeriode(key: PeriodeKey) {
    setPeriode(key);
    const dates = getPeriodDates(key);
    setDateDebut(dates.dateDebut);
    setDateFin(dates.dateFin);
  }

  function handleCustomDateDebut(v: string) {
    setDateDebut(v);
    setPeriode("custom");
  }
  function handleCustomDateFin(v: string) {
    setDateFin(v);
    setPeriode("custom");
  }

  // Reset
  function resetFilters() {
    selectPeriode("month");
    setConsultantId("all");
    setProjetId("all");
  }

  // Objectifs
  function openObjectifsDialog() {
    setTempObjectifs({ ...objectifs });
    setObjectifsDialogOpen(true);
  }

  function saveObjectifs() {
    setObjectifs(tempObjectifs);
    localStorage.setItem(OBJECTIFS_KEY, JSON.stringify(tempObjectifs));
    setObjectifsDialogOpen(false);
  }

  // Dismiss alerte
  function dismissAlerte(alerteId: string) {
    setDismissedAlertes((prev) => {
      const next = new Set(prev);
      next.add(alerteId);
      localStorage.setItem(DISMISSED_ALERTES_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  const hasActiveFilters = periode !== "month" || consultantId !== "all" || projetId !== "all";

  const visibleAlertes = (data?.alertes ?? []).filter((a) => !dismissedAlertes.has(a.id));
  const alertesCritiques = visibleAlertes.filter((a) => a.severite === "critique");
  const alertesAttention = visibleAlertes.filter((a) => a.severite === "attention");

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* ── FILTRES ────────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Period buttons */}
          <div className="flex flex-wrap gap-2">
            {PERIODES.map((p) => (
              <Button
                key={p.key}
                variant={periode === p.key ? "default" : "outline"}
                size="sm"
                onClick={() => selectPeriode(p.key)}
              >
                {p.label}
              </Button>
            ))}
          </div>

          {/* Custom date + dropdowns */}
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="date"
              value={dateDebut}
              onChange={(e) => handleCustomDateDebut(e.target.value)}
              className="w-auto"
            />
            <span className="text-muted-foreground text-sm">&rarr;</span>
            <Input
              type="date"
              value={dateFin}
              onChange={(e) => handleCustomDateFin(e.target.value)}
              className="w-auto"
            />

            <Select
              value={consultantId}
              onChange={(e) => setConsultantId(e.target.value)}
              className="w-[180px]"
            >
              <option value="all">Tous les consultants</option>
              {consultants.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.nom}</option>
              ))}
            </Select>

            <Select
              value={projetId}
              onChange={(e) => setProjetId(e.target.value)}
              className="w-[180px]"
            >
              <option value="all">Tous les projets</option>
              {projets.map((p) => (
                <option key={p.id} value={String(p.id)}>{p.nom}</option>
              ))}
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1.5 text-muted-foreground">
                <RotateCcw className="h-3.5 w-3.5" />
                Réinitialiser
              </Button>
            )}
          </div>

          {/* Active period label */}
          <p className="text-xs text-muted-foreground">
            Du {format(new Date(dateDebut), "d MMMM yyyy", { locale: fr })} au{" "}
            {format(new Date(dateFin), "d MMMM yyyy", { locale: fr })}
          </p>
        </CardContent>
      </Card>

      {loading && !data ? (
        <p className="text-center py-20 text-muted-foreground">Chargement...</p>
      ) : data ? (
        <>
          {/* ── ALERTES (Card dédiée) ─────────────────────────────── */}
          {visibleAlertes.length > 0 && (
            <section>
              <Card className="border-destructive/30 bg-destructive/[0.02]">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="h-5 w-5 text-destructive" />
                      <CardTitle className="text-base font-semibold">Alertes</CardTitle>
                      <Badge variant="destructive" className="text-xs px-2">
                        {visibleAlertes.length}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {alertesCritiques.length > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {alertesCritiques.length} critique{alertesCritiques.length > 1 ? "s" : ""}
                        </Badge>
                      )}
                      {alertesAttention.length > 0 && (
                        <Badge variant="warning" className="text-xs">
                          {alertesAttention.length} warning{alertesAttention.length > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {alertesCritiques.length > 0 && (
                    <div className="space-y-2">
                      {alertesCritiques.map((alerte) => (
                        <AlerteRow key={alerte.id} alerte={alerte} onDismiss={dismissAlerte} />
                      ))}
                    </div>
                  )}
                  {alertesCritiques.length > 0 && alertesAttention.length > 0 && (
                    <Separator className="my-2" />
                  )}
                  {alertesAttention.length > 0 && (
                    <div className="space-y-2">
                      {alertesAttention.map((alerte) => (
                        <AlerteRow key={alerte.id} alerte={alerte} onDismiss={dismissAlerte} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          )}

          <AlertToaster alertes={alertesCritiques} />

          {/* ── KPI CARDS ──────────────────────────────────────────── */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-sm font-medium">Consultants Actifs</CardDescription>
                <Users className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data.consultantsActifs}</div>
                <p className="text-xs text-muted-foreground mt-1">consultants disponibles</p>
              </CardContent>
            </Card>

            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-sm font-medium">Projets en Cours</CardDescription>
                <FolderOpen className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data.projetsEnCours}</div>
                <p className="text-xs text-muted-foreground mt-1">projets actifs</p>
              </CardContent>
            </Card>

            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-sm font-medium">Heures Facturables</CardDescription>
                <Clock className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data.totalHeures}h</div>
                <p className="text-xs text-muted-foreground mt-1">sur la période</p>
              </CardContent>
            </Card>

            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-sm font-medium">Marge Brute</CardDescription>
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${data.marge >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                  {formatEuros(data.marge)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  taux :{" "}
                  <span className={data.tauxMarge > 40 ? "text-emerald-600 font-semibold" : data.tauxMarge > 30 ? "text-amber-700 font-semibold" : "text-destructive font-semibold"}>
                    {data.tauxMarge}%
                  </span>
                </p>
              </CardContent>
            </Card>
          </section>

          {/* ── Objectifs Mensuels + Performance Financière ─────────── */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base font-semibold">Objectifs Mensuels</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" onClick={openObjectifsDialog} className="gap-1.5 text-muted-foreground">
                    <Settings className="h-3.5 w-3.5" />
                    Configurer
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {objectifs.caObjectif > 0 || objectifs.heuresObjectif > 0 ? (
                  <>
                    {objectifs.caObjectif > 0 && (
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-sm font-medium">CA vs Objectif</span>
                          <span className="text-sm font-bold">
                            {formatEuros(kpis?.caTotal ?? data.caFacturable)} / {formatEuros(objectifs.caObjectif)}
                          </span>
                        </div>
                        <Progress
                          value={Math.min(((kpis?.caTotal ?? data.caFacturable) / objectifs.caObjectif) * 100, 100)}
                          className="h-3"
                          indicatorClassName={
                            ((kpis?.caTotal ?? data.caFacturable) / objectifs.caObjectif) * 100 >= 100
                              ? "bg-emerald-500"
                              : ((kpis?.caTotal ?? data.caFacturable) / objectifs.caObjectif) * 100 >= 70
                                ? "bg-primary"
                                : "bg-amber-500"
                          }
                        />
                        <p className="text-xs text-muted-foreground mt-1 text-right">
                          {Math.round(((kpis?.caTotal ?? data.caFacturable) / objectifs.caObjectif) * 100)}%
                        </p>
                      </div>
                    )}
                    {objectifs.heuresObjectif > 0 && (
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-sm font-medium">Heures vs Objectif</span>
                          <span className="text-sm font-bold">
                            {kpis?.totalHeures ?? data.totalHeures}h / {objectifs.heuresObjectif}h
                          </span>
                        </div>
                        <Progress
                          value={Math.min(((kpis?.totalHeures ?? data.totalHeures) / objectifs.heuresObjectif) * 100, 100)}
                          className="h-3"
                          indicatorClassName={
                            ((kpis?.totalHeures ?? data.totalHeures) / objectifs.heuresObjectif) * 100 >= 100
                              ? "bg-emerald-500"
                              : ((kpis?.totalHeures ?? data.totalHeures) / objectifs.heuresObjectif) * 100 >= 70
                                ? "bg-primary"
                                : "bg-amber-500"
                          }
                        />
                        <p className="text-xs text-muted-foreground mt-1 text-right">
                          {Math.round(((kpis?.totalHeures ?? data.totalHeures) / objectifs.heuresObjectif) * 100)}%
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      Configurez vos objectifs mensuels pour suivre votre progression.
                    </p>
                    <Button variant="outline" size="sm" onClick={openObjectifsDialog}>
                      <Settings className="h-3.5 w-3.5" />
                      Configurer objectifs
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Performance Financière
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-medium">CA Facturable</span>
                    <span className="text-lg font-bold">{formatEuros(data.caFacturable)}</span>
                  </div>
                  <Progress value={100} className="h-2.5" indicatorClassName="bg-emerald-500" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-medium">Coût Réel</span>
                    <span className="text-lg font-bold text-destructive">{formatEuros(data.coutReel)}</span>
                  </div>
                  <Progress
                    value={data.caFacturable > 0 ? Math.min((data.coutReel / data.caFacturable) * 100, 100) : 0}
                    className="h-2.5"
                    indicatorClassName="bg-destructive"
                  />
                </div>
                <Separator />
                {kpis && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Taux de facturation</p>
                        <p className="text-xs text-muted-foreground">Objectif : 85%</p>
                      </div>
                    </div>
                    <Badge
                      variant={kpis.tauxFacturation >= 85 ? "success" : kpis.tauxFacturation >= 70 ? "warning" : "destructive"}
                      className="text-sm px-3 py-1"
                    >
                      {kpis.tauxFacturation}%
                    </Badge>
                  </div>
                )}
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Marge Brute</p>
                    <p className={`text-2xl font-bold ${data.marge >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                      {formatEuros(data.marge)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Taux de marge</p>
                    <Badge variant={data.tauxMarge > 40 ? "success" : data.tauxMarge > 30 ? "warning" : "destructive"} className="text-sm px-3 py-1">
                      {data.tauxMarge}%
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">Objectif : 40%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-sm font-medium">Prochaine Deadline</CardDescription>
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {data.prochaineEtape ? (
                  <>
                    <div className="text-lg font-bold truncate">{data.prochaineEtape.nom}</div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(data.prochaineEtape.deadline), "d MMM yyyy", { locale: fr })}
                    </p>
                    <p className={`text-xs font-semibold mt-1 ${data.prochaineEtape.joursRestants < 7 ? "text-destructive" : "text-muted-foreground"}`}>
                      dans {data.prochaineEtape.joursRestants} jour{data.prochaineEtape.joursRestants > 1 ? "s" : ""}
                    </p>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">Aucune deadline à venir</div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* ── GRAPHIQUES ─────────────────────────────────────────── */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <HeuresParConsultantChart data={data.chartConsultants} />
            <EvolutionHeuresChart data={data.chartEvolution} />
          </section>

          {/* ── PROJETS EN ALERTE DE DÉRIVE ─────────────────────── */}
          {data.projetsDerive && data.projetsDerive.filter((p) => p.ecart < -5).length > 0 && (
            <Card className="border-amber-500/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-amber-700" />
                  <CardTitle className="text-base font-semibold">Projets en Alerte de Dérive</CardTitle>
                  <Badge variant="warning" className="ml-auto text-xs">
                    {data.projetsDerive.filter((p) => p.ecart < -5).length} projet(s)
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.projetsDerive
                  .filter((p) => p.ecart < -5)
                  .map((p) => (
                  <div key={p.id} className={`flex items-start gap-3 p-3 rounded-lg border ${
                    p.health === "critique" ? "border-destructive/30 bg-destructive/5" : "border-amber-500/30 bg-amber-500/5"
                  }`}>
                    <span className="text-lg mt-0.5">
                      {p.health === "critique" ? "🔴" : "🟡"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{p.nom}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {p.budgetPct}% budget / {p.realisationPct}% réalisé = <span className={p.ecart < -10 ? "text-destructive font-medium" : "text-amber-700 font-medium"}>{p.ecart}%</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {p.health === "critique" ? "Action : Revue scope urgente" : "Surveillance requise"}
                      </p>
                    </div>
                    <Link href={`/projets/${p.id}`}>
                      <Button variant="ghost" size="sm" className="text-xs gap-1 shrink-0">
                        Voir <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* ── LISTES ─────────────────────────────────────────────── */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Dernières activités</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Consultant</TableHead>
                      <TableHead>Projet</TableHead>
                      <TableHead className="text-right">Heures</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.dernieresActivites.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(a.date), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>{a.consultant}</TableCell>
                        <TableCell>{a.projet}</TableCell>
                        <TableCell className="text-right font-medium">{a.heures}h</TableCell>
                      </TableRow>
                    ))}
                    {data.dernieresActivites.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          Aucune activité sur cette période
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Prochaines deadlines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.prochainesDeadlines.map((etape) => {
                  const urgence =
                    etape.joursRestants !== null && etape.joursRestants < 7
                      ? "text-destructive"
                      : etape.joursRestants !== null && etape.joursRestants < 14
                        ? "text-amber-700"
                        : "text-muted-foreground";

                  return (
                    <div
                      key={etape.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="space-y-1 min-w-0">
                        <p className="font-medium text-sm truncate">{etape.nom}</p>
                        <p className="text-xs text-muted-foreground">
                          {etape.projetNom}
                          {etape.deadline && (
                            <span className="ml-2">
                              • {format(new Date(etape.deadline), "d MMM yyyy", { locale: fr })}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {etape.joursRestants !== null && (
                          <span className={`text-xs font-semibold ${urgence}`}>
                            {etape.joursRestants}j
                          </span>
                        )}
                        <Badge variant={statutBadgeVariant(etape.statut)}>
                          {statutLabel(etape.statut)}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
                {data.prochainesDeadlines.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground text-sm">
                    Aucune deadline à venir
                  </p>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      ) : (
        <p className="text-center py-20 text-muted-foreground">Erreur de chargement</p>
      )}

      {/* ── Dialog Objectifs ───────────────────────────────────────── */}
      <Dialog open={objectifsDialogOpen} onOpenChange={setObjectifsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurer les objectifs mensuels</DialogTitle>
            <DialogDescription>
              Définissez vos objectifs de CA et d&apos;heures pour suivre votre progression.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="obj-ca">Objectif CA mensuel (€)</Label>
              <Input
                id="obj-ca"
                type="number"
                min="0"
                step="1000"
                value={tempObjectifs.caObjectif || ""}
                onChange={(e) => setTempObjectifs((prev) => ({ ...prev, caObjectif: parseFloat(e.target.value) || 0 }))}
                placeholder="ex: 50000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="obj-heures">Objectif heures mensuelles</Label>
              <Input
                id="obj-heures"
                type="number"
                min="0"
                step="10"
                value={tempObjectifs.heuresObjectif || ""}
                onChange={(e) => setTempObjectifs((prev) => ({ ...prev, heuresObjectif: parseFloat(e.target.value) || 0 }))}
                placeholder="ex: 160"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setObjectifsDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={saveObjectifs}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Alert Row Component ──────────────────────────────────────────────
function AlerteRow({ alerte, onDismiss }: { alerte: Alerte; onDismiss: (id: string) => void }) {
  const iconMap: Record<AlerteType, React.ReactNode> = {
    budget_depasse: <DollarSign className="h-4 w-4" />,
    budget_eleve: <DollarSign className="h-4 w-4" />,
    deadline_depassee: <Timer className="h-4 w-4" />,
    deadline_proche: <Timer className="h-4 w-4" />,
    marge_negative: <AlertTriangle className="h-4 w-4" />,
  };
  const colorMap: Record<AlerteSeverite, string> = {
    critique: "border-destructive/40 bg-destructive/5 text-destructive",
    attention: "border-amber-500/40 bg-amber-500/5 text-amber-700",
    info: "border-blue-500/40 bg-blue-500/5 text-blue-700",
  };
  const iconColorMap: Record<AlerteSeverite, string> = {
    critique: "text-destructive",
    attention: "text-amber-700",
    info: "text-blue-600",
  };

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${colorMap[alerte.severite]}`}>
      <Link
        href={`/projets/${alerte.projetId}`}
        className="flex items-start gap-3 flex-1 min-w-0 hover:opacity-80"
      >
        <div className={`shrink-0 mt-0.5 ${iconColorMap[alerte.severite]}`}>
          {iconMap[alerte.type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm">{alerte.titre}</p>
            <Badge
              variant={alerte.severite === "critique" ? "destructive" : "warning"}
              className="text-[10px] px-1.5 py-0"
            >
              {alerte.severite}
            </Badge>
          </div>
          <p className="text-xs mt-0.5 opacity-80">
            <span className="font-medium">{alerte.projetNom}</span>
            {" — "}
            {alerte.description}
          </p>
        </div>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 h-7 w-7 opacity-60 hover:opacity-100"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDismiss(alerte.id);
        }}
        title="Ignorer cette alerte"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
