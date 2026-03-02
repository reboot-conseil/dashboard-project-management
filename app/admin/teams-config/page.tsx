"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Settings,
  FlaskConical,
  Check,
  X,
  Plus,
  Trash2,
  Link as LinkIcon,
  Loader2,
  Wifi,
  WifiOff,
  Clock,
  Eye,
  EyeOff,
  ExternalLink,
  Copy,
  LayoutDashboard,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────

interface IntegrationConfig {
  id: number;
  n8nUrl: string;
  webhookSecret: string;
  emailDomain: string;
  actif: boolean;
  derniereSync: string | null;
}

interface ProjetInfo {
  id: number;
  nom: string;
  client: string;
  statut: string;
}

interface ProjetConfig {
  id: number;
  projetId: number;
  canalNom: string | null;
  canalId: string | null;
  webhookUrl: string | null;
  logAutoActif: boolean;
  projet: ProjetInfo;
}

// ── Page principale ────────────────────────────────────────────────────

export default function TeamsConfigPage() {
  const [loading, setLoading] = useState(true);
  const [globalConfig, setGlobalConfig] = useState<IntegrationConfig | null>(null);
  const [globalDraft, setGlobalDraft] = useState<IntegrationConfig | null>(null);
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [projetsConfigs, setProjetsConfigs] = useState<ProjetConfig[]>([]);
  const [projetsSansConfig, setProjetsSansConfig] = useState<ProjetInfo[]>([]);
  const [testingN8N, setTestingN8N] = useState(false);
  const [secretVisible, setSecretVisible] = useState(false);

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/teams-config");
      if (!res.ok) throw new Error("Réponse invalide");
      const data = await res.json();
      setGlobalConfig(data.globalConfig);
      setGlobalDraft(data.globalConfig);
      setProjetsConfigs(data.projetsConfigs);
      setProjetsSansConfig(data.projetsSansConfig);
    } catch {
      toast.error("Impossible de charger la configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  // ── Sauvegarder config globale ──────────────────────────────────
  async function saveGlobalConfig() {
    if (!globalDraft) return;
    setSavingGlobal(true);
    try {
      const res = await fetch("/api/admin/teams-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(globalDraft),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setGlobalConfig(data.config);
      setGlobalDraft(data.config);
      toast.success("Configuration globale enregistrée");
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSavingGlobal(false);
    }
  }

  // ── Tester connexion N8N ────────────────────────────────────────
  async function testN8N() {
    setTestingN8N(true);
    try {
      const res = await fetch("/api/admin/teams-config/test-n8n", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Connexion N8N réussie ✅");
        fetchConfigs(); // refresh derniereSync
      } else {
        toast.error(`Échec: ${data.message}`);
      }
    } catch {
      toast.error("Impossible de tester N8N");
    } finally {
      setTestingN8N(false);
    }
  }

  // ── Sauvegarder config projet ───────────────────────────────────
  async function saveProjetConfig(
    projetId: number,
    config: { canalNom: string; webhookUrl: string; logAutoActif: boolean }
  ) {
    try {
      const res = await fetch("/api/admin/teams-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projetId, ...config }),
      });
      if (!res.ok) throw new Error();
      toast.success("Configuration projet enregistrée");
      fetchConfigs();
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    }
  }

  // ── Supprimer config projet ─────────────────────────────────────
  async function deleteConfig(id: number) {
    try {
      const res = await fetch(`/api/admin/teams-config/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Configuration supprimée");
      fetchConfigs();
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  }

  // ── Créer config vide pour un projet ───────────────────────────
  async function initProjetConfig(projetId: number) {
    await saveProjetConfig(projetId, {
      canalNom: "",
      webhookUrl: "",
      logAutoActif: true,
    });
  }

  // ── Render ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const globalDirty =
    globalDraft &&
    globalConfig &&
    (globalDraft.n8nUrl !== globalConfig.n8nUrl ||
      globalDraft.webhookSecret !== globalConfig.webhookSecret ||
      globalDraft.emailDomain !== globalConfig.emailDomain);

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Configuration Intégrations Teams
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérer l&apos;intégration Microsoft Teams via N8N pour le log automatique
            d&apos;activités
          </p>
        </div>
        <Badge variant={globalConfig?.actif ? "default" : "secondary"}>
          {globalConfig?.actif ? "Actif" : "Inactif"}
        </Badge>
      </div>

      {/* ── Config Globale ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" />
            Configuration Globale N8N
          </CardTitle>
          <CardDescription>
            Paramètres partagés entre tous les projets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* URL N8N */}
            <div className="space-y-1.5">
              <Label htmlFor="n8nUrl">URL N8N</Label>
              <Input
                id="n8nUrl"
                value={globalDraft?.n8nUrl ?? ""}
                onChange={(e) =>
                  setGlobalDraft((d) => d && { ...d, n8nUrl: e.target.value })
                }
                placeholder="https://n8n.spoton-ai.fr"
              />
            </div>

            {/* Domaine email */}
            <div className="space-y-1.5">
              <Label htmlFor="emailDomain">Domaine Email</Label>
              <Input
                id="emailDomain"
                value={globalDraft?.emailDomain ?? ""}
                onChange={(e) =>
                  setGlobalDraft((d) => d && { ...d, emailDomain: e.target.value })
                }
                placeholder="@reboot-conseil.com"
              />
            </div>

            {/* Secret webhook */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="webhookSecret">Secret Webhook</Label>
              <div className="relative">
                <Input
                  id="webhookSecret"
                  type={secretVisible ? "text" : "password"}
                  value={globalDraft?.webhookSecret ?? ""}
                  onChange={(e) =>
                    setGlobalDraft(
                      (d) => d && { ...d, webhookSecret: e.target.value }
                    )
                  }
                  placeholder="Secret partagé app ↔ N8N"
                  className="pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setSecretVisible((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  title={secretVisible ? "Masquer" : "Afficher"}
                >
                  {secretVisible ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Doit correspondre à{" "}
                <code className="bg-muted px-1 rounded text-[11px]">
                  N8N_WEBHOOK_SECRET
                </code>{" "}
                dans votre .env
              </p>
            </div>
          </div>

          {/* Dernière sync */}
          {globalConfig?.derniereSync && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Dernière sync N8N :{" "}
              {new Date(globalConfig.derniereSync).toLocaleString("fr-FR")}
            </div>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={saveGlobalConfig}
              disabled={savingGlobal || !globalDirty}
            >
              {savingGlobal ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Enregistrer
            </Button>

            <Button
              variant="outline"
              onClick={testN8N}
              disabled={testingN8N}
            >
              {testingN8N ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FlaskConical className="h-4 w-4 mr-2" />
              )}
              {testingN8N ? "Test en cours…" : "Tester connexion N8N"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Projets Configurés ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wifi className="h-4 w-4" />
                Canaux Teams par Projet
              </CardTitle>
              <CardDescription>
                {projetsConfigs.length} projet
                {projetsConfigs.length !== 1 ? "s" : ""} configuré
                {projetsConfigs.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {projetsConfigs.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <WifiOff className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Aucun projet configuré</p>
              <p className="text-xs mt-1">
                Ajoutez un projet depuis la section ci-dessous
              </p>
            </div>
          ) : (
            projetsConfigs.map((config) => (
              <ProjetConfigCard
                key={config.id}
                config={config}
                onSave={(data) => saveProjetConfig(config.projetId, data)}
                onDelete={() => deleteConfig(config.id)}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* ── Projets Sans Config ── */}
      {projetsSansConfig.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <WifiOff className="h-4 w-4 text-muted-foreground" />
              Projets Non Configurés
            </CardTitle>
            <CardDescription>
              {projetsSansConfig.length} projet
              {projetsSansConfig.length !== 1 ? "s" : ""} actif
              {projetsSansConfig.length !== 1 ? "s" : ""} sans canal Teams
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {projetsSansConfig.map((projet) => (
              <div
                key={projet.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <p className="font-medium text-sm">{projet.nom}</p>
                  <p className="text-xs text-muted-foreground">{projet.client}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      projet.statut === "EN_COURS" ? "default" : "secondary"
                    }
                    className="text-xs"
                  >
                    {projet.statut === "EN_COURS" ? "En cours" : "Planifié"}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => initProjetConfig(projet.id)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Configurer
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Aide rapide ── */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Aide — Format des commandes Teams
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Dans un canal Teams configuré, les consultants peuvent logger avec :
          </p>
          <code className="block bg-background border rounded px-3 py-2 text-xs font-mono">
            @dashboard log 4h &quot;Réunion client&quot; #refonte-site
          </code>
          <p className="text-xs">
            N8N intercepte le message, identifie le consultant par son email Teams,
            trouve le projet via fuzzy match, et crée l&apos;activité via l&apos;API.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Composant carte projet ──────────────────────────────────────────────

interface ProjetConfigCardProps {
  config: ProjetConfig;
  onSave: (data: {
    canalNom: string;
    webhookUrl: string;
    logAutoActif: boolean;
  }) => void;
  onDelete: () => void;
}

function ProjetConfigCard({ config, onSave, onDelete }: ProjetConfigCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    canalNom: config.canalNom ?? "",
    webhookUrl: config.webhookUrl ?? "",
    logAutoActif: config.logAutoActif,
  });
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const dashboardUrl = `${origin}/teams-dashboard?projetId=${config.projet.id}`;

  function copyUrl() {
    navigator.clipboard
      .writeText(dashboardUrl)
      .then(() => toast.success("URL copiée dans le presse-papiers"))
      .catch(() => toast.error("Impossible de copier"));
  }

  function handleSave() {
    onSave(draft);
    setEditing(false);
  }

  function handleCancel() {
    setDraft({
      canalNom: config.canalNom ?? "",
      webhookUrl: config.webhookUrl ?? "",
      logAutoActif: config.logAutoActif,
    });
    setEditing(false);
  }

  const hasCanal = Boolean(config.canalNom);
  const hasWebhook = Boolean(config.webhookUrl);

  return (
    <div className="border rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{config.projet.nom}</p>
          <p className="text-xs text-muted-foreground">{config.projet.client}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Toggle log auto */}
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
            <Checkbox
              checked={draft.logAutoActif}
              onCheckedChange={(checked) => {
                const val = checked === true;
                setDraft((d) => ({ ...d, logAutoActif: val }));
                // Auto-save le toggle sans passer en mode édition
                if (!editing) {
                  onSave({ ...draft, logAutoActif: val });
                }
              }}
            />
            Log auto
          </label>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            onClick={onDelete}
            title="Supprimer cette configuration"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Mode visualisation */}
      {!editing && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <LinkIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Canal:</span>
            <code
              className={`px-1.5 py-0.5 rounded text-xs ${
                hasCanal
                  ? "bg-muted font-mono"
                  : "text-muted-foreground italic"
              }`}
            >
              {hasCanal ? config.canalNom : "Non configuré"}
            </code>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {hasWebhook ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
                <span className="text-green-700 dark:text-green-400 text-xs">
                  Webhook sortant configuré
                </span>
              </>
            ) : (
              <>
                <X className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground text-xs">
                  Pas de webhook sortant
                </span>
              </>
            )}
          </div>
          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* Ouvrir Dashboard */}
            <a
              href={`/teams-dashboard?projetId=${config.projet.id}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Ouvrir le dashboard Teams de ce projet (nouvel onglet)"
              className="inline-flex items-center gap-1.5 h-7 px-3 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              Ouvrir Dashboard
              <ExternalLink className="h-3 w-3 opacity-70" />
            </a>

            {/* Modifier */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing(true)}
              className="h-7 text-xs"
            >
              Modifier
            </Button>
          </div>

          {/* Encart URL pour Teams */}
          <div className="mt-1 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900">
            <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-1.5">
              URL à configurer dans Teams :
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[11px] bg-white dark:bg-background border border-blue-200 dark:border-blue-800 px-2 py-1 rounded font-mono text-blue-900 dark:text-blue-200 truncate">
                {origin
                  ? dashboardUrl
                  : `/teams-dashboard?projetId=${config.projet.id}`}
              </code>
              <button
                onClick={copyUrl}
                title="Copier l'URL"
                className="flex-shrink-0 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 transition-colors px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900"
              >
                <Copy className="h-3.5 w-3.5" />
                Copier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mode édition */}
      {editing && (
        <div className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs">Nom du canal Teams</Label>
            <Input
              value={draft.canalNom}
              onChange={(e) =>
                setDraft((d) => ({ ...d, canalNom: e.target.value }))
              }
              placeholder="refonte-site-web ou #refonte-site-web"
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">URL Webhook Sortant Teams</Label>
            <Input
              value={draft.webhookUrl}
              onChange={(e) =>
                setDraft((d) => ({ ...d, webhookUrl: e.target.value }))
              }
              placeholder="https://outlook.office.com/webhook/…"
              className="h-8 text-sm font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Teams → Canal → Connecteurs → Outgoing Webhook
            </p>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} className="h-7 text-xs">
              <Check className="h-3.5 w-3.5 mr-1.5" />
              Enregistrer
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              className="h-7 text-xs"
            >
              <X className="h-3.5 w-3.5 mr-1.5" />
              Annuler
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
