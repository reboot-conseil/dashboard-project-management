"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Clock } from "lucide-react";
import { toast } from "sonner";
import { format, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ProjetForm, type ProjetData } from "@/components/projet-form";
import { EtapeForm, type EtapeData } from "@/components/etape-form";
import {
  HeuresConsultantProjetChart,
  EvolutionHeuresProjetChart,
} from "@/components/projet-charts";
import { KanbanBoard } from "@/components/projets/kanban-board";
import { BudgetCard } from "@/components/projets/budget-card";
import { ProgressionCard } from "@/components/projets/progression-card";
import { ActivitesTable } from "@/components/projets/activites-table";
import type { Etape, ProjetDetail } from "@/components/projets/types";
import type { ProgressionMetrics } from "@/lib/projet-metrics";

// ── Helpers ────────────────────────────────────────────────────
function statutProjetBadge(statut: string) {
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

function statutEtapeLabel(statut: string) {
  switch (statut) {
    case "A_FAIRE":
      return "À faire";
    case "EN_COURS":
      return "En cours";
    case "VALIDEE":
      return "Validée";
    default:
      return statut;
  }
}

function budgetColor(pct: number) {
  if (pct > 100) return "bg-destructive";
  if (pct >= 80) return "bg-amber-500";
  return "bg-emerald-500";
}

function formatEuros(montant: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(montant);
}

// ── Page ───────────────────────────────────────────────────────
export default function ProjetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projetId = Number(params.id);

  const [projet, setProjet] = useState<ProjetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [etapeDialogOpen, setEtapeDialogOpen] = useState(false);
  const [editingEtape, setEditingEtape] = useState<EtapeData | null>(null);
  const [defaultEtapeStatut, setDefaultEtapeStatut] = useState<"A_FAIRE" | "EN_COURS" | "VALIDEE">("A_FAIRE");
  const [filtreEtapeId, setFiltreEtapeId] = useState<number | null>(null);
  const [progression, setProgression] = useState<ProgressionMetrics | null>(null);

  const fetchProgression = useCallback(async () => {
    try {
      const res = await fetch(`/api/projets/${projetId}/progression`);
      if (res.ok) {
        const data = await res.json();
        setProgression(data);
      }
    } catch { /* silent */ }
  }, [projetId]);

  const fetchProjet = useCallback(async () => {
    try {
      const res = await fetch(`/api/projets/${projetId}`);
      if (!res.ok) {
        toast.error("Projet non trouvé");
        router.push("/projets");
        return;
      }
      const data = await res.json();
      setProjet(data);
    } catch {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [projetId, router]);

  useEffect(() => {
    fetchProjet();
    fetchProgression();
  }, [fetchProjet, fetchProgression]);

  // ── Handlers étapes ──────────────────────────────────────────
  function handleAddEtape(statut: "A_FAIRE" | "EN_COURS" | "VALIDEE") {
    setEditingEtape(null);
    setDefaultEtapeStatut(statut);
    setEtapeDialogOpen(true);
  }

  function handleEditEtape(e: Etape) {
    setEditingEtape({
      id: e.id,
      projetId: e.projetId,
      nom: e.nom,
      description: e.description ?? "",
      deadline: e.deadline ?? "",
      chargeEstimeeJours: e.chargeEstimeeJours ?? null,
      ordre: e.ordre,
      statut: e.statut,
    });
    setEtapeDialogOpen(true);
  }

  async function handleDeleteEtape(e: Etape) {
    if (!confirm(`Supprimer l'étape "${e.nom}" ?`)) return;
    try {
      const res = await fetch(`/api/etapes/${e.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Erreur lors de la suppression");
        return;
      }
      toast.success("Étape supprimée");
      fetchProjet();
    } catch {
      toast.error("Erreur de connexion");
    }
  }

  async function handleMoveEtape(e: Etape, direction: "forward" | "backward") {
    const order: ("A_FAIRE" | "EN_COURS" | "VALIDEE")[] = ["A_FAIRE", "EN_COURS", "VALIDEE"];
    const idx = order.indexOf(e.statut);
    const newIdx = direction === "forward" ? idx + 1 : idx - 1;
    if (newIdx < 0 || newIdx >= order.length) return;

    try {
      const res = await fetch(`/api/etapes/${e.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: order[newIdx] }),
      });
      if (!res.ok) {
        toast.error("Erreur lors du déplacement");
        return;
      }
      toast.success(`Étape déplacée vers "${statutEtapeLabel(order[newIdx])}"`);
      fetchProjet();
    } catch {
      toast.error("Erreur de connexion");
    }
  }

  // ── Données graphiques ───────────────────────────────────────
  function getChartData() {
    if (!projet) return { consultantData: [], weeklyData: [] };

    const consultantMap = new Map<string, { heures: number; couleur: string }>();
    for (const a of projet.activites) {
      const { nom, couleur } = a.consultant ?? { nom: "Non attribué", couleur: "#94a3b8" };
      if (!consultantMap.has(nom)) consultantMap.set(nom, { heures: 0, couleur: couleur ?? "#3b82f6" });
      consultantMap.get(nom)!.heures += Number(a.heures);
    }
    const consultantData = Array.from(consultantMap.entries()).map(
      ([nom, { heures, couleur }]) => ({ nom, heures, couleur })
    );

    const weekMap = new Map<string, number>();
    for (const a of projet.activites) {
      const week = startOfWeek(new Date(a.date), { weekStartsOn: 1 });
      const key = format(week, "dd/MM", { locale: fr });
      weekMap.set(key, (weekMap.get(key) ?? 0) + Number(a.heures));
    }
    const weeklyData = Array.from(weekMap.entries())
      .map(([semaine, heures]) => ({ semaine: `Sem. ${semaine}`, heures }))
      .reverse();

    return { consultantData, weeklyData };
  }

  // ── Render ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <p className="text-center py-20 text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!projet) return null;

  const budgetNum = Number(projet.budget);
  const pctBudget = budgetNum > 0 ? Math.round((projet.budgetConsomme / budgetNum) * 100) : 0;
  const badge = statutProjetBadge(projet.statut);
  const { consultantData, weeklyData } = getChartData();
  const nextOrdre =
    projet.etapes.length > 0
      ? Math.max(...projet.etapes.map((e) => e.ordre)) + 1
      : 1;

  // Heures par étape
  const heuresParEtape = new Map<number, number>();
  for (const a of projet.activites) {
    if (a.etape) {
      heuresParEtape.set(a.etape.id, (heuresParEtape.get(a.etape.id) ?? 0) + Number(a.heures));
    }
  }

  const projetFormData: ProjetData = {
    id: projet.id,
    nom: projet.nom,
    client: projet.client,
    budget: budgetNum,
    chargeEstimeeTotale: projet.chargeEstimeeTotale ?? null,
    dateDebut: projet.dateDebut ?? "",
    dateFin: projet.dateFin ?? "",
    statut: projet.statut,
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/projets" className="hover:text-foreground transition-colors">
            Projets
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">{projet.nom}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/projets">
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Link>
          </Button>
          <Button size="sm" onClick={() => setEditDialogOpen(true)}>
            <Pencil className="h-4 w-4" />
            Modifier
          </Button>
        </div>
      </div>

      {/* ── Infos projet ────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">{projet.nom}</CardTitle>
              <CardDescription className="text-base mt-1">
                {projet.client}
              </CardDescription>
            </div>
            <Badge variant={badge.variant} className="text-sm px-3 py-1">
              {badge.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Période</p>
              <p className="font-medium">
                {projet.dateDebut
                  ? format(new Date(projet.dateDebut), "dd/MM/yyyy")
                  : "—"}
                {" → "}
                {projet.dateFin
                  ? format(new Date(projet.dateFin), "dd/MM/yyyy")
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Heures totales</p>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-xl font-bold">{projet.totalHeures}h</span>
              </div>
            </div>
            <div className="sm:col-span-2">
              <p className="text-sm text-muted-foreground mb-1">Budget</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">
                    {formatEuros(projet.budgetConsomme)}
                  </span>
                  <span className="text-muted-foreground">
                    / {formatEuros(budgetNum)}
                  </span>
                </div>
                <Progress value={pctBudget} indicatorClassName={budgetColor(pctBudget)} />
                <p className="text-xs text-muted-foreground text-right">
                  {pctBudget}% consommé
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Analyse Budgétaire ──────────────────────────────────── */}
      {budgetNum > 0 && (
        <BudgetCard
          budgetNum={budgetNum}
          budgetConsomme={projet.budgetConsomme}
          coutReel={projet.coutReel}
          marge={projet.marge}
        />
      )}

      {/* ── Progression & Santé Projet ─────────────────────────── */}
      {progression && (progression.chargeEstimeeTotale > 0 || progression.etapesTotal > 0) && (
        <ProgressionCard progression={progression} dateFin={projet.dateFin} />
      )}

      {/* ── Graphiques ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HeuresConsultantProjetChart data={consultantData} />
        <EvolutionHeuresProjetChart data={weeklyData} />
      </div>

      <Separator />

      {/* ── Kanban Étapes ───────────────────────────────────────── */}
      <KanbanBoard
        etapes={projet.etapes}
        heuresParEtape={heuresParEtape}
        filtreEtapeId={filtreEtapeId}
        onFiltreEtapeId={setFiltreEtapeId}
        onAddEtape={handleAddEtape}
        onEditEtape={handleEditEtape}
        onDeleteEtape={handleDeleteEtape}
        onMoveEtape={handleMoveEtape}
      />

      <Separator />

      {/* ── Activités ───────────────────────────────────────────── */}
      <ActivitesTable
        activites={projet.activites}
        etapes={projet.etapes}
        filtreEtapeId={filtreEtapeId}
        onClearFiltre={() => setFiltreEtapeId(null)}
      />

      {/* ── Dialogs ─────────────────────────────────────────────── */}
      <ProjetForm
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        projet={projetFormData}
        onSuccess={() => {
          toast.success("Projet modifié avec succès !");
          fetchProjet();
        }}
        onError={(msg) => toast.error(msg)}
      />

      <EtapeForm
        open={etapeDialogOpen}
        onOpenChange={setEtapeDialogOpen}
        etape={editingEtape}
        projetId={projetId}
        nextOrdre={nextOrdre}
        defaultStatut={defaultEtapeStatut}
        onSuccess={() => {
          toast.success(editingEtape ? "Étape modifiée !" : "Étape ajoutée !");
          fetchProjet();
        }}
        onError={(msg) => toast.error(msg)}
      />
    </div>
  );
}
