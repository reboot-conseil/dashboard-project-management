"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { Toaster } from "sonner";
import {
  Clock,
  Calendar,
  TrendingUp,
  Percent,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  User,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// ── Types ───────────────────────────────────────────────────────────────────

interface Consultant {
  id: number;
  nom: string;
  couleur: string;
}

interface Projet {
  id: number;
  nom: string;
  client: string;
  statut: string;
  couleur: string;
  dateDebut: string | null;
  dateFin: string | null;
}

interface Etape {
  id: number;
  nom: string;
  ordre: number;
  statut: string;
}

interface ActiviteRecente {
  id: number;
  date: string;
  heures: number;
  description: string | null;
  facturable: boolean;
  consultant: { id: number; nom: string; couleur: string };
  etape: { id: number; nom: string } | null;
}

interface Stats {
  heuresSemaine: number;
  heuresMois: number;
  heuresTotal: number;
  pctFacturable: number;
  heuresPerso: number;
}

interface DashboardData {
  projet: Projet;
  stats: Stats;
  activitesRecentes: ActiviteRecente[];
  etapes: Etape[];
}

interface FormState {
  heures: string;
  description: string;
  etapeId: string;
  dateType: "today" | "yesterday" | "day-before" | "custom";
  customDate: string;
}

interface EditModalState {
  open: boolean;
  activite: ActiviteRecente | null;
  heures: string;
  description: string;
  etapeId: string;
  date: string;
  saving: boolean;
}

const STORAGE_KEY = "teams-dashboard-consultant-id";

// ── Statut badge ─────────────────────────────────────────────────────────────

function StatutBadge({ statut }: { statut: string }) {
  const config: Record<string, { label: string; className: string }> = {
    EN_COURS: { label: "En cours", className: "bg-blue-100 text-blue-700 border-blue-200" },
    PLANIFIE: { label: "Planifié", className: "bg-slate-100 text-slate-700 border-slate-200" },
    EN_PAUSE: { label: "En pause", className: "bg-amber-100 text-amber-700 border-amber-200" },
    TERMINE: { label: "Terminé", className: "bg-green-100 text-green-700 border-green-200" },
  };
  const c = config[statut] ?? { label: statut, className: "bg-slate-100 text-slate-600 border-slate-200" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.className}`}>
      {c.label}
    </span>
  );
}

// ── Skeleton loader ────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl p-5 bg-slate-100 space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border bg-white p-4 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-14" />
          </div>
        ))}
      </div>
      {/* Form */}
      <div className="rounded-lg border bg-white p-5 space-y-4">
        <Skeleton className="h-5 w-40" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

// ── Fonction utilitaire date ───────────────────────────────────────────────

function getDateFromType(
  dateType: FormState["dateType"],
  customDate: string
): string {
  const today = new Date();
  switch (dateType) {
    case "today":
      return format(today, "yyyy-MM-dd");
    case "yesterday":
      return format(subDays(today, 1), "yyyy-MM-dd");
    case "day-before":
      return format(subDays(today, 2), "yyyy-MM-dd");
    case "custom":
      return customDate;
    default:
      return format(today, "yyyy-MM-dd");
  }
}

// ── Composant principal ────────────────────────────────────────────────────

function TeamsDashboard() {
  const searchParams = useSearchParams();
  const projetIdParam = searchParams.get("projetId");

  // ── État global ──────────────────────────────────────────────────────────
  const [hydrated, setHydrated] = useState(false);
  const [consultantId, setConsultantId] = useState<number | null>(null);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [loadingConsultants, setLoadingConsultants] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // ── Formulaire ───────────────────────────────────────────────────────────
  const [form, setForm] = useState<FormState>({
    heures: "",
    description: "",
    etapeId: "",
    dateType: "today",
    customDate: format(new Date(), "yyyy-MM-dd"),
  });

  // ── Modal édition ────────────────────────────────────────────────────────
  const [editModal, setEditModal] = useState<EditModalState>({
    open: false,
    activite: null,
    heures: "",
    description: "",
    etapeId: "",
    date: "",
    saving: false,
  });

  // ── Hydratation localStorage ─────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setConsultantId(parseInt(saved));
    setHydrated(true);
  }, []);

  // ── Charger liste consultants ────────────────────────────────────────────
  useEffect(() => {
    if (!hydrated) return;
    setLoadingConsultants(true);
    fetch("/api/consultants")
      .then((r) => r.json())
      .then((list: Consultant[]) => setConsultants(list.filter((c: any) => c.actif !== false)))
      .catch(() => toast.error("Impossible de charger les consultants"))
      .finally(() => setLoadingConsultants(false));
  }, [hydrated]);

  // ── Charger données dashboard ────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!projetIdParam || !consultantId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/teams-dashboard/stats?projetId=${projetIdParam}&consultantId=${consultantId}`
      );
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Erreur lors du chargement");
        return;
      }
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Impossible de charger les données");
    } finally {
      setLoading(false);
    }
  }, [projetIdParam, consultantId]);

  useEffect(() => {
    if (hydrated && consultantId && projetIdParam) {
      loadData();
    }
  }, [hydrated, consultantId, projetIdParam, loadData]);

  // ── Sélectionner consultant ──────────────────────────────────────────────
  function handleSelectConsultant(id: number) {
    setConsultantId(id);
    localStorage.setItem(STORAGE_KEY, String(id));
  }

  // ── Soumettre formulaire rapide ──────────────────────────────────────────
  async function handleSubmitLog(e: React.FormEvent) {
    e.preventDefault();
    if (!consultantId || !projetIdParam) return;

    const heuresNum = parseFloat(form.heures);
    if (isNaN(heuresNum) || heuresNum <= 0) {
      toast.error("Veuillez saisir un nombre d'heures valide");
      return;
    }

    const dateStr = getDateFromType(form.dateType, form.customDate);

    setSaving(true);
    try {
      const res = await fetch("/api/activites/quick-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projetId: parseInt(projetIdParam),
          consultantId,
          etapeId: form.etapeId ? parseInt(form.etapeId) : null,
          heures: heuresNum,
          description: form.description.trim(),
          date: dateStr,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Erreur lors de l'enregistrement");
        return;
      }

      toast.success(`✅ ${heuresNum}h enregistrées avec succès`);

      // Reset form
      setForm({
        heures: "",
        description: "",
        etapeId: "",
        dateType: "today",
        customDate: format(new Date(), "yyyy-MM-dd"),
      });

      // Refresh données
      await loadData();
    } catch {
      toast.error("Erreur réseau, veuillez réessayer");
    } finally {
      setSaving(false);
    }
  }

  // ── Ouvrir modal édition ─────────────────────────────────────────────────
  function handleOpenEdit(activite: ActiviteRecente) {
    setEditModal({
      open: true,
      activite,
      heures: String(activite.heures),
      description: activite.description || "",
      etapeId: activite.etape ? String(activite.etape.id) : "",
      date: format(new Date(activite.date), "yyyy-MM-dd"),
      saving: false,
    });
  }

  // ── Sauvegarder modification ─────────────────────────────────────────────
  async function handleSaveEdit() {
    if (!editModal.activite || !consultantId) return;
    const heuresNum = parseFloat(editModal.heures);
    if (isNaN(heuresNum) || heuresNum <= 0) {
      toast.error("Nombre d'heures invalide");
      return;
    }

    setEditModal((s) => ({ ...s, saving: true }));
    try {
      const res = await fetch(`/api/activites/${editModal.activite.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultantId: editModal.activite.consultant.id,
          projetId: parseInt(projetIdParam!),
          etapeId: editModal.etapeId ? parseInt(editModal.etapeId) : null,
          date: editModal.date,
          heures: heuresNum,
          description: editModal.description.trim(),
          facturable: editModal.activite.facturable,
          ownerId: consultantId,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Erreur lors de la modification");
        return;
      }

      toast.success("Activité modifiée");
      setEditModal((s) => ({ ...s, open: false }));
      await loadData();
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setEditModal((s) => ({ ...s, saving: false }));
    }
  }

  // ── Supprimer activité ────────────────────────────────────────────────────
  async function handleDelete(id: number) {
    if (!consultantId) return;
    setDeleting(id);
    try {
      const res = await fetch(
        `/api/activites/${id}?ownerId=${consultantId}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Impossible de supprimer");
        return;
      }
      toast.success("Activité supprimée");
      setDeleteConfirm(null);
      await loadData();
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setDeleting(null);
    }
  }

  // ── Garde : projetId manquant ─────────────────────────────────────────────
  if (!projetIdParam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3 p-8">
          <XCircle className="h-12 w-12 text-red-400 mx-auto" />
          <h2 className="text-lg font-semibold text-slate-700">Projet non spécifié</h2>
          <p className="text-sm text-slate-500">
            Ajoutez <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">?projetId=X</code> à l'URL.
          </p>
        </div>
      </div>
    );
  }

  // ── Garde : hydratation ───────────────────────────────────────────────────
  if (!hydrated) return null;

  // ── Sélecteur de consultant (si aucun sélectionné) ───────────────────────
  if (!consultantId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white rounded-xl shadow-sm border p-8 w-full max-w-md space-y-5">
          <div className="text-center space-y-2">
            <div className="h-14 w-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <User className="h-7 w-7 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800">Qui êtes-vous ?</h2>
            <p className="text-sm text-slate-500">
              Sélectionnez votre profil pour accéder au dashboard.
            </p>
          </div>
          {loadingConsultants ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-11 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {consultants.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelectConsultant(c.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-left group"
                >
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: c.couleur }}
                  >
                    {c.nom.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-slate-700 group-hover:text-blue-700">
                    {c.nom}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Consultant courant ────────────────────────────────────────────────────
  const currentConsultant = consultants.find((c) => c.id === consultantId);

  // ── Rendu principal ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster richColors position="top-right" />

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* ── HEADER ── */}
        {loading && !data ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* Bandeau projet */}
            <div
              className="rounded-xl p-5 text-white shadow-sm"
              style={{
                background: data
                  ? `linear-gradient(135deg, ${data.projet.couleur}cc, ${data.projet.couleur}88)`
                  : "linear-gradient(135deg, #3b82f6cc, #3b82f688)",
              }}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <h1 className="text-2xl font-bold tracking-tight">
                    {data?.projet.nom ?? "Chargement…"}
                  </h1>
                  <p className="text-white/80 text-sm">
                    {data?.projet.client}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {data && <StatutBadge statut={data.projet.statut} />}
                  {/* Changement de consultant */}
                  {currentConsultant && (
                    <button
                      onClick={() => {
                        localStorage.removeItem(STORAGE_KEY);
                        setConsultantId(null);
                        setData(null);
                      }}
                      className="flex items-center gap-2 bg-white/20 hover:bg-white/30 transition-colors rounded-full px-3 py-1.5 text-sm font-medium"
                    >
                      <div
                        className="h-5 w-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: currentConsultant.couleur }}
                      >
                        {currentConsultant.nom.charAt(0)}
                      </div>
                      {currentConsultant.nom}
                      <ChevronDown className="h-3 w-3 opacity-70" />
                    </button>
                  )}
                  <button
                    onClick={loadData}
                    disabled={loading}
                    className="bg-white/20 hover:bg-white/30 transition-colors rounded-full p-1.5"
                    title="Actualiser"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* ── STATS 4 CARTES ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Cette semaine */}
              <Card className="bg-white shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
                    <Clock className="h-3.5 w-3.5" />
                    Cette semaine
                  </div>
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div className="text-3xl font-bold text-slate-800">
                      {data?.stats.heuresSemaine ?? 0}
                      <span className="text-base font-normal text-slate-400 ml-1">h</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Ce mois */}
              <Card className="bg-white shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
                    <Calendar className="h-3.5 w-3.5" />
                    Ce mois
                  </div>
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div className="text-3xl font-bold text-slate-800">
                      {data?.stats.heuresMois ?? 0}
                      <span className="text-base font-normal text-slate-400 ml-1">h</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Total projet */}
              <Card className="bg-white shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Total projet
                  </div>
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div className="text-3xl font-bold text-slate-800">
                      {data?.stats.heuresTotal ?? 0}
                      <span className="text-base font-normal text-slate-400 ml-1">h</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* % Facturable */}
              <Card className="bg-white shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
                    <Percent className="h-3.5 w-3.5" />
                    Facturable
                  </div>
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div
                      className={`text-3xl font-bold ${
                        (data?.stats.pctFacturable ?? 0) >= 80
                          ? "text-green-600"
                          : (data?.stats.pctFacturable ?? 0) >= 60
                          ? "text-amber-500"
                          : "text-red-500"
                      }`}
                    >
                      {data?.stats.pctFacturable ?? 0}
                      <span className="text-base font-normal text-slate-400 ml-0.5">%</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ── FORMULAIRE QUICK LOG ── */}
            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-3 pt-5 px-5">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Plus className="h-4 w-4 text-blue-600" />
                  Logger une activité
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <form onSubmit={handleSubmitLog} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Heures */}
                    <div className="space-y-1.5">
                      <Label htmlFor="heures" className="text-xs font-medium text-slate-600">
                        Heures *
                      </Label>
                      <Input
                        id="heures"
                        type="number"
                        min="0.5"
                        max="24"
                        step="0.5"
                        placeholder="ex: 4"
                        value={form.heures}
                        onChange={(e) => setForm((s) => ({ ...s, heures: e.target.value }))}
                        required
                      />
                    </div>

                    {/* Étape */}
                    <div className="space-y-1.5">
                      <Label htmlFor="etape" className="text-xs font-medium text-slate-600">
                        Étape
                      </Label>
                      <Select
                        id="etape"
                        value={form.etapeId}
                        onChange={(e) => setForm((s) => ({ ...s, etapeId: e.target.value }))}
                      >
                        <option value="">Aucune étape spécifique</option>
                        {(data?.etapes ?? []).map((etape) => (
                          <option key={etape.id} value={String(etape.id)}>
                            {etape.nom}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <Label htmlFor="description" className="text-xs font-medium text-slate-600">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Ce que vous avez fait…"
                      value={form.description}
                      onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                      rows={2}
                      className="resize-none"
                    />
                  </div>

                  {/* Date */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Date</Label>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          { key: "today", label: "Aujourd'hui" },
                          { key: "yesterday", label: "Hier" },
                          { key: "day-before", label: "Avant-hier" },
                          { key: "custom", label: "Autre date" },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setForm((s) => ({ ...s, dateType: opt.key }))}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                            form.dateType === opt.key
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {form.dateType === "custom" && (
                      <Input
                        type="date"
                        value={form.customDate}
                        onChange={(e) => setForm((s) => ({ ...s, customDate: e.target.value }))}
                        max={format(new Date(), "yyyy-MM-dd")}
                      />
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={saving || !form.heures}
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Enregistrement…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Enregistrer
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* ── ENCART PERSO ── */}
            {data && data.stats.heuresPerso > 0 && (
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: currentConsultant?.couleur ?? "#3b82f6" }}
                >
                  {currentConsultant?.nom.charAt(0) ?? "?"}
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    Vos activités cette semaine :&nbsp;
                    <span className="font-bold">{data.stats.heuresPerso}h</span>
                  </p>
                  <div className="mt-1 h-1.5 w-48 max-w-full bg-blue-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${Math.min((data.stats.heuresPerso / 40) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-blue-500 mt-0.5">
                    {Math.round((data.stats.heuresPerso / 40) * 100)}% d'une semaine type (40h)
                  </p>
                </div>
              </div>
            )}

            {/* ── LISTE ACTIVITÉS RÉCENTES ── */}
            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-3 pt-5 px-5 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold">
                  📋 Activités récentes
                </CardTitle>
                <span className="text-xs text-slate-400">5 dernières</span>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                {loading && !data ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-lg" />
                    ))}
                  </div>
                ) : !data || data.activitesRecentes.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Aucune activité enregistrée</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.activitesRecentes.map((activite) => {
                      const isOwn = activite.consultant.id === consultantId;
                      const isBeingDeleted = deleting === activite.id;
                      const awaitingConfirm = deleteConfirm === activite.id;
                      return (
                        <div
                          key={activite.id}
                          className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-colors group"
                        >
                          {/* Avatar consultant */}
                          <div
                            className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
                            style={{ backgroundColor: activite.consultant.couleur }}
                          >
                            {activite.consultant.nom.charAt(0)}
                          </div>

                          {/* Contenu */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-medium text-slate-500">
                                {format(new Date(activite.date), "dd/MM", { locale: fr })}
                              </span>
                              <span className="font-semibold text-sm text-slate-800">
                                {activite.consultant.nom}
                              </span>
                              <span className="text-sm font-bold text-blue-600">
                                {activite.heures}h
                              </span>
                              {activite.etape && (
                                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                  {activite.etape.nom}
                                </span>
                              )}
                              {!activite.facturable && (
                                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                  Non facturable
                                </span>
                              )}
                            </div>
                            {activite.description && (
                              <p className="text-xs text-slate-500 mt-0.5 truncate">
                                {activite.description}
                              </p>
                            )}
                          </div>

                          {/* Actions (seulement pour ses propres activités) */}
                          {isOwn && (
                            <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              {awaitingConfirm ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-red-600 font-medium">
                                    Supprimer ?
                                  </span>
                                  <button
                                    onClick={() => handleDelete(activite.id)}
                                    disabled={isBeingDeleted}
                                    className="text-xs bg-red-600 text-white px-2 py-0.5 rounded hover:bg-red-700 transition-colors"
                                  >
                                    {isBeingDeleted ? "…" : "Oui"}
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="text-xs text-slate-500 px-2 py-0.5 rounded hover:text-slate-700 transition-colors"
                                  >
                                    Non
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleOpenEdit(activite)}
                                    className="p-1.5 rounded hover:bg-slate-200 text-slate-400 hover:text-blue-600 transition-colors"
                                    title="Modifier"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(activite.id)}
                                    className="p-1.5 rounded hover:bg-slate-200 text-slate-400 hover:text-red-600 transition-colors"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── LIEN VERS VUE COMPLÈTE ── */}
            {projetIdParam && (
              <div className="text-center pb-2">
                <a
                  href={`/activites?projetId=${projetIdParam}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Voir toutes les activités du projet
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── MODAL ÉDITION ── */}
      <Dialog open={editModal.open} onOpenChange={(o) => setEditModal((s) => ({ ...s, open: o }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Modifier l'activité
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            {/* Heures */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Heures *</Label>
              <Input
                type="number"
                min="0.5"
                max="24"
                step="0.5"
                value={editModal.heures}
                onChange={(e) => setEditModal((s) => ({ ...s, heures: e.target.value }))}
              />
            </div>

            {/* Étape */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Étape</Label>
              <Select
                value={editModal.etapeId}
                onChange={(e) => setEditModal((s) => ({ ...s, etapeId: e.target.value }))}
              >
                <option value="">Aucune étape</option>
                {(data?.etapes ?? []).map((etape) => (
                  <option key={etape.id} value={String(etape.id)}>
                    {etape.nom}
                  </option>
                ))}
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Description</Label>
              <Textarea
                value={editModal.description}
                onChange={(e) => setEditModal((s) => ({ ...s, description: e.target.value }))}
                rows={2}
                className="resize-none"
              />
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Date</Label>
              <Input
                type="date"
                value={editModal.date}
                onChange={(e) => setEditModal((s) => ({ ...s, date: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEditModal((s) => ({ ...s, open: false }))}
              disabled={editModal.saving}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={editModal.saving || !editModal.heures}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {editModal.saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sauvegarde…
                </>
              ) : (
                "Enregistrer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Export page avec Suspense (requis pour useSearchParams) ───────────────

export default function TeamsDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center space-y-3">
            <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mx-auto" />
            <p className="text-sm text-slate-500">Chargement du dashboard…</p>
          </div>
        </div>
      }
    >
      <TeamsDashboard />
    </Suspense>
  );
}
