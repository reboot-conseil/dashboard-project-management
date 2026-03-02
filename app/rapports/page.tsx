"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Clock,
  DollarSign,
  TrendingUp,
  Calendar,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  GitCompare,
} from "lucide-react";
import { toast } from "sonner";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
} from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ConsultantPieChart,
  ProjetBudgetChart,
  EvolutionTemporelleChart,
  ActivityHeatmap,
} from "@/components/rapports-charts";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────
interface Stats {
  totalHeures: number;
  totalFacturable: number;
  totalNonFacturable: number;
  variationPct: number | null;
  caTotal: number;
  coutTotal: number;
  margeBrute: number;
  tauxMarge: number;
  nbJours: number;
  moyenneParJour: number;
}
interface ConsultantStats {
  id: number;
  nom: string;
  email: string;
  tjm: number;
  heuresTotal: number;
  heuresFacturables: number;
  heuresNonFacturables: number;
  tauxFacturable: number;
  ca: number;
  coutReel: number;
  marge: number;
  tauxMarge: number;
  joursTravailles: number;
}
interface ProjetStats {
  id: number;
  nom: string;
  client: string;
  heures: number;
  budget: number;
  budgetConsomme: number;
  coutReel: number;
  marge: number;
  tauxMarge: number;
  pctBudget: number;
  statut: string;
  // Progression
  progressionBudgetPct?: number;
  progressionRealisationPct?: number;
  progressionEcart?: number;
  progressionHealth?: "bon" | "normal" | "critique";
  progressionDateFinEstimee?: string | null;
}
interface TemporelJour {
  date: string;
  facturable: number;
  nonFacturable: number;
  total: number;
}
interface Temporel {
  parJour: TemporelJour[];
  jourPlusActif: string;
  jourPlusActifHeures: number;
  jourMoinsActif: string;
  jourMoinsActifHeures: number;
}
interface FacturationProjet {
  projetNom: string;
  heures: number;
  montant: number;
}
interface FacturationConsultant {
  consultant: { id: number; nom: string; tjm: number };
  totalHeures: number;
  totalMontant: number;
  projets: FacturationProjet[];
}
interface RapportData {
  stats: Stats;
  parConsultant: ConsultantStats[];
  parProjet: ProjetStats[];
  temporel: Temporel;
  facturation: FacturationConsultant[];
}

// ── Périodes prédéfinies ───────────────────────────────────────
const now = new Date();
const PERIODES = [
  { label: "Cette semaine", debut: startOfWeek(now, { weekStartsOn: 1 }), fin: endOfWeek(now, { weekStartsOn: 1 }) },
  { label: "Ce mois", debut: startOfMonth(now), fin: endOfMonth(now) },
  { label: "Mois dernier", debut: startOfMonth(subMonths(now, 1)), fin: endOfMonth(subMonths(now, 1)) },
  { label: "Ce trimestre", debut: startOfQuarter(now), fin: endOfQuarter(now) },
  { label: "Cette année", debut: startOfYear(now), fin: endOfYear(now) },
];

function formatEuros(montant: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(montant);
}

// ── Page ───────────────────────────────────────────────────────
function computePreviousPeriod(debut: string, fin: string) {
  const d1 = new Date(debut);
  const d2 = new Date(fin);
  const duration = d2.getTime() - d1.getTime() + 86400000; // +1 day in ms
  const prevFin = new Date(d1.getTime() - 86400000); // day before debut
  const prevDebut = new Date(prevFin.getTime() - duration + 86400000);
  return {
    dateDebut: format(prevDebut, "yyyy-MM-dd"),
    dateFin: format(prevFin, "yyyy-MM-dd"),
  };
}

function variationPct(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return 100;
  return Math.round(((current - previous) / Math.abs(previous)) * 10) / 10;
}

function VariationBadge({ current, previous, invert = false }: { current: number; previous: number; invert?: boolean }) {
  const pct = variationPct(current, previous);
  if (pct === null) return null;
  const isPositive = pct >= 0;
  // invert=true means "lower is better" (e.g., cost)
  const isGood = invert ? !isPositive : isPositive;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isGood ? "text-emerald-600" : "text-destructive"}`}>
      {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {isPositive ? "+" : ""}{pct}%
    </span>
  );
}

export default function RapportsPage() {
  const [dateDebut, setDateDebut] = useState(format(startOfMonth(now), "yyyy-MM-dd"));
  const [dateFin, setDateFin] = useState(format(endOfMonth(now), "yyyy-MM-dd"));
  const [periodeLabel, setPeriodeLabel] = useState("Ce mois");
  const [data, setData] = useState<RapportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("consultants");
  const [expandedFacturation, setExpandedFacturation] = useState<Set<number>>(new Set());

  // KPI data
  interface KpisGlobaux {
    caTotal: number;
    tauxMarge: number;
    tauxFacturation: number;
    roiMoyen: number;
    tauxOccupation: number;
    moyenneParJour: number;
    totalHeures: number;
    consultantsActifs: number;
    projetsDepassementBudget: number;
    deadlinesProches: number;
    pctEtapesATemps: number;
    tendance6Mois: { mois: string; ca: number; marge: number; heures: number }[];
  }
  const [kpis, setKpis] = useState<KpisGlobaux | null>(null);

  // Comparison
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [prevData, setPrevData] = useState<RapportData | null>(null);
  const [prevLoading, setPrevLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rapRes, kpiRes] = await Promise.all([
        fetch(`/api/rapports?dateDebut=${dateDebut}&dateFin=${dateFin}`),
        fetch(`/api/kpis?dateDebut=${dateDebut}&dateFin=${dateFin}`),
      ]);
      const [d, k] = await Promise.all([rapRes.json(), kpiRes.json()]);
      setData(d);
      setKpis(k);
    } catch {
      toast.error("Erreur de chargement des rapports");
    } finally {
      setLoading(false);
    }
  }, [dateDebut, dateFin]);

  // Fetch previous period data when comparison is enabled
  const fetchPrevData = useCallback(async () => {
    if (!compareEnabled) {
      setPrevData(null);
      return;
    }
    setPrevLoading(true);
    try {
      const prev = computePreviousPeriod(dateDebut, dateFin);
      const res = await fetch(`/api/rapports?dateDebut=${prev.dateDebut}&dateFin=${prev.dateFin}`);
      const d = await res.json();
      setPrevData(d);
    } catch {
      setPrevData(null);
    } finally {
      setPrevLoading(false);
    }
  }, [compareEnabled, dateDebut, dateFin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchPrevData();
  }, [fetchPrevData]);

  function selectPeriode(idx: number) {
    const p = PERIODES[idx];
    setDateDebut(format(p.debut, "yyyy-MM-dd"));
    setDateFin(format(p.fin, "yyyy-MM-dd"));
    setPeriodeLabel(p.label);
  }

  function handleCustomDate() {
    setPeriodeLabel("Personnalisé");
  }

  function exportCsv(type: string) {
    const url = `/api/rapports/export-csv?type=${type}&dateDebut=${dateDebut}&dateFin=${dateFin}`;
    window.open(url, "_blank");
    toast.success("Export lancé !");
  }

  function toggleFacturation(id: number) {
    setExpandedFacturation((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading && !data) {
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <p className="text-center py-20 text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <h1 className="text-3xl font-bold tracking-tight">Rapports &amp; Analyses</h1>

      {/* ── Sélecteur de période ──────────────────────────────── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2 mb-4">
            {PERIODES.map((p, i) => (
              <Button
                key={i}
                variant={periodeLabel === p.label ? "default" : "outline"}
                size="sm"
                onClick={() => selectPeriode(i)}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="date"
              value={dateDebut}
              onChange={(e) => { setDateDebut(e.target.value); handleCustomDate(); }}
              className="w-auto"
            />
            <span className="text-muted-foreground">→</span>
            <Input
              type="date"
              value={dateFin}
              onChange={(e) => { setDateFin(e.target.value); handleCustomDate(); }}
              className="w-auto"
            />
            <span className="text-sm text-muted-foreground">
              Du {format(new Date(dateDebut), "d MMMM yyyy", { locale: fr })} au{" "}
              {format(new Date(dateFin), "d MMMM yyyy", { locale: fr })}
            </span>
          </div>
          {/* Compare toggle */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
            <Checkbox
              checked={compareEnabled}
              onCheckedChange={(v) => setCompareEnabled(!!v)}
            />
            <Label className="text-sm cursor-pointer flex items-center gap-1.5">
              <GitCompare className="h-3.5 w-3.5 text-muted-foreground" />
              Comparer avec la période précédente
            </Label>
            {compareEnabled && prevData && (
              <span className="text-xs text-muted-foreground ml-auto">
                vs {format(new Date(computePreviousPeriod(dateDebut, dateFin).dateDebut), "d MMM", { locale: fr })}
                {" → "}
                {format(new Date(computePreviousPeriod(dateDebut, dateFin).dateFin), "d MMM yyyy", { locale: fr })}
              </span>
            )}
            {compareEnabled && prevLoading && (
              <span className="text-xs text-muted-foreground ml-auto">Chargement...</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── KPI Cards ────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription className="text-sm font-medium">Total Heures</CardDescription>
              <Clock className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalHeures}h</div>
              {stats.variationPct !== null && (
                <p className={`text-xs font-medium flex items-center gap-1 mt-1 ${stats.variationPct >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                  {stats.variationPct >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {stats.variationPct > 0 ? "+" : ""}{stats.variationPct}% vs période préc.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription className="text-sm font-medium">Heures Facturables</CardDescription>
              <DollarSign className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalFacturable}h</div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-muted-foreground">
                  {stats.totalHeures > 0 ? Math.round((stats.totalFacturable / stats.totalHeures) * 100) : 0}% du total
                </p>
                {compareEnabled && prevData?.stats && (
                  <VariationBadge current={stats.totalFacturable} previous={prevData.stats.totalFacturable} />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription className="text-sm font-medium">CA Estimé</CardDescription>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatEuros(stats.caTotal)}</div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-muted-foreground">coût : {formatEuros(stats.coutTotal)}</p>
                {compareEnabled && prevData?.stats && (
                  <VariationBadge current={stats.caTotal} previous={prevData.stats.caTotal} />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription className="text-sm font-medium">Marge Brute</CardDescription>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${stats.margeBrute >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                {formatEuros(stats.margeBrute)}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={stats.tauxMarge > 40 ? "success" : stats.tauxMarge > 30 ? "warning" : "destructive"} className="text-xs">
                  {stats.tauxMarge}%
                </Badge>
                {compareEnabled && prevData?.stats && (
                  <VariationBadge current={stats.margeBrute} previous={prevData.stats.margeBrute} />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Onglets ──────────────────────────────────────────── */}
      {data && (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="kpis">KPIs Globaux</TabsTrigger>
            <TabsTrigger value="consultants">Par consultant</TabsTrigger>
            <TabsTrigger value="projets">Par projet</TabsTrigger>
            <TabsTrigger value="temporel">Vue temporelle</TabsTrigger>
            <TabsTrigger value="facturation">Facturation</TabsTrigger>
          </TabsList>

          {/* ── TAB 0 : KPIs Globaux ──────────────────────────── */}
          <TabsContent value="kpis">
            {kpis && (
              <div className="space-y-6">
                {/* 8 KPI Cards (grid 2x4) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs font-medium">CA Total</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{formatEuros(kpis.caTotal)}</p>
                      {kpis.tendance6Mois.length >= 2 && (
                        <p className={`text-xs mt-1 ${kpis.tendance6Mois[kpis.tendance6Mois.length - 1].ca >= kpis.tendance6Mois[kpis.tendance6Mois.length - 2].ca ? "text-emerald-600" : "text-destructive"}`}>
                          {kpis.tendance6Mois[kpis.tendance6Mois.length - 1].ca >= kpis.tendance6Mois[kpis.tendance6Mois.length - 2].ca ? <ArrowUpRight className="h-3 w-3 inline" /> : <ArrowDownRight className="h-3 w-3 inline" />}
                          {" "}vs mois précédent
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs font-medium">Marge Moyenne</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{kpis.tauxMarge}%</p>
                      <Badge variant={kpis.tauxMarge > 40 ? "success" : kpis.tauxMarge > 30 ? "warning" : "destructive"} className="text-xs mt-1">
                        {kpis.tauxMarge > 40 ? "Bon" : kpis.tauxMarge > 30 ? "Moyen" : "Faible"}
                      </Badge>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs font-medium">Taux Facturation</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{kpis.tauxFacturation}%</p>
                      <Badge variant={kpis.tauxFacturation >= 85 ? "success" : kpis.tauxFacturation >= 70 ? "warning" : "destructive"} className="text-xs mt-1">
                        Obj. 85%
                      </Badge>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs font-medium">ROI Moyen</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{kpis.roiMoyen}%</p>
                      <Badge variant={kpis.roiMoyen > 50 ? "success" : kpis.roiMoyen > 20 ? "warning" : "destructive"} className="text-xs mt-1">
                        {kpis.roiMoyen > 50 ? "Excellent" : kpis.roiMoyen > 20 ? "Correct" : "Faible"}
                      </Badge>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs font-medium">Taux Occupation</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{kpis.tauxOccupation}%</p>
                      <Badge variant={kpis.tauxOccupation > 90 ? "destructive" : kpis.tauxOccupation > 70 ? "success" : "warning"} className="text-xs mt-1">
                        {kpis.tauxOccupation > 90 ? "Surchargé" : kpis.tauxOccupation > 70 ? "Bon" : "Sous-utilisé"}
                      </Badge>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs font-medium">Heures / Jour</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{kpis.moyenneParJour}h</p>
                      <p className="text-xs text-muted-foreground mt-1">{kpis.totalHeures}h total</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs font-medium">Projets Actifs</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{data?.parProjet.length ?? 0}</p>
                      {kpis.projetsDepassementBudget > 0 && (
                        <Badge variant="destructive" className="text-xs mt-1">
                          {kpis.projetsDepassementBudget} en dépassement
                        </Badge>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs font-medium">Livraison à temps</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{kpis.pctEtapesATemps}%</p>
                      {kpis.deadlinesProches > 0 && (
                        <Badge variant="warning" className="text-xs mt-1">
                          {kpis.deadlinesProches} deadline(s) &lt; 7j
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Graphique tendances 6 mois */}
                {kpis.tendance6Mois.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Tendances 6 mois</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={kpis.tendance6Mois} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            <RechartsTooltip
                              formatter={(v: any, name: any) => [formatEuros(Number(v)), name]}
                              contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px" }}
                            />
                            <Line type="monotone" dataKey="ca" name="CA" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                            <Line type="monotone" dataKey="marge" name="Marge" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                            <RechartsLegend />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── TAB 1 : Par consultant ──────────────────────── */}
          <TabsContent value="consultants">
            <div className="flex justify-end mb-4">
              <Button variant="outline" size="sm" onClick={() => exportCsv("consultants")}>
                <Download className="h-4 w-4" /> Exporter CSV
              </Button>
            </div>
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Consultant</TableHead>
                      <TableHead className="text-right">H. totales</TableHead>
                      <TableHead className="text-right">H. fact.</TableHead>
                      <TableHead className="text-right">Taux fact.</TableHead>
                      <TableHead className="text-right">CA généré</TableHead>
                      <TableHead className="text-right">Coût réel</TableHead>
                      <TableHead className="text-right">Marge</TableHead>
                      <TableHead className="text-right">% Marge</TableHead>
                      {compareEnabled && prevData && <TableHead className="text-right">Variation CA</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.parConsultant.map((c) => {
                      const prevC = prevData?.parConsultant.find((pc) => pc.id === c.id);
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.nom}</TableCell>
                          <TableCell className="text-right">{c.heuresTotal}h</TableCell>
                          <TableCell className="text-right text-emerald-600">{c.heuresFacturables}h</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={c.tauxFacturable >= 80 ? "success" : "secondary"} className="text-xs">
                              {c.tauxFacturable}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatEuros(c.ca)}</TableCell>
                          <TableCell className="text-right text-destructive">{formatEuros(c.coutReel)}</TableCell>
                          <TableCell className="text-right font-bold text-emerald-600">{formatEuros(c.marge)}</TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={c.tauxMarge > 40 ? "success" : c.tauxMarge > 30 ? "warning" : "destructive"}
                              className="text-xs"
                            >
                              {c.tauxMarge}%
                            </Badge>
                          </TableCell>
                          {compareEnabled && prevData && (
                            <TableCell className="text-right">
                              {prevC ? (
                                <VariationBadge current={c.ca} previous={prevC.ca} />
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                    {data.parConsultant.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={compareEnabled && prevData ? 9 : 8} className="text-center py-8 text-muted-foreground">
                          Aucune donnée pour cette période
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <div className="flex gap-4 text-sm mt-4 mb-4 px-2">
              <div className="flex items-center gap-1.5">
                <Badge variant="destructive" className="text-xs">&lt; 30%</Badge>
                <span className="text-muted-foreground">Faible</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="warning" className="text-xs">30-40%</Badge>
                <span className="text-muted-foreground">Moyen</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="success" className="text-xs">&gt; 40%</Badge>
                <span className="text-muted-foreground">Bon</span>
              </div>
            </div>
            <div className="mt-4">
              <ConsultantPieChart data={data.parConsultant} />
            </div>
          </TabsContent>

          {/* ── TAB 2 : Par projet ──────────────────────────── */}
          <TabsContent value="projets">
            <div className="flex justify-end mb-4">
              <Button variant="outline" size="sm" onClick={() => exportCsv("projets")}>
                <Download className="h-4 w-4" /> Exporter CSV
              </Button>
            </div>
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Projet</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead className="text-right">Heures</TableHead>
                      <TableHead className="text-right">Budget</TableHead>
                      <TableHead className="text-right">Consommé</TableHead>
                      <TableHead className="text-right">Coût réel</TableHead>
                      <TableHead className="text-right">Marge</TableHead>
                      <TableHead>% Marge</TableHead>
                      <TableHead>% Budget</TableHead>
                      <TableHead className="text-right">% Réalisé</TableHead>
                      <TableHead>Écart</TableHead>
                      <TableHead>Date Fin Est.</TableHead>
                      {compareEnabled && prevData && <TableHead className="text-right">Var. Budget</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.parProjet.map((p) => {
                      const prevP = prevData?.parProjet.find((pp) => pp.id === p.id);
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.nom}</TableCell>
                          <TableCell className="text-muted-foreground">{p.client}</TableCell>
                          <TableCell className="text-right">{p.heures}h</TableCell>
                          <TableCell className="text-right">{formatEuros(p.budget)}</TableCell>
                          <TableCell className="text-right font-medium">{formatEuros(p.budgetConsomme)}</TableCell>
                          <TableCell className="text-right text-destructive">{formatEuros(p.coutReel)}</TableCell>
                          <TableCell className="text-right font-bold text-emerald-600">{formatEuros(p.marge)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={p.tauxMarge > 40 ? "success" : p.tauxMarge > 30 ? "warning" : "destructive"}
                              className="text-xs"
                            >
                              {p.tauxMarge}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <Progress
                                value={Math.min(p.pctBudget, 100)}
                                indicatorClassName={
                                  p.pctBudget > 100 ? "bg-destructive" : p.pctBudget >= 80 ? "bg-amber-500" : "bg-emerald-500"
                                }
                                className="h-2 flex-1"
                              />
                              <Badge
                                variant={p.pctBudget > 100 ? "destructive" : p.pctBudget >= 80 ? "warning" : "secondary"}
                                className="text-xs whitespace-nowrap"
                              >
                                {p.pctBudget}%
                              </Badge>
                            </div>
                          </TableCell>
                          {/* Progression columns */}
                          <TableCell className="text-right">
                            {p.progressionRealisationPct !== undefined ? (
                              <span className="text-sm font-medium">{p.progressionRealisationPct}%</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {p.progressionEcart !== undefined ? (
                              <Badge
                                variant={
                                  p.progressionHealth === "bon" ? "success" :
                                  p.progressionHealth === "normal" ? "default" :
                                  "destructive"
                                }
                                className="text-xs"
                              >
                                {p.progressionEcart > 0 ? "+" : ""}{p.progressionEcart}%
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {p.progressionDateFinEstimee ? (
                              <span className="text-xs">{format(new Date(p.progressionDateFinEstimee), "dd/MM/yy")}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          {compareEnabled && prevData && (
                            <TableCell className="text-right">
                              {prevP ? (
                                <VariationBadge current={p.budgetConsomme} previous={prevP.budgetConsomme} invert />
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                    {data.parProjet.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={compareEnabled && prevData ? 13 : 12} className="text-center py-8 text-muted-foreground">
                          Aucune donnée pour cette période
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <div className="mt-4">
              <ProjetBudgetChart data={data.parProjet} />
            </div>
          </TabsContent>

          {/* ── TAB 3 : Vue temporelle ──────────────────────── */}
          <TabsContent value="temporel">
            <div className="flex justify-end mb-4">
              <Button variant="outline" size="sm" onClick={() => exportCsv("activites")}>
                <Download className="h-4 w-4" /> Exporter données
              </Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <EvolutionTemporelleChart data={data.temporel.parJour} />
              <ActivityHeatmap data={data.temporel.parJour} dateDebut={dateDebut} dateFin={dateFin} />
            </div>
            <Card>
              <CardHeader><CardTitle className="text-base">Statistiques temporelles</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Moyenne / jour</p>
                    <p className="text-xl font-bold">{stats?.moyenneParJour ?? 0}h</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Jour le plus actif</p>
                    <p className="text-xl font-bold">{data.temporel.jourPlusActif}</p>
                    <p className="text-xs text-muted-foreground">{data.temporel.jourPlusActifHeures}h en moyenne</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Jour le moins actif</p>
                    <p className="text-xl font-bold">{data.temporel.jourMoinsActif}</p>
                    <p className="text-xs text-muted-foreground">{data.temporel.jourMoinsActifHeures}h en moyenne</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Jours d&apos;activité</p>
                    <p className="text-xl font-bold">{stats?.nbJours ?? 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB 4 : Facturation ─────────────────────────── */}
          <TabsContent value="facturation">
            <div className="space-y-4">
              {data.facturation.length === 0 && (
                <p className="text-center py-8 text-muted-foreground">
                  Aucune activité facturable sur cette période
                </p>
              )}
              {data.facturation.map((f) => {
                const expanded = expandedFacturation.has(f.consultant.id);
                return (
                  <Card key={f.consultant.id}>
                    <CardHeader
                      className="cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => toggleFacturation(f.consultant.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">{f.consultant.nom}</CardTitle>
                          <CardDescription>TJM : {f.consultant.tjm.toLocaleString("fr-FR")} €</CardDescription>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">{f.totalMontant.toLocaleString("fr-FR")} €</p>
                          <p className="text-sm text-muted-foreground">{f.totalHeures}h facturables</p>
                        </div>
                      </div>
                    </CardHeader>
                    {expanded && (
                      <CardContent>
                        <Separator className="mb-4" />
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Projet</TableHead>
                              <TableHead className="text-right">Heures</TableHead>
                              <TableHead className="text-right">TJM</TableHead>
                              <TableHead className="text-right">Montant</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {f.projets.map((p, i) => (
                              <TableRow key={i}>
                                <TableCell className="font-medium">{p.projetNom}</TableCell>
                                <TableCell className="text-right">{p.heures}h</TableCell>
                                <TableCell className="text-right text-muted-foreground">{f.consultant.tjm.toLocaleString("fr-FR")} €</TableCell>
                                <TableCell className="text-right font-medium">{p.montant.toLocaleString("fr-FR")} €</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* ── Section Exports ──────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exports disponibles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => exportCsv("activites")}>
              <Download className="h-4 w-4" /> Activités CSV
            </Button>
            <Button variant="outline" onClick={() => exportCsv("consultants")}>
              <Download className="h-4 w-4" /> Consultants CSV
            </Button>
            <Button variant="outline" onClick={() => exportCsv("projets")}>
              <Download className="h-4 w-4" /> Projets CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
