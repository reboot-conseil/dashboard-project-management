"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  FileText,
  FileSpreadsheet,
  File,
  Upload,
  Eye,
  Trash2,
  RefreshCw,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Inbox,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// ── Types ───────────────────────────────────────────────────────

interface DocumentItem {
  id: number;
  filename: string;
  filesize: number | null;
  mimetype: string | null;
  type: string | null;
  status: string;
  confidence: number | null;
  createdAt: string;
  projet: { id: number; nom: string; client: string } | null;
}

interface Stats {
  total: number;
  enAttente: number;
  traites: number;
  erreurs: number;
}

// ── Helpers ─────────────────────────────────────────────────────

function mimeIcon(mime: string | null) {
  if (mime === "application/pdf") return <FileText className="h-4 w-4 text-red-500" />;
  if (mime?.includes("wordprocessingml")) return <FileSpreadsheet className="h-4 w-4 text-blue-500" />;
  return <File className="h-4 w-4 text-slate-400" />;
}

function typeLabel(type: string | null) {
  const map: Record<string, string> = {
    devis: "Devis",
    presentation: "Présentation",
    transcript: "Transcript",
    compte_rendu: "CR",
    email: "Email",
    autre: "Autre",
  };
  return type ? map[type] ?? type : "Auto";
}

function statusConfig(status: string) {
  const map: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
    UPLOADING: { label: "Upload", cls: "bg-slate-100 text-slate-600", icon: Clock },
    EXTRACTING: { label: "Extraction", cls: "bg-blue-100 text-blue-700", icon: Loader2 },
    ANALYZING: { label: "Analyse", cls: "bg-violet-100 text-violet-700", icon: Loader2 },
    PENDING_REVIEW: { label: "En attente", cls: "bg-amber-100 text-amber-700", icon: AlertTriangle },
    PROCESSED: { label: "Traité", cls: "bg-green-100 text-green-700", icon: CheckCircle2 },
    REJECTED: { label: "Rejeté", cls: "bg-red-100 text-red-700", icon: XCircle },
    ERROR: { label: "Erreur", cls: "bg-red-100 text-red-700", icon: XCircle },
  };
  return map[status] ?? { label: status, cls: "bg-slate-100 text-slate-600", icon: Clock };
}

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

// ── Prompt ingestion ────────────────────────────────────────────

const INGESTION_PROMPT = `Tu es un expert en gestion de projets consulting. Je te fournis un ensemble de documents relatifs à un projet (devis, compte-rendus, emails, transcripts de réunions, plannings, etc.).

Ton objectif : produire UN SEUL document texte structuré, clair et complet, qui synthétise toutes les informations du projet de façon à être parfaitement analysé par un outil de gestion de projet.

---

INFORMATIONS À EXTRAIRE ET STRUCTURER :

## 1. PROJET
- Nom du projet (précis, pas générique)
- Nom du client (entreprise)
- Date de début (format JJ/MM/AAAA)
- Date de fin prévue (format JJ/MM/AAAA)
- Budget total en euros (chiffre uniquement)
- Statut : Planifié / En cours
- Description courte (2-3 phrases sur l'objectif du projet)

## 2. ÉQUIPE / CONSULTANTS
Pour chaque consultant impliqué :
- Prénom Nom
- Email professionnel (si disponible)
- Rôle sur le projet (Chef de projet / Consultant / Expert / etc.)

## 3. ÉTAPES DU PROJET
Pour chaque phase ou étape :
- Nom de l'étape (court et clair : ex. "Cadrage", "Audit", "Développement", "Recette", "Déploiement")
- Ordre (1, 2, 3…)
- Charge estimée en jours (ex. 5 jours)
- Date de début (JJ/MM/AAAA)
- Date de fin (JJ/MM/AAAA)
- Description des livrables ou objectifs

## 4. ACTIVITÉS RÉALISÉES
Pour chaque activité ou temps passé déjà connu :
- Date (JJ/MM/AAAA)
- Nombre d'heures
- Prénom Nom du consultant (ou email)
- Étape associée (nom exact de l'étape)
- Description de la tâche

## 5. CONTACTS CLIENT
Pour chaque interlocuteur côté client :
- Prénom Nom
- Email (si disponible)
- Rôle (ex. DSI, Directeur de projet, Chef de projet client)

---

RÈGLES DE RÉDACTION :
- Si une information est absente ou incertaine, indique explicitement "Non renseigné" (ne pas inventer)
- Toutes les dates au format JJ/MM/AAAA
- Les durées toujours en jours (convertir semaines et mois : 1 semaine = 5 jours, 1 mois = 20 jours)
- Le budget en chiffre entier euros, sans symbole ni espace (ex. 45000)
- Les noms des étapes : courts, sans numéro, sans date (ex. "Cadrage" pas "Phase 1 - Cadrage - Jan 2026")
- Les heures d'activité en chiffre décimal (ex. 3.5 pour 3h30)
- Un consultant identifié par son email est préférable à son nom seul

---

STRUCTURE DE SORTIE ATTENDUE :

Rédige le document avec exactement les sections suivantes, dans cet ordre, avec les titres en majuscules :

PROJET
[informations projet]

ÉQUIPE
[liste des consultants]

ÉTAPES
[liste des étapes numérotées]

ACTIVITÉS RÉALISÉES
[liste des activités avec date, heures, consultant, étape, description]

CONTACTS CLIENT
[liste des contacts]

NOTES COMPLÉMENTAIRES
[tout ce qui ne rentre pas dans les catégories ci-dessus mais pourrait être utile]

---

Voici les documents à analyser :
[JOINDRE LES DOCUMENTS ICI]`;

// ── Page ────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, enAttente: 0, traites: 0, erreurs: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [deleting, setDeleting] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    await navigator.clipboard.writeText(INGESTION_PROMPT);
    setCopied(true);
    toast.success("Prompt copié — colle-le dans Claude avec tes documents");
    setTimeout(() => setCopied(false), 2000);
  }

  const fetchDocs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);

      const res = await fetch(`/api/documents?${params}`);
      const data = await res.json();
      setDocuments(data.documents ?? []);
      setStats(data.stats ?? { total: 0, enAttente: 0, traites: 0, erreurs: 0 });
    } catch {
      toast.error("Impossible de charger les documents");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  async function handleDelete(id: number) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Erreur lors de la suppression");
        return;
      }
      toast.success("Document supprimé");
      fetchDocs();
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      {/* En-tête */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Documents
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Documents uploadés et analysés par l'IA
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={copyPrompt}>
            {copied ? <Check className="h-4 w-4 mr-2 text-green-600" /> : <Copy className="h-4 w-4 mr-2" />}
            {copied ? "Copié !" : "Prompt"}
          </Button>
          <Link href="/documents/upload">
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Uploader un document
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats — masquées si tout à zéro */}
      {stats.total > 0 && <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, icon: FileText, color: "text-slate-700" },
          { label: "En attente", value: stats.enAttente, icon: AlertTriangle, color: "text-amber-600" },
          { label: "Traités", value: stats.traites, icon: CheckCircle2, color: "text-green-600" },
          { label: "Erreurs", value: stats.erreurs, icon: XCircle, color: "text-red-600" },
        ].map((s) => (
          <Card key={s.label} className="bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <s.icon className="h-3.5 w-3.5" />
                {s.label}
              </div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>}

      {/* Filtre */}
      <div className="flex items-center gap-3">
        <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-48">
          <option value="all">Tous les statuts</option>
          <option value="PENDING_REVIEW">En attente de validation</option>
          <option value="PROCESSED">Traités</option>
          <option value="REJECTED">Rejetés</option>
          <option value="ERROR">Erreurs</option>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchDocs} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {/* Liste */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-16 px-8">
              <div className="mx-auto mb-4 flex items-center justify-center">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="10" y="6" width="34" height="44" rx="4" fill="currentColor" className="text-muted" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3"/>
                  <path d="M18 20h18M18 27h18M18 34h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-muted-foreground" opacity="0.4"/>
                  <circle cx="48" cy="46" r="13" fill="var(--color-primary)" opacity="0.12"/>
                  <path d="M48 40v12M42 46h12" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="font-semibold text-foreground">Aucun document</p>
              <p className="text-sm text-muted-foreground mt-1 mb-5">
                Les devis et contrats seront analysés automatiquement
              </p>
              <Link href="/documents/upload">
                <Button size="sm">
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Uploader un document
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {documents.map((doc) => {
                const sc = statusConfig(doc.status);
                const StatusIcon = sc.icon;
                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/50 transition-colors group"
                  >
                    {/* Icône type */}
                    {mimeIcon(doc.mimetype)}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.filename}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{formatSize(doc.filesize)}</span>
                        <span>•</span>
                        <span>{typeLabel(doc.type)}</span>
                        <span>•</span>
                        <span>{format(new Date(doc.createdAt), "dd/MM/yyyy HH:mm", { locale: fr })}</span>
                      </div>
                    </div>

                    {/* Statut */}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${sc.cls}`}>
                      <StatusIcon className={`h-3 w-3 ${["EXTRACTING", "ANALYZING"].includes(doc.status) ? "animate-spin" : ""}`} />
                      {sc.label}
                    </span>

                    {/* Confiance */}
                    {doc.confidence != null && (
                      <span
                        className={`text-xs font-medium ${
                          doc.confidence >= 80 ? "text-green-600" : doc.confidence >= 50 ? "text-amber-600" : "text-red-600"
                        }`}
                      >
                        {doc.confidence}%
                      </span>
                    )}

                    {/* Projet lié */}
                    {doc.projet && (
                      <Badge variant="secondary" className="text-[10px] max-w-[120px] truncate">
                        {doc.projet.nom}
                      </Badge>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/documents/review/${doc.id}`}>
                        <button className="p-1.5 rounded hover:bg-slate-200 text-slate-400 hover:text-blue-600 transition-colors" title="Voir">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </Link>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        disabled={deleting === doc.id}
                        className="p-1.5 rounded hover:bg-slate-200 text-slate-400 hover:text-red-600 transition-colors"
                        title="Supprimer"
                      >
                        {deleting === doc.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
