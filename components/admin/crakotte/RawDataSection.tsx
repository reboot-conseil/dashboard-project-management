"use client"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format, subDays } from "date-fns"
import { fr } from "date-fns/locale"
import { toast } from "sonner"

interface ConsultantPreview {
  id: string
  nom: string
  email: string
  matched: boolean
  matchedWith: string | null
  matchedByNom: boolean
}

interface ProjetSuggestion {
  projetId: number
  nom: string
  client: string
  score: number
}

interface ProjetPreview {
  id: string
  nom: string
  client: string
  matchedById: boolean
  matchedByAlias: boolean
  matchedByNom: boolean
  suggestions: ProjetSuggestion[]
  dbProjetId: number | null
}

interface DbProjet {
  id: number
  nom: string
  client: string
}

interface EntryPreview {
  id: string
  date: string
  heures: number
  consultant: string
  consultantEmail: string
  projet: string
  etape: string
  status: string
  consultantMatched: boolean
}

interface PreviewData {
  periode: { from: string; to: string }
  consultants: ConsultantPreview[]
  projets: ProjetPreview[]
  allDbProjets: DbProjet[]
  entries: EntryPreview[]
  stats: {
    totalEntries: number
    shownEntries: number
    consultantsMatches: number
    consultantsTotal: number
    projetsMatches: number
    projetsTotal: number
  }
}

export function RawDataSection() {
  const [data, setData] = useState<PreviewData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<"consultants" | "projets" | "entries">("consultants")
  const [creating, setCreating] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [unlinking, setUnlinking] = useState<string | null>(null)
  const [syncingActivities, setSyncingActivities] = useState(false)
  const today = format(new Date(), "yyyy-MM-dd")
  const [syncFrom, setSyncFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"))
  const [syncTo, setSyncTo] = useState(today)
  // Manual project selection: crakotteProjectId → selected db projetId (as string for <select>)
  const [manualSelect, setManualSelect] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/crakotte/preview")
      if (!res.ok) throw new Error(await res.text())
      setData(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function importConsultants(mode: "reboot" | "all" | "selected", ids?: string[]) {
    setCreating(mode === "reboot" ? "reboot" : mode === "all" ? "all-consultants" : ids?.[0] ?? "")
    try {
      const res = await fetch("/api/admin/crakotte/import-consultants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, ids }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error ?? "Erreur"); return }
      toast.success(`${d.created} consultant(s) créé(s), ${d.linked} lié(s)`)
      await load()
    } finally {
      setCreating(null)
    }
  }

  async function importProject(projectId: string, nom: string, client: string) {
    setCreating(projectId)
    try {
      const res = await fetch("/api/admin/crakotte/import-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, nom, client }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error ?? "Erreur"); return }
      toast.success(`Projet "${nom}" créé`)
      await load()
    } finally {
      setCreating(null)
    }
  }

  async function linkProject(projectId: string, existingProjetId: number, existingNom: string) {
    setCreating(`link-${projectId}`)
    try {
      const res = await fetch("/api/admin/crakotte/import-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "link", projectId, existingProjetId }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error ?? "Erreur"); return }
      toast.success(`Fusionné avec "${existingNom}"`)
      setManualSelect((prev) => { const n = { ...prev }; delete n[projectId]; return n })
      await load()
    } finally {
      setCreating(null)
    }
  }

  async function unlinkProject(crakotteProjectId: string) {
    setUnlinking(crakotteProjectId)
    try {
      const res = await fetch("/api/admin/crakotte/project-alias", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crakotteProjectId }),
      })
      if (!res.ok) { toast.error("Erreur lors de la décorélation"); return }
      toast.success("Projet décorélé — vous pouvez maintenant le reconfigurer")
      await load()
    } finally {
      setUnlinking(null)
    }
  }

  async function deleteProject(dbProjetId: number, nom: string) {
    if (!window.confirm(`Supprimer le projet "${nom}" ? Cette action est irréversible.`)) return
    setDeleting(dbProjetId)
    try {
      const res = await fetch(`/api/projets/${dbProjetId}`, { method: "DELETE" })
      if (!res.ok) { toast.error("Erreur lors de la suppression"); return }
      toast.success(`Projet "${nom}" supprimé`)
      await load()
    } finally {
      setDeleting(null)
    }
  }

  async function syncActivities() {
    setSyncingActivities(true)
    try {
      const res = await fetch("/api/admin/crakotte/import-activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: syncFrom, to: syncTo }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error ?? "Erreur"); return }
      const msg = d.activitesCreees > 0
        ? `${d.activitesCreees} activité(s) importée(s)`
        : "Aucune nouvelle activité (déjà synchronisées ou aucune entrée sur la période)"
      toast.success(msg)
      if (d.projetsEnAttente > 0) toast.warning(`${d.projetsEnAttente} projet(s) en attente de création`)
      await load()
    } finally {
      setSyncingActivities(false)
    }
  }

  async function importAllProjects() {
    setCreating("all-projects")
    try {
      const res = await fetch("/api/admin/crakotte/import-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "all" }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error ?? "Erreur"); return }
      toast.success(`${d.created} projet(s) créé(s)`)
      await load()
    } finally {
      setCreating(null)
    }
  }

  const tabs = [
    { key: "consultants" as const, label: "1. Consultants" },
    { key: "projets" as const,     label: "2. Projets" },
    { key: "entries" as const,     label: "3. Activités" },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Données brutes Crakotte</h2>
        <Button onClick={load} disabled={loading} variant="outline" size="sm">
          {loading ? "Chargement..." : "Actualiser"}
        </Button>
      </div>

      {loading && !data && (
        <p className="text-sm text-muted-foreground">Chargement des données Crakotte...</p>
      )}
      {error && <p className="text-destructive text-sm">{error}</p>}

      {data && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Période : {data.periode.from} → {data.periode.to}
          </p>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold">{data.stats.consultantsMatches}/{data.stats.consultantsTotal}</p>
              <p className="text-xs text-muted-foreground mt-1">Consultants matchés</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold">{data.stats.projetsMatches}/{data.stats.projetsTotal}</p>
              <p className="text-xs text-muted-foreground mt-1">Projets matchés</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold">{data.stats.totalEntries}</p>
              <p className="text-xs text-muted-foreground mt-1">Entrées de temps</p>
            </div>
          </div>

          <div className="flex gap-2 border-b">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── 1. Consultants ── */}
          {tab === "consultants" && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button size="sm" onClick={() => importConsultants("reboot")} disabled={!!creating}>
                  {creating === "reboot" ? "Création..." : "Créer @reboot-conseil.com"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => importConsultants("all")} disabled={!!creating}>
                  {creating === "all-consultants" ? "Création..." : `Créer tous (${data.consultants.length})`}
                </Button>
              </div>
              <div className="space-y-1">
                {data.consultants.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium">{c.nom}</span>
                      <span className="ml-2 text-muted-foreground text-xs">{c.email}</span>
                    </div>
                    {c.matched ? (
                      <Badge variant={c.matchedByNom ? "warning-soft" : "success-soft"}>
                        {c.matchedWith}{c.matchedByNom ? " (nom)" : ""}
                      </Badge>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button size="xs" variant="outline" disabled={!!creating} onClick={() => importConsultants("selected", [c.id])}>
                          {creating === c.id ? "..." : "Créer"}
                        </Button>
                        <Badge variant="destructive-soft">Non trouvé</Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 2. Projets ── */}
          {tab === "projets" && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button size="sm" onClick={importAllProjects} disabled={!!creating}>
                  {creating === "all-projects"
                    ? "Création..."
                    : `Créer tous les inconnus (${data.projets.filter((p) => !p.matchedById && !p.matchedByNom).length})`}
                </Button>
              </div>
              <div className="space-y-2">
                {data.projets.map((p) => {
                  const selectedId = manualSelect[p.id] ? parseInt(manualSelect[p.id]) : null
                  const selectedDbProjet = selectedId ? data.allDbProjets.find((dp) => dp.id === selectedId) : null
                  const canFuse = !p.matchedById

                  return (
                    <div key={p.id} className="rounded-md border px-3 py-2.5 text-sm space-y-2">
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-medium">{p.nom}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{p.client}</span>
                        </div>
                        {p.matchedById ? (
                          <div className="flex items-center gap-2 shrink-0">
                            {p.matchedByAlias ? (
                              <button
                                onClick={() => unlinkProject(p.id)}
                                disabled={unlinking === p.id}
                                className="text-xs px-2 py-0.5 rounded border border-amber-400/60 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 disabled:opacity-50 transition-colors"
                              >
                                {unlinking === p.id ? "..." : "Décoreler"}
                              </button>
                            ) : p.dbProjetId ? (
                              <button
                                onClick={() => deleteProject(p.dbProjetId!, p.nom)}
                                disabled={deleting === p.dbProjetId}
                                className="text-xs px-2 py-0.5 rounded border border-destructive/40 text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
                              >
                                {deleting === p.dbProjetId ? "..." : "Supprimer"}
                              </button>
                            ) : null}
                            <Badge variant="success-soft">{p.matchedByAlias ? "Fusionné" : "ID lié"}</Badge>
                          </div>
                        ) : p.matchedByNom ? (
                          <Badge variant="warning-soft">Nom similaire</Badge>
                        ) : (
                          <div className="flex items-center gap-2 shrink-0">
                            <Button size="xs" variant="outline" disabled={!!creating} onClick={() => importProject(p.id, p.nom, p.client)}>
                              {creating === p.id ? "..." : "Créer"}
                            </Button>
                            <Badge variant="destructive-soft">Inconnu</Badge>
                          </div>
                        )}
                      </div>

                      {/* Suggestions + manual select (only for unmatched) */}
                      {canFuse && (
                        <div className="space-y-2 pt-1 border-t">
                          {/* Auto-suggestions */}
                          {p.suggestions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 items-center">
                              <span className="text-xs text-muted-foreground">Suggestions :</span>
                              {p.suggestions.map((s) => (
                                <button
                                  key={s.projetId}
                                  disabled={!!creating}
                                  onClick={() => linkProject(p.id, s.projetId, s.nom)}
                                  className="text-xs px-2 py-0.5 rounded border border-amber-400/60 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 disabled:opacity-50 transition-colors"
                                >
                                  {creating === `link-${p.id}` ? "..." : `${s.nom} — ${s.client} (${Math.round(s.score * 100)}%)`}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Manual select */}
                          <div className="flex gap-2 items-center">
                            <select
                              value={manualSelect[p.id] ?? ""}
                              onChange={(e) => setManualSelect((prev) => ({ ...prev, [p.id]: e.target.value }))}
                              className="flex-1 text-xs rounded-md border bg-background px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            >
                              <option value="">Fusionner manuellement avec...</option>
                              {data.allDbProjets.map((dp) => (
                                <option key={dp.id} value={dp.id}>
                                  {dp.nom} — {dp.client}
                                </option>
                              ))}
                            </select>
                            <Button
                              size="xs"
                              disabled={!selectedDbProjet || !!creating}
                              onClick={() => selectedDbProjet && linkProject(p.id, selectedDbProjet.id, selectedDbProjet.nom)}
                            >
                              {creating === `link-${p.id}` ? "..." : "Fusionner"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── 3. Activités ── */}
          {tab === "entries" && (
            <div className="space-y-3">
              {/* Import block */}
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Importer les activités</p>
                <p className="text-xs text-muted-foreground">
                  Chaque activité est identifiée par son ID Crakotte — aucun doublon possible.
                </p>
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    type="date"
                    value={syncFrom}
                    onChange={(e) => setSyncFrom(e.target.value)}
                    className="text-xs rounded-md border bg-background px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <span className="text-xs text-muted-foreground">→</span>
                  <input
                    type="date"
                    value={syncTo}
                    onChange={(e) => setSyncTo(e.target.value)}
                    className="text-xs rounded-md border bg-background px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <Button size="sm" disabled={syncingActivities} onClick={syncActivities}>
                    {syncingActivities ? "Import en cours..." : "Importer les activités"}
                  </Button>
                </div>
              </div>

              {/* Entries list */}
              <div className="space-y-1">
              {data.entries.map((e) => (
                <div
                  key={e.id}
                  className={`rounded-md border px-3 py-2 text-sm grid grid-cols-[1fr_auto] gap-2 ${
                    !e.consultantMatched ? "opacity-50" : ""
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{e.consultant}</span>
                      <span className="text-muted-foreground">{format(new Date(e.date), "dd MMM", { locale: fr })}</span>
                      <span className="font-medium">{e.heures}h</span>
                    </div>
                    <p className="text-muted-foreground text-xs">{e.projet} — {e.etape}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="neutral">{e.status}</Badge>
                    {!e.consultantMatched && <Badge variant="destructive-soft">consultant inconnu</Badge>}
                  </div>
                </div>
              ))}
              {data.stats.totalEntries > data.stats.shownEntries && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  {data.stats.shownEntries} / {data.stats.totalEntries} entrées affichées
                </p>
              )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
