"use client";

import { useEffect, useState, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Target,
  AlertTriangle,
  Zap,
  PieChart as PieIcon,
  BarChart3,
  Clock,
  CheckCircle,
  Settings,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────
interface ExecutiveData {
  caAnnuel: number;
  coutAnnuel: number;
  margeGlobale: number;
  tauxMargeGlobal: number;
  projectionCA: number;
  tauxFacturation: number;
  tauxOccupation: number;
  heuresAnnee: number;
  consultantsActifs: number;
  projetsActifs: number;
  pctEtapesATemps: number;

  roiDistribution: { excellent: number; bon: number; moyen: number; faible: number };
  top3Rentables: { projetId: number; projetNom: string; client: string; roi: number; ca: number; cout: number }[];
  projetsSurveiller: { projetId: number; projetNom: string; client: string; roi: number; ca: number; cout: number }[];

  pipelineCA: number;
  projetsPlanifies: number;
  previsions3Mois: { mois: string; caPrevu: number }[];
  risques: { type: string; description: string; impact: string; projetNom?: string }[];

  utilisationParConsultant: { id: number; nom: string; heures: number; capacite: number; taux: number }[];
  capaciteDisponible: number;
  joursHommeDisponibles: number;
  besoinRecrutement: number;

  tendance12Mois: { mois: string; ca: number; marge: number; couts: number }[];
  comparaisonMois: {
    actuel: { mois: string; ca: number; marge: number; couts: number } | null;
    precedent: { mois: string; ca: number; marge: number; couts: number } | null;
  };

  actions: { titre: string; description: string; priorite: string; impact: string }[];
}

interface ObjectifsAnnuels {
  caObjectif: number;
}

// ── Helpers ───────────────────────────────────────────────────────
function formatEuros(montant: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(montant);
}

function formatK(montant: number) {
  if (montant >= 1000000) return `${(montant / 1000000).toFixed(1)}M €`;
  if (montant >= 1000) return `${Math.round(montant / 1000)}k €`;
  return `${montant} €`;
}

const STORAGE_KEY = "executive-objectifs";

const PIE_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"];

function exportCsvFacturation(data: ExecutiveData) {
  const rows = [
    ["Mois", "CA (EUR)", "Marge (EUR)", "Couts (EUR)"],
    ...data.tendance12Mois.map((t) => [
      t.mois ?? "",
      String(Math.round(t.ca ?? 0)),
      String(Math.round(t.marge ?? 0)),
      String(Math.round(t.couts ?? 0)),
    ]),
  ];
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `facturation-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Page ──────────────────────────────────────────────────────────
export default function ExecutivePage() {
  const [data, setData] = useState<ExecutiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [objectifs, setObjectifs] = useState<ObjectifsAnnuels>({ caObjectif: 0 });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tempObjectifs, setTempObjectifs] = useState<ObjectifsAnnuels>({ caObjectif: 0 });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setObjectifs(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/executive");
      const d = await res.json();
      setData(d);
    } catch {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function openDialog() {
    setTempObjectifs({ ...objectifs });
    setDialogOpen(true);
  }

  function saveObjectifs() {
    setObjectifs(tempObjectifs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tempObjectifs));
    setDialogOpen(false);
  }

  if (loading && !data) {
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <p className="text-center py-20 text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <p className="text-center py-20 text-muted-foreground">Erreur de chargement</p>
      </div>
    );
  }

  const pctCA = objectifs.caObjectif > 0 ? Math.round((data.caAnnuel / objectifs.caObjectif) * 100) : 0;

  const roiPieData = [
    { name: "> 50%", value: data.roiDistribution.excellent },
    { name: "25-50%", value: data.roiDistribution.bon },
    { name: "10-25%", value: data.roiDistribution.moyen },
    { name: "< 10%", value: data.roiDistribution.faible },
  ].filter((d) => d.value > 0);

  const varCA = data.comparaisonMois.actuel && data.comparaisonMois.precedent
    ? data.comparaisonMois.actuel.ca - data.comparaisonMois.precedent.ca
    : null;
  const varMarge = data.comparaisonMois.actuel && data.comparaisonMois.precedent
    ? data.comparaisonMois.actuel.marge - data.comparaisonMois.precedent.marge
    : null;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vue Dirigeant</h1>
          <p className="text-muted-foreground">Vision globale et pilotage stratégique</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={openDialog} className="gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            Configurer
          </Button>
        </div>
      </div>

      {/* ── 1. Performance Globale ─────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle>Performance Globale</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* CA Annuel */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">CA Annuel</p>
              <p className="text-2xl font-bold">{formatK(data.caAnnuel)}</p>
              {objectifs.caObjectif > 0 && (
                <>
                  <Progress
                    value={Math.min(pctCA, 100)}
                    className="h-2.5"
                    indicatorClassName={pctCA >= 100 ? "bg-emerald-500" : pctCA >= 70 ? "bg-primary" : "bg-amber-500"}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Réalisé : {pctCA}%</span>
                    <span>Objectif : {formatK(objectifs.caObjectif)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Projection : <span className="font-semibold text-foreground">{formatK(data.projectionCA)}</span>
                  </p>
                </>
              )}
              {objectifs.caObjectif === 0 && (
                <p className="text-xs text-muted-foreground">Projection : {formatK(data.projectionCA)}</p>
              )}
            </div>

            {/* Marge Globale */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Marge Globale</p>
              <p className={`text-2xl font-bold ${data.margeGlobale >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                {formatK(data.margeGlobale)}
              </p>
              <Badge variant={data.tauxMargeGlobal > 40 ? "success" : data.tauxMargeGlobal > 30 ? "warning" : "destructive"}>
                Taux : {data.tauxMargeGlobal}%
              </Badge>
            </div>

            {/* Taux Facturation */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Taux Facturation</p>
              <p className="text-2xl font-bold">{data.tauxFacturation}%</p>
              <Badge variant={data.tauxFacturation >= 85 ? "success" : data.tauxFacturation >= 70 ? "warning" : "destructive"}>
                Objectif : 85%
              </Badge>
            </div>

            {/* Capacité Équipe */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Capacité Équipe</p>
              <p className="text-2xl font-bold">{data.tauxOccupation}%</p>
              <p className="text-xs text-muted-foreground">
                {data.consultantsActifs} consultants actifs
              </p>
              {data.besoinRecrutement > 0 && (
                <Badge variant="warning" className="text-xs">
                  Besoin : +{data.besoinRecrutement} consultant(s)
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 2-3-4. Rentabilité + Pipeline + Équipe ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 2. Analyse Rentabilité */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <PieIcon className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-base">Analyse Rentabilité</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {roiPieData.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={roiPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" nameKey="name">
                      {roiPieData.map((_e, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée ROI</p>
            )}

            <Separator />
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Top 3 rentables</p>
              {data.top3Rentables.map((p) => (
                <div key={p.projetId} className="flex items-center justify-between py-1.5">
                  <span className="text-sm truncate">{p.projetNom}</span>
                  <Badge variant="success" className="text-xs">{p.roi}%</Badge>
                </div>
              ))}
              {data.top3Rentables.length === 0 && (
                <p className="text-xs text-muted-foreground">Aucun projet</p>
              )}
            </div>

            {data.projetsSurveiller.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-semibold text-amber-600 mb-2">À surveiller (ROI &lt; 25%)</p>
                  {data.projetsSurveiller.slice(0, 3).map((p) => (
                    <div key={p.projetId} className="flex items-center justify-between py-1.5">
                      <span className="text-sm truncate">{p.projetNom}</span>
                      <Badge variant={p.roi < 10 ? "destructive" : "warning"} className="text-xs">{p.roi}%</Badge>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 3. Pipeline & Prévisions */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-base">Pipeline & Prévisions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pipeline (planifiés)</p>
                <p className="text-2xl font-bold">{formatK(data.pipelineCA)}</p>
              </div>
              <Badge variant="secondary">{data.projetsPlanifies} projets</Badge>
            </div>

            <Separator />
            <p className="text-xs font-semibold text-muted-foreground">Prévisions CA 3 mois</p>
            {data.previsions3Mois.length > 0 ? (
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.previsions3Mois}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <Tooltip formatter={(v: any) => [formatEuros(Number(v)), "CA Prévu"]} />
                    <Bar dataKey="caPrevu" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">Pas de données</p>
            )}

            {data.risques.length > 0 && (
              <>
                <Separator />
                <p className="text-xs font-semibold text-destructive mb-2">Risques identifiés</p>
                {data.risques.slice(0, 4).map((r, i) => (
                  <div key={i} className="flex items-start gap-2 py-1">
                    <ShieldAlert className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium">{r.projetNom}</p>
                      <p className="text-xs text-muted-foreground">{r.description}</p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>

        {/* 4. Équipe & Capacité */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-violet-600" />
              <CardTitle className="text-base">Équipe & Capacité</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.utilisationParConsultant.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.utilisationParConsultant} layout="vertical" margin={{ left: 60, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="nom" tick={{ fontSize: 11 }} width={55} />
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <Tooltip formatter={(v: any) => [`${v}%`, "Taux occupation"]} />
                    <Bar dataKey="taux" radius={[0, 4, 4, 0]}>
                      {data.utilisationParConsultant.map((c, i) => (
                        <Cell key={i} fill={c.taux > 90 ? "#ef4444" : c.taux > 70 ? "#10b981" : c.taux > 50 ? "#f59e0b" : "#94a3b8"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Aucun consultant</p>
            )}

            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Capacité disponible</p>
                <p className="text-lg font-bold">{data.joursHommeDisponibles}j/h</p>
                <p className="text-xs text-muted-foreground">{Math.round(data.capaciteDisponible)}h</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Besoin recrutement</p>
                <p className="text-lg font-bold">{data.besoinRecrutement > 0 ? `+${data.besoinRecrutement}` : "Aucun"}</p>
                {data.besoinRecrutement > 0 && (
                  <Badge variant="warning" className="text-xs mt-1">Capacité tendue</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 5. Tendances 12 mois ───────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Tendances 12 mois</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.tendance12Mois} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Tooltip
                  formatter={(v: any, name: any) => [formatEuros(Number(v)), name]}
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px" }}
                />
                <Line type="monotone" dataKey="ca" name="CA" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="marge" name="Marge" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="couts" name="Coûts" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
                {objectifs.caObjectif > 0 && (
                  <Line
                    type="monotone"
                    dataKey={() => Math.round(objectifs.caObjectif / 12)}
                    name="Objectif mensuel"
                    stroke="#94a3b8"
                    strokeWidth={1}
                    strokeDasharray="10 5"
                    dot={false}
                  />
                )}
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Comparaison mois */}
          {data.comparaisonMois.actuel && data.comparaisonMois.precedent && (
            <>
              <Separator className="my-4" />
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">CA</p>
                  <p className="text-lg font-bold">{formatK(data.comparaisonMois.actuel.ca)}</p>
                  {varCA !== null && (
                    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${varCA >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                      {varCA >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {varCA >= 0 ? "+" : ""}{formatK(varCA)} vs mois dernier
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Marge</p>
                  <p className="text-lg font-bold">{formatK(data.comparaisonMois.actuel.marge)}</p>
                  {varMarge !== null && (
                    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${varMarge >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                      {varMarge >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {varMarge >= 0 ? "+" : ""}{formatK(varMarge)}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Coûts</p>
                  <p className="text-lg font-bold">{formatK(data.comparaisonMois.actuel.couts)}</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── 6. Actions Recommandées ─────────────────────────────── */}
      {data.actions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-base">Actions Recommandées</CardTitle>
              <Badge variant="secondary" className="text-xs">{data.actions.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.actions.map((action, i) => {
              const prioriteColor = action.priorite === "haute"
                ? "border-destructive/40 bg-destructive/5"
                : action.priorite === "moyenne"
                  ? "border-amber-500/40 bg-amber-500/5"
                  : "border-blue-500/40 bg-blue-500/5";
              const prioriteBadge = action.priorite === "haute"
                ? "destructive" as const
                : action.priorite === "moyenne"
                  ? "warning" as const
                  : "secondary" as const;

              return (
                <div key={i} className={`p-4 rounded-lg border ${prioriteColor}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{action.titre}</p>
                        <Badge variant={prioriteBadge} className="text-[10px] px-1.5 py-0">
                          {action.priorite}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{action.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-muted-foreground">Impact estimé</p>
                      <p className="text-xs font-medium">{action.impact}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ── Dialog Objectifs Annuels ────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Objectifs annuels</DialogTitle>
            <DialogDescription>
              Définissez votre objectif de CA annuel pour le suivi de progression.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="exec-ca">Objectif CA annuel (€)</Label>
              <Input
                id="exec-ca"
                type="number"
                min="0"
                step="10000"
                value={tempObjectifs.caObjectif || ""}
                onChange={(e) => setTempObjectifs({ caObjectif: parseFloat(e.target.value) || 0 })}
                placeholder="ex: 500000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={saveObjectifs}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
