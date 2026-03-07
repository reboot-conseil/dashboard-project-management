"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  Trash2,
  ArrowLeft,
  RefreshCw,
  Eye,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

// ── Types ───────────────────────────────────────────────────────

interface DocumentData {
  id: number;
  filename: string;
  filepath: string;
  filesize: number | null;
  mimetype: string | null;
  type: string | null;
  status: string;
  extractedText: string | null;
  analysis: AnalysisData | null;
  confidence: number | null;
  errorMessage: string | null;
  createdAt: string;
  projet: { id: number; nom: string; client: string } | null;
}

interface AnalysisData {
  documentType?: string;
  confidence?: number;
  projet?: {
    nom?: string;
    client?: string;
    dateDebut?: string | null;
    dateFin?: string | null;
    budget?: number | null;
    description?: string;
    statut?: string;
  };
  etapes?: Array<{
    nom: string;
    ordre?: number;
    chargeEstimeeJours?: number | null;
    dateDebut?: string | null;
    dateFin?: string | null;
    description?: string;
  }>;
  activites?: Array<{
    date: string;
    heures: number;
    description?: string;
    consultant?: string;
    etape?: string | null;
  }>;
  contacts?: Array<{
    nom: string;
    email?: string | null;
    role?: string;
  }>;
  metadata?: {
    dateDocument?: string | null;
    auteur?: string | null;
    resume?: string;
  };
}

interface ProjetForm {
  nom: string;
  client: string;
  dateDebut: string;
  dateFin: string;
  budget: string;
  statut: string;
  description: string;
}

interface EtapeForm {
  nom: string;
  chargeEstimeeJours: string;
  dateDebut: string;
  dateFin: string;
  description: string;
}

interface ActiviteForm {
  date: string;
  heures: string;
  description: string;
  consultantEmail: string;
  etapeNom: string;
}

// ── Helpers ─────────────────────────────────────────────────────

function ConfidenceBadge({ score }: { score: number | null }) {
  if (score === null) return <Badge variant="secondary">N/A</Badge>;
  if (score >= 80)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
        <ShieldCheck className="h-3 w-3" />
        {score}%
      </span>
    );
  if (score >= 50)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
        <ShieldAlert className="h-3 w-3" />
        {score}%
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
      <ShieldX className="h-3 w-3" />
      {score}%
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    UPLOADING: { label: "Upload…", cls: "bg-slate-100 text-slate-600" },
    EXTRACTING: { label: "Extraction…", cls: "bg-blue-100 text-blue-700" },
    ANALYZING: { label: "Analyse IA…", cls: "bg-violet-100 text-violet-700" },
    PENDING_REVIEW: { label: "En attente", cls: "bg-amber-100 text-amber-700" },
    PROCESSED: { label: "Traité", cls: "bg-green-100 text-green-700" },
    REJECTED: { label: "Rejeté", cls: "bg-red-100 text-red-700" },
    ERROR: { label: "Erreur", cls: "bg-red-100 text-red-700" },
  };
  const info = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-600" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${info.cls}`}>
      {info.label}
    </span>
  );
}

function runChecks(projetForm: ProjetForm, etapes: EtapeForm[], activites: ActiviteForm[]) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const successes: string[] = [];

  if (projetForm.nom.trim()) successes.push("Nom projet renseigné");
  else errors.push("Nom projet manquant");

  if (projetForm.client.trim()) successes.push("Client renseigné");
  else errors.push("Client manquant");

  if (etapes.length >= 1) successes.push(`${etapes.length} étape(s) définie(s)`);
  else warnings.push("Aucune étape définie");

  if (projetForm.budget && parseFloat(projetForm.budget) > 50000)
    warnings.push("Budget > 50k€ — vérifier");

  if (projetForm.dateDebut && projetForm.dateFin && projetForm.dateDebut > projetForm.dateFin)
    errors.push("Date début > date fin");

  const orphanActivites = activites.filter((a) => !a.consultantEmail);
  if (orphanActivites.length > 0)
    warnings.push(`${orphanActivites.length} activité(s) sans consultant`);

  const isValid = errors.length === 0;
  return { isValid, errors, warnings, successes };
}

// ── Composant principal ─────────────────────────────────────────

function ReviewContent() {
  const params = useParams();
  const router = useRouter();
  const docId = params.id as string;

  const [doc, setDoc] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Formulaires ───────────────────────────────────────────────
  const [createNewProject, setCreateNewProject] = useState(true);
  const [projetForm, setProjetForm] = useState<ProjetForm>({
    nom: "", client: "", dateDebut: "", dateFin: "", budget: "", statut: "PLANIFIE", description: "",
  });
  const [etapes, setEtapes] = useState<EtapeForm[]>([]);
  const [activites, setActivites] = useState<ActiviteForm[]>([]);

  // ── Chargement ────────────────────────────────────────────────
  const fetchDoc = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${docId}`);
      if (!res.ok) {
        toast.error("Document introuvable");
        return;
      }
      const data: DocumentData = await res.json();
      setDoc(data);

      // Pré-remplir formulaire depuis analyse
      if (data.analysis && data.status === "PENDING_REVIEW") {
        const a = data.analysis;
        if (a.projet) {
          setProjetForm({
            nom: a.projet.nom ?? "",
            client: a.projet.client ?? "",
            dateDebut: a.projet.dateDebut ?? "",
            dateFin: a.projet.dateFin ?? "",
            budget: a.projet.budget != null ? String(a.projet.budget) : "",
            statut: a.projet.statut ?? "PLANIFIE",
            description: a.projet.description ?? "",
          });
        }
        if (a.etapes) {
          setEtapes(
            a.etapes.map((e, i) => ({
              nom: e.nom ?? "",
              chargeEstimeeJours: e.chargeEstimeeJours != null ? String(e.chargeEstimeeJours) : "",
              dateDebut: e.dateDebut ?? "",
              dateFin: e.dateFin ?? "",
              description: e.description ?? "",
            }))
          );
        }
        if (a.activites) {
          setActivites(
            a.activites.map((act) => ({
              date: act.date ?? "",
              heures: String(act.heures ?? ""),
              description: act.description ?? "",
              consultantEmail: act.consultant ?? "",
              etapeNom: act.etape ?? "",
            }))
          );
        }
        if (data.projet) {
          setCreateNewProject(false);
        }
      }

      return data;
    } catch {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [docId]);

  useEffect(() => {
    fetchDoc();
  }, [fetchDoc]);

  // ── Polling pendant analyse ───────────────────────────────────
  useEffect(() => {
    const isProcessing = doc?.status === "UPLOADING" || doc?.status === "EXTRACTING" || doc?.status === "ANALYZING";
    if (isProcessing) {
      pollingRef.current = setInterval(async () => {
        const data = await fetchDoc();
        if (data && !["UPLOADING", "EXTRACTING", "ANALYZING"].includes(data.status)) {
          if (pollingRef.current) clearInterval(pollingRef.current);
        }
      }, 3000);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [doc?.status, fetchDoc]);

  // ── Helpers formulaire ────────────────────────────────────────
  function updateEtape(idx: number, field: keyof EtapeForm, value: string) {
    setEtapes((prev) => prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)));
  }
  function removeEtape(idx: number) {
    setEtapes((prev) => prev.filter((_, i) => i !== idx));
  }
  function addEtape() {
    setEtapes((prev) => [
      ...prev,
      { nom: "", chargeEstimeeJours: "", dateDebut: "", dateFin: "", description: "" },
    ]);
  }
  function updateActivite(idx: number, field: keyof ActiviteForm, value: string) {
    setActivites((prev) => prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a)));
  }
  function removeActivite(idx: number) {
    setActivites((prev) => prev.filter((_, i) => i !== idx));
  }
  function addActivite() {
    setActivites((prev) => [
      ...prev,
      { date: format(new Date(), "yyyy-MM-dd"), heures: "", description: "", consultantEmail: "", etapeNom: "" },
    ]);
  }

  // ── Validation ────────────────────────────────────────────────
  async function handleValidate() {
    setSaving(true);
    try {
      const res = await fetch("/api/documents/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: parseInt(docId),
          action: "validate",
          validatedData: {
            createNewProject,
            projetId: !createNewProject && doc?.projet ? doc.projet.id : null,
            projet: projetForm,
            etapes: etapes.map((e, i) => ({
              nom: e.nom,
              ordre: i + 1,
              chargeEstimeeJours: e.chargeEstimeeJours ? parseFloat(e.chargeEstimeeJours) : null,
              dateDebut: e.dateDebut || null,
              dateFin: e.dateFin || null,
              description: e.description || null,
            })),
            activites: activites.map((a) => ({
              date: a.date,
              heures: a.heures ? parseFloat(a.heures) : 0,
              description: a.description,
              consultantEmail: a.consultantEmail,
              etapeNom: a.etapeNom || null,
            })),
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Erreur de validation");
        return;
      }
      toast.success(
        `Projet créé avec ${json.etapesCreated} étape(s) et ${json.activitesCreated} activité(s)`
      );
      router.push(`/projets`);
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  async function handleReject() {
    setRejecting(true);
    try {
      const res = await fetch("/api/documents/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: parseInt(docId), action: "reject" }),
      });
      if (!res.ok) {
        toast.error("Erreur lors du rejet");
        return;
      }
      toast.success("Document rejeté");
      router.push("/documents");
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setRejecting(false);
    }
  }

  // ── Loading state ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl space-y-4">
        <Skeleton className="h-8 w-72" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96 w-full rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="container mx-auto p-6 text-center py-20">
        <XCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
        <p className="text-lg font-medium">Document introuvable</p>
        <Link href="/documents" className="text-blue-600 text-sm mt-2 hover:underline">
          Retour à la liste
        </Link>
      </div>
    );
  }

  // ── Processing state (polling) ────────────────────────────────
  const isProcessing = ["UPLOADING", "EXTRACTING", "ANALYZING"].includes(doc.status);
  if (isProcessing) {
    return (
      <div className="container mx-auto p-6 max-w-xl text-center py-20 space-y-4">
        <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto" />
        <h2 className="text-xl font-semibold">Analyse en cours…</h2>
        <StatusBadge status={doc.status} />
        <p className="text-sm text-muted-foreground">
          {doc.status === "UPLOADING" && "Upload du fichier…"}
          {doc.status === "EXTRACTING" && "Extraction du texte depuis le document…"}
          {doc.status === "ANALYZING" && "L'IA analyse le contenu du document…"}
        </p>
        <p className="text-xs text-muted-foreground">Actualisation automatique toutes les 3s</p>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────
  if (doc.status === "ERROR") {
    return (
      <div className="container mx-auto p-6 max-w-xl text-center py-20 space-y-4">
        <XCircle className="h-12 w-12 text-red-400 mx-auto" />
        <h2 className="text-xl font-semibold">Erreur d'analyse</h2>
        {doc.errorMessage && (
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{doc.errorMessage}</p>
        )}
        <div className="flex gap-3 justify-center">
          <Link href="/documents">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
          <Link href="/documents/upload">
            <Button>Réessayer avec un autre fichier</Button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Already processed ─────────────────────────────────────────
  if (doc.status === "PROCESSED" || doc.status === "REJECTED") {
    return (
      <div className="container mx-auto p-6 max-w-xl text-center py-20 space-y-4">
        {doc.status === "PROCESSED" ? (
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
        ) : (
          <XCircle className="h-12 w-12 text-red-400 mx-auto" />
        )}
        <h2 className="text-xl font-semibold">
          Document {doc.status === "PROCESSED" ? "déjà traité" : "rejeté"}
        </h2>
        {doc.projet && (
          <p className="text-sm">
            Projet :{" "}
            <Link href={`/projets`} className="text-blue-600 hover:underline">
              {doc.projet.nom}
            </Link>
          </p>
        )}
        <Link href="/documents">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la liste
          </Button>
        </Link>
      </div>
    );
  }

  // ── Vérifications ─────────────────────────────────────────────
  const checks = runChecks(projetForm, etapes, activites);

  // ── Rendu principal (PENDING_REVIEW) ──────────────────────────
  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/documents" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-xl font-bold">Valider le document</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            {doc.filename}
            <StatusBadge status={doc.status} />
            <ConfidenceBadge score={doc.confidence} />
          </div>
        </div>
      </div>

      {/* 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Colonne gauche : Texte extrait (2/5) ── */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Texte extrait
              </CardTitle>
            </CardHeader>
            <CardContent>
              {doc.extractedText ? (
                <pre className="text-xs font-mono bg-slate-50 border rounded-lg p-3 max-h-[600px] overflow-y-auto whitespace-pre-wrap break-words">
                  {doc.extractedText}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Aucun texte extrait
                </p>
              )}
            </CardContent>
          </Card>

          {/* Contacts (informatif) */}
          {doc.analysis?.contacts && doc.analysis.contacts.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Contacts détectés</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {doc.analysis.contacts.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{c.nom}</span>
                    {c.email && <span className="text-xs text-muted-foreground">{c.email}</span>}
                    {c.role && (
                      <Badge variant="secondary" className="text-[10px]">
                        {c.role}
                      </Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Résumé IA */}
          {doc.analysis?.metadata?.resume && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Résumé IA</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{doc.analysis.metadata.resume}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Colonne droite : Données éditables (3/5) ── */}
        <div className="lg:col-span-3 space-y-4">
          {/* Section Projet */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Projet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nom *</Label>
                  <Input
                    value={projetForm.nom}
                    onChange={(e) => setProjetForm((f) => ({ ...f, nom: e.target.value }))}
                    placeholder="Nom du projet"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Client *</Label>
                  <Input
                    value={projetForm.client}
                    onChange={(e) => setProjetForm((f) => ({ ...f, client: e.target.value }))}
                    placeholder="Nom du client"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Date début</Label>
                  <Input
                    type="date"
                    value={projetForm.dateDebut}
                    onChange={(e) => setProjetForm((f) => ({ ...f, dateDebut: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Date fin</Label>
                  <Input
                    type="date"
                    value={projetForm.dateFin}
                    onChange={(e) => setProjetForm((f) => ({ ...f, dateFin: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Budget (€)</Label>
                  <Input
                    type="number"
                    value={projetForm.budget}
                    onChange={(e) => setProjetForm((f) => ({ ...f, budget: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Statut</Label>
                  <Select
                    value={projetForm.statut}
                    onChange={(e) => setProjetForm((f) => ({ ...f, statut: e.target.value }))}
                  >
                    <option value="PLANIFIE">Planifié</option>
                    <option value="EN_COURS">En cours</option>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={projetForm.description}
                  onChange={(e) => setProjetForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Section Étapes */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">
                Étapes ({etapes.length})
              </CardTitle>
              <Button size="sm" variant="outline" onClick={addEtape} className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Ajouter
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {etapes.length === 0 && (
                <p className="text-sm text-muted-foreground italic text-center py-4">
                  Aucune étape. Cliquez "Ajouter" pour en créer.
                </p>
              )}
              {etapes.map((etape, idx) => (
                <div
                  key={idx}
                  className="border rounded-lg p-3 space-y-2 relative group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground w-6 text-center">
                      {idx + 1}
                    </span>
                    <Input
                      value={etape.nom}
                      onChange={(e) => updateEtape(idx, "nom", e.target.value)}
                      placeholder="Nom de l'étape"
                      className="flex-1 h-8 text-sm"
                    />
                    <Input
                      type="number"
                      value={etape.chargeEstimeeJours}
                      onChange={(e) => updateEtape(idx, "chargeEstimeeJours", e.target.value)}
                      placeholder="Jours"
                      className="w-20 h-8 text-sm"
                    />
                    <button
                      onClick={() => removeEtape(idx)}
                      className="p-1 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pl-8">
                    <Input
                      type="date"
                      value={etape.dateDebut}
                      onChange={(e) => updateEtape(idx, "dateDebut", e.target.value)}
                      className="h-7 text-xs"
                    />
                    <Input
                      type="date"
                      value={etape.dateFin}
                      onChange={(e) => updateEtape(idx, "dateFin", e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                  <Input
                    value={etape.description}
                    onChange={(e) => updateEtape(idx, "description", e.target.value)}
                    placeholder="Description"
                    className="h-7 text-xs ml-8"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Section Activités */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">
                Activités ({activites.length})
              </CardTitle>
              <Button size="sm" variant="outline" onClick={addActivite} className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Ajouter
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {activites.length === 0 && (
                <p className="text-sm text-muted-foreground italic text-center py-4">
                  Aucune activité détectée.
                </p>
              )}
              {activites.map((act, idx) => (
                <div
                  key={idx}
                  className="border rounded-lg p-3 space-y-2 relative group"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Input
                      type="date"
                      value={act.date}
                      onChange={(e) => updateActivite(idx, "date", e.target.value)}
                      className="h-8 text-sm"
                    />
                    <Input
                      type="number"
                      step="0.5"
                      value={act.heures}
                      onChange={(e) => updateActivite(idx, "heures", e.target.value)}
                      placeholder="Heures"
                      className="h-8 text-sm"
                    />
                    <Input
                      value={act.consultantEmail}
                      onChange={(e) => updateActivite(idx, "consultantEmail", e.target.value)}
                      placeholder="Email consultant"
                      className="h-8 text-sm"
                    />
                    <div className="flex items-center gap-1">
                      <Input
                        value={act.etapeNom}
                        onChange={(e) => updateActivite(idx, "etapeNom", e.target.value)}
                        placeholder="Étape"
                        className="h-8 text-sm flex-1"
                      />
                      <button
                        onClick={() => removeActivite(idx)}
                        className="p-1 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <Input
                    value={act.description}
                    onChange={(e) => updateActivite(idx, "description", e.target.value)}
                    placeholder="Description"
                    className="h-7 text-xs"
                  />
                </div>
              ))}
              {activites.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Les activités sans consultant valide seront ignorées.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Vérifications */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Vérifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {checks.successes.map((s, i) => (
                <div key={`s-${i}`} className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  <span className="text-green-700">{s}</span>
                </div>
              ))}
              {checks.warnings.map((w, i) => (
                <div key={`w-${i}`} className="flex items-center gap-2 text-xs">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span className="text-amber-700">{w}</span>
                </div>
              ))}
              {checks.errors.map((e, i) => (
                <div key={`e-${i}`} className="flex items-center gap-2 text-xs">
                  <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  <span className="text-red-700">{e}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2 pb-6">
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={rejecting || saving}
              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              {rejecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
              Rejeter
            </Button>
            <Button
              onClick={handleValidate}
              disabled={!checks.isValid || saving || rejecting}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold h-11"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création en cours…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Valider et créer
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto p-6 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ReviewContent />
    </Suspense>
  );
}
