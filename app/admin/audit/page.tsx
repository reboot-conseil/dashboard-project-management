"use client"

import { useState, useEffect, useCallback } from "react"
import ReactMarkdown from "react-markdown"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Loader2, Play, CheckCircle2, AlertTriangle, FileText, Trash2,
  RefreshCw, ShieldCheck, Terminal, BookOpen, Wrench, XCircle,
  Info, ShieldAlert, CheckCheck,
} from "lucide-react"
import { toast } from "sonner"

// ── Types ──────────────────────────────────────────────────────────────────────
interface FileCheck {
  path: string; label: string; severity: string; critical: boolean; exists: boolean
}
interface RouteCheck {
  path: string; label: string; exists: boolean
}
interface CurrentState {
  filesToDelete: FileCheck[]
  legacyRoutes: RouteCheck[]
  envInGitignore: boolean
  envDuplicates: string[]
  nextCacheExists: boolean
  cleanupScriptExists: boolean
}
interface Summary {
  filesStillPresent: number; filesTotal: number
  legacyStillPresent: number; legacyTotal: number
  envOk: boolean; cleanlinessScore: number
}
interface AuditReport {
  filename: string; content: string | null; error?: string
  stats?: { lines: number; words: number; size: string }
}
interface ApiResponse {
  success: boolean
  reports: { rapport: AuditReport; nettoyage: AuditReport; documentation: AuditReport }
  currentState: CurrentState
  summary: Summary
  cleanupScriptExists: boolean
  timestamp: string
}
interface CleanupResult {
  success: boolean; mode: "dry-run" | "execute"
  output: string; errors: string | null; error?: string; timestamp: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const ADMIN_SECRET_KEY = "pm-admin-secret"

function scoreColor(score: number) {
  if (score >= 80) return "text-green-600"
  if (score >= 60) return "text-amber-600"
  return "text-red-600"
}
function scoreLabel(score: number) {
  if (score >= 90) return "Excellent"
  if (score >= 75) return "Bon"
  if (score >= 55) return "À améliorer"
  return "Critique"
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function AdminAuditPage() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [prevScore, setPrevScore] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null)
  const [selectedTab, setSelectedTab] = useState("rapport")
  const [adminSecret, setAdminSecret] = useState("")
  const [hydrated, setHydrated] = useState(false)
  const [showSecretInput, setShowSecretInput] = useState(false)
  const [lastLoaded, setLastLoaded] = useState<Date | null>(null)

  useEffect(() => {
    try { const s = localStorage.getItem(ADMIN_SECRET_KEY); if (s) setAdminSecret(s) }
    catch { /* ignore */ }
    setHydrated(true)
  }, [])

  const getHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { "Content-Type": "application/json" }
    if (adminSecret) h["x-admin-secret"] = adminSecret
    return h
  }, [adminSecret])

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch("/api/admin/audit-reports", { headers: getHeaders() })
      if (res.status === 403) { setShowSecretInput(true); return }
      const json: ApiResponse = await res.json()
      if (json.success) {
        // Conserver l'ancien score pour afficher la variation
        if (data?.summary?.cleanlinessScore != null) {
          setPrevScore(data.summary.cleanlinessScore)
        }
        setData(json)
        setLastLoaded(new Date())
        if (!silent) toast.success("État du projet rechargé")
      }
    } catch {
      if (!silent) toast.error("Erreur réseau")
    } finally {
      setLoading(false)
    }
  }, [getHeaders, data])

  useEffect(() => { if (hydrated) loadData(false) }, [hydrated]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveSecret = () => {
    try { localStorage.setItem(ADMIN_SECRET_KEY, adminSecret) } catch { /* ignore */ }
    loadData(false)
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────
  const executeCleanup = async (mode: "dry-run" | "execute") => {
    if (mode === "execute") {
      // Calculer ce qui sera réellement supprimé
      const toDelete = data?.currentState.filesToDelete.filter(f => f.exists) ?? []
      if (toDelete.length === 0) {
        toast.info("Rien à nettoyer — tous les fichiers sont déjà propres ✅")
        return
      }
      const list = toDelete.map(f => `• ${f.label}`).join("\n")
      const confirmed = window.confirm(
        `⚠️ EXÉCUTION RÉELLE\n\nFichiers qui vont être supprimés :\n${list}\n\nCette action est irréversible. Continuer ?`
      )
      if (!confirmed) return
    }

    setCleanupLoading(true)
    setCleanupResult(null)
    const toastId = toast.loading(mode === "execute" ? "🗑 Nettoyage en cours…" : "🔍 Simulation en cours…")

    try {
      const res = await fetch("/api/admin/cleanup", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ mode }),
      })
      const result: CleanupResult = await res.json()
      setCleanupResult(result)

      if (result.success) {
        toast.success(mode === "execute" ? "✅ Nettoyage terminé !" : "✅ Simulation terminée", { id: toastId })
        // Recharger l'état automatiquement après un vrai nettoyage
        if (mode === "execute") {
          setTimeout(() => loadData(true), 600)
        }
      } else {
        toast.error("❌ Erreur : " + (result.error ?? "voir logs"), { id: toastId })
      }
    } catch {
      toast.error("❌ Erreur réseau", { id: toastId })
    } finally {
      setCleanupLoading(false)
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!hydrated || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-muted-foreground">Analyse du projet en cours…</span>
      </div>
    )
  }

  const state = data?.currentState
  const summary = data?.summary

  const filesToDeletePresent = state?.filesToDelete.filter(f => f.exists) ?? []
  const filesAlreadyClean    = state?.filesToDelete.filter(f => !f.exists) ?? []
  const legacyPresent        = state?.legacyRoutes.filter(r => r.exists) ?? []
  const legacyClean          = state?.legacyRoutes.filter(r => !r.exists) ?? []

  const score = summary?.cleanlinessScore ?? 0
  const scoreDelta = prevScore != null ? score - prevScore : null

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Audit & Nettoyage Projet
          </h1>
          {lastLoaded && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Dernière vérification : {lastLoaded.toLocaleTimeString("fr-FR")}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => loadData(false)} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Recharger l'état
        </Button>
      </div>

      {/* ── Secret admin ──────────────────────────────────────────────────── */}
      {showSecretInput && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Secret admin requis</AlertTitle>
          <AlertDescription>
            <div className="flex gap-2 mt-2">
              <input type="password" value={adminSecret} onChange={e => setAdminSecret(e.target.value)}
                onKeyDown={e => e.key === "Enter" && saveSecret()}
                placeholder="Secret admin…"
                className="flex h-9 rounded-md border border-border bg-background px-3 text-sm flex-1 max-w-xs" />
              <Button size="sm" onClick={saveSecret}>Valider</Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* ── Scores ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Score propreté — DYNAMIQUE */}
        <Card className="text-center py-3 col-span-2 sm:col-span-1 relative overflow-hidden">
          {scoreDelta !== null && scoreDelta !== 0 && (
            <div className={`absolute top-1.5 right-2 text-[11px] font-bold ${scoreDelta > 0 ? "text-green-600" : "text-red-500"}`}>
              {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta} pts
            </div>
          )}
          <p className={`text-2xl font-bold ${scoreColor(score)}`}>{score}/100</p>
          <p className={`text-xs font-medium ${scoreColor(score)}`}>{scoreLabel(score)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Propreté code</p>
        </Card>

        {/* Scores statiques architecture */}
        {[
          { label: "Architecture",   score: "8/10",  color: "text-green-600" },
          { label: "Sécurité API",   score: "5/10",  color: "text-amber-600" },
          { label: "Maintenabilité", score: "6/10",  color: "text-amber-600" },
        ].map(({ label, score: s, color }) => (
          <Card key={label} className="text-center py-3">
            <p className={`text-xl font-bold ${color}`}>{s}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            <p className="text-[10px] text-muted-foreground/60">statique</p>
          </Card>
        ))}
      </div>

      {/* ── État actuel — Live ────────────────────────────────────────────── */}
      {state && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCheck className="h-4 w-4" />
              État actuel du projet
              <Badge variant={filesToDeletePresent.length === 0 ? "success" : "warning"} className="ml-auto">
                {filesToDeletePresent.length === 0
                  ? "✅ Fichiers propres"
                  : `⚠ ${filesToDeletePresent.length} fichier${filesToDeletePresent.length > 1 ? "s" : ""} à supprimer`}
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Vérification en temps réel — mis à jour à chaque rechargement ou après un nettoyage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Fichiers à supprimer */}
            <section>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Trash2 className="h-3.5 w-3.5" /> Fichiers à supprimer
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  {filesAlreadyClean.length}/{state.filesToDelete.length} nettoyés
                </span>
              </h4>
              <div className="space-y-1.5">
                {state.filesToDelete.map(f => (
                  <div key={f.path} className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${f.exists ? "bg-amber-50 border border-amber-200" : "bg-green-50 border border-green-200"}`}>
                    {f.exists
                      ? <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      : <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />}
                    <span className={`flex-1 font-mono text-xs ${f.exists ? "text-amber-800" : "text-green-700 line-through opacity-70"}`}>
                      {f.path}
                    </span>
                    <span className={`text-xs ${f.exists ? "text-amber-700" : "text-green-600"}`}>
                      {f.exists ? (f.critical ? "⚠ Critique" : "À supprimer") : "Supprimé ✓"}
                    </span>
                  </div>
                ))}
                {state.filesToDelete.length === 0 && (
                  <p className="text-xs text-muted-foreground">Aucun fichier de test détecté dans uploads/</p>
                )}
              </div>
            </section>

            {/* .env sécurité */}
            <section>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5" /> Sécurité .env
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  {(state.envInGitignore && state.envDuplicates.length === 0) ? "OK ✓" : "Attention requise"}
                </span>
              </h4>
              <div className="space-y-1.5">
                <StateRow
                  ok={state.envInGitignore}
                  label=".env présent dans .gitignore"
                  fixHint={!state.envInGitignore ? "Ajouter .env dans .gitignore avant tout commit" : undefined}
                />
                <StateRow
                  ok={state.envDuplicates.length === 0}
                  label={state.envDuplicates.length === 0 ? "Aucun doublon dans .env" : `Doublon détecté : ${state.envDuplicates.join(", ")}`}
                  fixHint={state.envDuplicates.length > 0 ? "Éditer .env manuellement pour supprimer les doublons" : undefined}
                />
              </div>
            </section>

            {/* Routes legacy */}
            <section>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Routes API legacy n8n
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  {legacyClean.length}/{state.legacyRoutes.length} supprimées
                </span>
                <Badge variant="secondary" className="text-[10px]">suppression manuelle</Badge>
              </h4>
              <div className="space-y-1">
                {state.legacyRoutes.map(r => (
                  <div key={r.path} className={`flex items-center gap-2 rounded px-2.5 py-1.5 text-xs ${r.exists ? "bg-muted/60" : "bg-green-50/60"}`}>
                    {r.exists
                      ? <span className="text-amber-500">⚠</span>
                      : <span className="text-green-500">✓</span>}
                    <span className={`font-mono flex-1 ${!r.exists ? "line-through opacity-50" : ""}`}>{r.path}</span>
                    <span className="text-muted-foreground shrink-0">{r.label}</span>
                  </div>
                ))}
              </div>
              {legacyPresent.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2 pl-2">
                  Pour supprimer : <code className="bg-muted px-1 rounded">rm &quot;app/api/documents/update-status/route.ts&quot;</code> etc. (voir NETTOYAGE_RECOMMANDE.md)
                </p>
              )}
            </section>

          </CardContent>
        </Card>
      )}

      {/* ── Actions cleanup ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trash2 className="h-4 w-4" /> Actions de nettoyage
          </CardTitle>
          <CardDescription className="text-xs">
            {filesToDeletePresent.length > 0
              ? `${filesToDeletePresent.length} fichier(s) peuvent être supprimés automatiquement`
              : "Tous les fichiers automatiques ont déjà été nettoyés ✅"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => executeCleanup("dry-run")} disabled={cleanupLoading} variant="outline">
              {cleanupLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              Simulation (dry-run)
            </Button>
            <Button
              onClick={() => executeCleanup("execute")} disabled={cleanupLoading || filesToDeletePresent.length === 0}
              variant={filesToDeletePresent.length > 0 ? "destructive" : "outline"}
              title={filesToDeletePresent.length === 0 ? "Rien à nettoyer" : undefined}
            >
              {cleanupLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
              {filesToDeletePresent.length > 0
                ? `Supprimer ${filesToDeletePresent.length} fichier(s)`
                : "Déjà propre ✅"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 shrink-0" />
            L'état se met à jour automatiquement après un nettoyage.
            Cliquez sur "Recharger l'état" pour forcer la vérification.
          </p>
        </CardContent>
      </Card>

      {/* ── Résultat cleanup ──────────────────────────────────────────────── */}
      {cleanupResult && (
        <Card className={cleanupResult.success ? "border-green-500/50" : "border-destructive/50"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {cleanupResult.success
                ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                : <XCircle className="h-4 w-4 text-destructive" />}
              Résultat —&nbsp;
              <Badge variant={cleanupResult.mode === "execute" ? "destructive" : "secondary"}>
                {cleanupResult.mode === "execute" ? "EXÉCUTION" : "SIMULATION"}
              </Badge>
              <span className="text-xs text-muted-foreground font-normal ml-auto">
                {new Date(cleanupResult.timestamp).toLocaleString("fr-FR")}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1.5 mb-1">
              <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">stdout</span>
            </div>
            <pre className="p-4 bg-muted rounded-lg text-xs font-mono leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
              {cleanupResult.output || "(pas de sortie)"}
            </pre>
            {cleanupResult.errors && (
              <pre className="mt-3 p-3 bg-destructive/10 rounded-lg text-xs text-destructive font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                {cleanupResult.errors}
              </pre>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Rapports markdown ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" /> Rapports d&apos;audit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="rapport" className="gap-1.5 text-xs">
                <Wrench className="h-3.5 w-3.5" /> Rapport
                {data?.reports?.rapport?.stats && (
                  <Badge variant="secondary" className="text-[10px] px-1 h-4">{data.reports.rapport.stats.size}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="nettoyage" className="gap-1.5 text-xs">
                <Trash2 className="h-3.5 w-3.5" /> Nettoyage
                {data?.reports?.nettoyage?.stats && (
                  <Badge variant="secondary" className="text-[10px] px-1 h-4">{data.reports.nettoyage.stats.size}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="documentation" className="gap-1.5 text-xs">
                <BookOpen className="h-3.5 w-3.5" /> Docs
                {data?.reports?.documentation?.stats && (
                  <Badge variant="secondary" className="text-[10px] px-1 h-4">{data.reports.documentation.stats.size}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="rapport" className="mt-4">
              <ReportContent report={data?.reports?.rapport} />
            </TabsContent>
            <TabsContent value="nettoyage" className="mt-4">
              <ReportContent report={data?.reports?.nettoyage} />
            </TabsContent>
            <TabsContent value="documentation" className="mt-4">
              <ReportContent report={data?.reports?.documentation} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

// ── StateRow ──────────────────────────────────────────────────────────────────
function StateRow({ ok, label, fixHint }: { ok: boolean; label: string; fixHint?: string }) {
  return (
    <div className={`flex items-start gap-2 rounded-md px-3 py-2 text-sm ${ok ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}>
      {ok
        ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
        : <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />}
      <div>
        <p className={`text-xs font-medium ${ok ? "text-green-800" : "text-amber-800"}`}>{label}</p>
        {fixHint && <p className="text-xs text-amber-600 mt-0.5">{fixHint}</p>}
      </div>
    </div>
  )
}

// ── ReportContent ─────────────────────────────────────────────────────────────
function ReportContent({ report }: { report?: AuditReport | null }) {
  if (!report) return (
    <Alert><Info className="h-4 w-4" /><AlertTitle>Non chargé</AlertTitle></Alert>
  )
  if (report.error || !report.content) return (
    <Alert variant="warning">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Fichier non trouvé</AlertTitle>
      <AlertDescription>
        <code className="text-xs">{report.filename}</code>
        {report.error && <p className="text-xs mt-1 text-muted-foreground">{report.error}</p>}
      </AlertDescription>
    </Alert>
  )
  return (
    <>
      {report.stats && (
        <div className="flex gap-2 mb-4">
          {[["lignes", report.stats.lines.toLocaleString()], ["mots", report.stats.words.toLocaleString()], ["taille", report.stats.size]].map(([k, v]) => (
            <span key={k} className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
              <strong>{v}</strong> {k}
            </span>
          ))}
        </div>
      )}
      <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-h2:border-b prose-h2:pb-1 prose-h2:border-border prose-code:bg-muted prose-code:px-1 prose-code:rounded prose-code:text-xs prose-pre:bg-muted prose-pre:text-xs prose-table:text-sm prose-th:bg-muted/60 prose-a:text-primary overflow-x-auto">
        <ReactMarkdown>{report.content}</ReactMarkdown>
      </div>
    </>
  )
}
