"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  FileSpreadsheet,
  File,
  X,
  Loader2,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// ── Types ───────────────────────────────────────────────────────

interface Projet {
  id: number;
  nom: string;
  client: string;
  statut: string;
}

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "text/plain": [".txt"],
};

const DOC_TYPES = [
  { value: "auto", label: "Laisser l'IA deviner" },
  { value: "devis", label: "Devis / Proposition commerciale" },
  { value: "presentation", label: "Présentation projet" },
  { value: "transcript", label: "Transcript réunion" },
  { value: "compte_rendu", label: "Compte-rendu" },
  { value: "email", label: "Email" },
  { value: "autre", label: "Autre" },
];

function fileIcon(mime: string) {
  if (mime === "application/pdf") return <FileText className="h-8 w-8 text-red-500" />;
  if (mime.includes("wordprocessingml")) return <FileSpreadsheet className="h-8 w-8 text-blue-500" />;
  return <File className="h-8 w-8 text-slate-500" />;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

// ── Page ────────────────────────────────────────────────────────

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("auto");
  const [projetId, setProjetId] = useState("new");
  const [projets, setProjets] = useState<Projet[]>([]);
  const [uploading, setUploading] = useState(false);

  // Charger projets actifs
  useEffect(() => {
    fetch("/api/projets")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.projets ?? [];
        setProjets(
          list.filter(
            (p: Projet) => p.statut === "EN_COURS" || p.statut === "PLANIFIE"
          )
        );
      })
      .catch(() => {});
  }, []);

  // ── Dropzone ──────────────────────────────────────────────────
  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      const err = rejectedFiles[0]?.errors?.[0];
      if (err?.code === "file-too-large") {
        toast.error("Fichier trop volumineux (max 10 Mo)");
      } else if (err?.code === "file-invalid-type") {
        toast.error("Format non supporté. Utilisez PDF, DOCX ou TXT");
      } else {
        toast.error("Fichier refusé");
      }
      return;
    }
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    multiple: false,
  });

  // ── Upload ────────────────────────────────────────────────────
  async function handleUpload() {
    if (!file) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", documentType);
      formData.append("projetId", projetId);

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Erreur lors de l'upload");
        return;
      }

      toast.success("Document uploadé — analyse en cours…");
      router.push(`/documents/review/${json.documentId}`);
    } catch {
      toast.error("Erreur réseau, veuillez réessayer");
    } finally {
      setUploading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="container mx-auto p-6 max-w-2xl space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Upload className="h-6 w-6" />
          Uploader un document
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          L'IA analysera le document pour en extraire projets, étapes et activités.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Sélectionner le fichier</CardTitle>
          <CardDescription>PDF, DOCX ou TXT — max 10 Mo</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Zone drop */}
          {!file ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
              }`}
            >
              <input {...getInputProps()} />
              <Upload
                className={`h-12 w-12 mx-auto mb-4 ${
                  isDragActive ? "text-blue-500" : "text-slate-400"
                }`}
              />
              {isDragActive ? (
                <p className="text-blue-600 font-medium">Déposez le fichier ici…</p>
              ) : (
                <>
                  <p className="text-slate-600 font-medium">
                    Glissez-déposez un fichier ici
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    ou cliquez pour parcourir
                  </p>
                </>
              )}
            </div>
          ) : (
            /* Fichier sélectionné */
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border">
              {fileIcon(file.type)}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatSize(file.size)}
                </p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
              <button
                onClick={() => setFile(null)}
                className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                title="Retirer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Type document */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">
              Type de document
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DOC_TYPES.map((dt) => (
                <button
                  key={dt.value}
                  type="button"
                  onClick={() => setDocumentType(dt.value)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors text-left ${
                    documentType === dt.value
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                  }`}
                >
                  {dt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Projet associé */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">
              Projet associé
            </Label>
            <Select
              value={projetId}
              onChange={(e) => setProjetId(e.target.value)}
            >
              <option value="new">Nouveau projet (sera créé)</option>
              {projets.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.nom} — {p.client}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">
              {projetId === "new"
                ? "Un nouveau projet sera créé à partir des données extraites."
                : "Les étapes extraites seront ajoutées à ce projet."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action */}
      <Button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="w-full h-12 text-base font-semibold"
        size="lg"
      >
        {uploading ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Upload et analyse en cours…
          </>
        ) : (
          <>
            Analyser le document
            <ArrowRight className="h-5 w-5 ml-2" />
          </>
        )}
      </Button>
    </div>
  );
}
