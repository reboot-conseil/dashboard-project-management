"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Users, Pencil, ArrowUpRight, ArrowDownRight, Download, LayoutGrid, List, ExternalLink, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { startOfMonth, endOfMonth, subMonths, format, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KpiSparkline } from "@/components/charts/kpi-sparkline";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  ConsultantForm,
  type ConsultantData,
} from "@/components/consultant-form";

interface Consultant {
  id: number;
  nom: string;
  email: string;
  tjm: string | number;
  coutJournalierEmployeur: number | null;
  competences: string | null;
  actif: boolean;
  couleur?: string;
}

interface ConsultantKpi {
  id: number;
  tauxOccupation: number;
  caMois: number;
  caMoisPrecedent: number;
  sparkline: number[];
}

interface ExpandData {
  projets: { id: number; nom: string; statut: string; couleur?: string }[];
  activites: { id: number; date: string; projet: { nom: string }; etape: { nom: string } | null; heures: number }[];
  loading: boolean;
}

function occupationColor(taux: number) {
  if (taux > 80) return "#10b981";
  if (taux > 60) return "#F59E0B";
  return "#b91c1c";
}

function exportCsvConsultants(consultants: Consultant[]) {
  const rows = [
    ["Nom", "Email", "TJM (EUR)", "Actif"],
    ...consultants.map((c) => [
      c.nom ?? "",
      c.email ?? "",
      String(Number(c.tjm ?? 0)),
      c.actif ? "Oui" : "Non",
    ]),
  ];
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `consultants-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ConsultantsPage() {
  const router = useRouter();
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConsultant, setEditingConsultant] = useState<ConsultantData | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [kpis, setKpis] = useState<Map<number, ConsultantKpi>>(new Map());
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandData, setExpandData] = useState<Map<number, ExpandData>>(new Map());

  const fetchKpis = useCallback(async () => {
    try {
      const now = new Date();
      const months = [3, 2, 1, 0].map((i) => {
        const d = subMonths(now, i);
        return {
          debut: format(startOfMonth(d), "yyyy-MM-dd"),
          fin: format(endOfMonth(d), "yyyy-MM-dd"),
        };
      });

      const results = await Promise.all(
        months.map((m) =>
          fetch(`/api/rapports?dateDebut=${m.debut}&dateFin=${m.fin}`).then((r) => r.json())
        )
      );

      const joursOuvres = Math.round((30 * 5) / 7);
      const capacite = joursOuvres * 8;
      const rapData = results[3];
      const prevData = results[2];

      const map = new Map<number, ConsultantKpi>();
      for (const c of rapData.parConsultant ?? []) {
        const prevC = (prevData.parConsultant ?? []).find((pc: { id: number }) => pc.id === c.id);
        const sparkline = results.map(
          (r) => (r.parConsultant ?? []).find((pc: { id: number }) => pc.id === c.id)?.ca ?? 0
        );
        map.set(c.id, {
          id: c.id,
          tauxOccupation: capacite > 0 ? Math.round((c.heuresTotal / capacite) * 100) : 0,
          caMois: c.ca ?? 0,
          caMoisPrecedent: prevC?.ca ?? 0,
          sparkline,
        });
      }
      setKpis(map);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchKpis(); }, [fetchKpis]);

  const fetchConsultants = useCallback(async () => {
    try {
      const res = await fetch("/api/consultants");
      const data = await res.json();
      setConsultants(data);
    } catch {
      toast.error("Erreur lors du chargement des consultants");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConsultants(); }, [fetchConsultants]);

  async function loadExpandData(consultantId: number) {
    setExpandData((prev) => new Map(prev).set(consultantId, { projets: [], activites: [], loading: true }));
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const twoWeeksAgo = format(subDays(new Date(), 14), "yyyy-MM-dd");
      const res = await fetch(`/api/activites?consultantId=${consultantId}&dateDebut=${twoWeeksAgo}&dateFin=${today}`);
      const data = await res.json();
      const activites = (data.activites ?? []).slice(0, 8);
      const projetsSeen = new Set<number>();
      const projets: ExpandData["projets"] = [];
      for (const a of data.activites ?? []) {
        if (!projetsSeen.has(a.projet.id)) {
          projetsSeen.add(a.projet.id);
          projets.push({ id: a.projet.id, nom: a.projet.nom, statut: "EN_COURS", couleur: a.projet.couleur });
        }
      }
      setExpandData((prev) => new Map(prev).set(consultantId, { projets, activites, loading: false }));
    } catch {
      setExpandData((prev) => new Map(prev).set(consultantId, { projets: [], activites: [], loading: false }));
    }
  }

  function handleRowClick(consultantId: number) {
    if (expandedId === consultantId) {
      setExpandedId(null);
    } else {
      setExpandedId(consultantId);
      if (!expandData.has(consultantId)) {
        loadExpandData(consultantId);
      }
    }
  }

  function goToDashboard(consultantId: number) {
    localStorage.setItem("dashboard-active-view", JSON.stringify("consultants"));
    localStorage.setItem("lastConsultantId", String(consultantId));
    router.push("/");
  }

  function handleAdd() {
    setEditingConsultant(null);
    setDialogOpen(true);
  }

  function handleEdit(c: Consultant) {
    setEditingConsultant({
      id: c.id,
      nom: c.nom,
      email: c.email,
      tjm: Number(c.tjm),
      coutJournalierEmployeur: c.coutJournalierEmployeur,
      competences: c.competences ?? "",
      actif: c.actif,
    });
    setDialogOpen(true);
  }

  async function handleToggle(c: Consultant) {
    setTogglingId(c.id);
    try {
      const res = await fetch(`/api/consultants/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actif: !c.actif }),
      });
      if (!res.ok) { toast.error("Erreur lors de la modification"); return; }
      toast.success(c.actif ? `${c.nom} a été désactivé` : `${c.nom} a été réactivé`);
      fetchConsultants();
      router.refresh();
    } catch {
      toast.error("Erreur de connexion au serveur");
    } finally {
      setTogglingId(null);
    }
  }

  function handleSuccess() {
    toast.success(editingConsultant ? "Consultant modifié avec succès !" : "Consultant ajouté avec succès !");
    fetchConsultants();
    router.refresh();
  }

  function handleError(message: string) {
    toast.error(message);
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <h1 className="text-lg font-semibold">
            {consultants.length} consultant{consultants.length > 1 ? "s" : ""}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle Table / Cards */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors${viewMode === "table" ? " bg-primary text-primary-foreground" : " bg-card text-muted-foreground hover:bg-muted"}`}
            >
              <List className="h-3.5 w-3.5" />Table
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors${viewMode === "cards" ? " bg-primary text-primary-foreground" : " bg-card text-muted-foreground hover:bg-muted"}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />Cards
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={() => exportCsvConsultants(consultants)}>
            <Download className="h-4 w-4 mr-1.5" />Exporter CSV
          </Button>
          <Button size="sm" onClick={handleAdd}>
            <UserPlus className="h-4 w-4 mr-1.5" />Nouveau consultant
          </Button>
        </div>
      </div>

      {/* TABLE VIEW */}
      {viewMode === "table" && (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Consultant</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>TJM</TableHead>
                <TableHead>Occupation</TableHead>
                <TableHead className="text-right">CA ce mois</TableHead>
                <TableHead>Tendance</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : consultants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Aucun consultant.
                  </TableCell>
                </TableRow>
              ) : (
                consultants.map((c) => {
                  const kpi = kpis.get(c.id);
                  const tendance = kpi ? kpi.caMois - kpi.caMoisPrecedent : 0;
                  const isExpanded = expandedId === c.id;
                  const expand = expandData.get(c.id);
                  const taux = kpi?.tauxOccupation ?? 0;

                  return [
                    // Main row
                    <TableRow
                      key={c.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleRowClick(c.id)}
                    >
                      <TableCell className="w-8 text-muted-foreground">
                        {isExpanded
                          ? <ChevronDown className="h-3.5 w-3.5" />
                          : <ChevronRight className="h-3.5 w-3.5" />}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold shrink-0"
                            style={{ backgroundColor: c.couleur ?? "#8B5CF6" }}
                          >
                            {c.nom.charAt(0).toUpperCase()}
                          </span>
                          {c.nom}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{c.email}</TableCell>
                      <TableCell className="font-medium">{Number(c.tjm).toLocaleString("fr-FR")} €</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[100px]">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(taux, 100)}%`,
                                backgroundColor: occupationColor(taux),
                              }}
                            />
                          </div>
                          <span className="text-xs font-medium shrink-0 w-9 text-right">
                            {kpi ? `${taux}%` : "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {kpi ? (
                          <span className="text-sm font-medium">
                            {kpi.caMois.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {kpi ? (
                          <div className="flex items-center gap-2 min-w-[80px]">
                            <div className="w-16 shrink-0">
                              <KpiSparkline
                                data={kpi.sparkline}
                                color={tendance >= 0 ? "var(--color-success)" : "var(--color-destructive)"}
                                height={28}
                              />
                            </div>
                            <span className={`inline-flex items-center gap-0.5 text-xs font-medium shrink-0 ${tendance >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                              {tendance >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                              {kpi.caMoisPrecedent > 0 ? `${Math.abs(Math.round((tendance / kpi.caMoisPrecedent) * 100))}%` : ""}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggle(c); }}
                          disabled={togglingId === c.id}
                          className="cursor-pointer disabled:opacity-50"
                        >
                          <Badge variant={c.actif ? "success" : "secondary"}>
                            {c.actif ? "Actif" : "Inactif"}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs gap-1"
                            onClick={() => goToDashboard(c.id)}
                            title="Voir le dashboard"
                          >
                            Dashboard <ExternalLink className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(c)}
                            title="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>,

                    // Expand row
                    isExpanded && (
                      <TableRow key={`expand-${c.id}`} className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={9} className="py-4 px-6">
                          {expand?.loading ? (
                            <p className="text-sm text-muted-foreground">Chargement...</p>
                          ) : (
                            <div className="flex gap-8">
                              {/* Projets en cours */}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                                  Projets récents
                                </p>
                                {expand?.projets.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">Aucun projet récent</p>
                                ) : (
                                  <div className="space-y-1.5">
                                    {expand?.projets.map((p) => (
                                      <div key={p.id} className="flex items-center gap-2 text-sm">
                                        <span
                                          className="w-2 h-2 rounded-sm shrink-0"
                                          style={{ backgroundColor: p.couleur ?? "#6366f1" }}
                                        />
                                        {p.nom}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Activités récentes */}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                                  Activités récentes (14j)
                                </p>
                                {expand?.activites.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">Aucune activité récente</p>
                                ) : (
                                  <div className="space-y-1.5">
                                    {expand?.activites.map((a) => (
                                      <div key={a.id} className="flex items-center justify-between gap-4 text-sm">
                                        <span className="text-muted-foreground shrink-0">
                                          {format(new Date(a.date), "d MMM", { locale: fr })}
                                        </span>
                                        <span className="flex-1 truncate">{a.projet.nom}</span>
                                        {a.etape && (
                                          <span className="text-muted-foreground truncate max-w-[120px]">{a.etape.nom}</span>
                                        )}
                                        <span className="font-medium shrink-0">{a.heures}h</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ),
                  ];
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* CARDS VIEW */}
      {viewMode === "cards" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <p className="col-span-full text-center py-8 text-muted-foreground">Chargement...</p>
          ) : consultants.map((c) => {
            const kpi = kpis.get(c.id);
            const tendance = kpi ? kpi.caMois - kpi.caMoisPrecedent : 0;
            const taux = kpi?.tauxOccupation ?? 0;

            return (
              <div
                key={c.id}
                className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4"
              >
                {/* Header */}
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex items-center justify-center w-10 h-10 rounded-full text-white text-sm font-bold shrink-0"
                    style={{ backgroundColor: c.couleur ?? "#8B5CF6" }}
                  >
                    {c.nom.charAt(0).toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{c.nom}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                  </div>
                  <button
                    onClick={() => handleToggle(c)}
                    disabled={togglingId === c.id}
                    className="cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <Badge variant={c.actif ? "success" : "secondary"} className="text-xs">
                      {c.actif ? "Actif" : "Inactif"}
                    </Badge>
                  </button>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted/40 px-3 py-2">
                    <p className="text-xs text-muted-foreground">CA ce mois</p>
                    <p className="text-sm font-semibold mt-0.5">
                      {kpi ? kpi.caMois.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €" : "—"}
                    </p>
                    {kpi && kpi.caMoisPrecedent > 0 && (
                      <p className={`text-xs flex items-center gap-0.5 mt-0.5 ${tendance >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                        {tendance >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {Math.abs(Math.round((tendance / kpi.caMoisPrecedent) * 100))}%
                      </p>
                    )}
                  </div>
                  <div className="rounded-lg bg-muted/40 px-3 py-2">
                    <p className="text-xs text-muted-foreground">TJM</p>
                    <p className="text-sm font-semibold mt-0.5">
                      {Number(c.tjm).toLocaleString("fr-FR")} €
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">par jour</p>
                  </div>
                </div>

                {/* Occupation bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Occupation</span>
                    <span className="font-medium" style={{ color: occupationColor(taux) }}>
                      {kpi ? `${taux}%` : "—"}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(taux, 100)}%`,
                        backgroundColor: occupationColor(taux),
                      }}
                    />
                  </div>
                </div>

                {/* Sparkline */}
                {kpi && (
                  <div className="h-8">
                    <KpiSparkline
                      data={kpi.sparkline}
                      color={tendance >= 0 ? "var(--color-success)" : "var(--color-destructive)"}
                      height={32}
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs gap-1"
                    onClick={() => goToDashboard(c.id)}
                  >
                    Voir dashboard <ExternalLink className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(c)}
                    title="Modifier"
                    className="shrink-0"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog Form */}
      <ConsultantForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        consultant={editingConsultant}
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </div>
  );
}
