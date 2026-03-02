"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Activity, Clock, Target, TrendingUp, CalendarClock, AlertTriangle } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  ReferenceLine,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import type { ProgressionMetrics } from "@/lib/projet-metrics";

interface ProgressionCardProps {
  progression: ProgressionMetrics;
  dateFin: string | null;
}

export function ProgressionCard({ progression, dateFin }: ProgressionCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-semibold">
            Progression & Santé Projet
          </CardTitle>
          <Badge
            variant={
              progression.health === "bon"
                ? "success"
                : progression.health === "normal"
                  ? "default"
                  : "destructive"
            }
            className="ml-2 text-xs"
          >
            {progression.health === "bon" ? "🟢" : progression.health === "normal" ? "🟡" : "🔴"}{" "}
            {progression.healthLabel}
          </Badge>
        </div>
        <CardDescription className="text-xs mt-1">
          Méthode de calcul :{" "}
          {progression.methodeRealisation === "charges"
            ? "pondérée par charges estimées"
            : "par nombre d'étapes"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPIs Grid 2x2 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-blue-700" />
              <p className="text-xs font-medium text-muted-foreground">Budget Consommé</p>
            </div>
            <p className="text-2xl font-bold">{progression.budgetConsommePct}%</p>
            <Progress
              value={Math.min(progression.budgetConsommePct, 100)}
              className="h-2"
              indicatorClassName="bg-blue-500"
            />
            <p className="text-[11px] text-muted-foreground">
              {progression.chargeConsommee}j / {progression.chargeEstimeeTotale}j
            </p>
          </div>

          <div className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-emerald-500" />
              <p className="text-xs font-medium text-muted-foreground">Projet Réalisé</p>
            </div>
            <p className="text-2xl font-bold">{progression.realisationPct}%</p>
            <Progress
              value={Math.min(progression.realisationPct, 100)}
              className="h-2"
              indicatorClassName="bg-emerald-500"
            />
            <p className="text-[11px] text-muted-foreground">
              {progression.etapesValidees}/{progression.etapesTotal} étapes validées
            </p>
          </div>

          <div
            className={`space-y-2 p-3 rounded-lg border ${
              progression.health === "bon"
                ? "bg-emerald-500/5 border-emerald-500/30"
                : progression.health === "normal"
                  ? "bg-amber-500/5 border-amber-500/30"
                  : "bg-destructive/5 border-destructive/30"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              <p className="text-xs font-medium text-muted-foreground">Écart / Health</p>
            </div>
            <p
              className={`text-2xl font-bold ${
                progression.ecart > 0
                  ? "text-emerald-700"
                  : progression.ecart > -10
                    ? "text-amber-700"
                    : "text-destructive"
              }`}
            >
              {progression.ecart > 0 ? "+" : ""}
              {progression.ecart}%
            </p>
            <p className="text-[11px] text-muted-foreground">
              {progression.ecart > 0
                ? "On avance plus vite que prévu"
                : progression.ecart > -10
                  ? "Progression normale"
                  : "On brûle sans avancer"}
            </p>
          </div>

          <div className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5 text-violet-500" />
              <p className="text-xs font-medium text-muted-foreground">Date Fin Estimée</p>
            </div>
            {progression.dateFinEstimee ? (
              <>
                <p className="text-lg font-bold">
                  {format(new Date(progression.dateFinEstimee), "d MMM yyyy", { locale: fr })}
                </p>
                {dateFin && (
                  <p className="text-[11px] text-muted-foreground">
                    vs {format(new Date(dateFin), "d MMM", { locale: fr })} prévu
                  </p>
                )}
                <Badge variant="secondary" className="text-[10px]">
                  Confiance : {progression.confiancePrediction}%
                </Badge>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Données insuffisantes</p>
            )}
          </div>
        </div>

        {/* Graphique Évolution */}
        {progression.historique.length > 2 && (
          <>
            <Separator />
            <div>
              <h3 className="text-sm font-semibold mb-3">Évolution Budget vs Réalisation</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={progression.historique}
                    margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="jour"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: number) => `J${v}`}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: number) => `${v}%`}
                      domain={[0, "auto"]}
                    />
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <RechartsTooltip
                      formatter={(v: any, name: any) => [`${Number(v).toFixed(1)}%`, name]}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        fontSize: "13px",
                      }}
                    />
                    <ReferenceLine
                      y={100}
                      stroke="#94a3b8"
                      strokeDasharray="6 6"
                      label={{ value: "100%", position: "right", fontSize: 10 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="budget"
                      name="Budget consommé"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="realisation"
                      name="Réalisation"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                    />
                    <RechartsLegend />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {/* Détail par Étape */}
        {progression.etapesDetail.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="text-sm font-semibold mb-3">Détail par Étape</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Étape</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Estimé</TableHead>
                    <TableHead className="text-right">Réel</TableHead>
                    <TableHead className="text-right">Écart</TableHead>
                    <TableHead>Performance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {progression.etapesDetail.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium text-sm">{e.nom}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            e.statut === "VALIDEE"
                              ? "success"
                              : e.statut === "EN_COURS"
                                ? "default"
                                : "secondary"
                          }
                          className="text-xs"
                        >
                          {e.statut === "VALIDEE"
                            ? "Validée"
                            : e.statut === "EN_COURS"
                              ? "En cours"
                              : "À faire"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {e.chargeEstimeeJours !== null ? `${e.chargeEstimeeJours}j` : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {e.joursReels > 0 ? `${e.joursReels}j` : "—"}
                        {e.statut === "EN_COURS" && e.joursReels > 0 && (
                          <span className="text-muted-foreground text-xs ml-1">(partiel)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {e.ecartJours !== null && e.statut === "VALIDEE" ? (
                          <span className={e.ecartJours > 0 ? "text-destructive" : "text-emerald-700"}>
                            {e.ecartJours > 0 ? "+" : ""}
                            {e.ecartJours}j
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {e.performancePct !== null && e.statut === "VALIDEE" ? (
                          <Badge
                            variant={
                              Math.abs(e.performancePct) <= 10
                                ? "success"
                                : Math.abs(e.performancePct) <= 30
                                  ? "warning"
                                  : "destructive"
                            }
                            className="text-xs"
                          >
                            {e.performancePct > 0 ? "🟡" : "🟢"}{" "}
                            {e.performancePct > 0 ? "+" : ""}
                            {e.performancePct}%
                          </Badge>
                        ) : e.statut === "EN_COURS" ? (
                          <span className="text-xs text-muted-foreground">En cours</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {/* Alertes Intelligentes */}
        {progression.alertes.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Alertes & Recommandations</h3>
              {progression.alertes.map((alerte, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    alerte.type === "critique"
                      ? "border-destructive/30 bg-destructive/5"
                      : "border-amber-500/30 bg-amber-500/5"
                  }`}
                >
                  <AlertTriangle
                    className={`h-4 w-4 shrink-0 mt-0.5 ${
                      alerte.type === "critique" ? "text-destructive" : "text-amber-700"
                    }`}
                  />
                  <div>
                    <p
                      className={`text-sm font-medium ${
                        alerte.type === "critique" ? "text-destructive" : "text-amber-700"
                      }`}
                    >
                      {alerte.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      💡 {alerte.recommandation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
