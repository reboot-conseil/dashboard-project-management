"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  Clock,
  Calendar,
  FolderOpen,
  TrendingUp,
  Plus,
  CheckCircle,
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInDays } from "date-fns";

const PROJET_COLORS = ["#3b82f6", "#6366f1", "#14b8a6", "#f43f5e", "#84cc16", "#f97316"];
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// ── Types ─────────────────────────────────────────────────────────
interface ConsultantDashData {
  // Mon activité de la semaine
  heuresSemaine: number;
  heuresMois: number;
  heuresFacturablesSemaine: number;
  tauxFacturation: number;
  // Mes projets
  mesProjets: {
    id: number;
    nom: string;
    client: string;
    statut: string;
    heuresMois: number;
    pctBudget: number;
    realisationPct: number;
    prochaineDeadline: string | null;
    couleur?: string;
  }[];
  // Activités récentes
  activitesRecentes: {
    id: number;
    date: string;
    heures: number;
    projet: string;
    description: string | null;
    facturable: boolean;
  }[];
  // Prochaines deadlines
  prochainesDeadlines: {
    id: number;
    nom: string;
    projetNom: string;
    projetCouleur?: string;
    deadline: string;
    joursRestants: number | null;
    statut: string;
  }[];
  // Semaine détail
  joursSemaine: {
    date: string;
    label: string;
    heures: number;
  }[];
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
export function DashboardConsultant() {
  const [data, setData] = useState<ConsultantDashData | null>(null);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const debutSemaine = startOfWeek(now, { weekStartsOn: 1 });
  const finSemaine = endOfWeek(now, { weekStartsOn: 1 });
  const debutMois = startOfMonth(now);
  const finMois = endOfMonth(now);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch data from existing APIs and aggregate for consultant view
      const semaineParams = new URLSearchParams({
        dateDebut: format(debutSemaine, "yyyy-MM-dd"),
        dateFin: format(finSemaine, "yyyy-MM-dd"),
      });
      const moisParams = new URLSearchParams({
        dateDebut: format(debutMois, "yyyy-MM-dd"),
        dateFin: format(finMois, "yyyy-MM-dd"),
      });

      const [dashSemaine, dashMois, projetsRes, deadlinesRes] = await Promise.all([
        fetch(`/api/dashboard?${semaineParams}`).then((r) => r.ok ? r.json() : null),
        fetch(`/api/dashboard?${moisParams}`).then((r) => r.ok ? r.json() : null),
        fetch("/api/projets?statut=EN_COURS").then((r) => r.ok ? r.json() : []),
        fetch("/api/dashboard?${semaineParams}").then((r) => r.ok ? r.json() : null),
      ]);

      // Build weekly breakdown
      const jours: { date: string; label: string; heures: number }[] = [];
      const jourNoms = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
      for (let i = 0; i < 7; i++) {
        const d = new Date(debutSemaine);
        d.setDate(d.getDate() + i);
        const dateStr = format(d, "yyyy-MM-dd");
        const dayData = dashSemaine?.chartEvolution?.find(
          (e: { date: string }) => e.date === format(d, "dd MMM", { locale: fr })
        );
        jours.push({
          date: dateStr,
          label: jourNoms[i],
          heures: dayData?.heures ?? 0,
        });
      }

      // Projets list
      const projetsArr = Array.isArray(projetsRes) ? projetsRes : [];
      const mesProjets = projetsArr.slice(0, 5).map((p: Record<string, unknown>) => ({
        id: Number(p.id),
        nom: String(p.nom ?? ""),
        client: String(p.client ?? ""),
        statut: String(p.statut ?? ""),
        heuresMois: 0,
        pctBudget: Number(p.progressionBudgetPct ?? p.pctBudget ?? 0),
        realisationPct: Number(p.progressionRealisationPct ?? 0),
        prochaineDeadline: p.prochaineDeadline ? String(p.prochaineDeadline) : null,
        couleur: p.couleur ? String(p.couleur) : undefined,
      }));

      // Activités récentes
      const activitesRecentes = (dashSemaine?.dernieresActivites ?? []).map(
        (a: { id: number; date: string; heures: number; projet: string; consultant?: string }) => ({
          id: a.id,
          date: a.date,
          heures: a.heures,
          projet: a.projet,
          description: null,
          facturable: true,
        })
      );

      // Deadlines
      const prochainesDeadlines = (dashSemaine?.prochainesDeadlines ?? []).slice(0, 5);

      // Calculate hours
      const heuresSemaine = dashSemaine?.totalHeures ?? 0;
      const heuresMois = dashMois?.totalHeures ?? 0;
      const tauxFacturation = heuresSemaine > 0 ? Math.round((dashSemaine?.totalHeures / Math.max(heuresSemaine, 1)) * 100) : 0;

      setData({
        heuresSemaine,
        heuresMois,
        heuresFacturablesSemaine: dashSemaine?.totalHeures ?? 0,
        tauxFacturation: dashMois?.tauxMarge ?? 0,
        mesProjets,
        activitesRecentes,
        prochainesDeadlines,
        joursSemaine: jours,
      });
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !data) {
    return <p className="text-center py-20 text-muted-foreground">Chargement...</p>;
  }

  if (!data) {
    return <p className="text-center py-20 text-muted-foreground">Erreur de chargement</p>;
  }

  const objectifHeuresSemaine = 40; // 5j * 8h
  const pctSemaine = Math.round((data.heuresSemaine / objectifHeuresSemaine) * 100);

  return (
    <div className="space-y-6">
      {/* ── KPI Cards ────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-medium">Ma semaine</CardDescription>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.heuresSemaine}h</div>
            <Progress
              value={Math.min(pctSemaine, 100)}
              className="h-2 mt-2"
              indicatorClassName={pctSemaine >= 100 ? "bg-emerald-500" : pctSemaine >= 70 ? "bg-primary" : "bg-amber-500"}
            />
            <p className="text-xs text-muted-foreground mt-1">{pctSemaine}% de {objectifHeuresSemaine}h</p>
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-medium">Mon mois</CardDescription>
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.heuresMois}h</div>
            <p className="text-xs text-muted-foreground mt-1">
              {format(now, "MMMM yyyy", { locale: fr })}
            </p>
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-medium">Mes projets</CardDescription>
            <FolderOpen className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.mesProjets.length}</div>
            <p className="text-xs text-muted-foreground mt-1">projets en cours</p>
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-medium">Deadlines proches</CardDescription>
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {data.prochainesDeadlines.filter((d) => d.joursRestants !== null && d.joursRestants <= 7).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">dans les 7 prochains jours</p>
          </CardContent>
        </Card>
      </section>

      {/* ── Calendrier Semaine + Saisie Rapide ──────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Calendrier hebdo */}
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Semaine du {format(debutSemaine, "d MMM", { locale: fr })}
              </CardTitle>
              <Link href="/activites">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Saisir
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {data.joursSemaine.map((jour) => {
                const isToday = jour.date === format(now, "yyyy-MM-dd");
                const hasHours = jour.heures > 0;
                return (
                  <div
                    key={jour.date}
                    className={`text-center rounded-lg p-2 transition-colors ${
                      isToday
                        ? "bg-primary/10 border-2 border-primary"
                        : hasHours
                          ? "bg-muted/50 border border-border"
                          : "border border-border/50"
                    }`}
                  >
                    <p className={`text-xs font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                      {jour.label}
                    </p>
                    <p className={`text-lg font-bold mt-1 ${hasHours ? "text-foreground" : "text-muted-foreground/40"}`}>
                      {jour.heures > 0 ? `${jour.heures}h` : "-"}
                    </p>
                  </div>
                );
              })}
            </div>
            <Separator className="my-3" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total semaine</span>
              <span className="font-bold">{data.heuresSemaine}h / {objectifHeuresSemaine}h</span>
            </div>
          </CardContent>
        </Card>

        {/* Mes projets */}
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Mes projets actifs</CardTitle>
              <Link href="/projets">
                <Button variant="ghost" size="sm" className="text-xs">
                  Voir tous
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.mesProjets.length > 0 ? (
              data.mesProjets.map((p, i) => {
                const color = p.couleur ?? PROJET_COLORS[i % PROJET_COLORS.length];
                const budgetBarColor = p.pctBudget > 100 ? "#b91c1c" : p.pctBudget > 85 ? "#f97316" : "#2563EB";
                const margeLabel = p.realisationPct >= 40 ? "Bon" : p.realisationPct >= 30 ? "Moyen" : "Faible";
                const margeBadgeClasses = p.realisationPct >= 40
                  ? "bg-success/10 text-success"
                  : p.realisationPct >= 30
                  ? "bg-warning/10 text-warning-foreground"
                  : "bg-destructive/10 text-destructive";
                const joursRestants = p.prochaineDeadline
                  ? differenceInDays(new Date(p.prochaineDeadline), new Date())
                  : null;
                const joursLabel = joursRestants != null
                  ? joursRestants < 0 ? `J${joursRestants} retard` : `J+${joursRestants}`
                  : null;
                const joursColor = joursRestants != null
                  ? joursRestants < 0 ? "text-destructive"
                  : joursRestants <= 7 ? "text-destructive"
                  : joursRestants <= 14 ? "text-warning"
                  : "text-muted-foreground"
                  : "";
                return (
                  <div key={p.id} className="relative rounded-xl border border-border overflow-hidden hover:-translate-y-px hover:shadow-sm transition-all">
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ background: color }} />
                    <div className="pl-4 pr-4 py-3.5">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="text-[14px] font-bold text-foreground leading-tight">{p.nom}</div>
                          <div className="text-[12px] text-muted-foreground mt-0.5">{p.client}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3 mt-0.5">
                          <span className={cn("text-[11.5px] font-semibold px-2 py-0.5 rounded-md", margeBadgeClasses)}>
                            {margeLabel}
                          </span>
                          <Link href={`/projets/${p.id}`} className="text-muted-foreground hover:text-primary transition-colors">
                            <ArrowUpRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <span className="text-[11px] text-muted-foreground w-12 shrink-0">Budget</span>
                        <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(p.pctBudget, 100)}%`, background: budgetBarColor }} />
                        </div>
                        <span className="text-[11.5px] font-bold w-9 text-right" style={{ color: budgetBarColor }}>{p.pctBudget.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-[11px] text-muted-foreground w-12 shrink-0">Réalisé</span>
                        <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                          <div className="h-full rounded-full bg-[#10b981]" style={{ width: `${p.realisationPct}%` }} />
                        </div>
                        <span className="text-[11.5px] font-bold text-muted-foreground w-9 text-right">{p.realisationPct.toFixed(1)}%</span>
                      </div>
                      {joursLabel && (
                        <div className={cn("text-right text-[11px] font-semibold mt-1.5", joursColor)}>
                          {joursLabel}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center py-8 text-muted-foreground text-sm">
                Aucun projet en cours
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── Activités récentes + Deadlines ─────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Activités récentes */}
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Activités récentes</CardTitle>
              <Link href="/activites">
                <Button variant="ghost" size="sm" className="text-xs">
                  Voir tout
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.activitesRecentes.length > 0 ? (
              data.activitesRecentes.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{a.projet}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(a.date), "dd/MM/yyyy")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {a.facturable && (
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                    )}
                    <span className="text-sm font-bold">{a.heures}h</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-8 text-muted-foreground text-sm">
                Aucune activité récente
              </p>
            )}
          </CardContent>
        </Card>

        {/* Prochaines deadlines */}
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Mes prochaines deadlines</CardTitle>
          </CardHeader>
          <CardContent>
            {data.prochainesDeadlines.length > 0 ? (
              <div className="grid grid-cols-2 gap-1.5">
                {data.prochainesDeadlines.map((d) => {
                  const dotColor = d.projetCouleur ?? "#3b82f6";
                  const dateColor = d.joursRestants !== null && d.joursRestants < 0
                    ? "text-destructive"
                    : d.joursRestants !== null && d.joursRestants <= 7
                    ? "text-destructive"
                    : d.joursRestants !== null && d.joursRestants <= 14
                    ? "text-warning"
                    : "text-muted-foreground";
                  return (
                    <div key={d.id} className="bg-card rounded-lg px-2.5 py-2 border border-border" style={{ borderLeft: `3px solid ${dotColor}` }}>
                      <div className="flex items-baseline justify-between gap-1">
                        <span className="text-[12.5px] font-bold text-foreground truncate">{d.nom}</span>
                        <span className={`text-[11.5px] font-bold shrink-0 ${dateColor}`}>
                          {new Date(d.deadline).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-1.5 h-1.5 rounded-sm shrink-0" style={{ background: dotColor }} />
                        <span className="text-[10.5px] text-muted-foreground truncate">{d.projetNom}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground text-sm">
                Aucune deadline à venir
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
