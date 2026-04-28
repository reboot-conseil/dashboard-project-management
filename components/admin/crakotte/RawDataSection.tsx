"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { toast } from "sonner"

interface ConsultantPreview {
  id: string
  nom: string
  email: string
  matched: boolean
  matchedWith: string | null
}

interface ProjetPreview {
  id: string
  nom: string
  client: string
  matchedById: boolean
  matchedByNom: boolean
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

  async function load() {
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
  }

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Données brutes Crakotte</h2>
        <Button onClick={load} disabled={loading} variant="outline" size="sm">
          {loading ? "Chargement..." : data ? "Actualiser" : "Charger"}
        </Button>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {data && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Période : {data.periode.from} → {data.periode.to}
          </p>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold">
                {data.stats.consultantsMatches}/{data.stats.consultantsTotal}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Consultants matchés</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold">
                {data.stats.projetsMatches}/{data.stats.projetsTotal}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Projets matchés</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold">{data.stats.totalEntries}</p>
              <p className="text-xs text-muted-foreground mt-1">Entrées de temps</p>
            </div>
          </div>

          <div className="flex gap-2 border-b">
            {(["consultants", "projets", "entries"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === t
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "consultants" ? "Consultants" : t === "projets" ? "Projets" : "Entrées de temps"}
              </button>
            ))}
          </div>

          {tab === "consultants" && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => importConsultants("reboot")}
                  disabled={!!creating}
                >
                  {creating === "reboot" ? "Création..." : "Créer @reboot-conseil.com"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => importConsultants("all")}
                  disabled={!!creating}
                >
                  {creating === "all-consultants" ? "Création..." : "Créer tous (69)"}
                </Button>
              </div>
              <div className="space-y-1">
                {data.consultants.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium">{c.nom}</span>
                      <span className="ml-2 text-muted-foreground">{c.email}</span>
                    </div>
                    {c.matched ? (
                      <Badge variant="success-soft">{c.matchedWith}</Badge>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          size="xs"
                          variant="outline"
                          disabled={!!creating}
                          onClick={() => importConsultants("selected", [c.id])}
                        >
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

          {tab === "projets" && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={importAllProjects}
                  disabled={!!creating}
                >
                  {creating === "all-projects" ? "Création..." : `Créer tous les inconnus (${data.projets.filter((p) => !p.matchedById && !p.matchedByNom).length})`}
                </Button>
              </div>
              <div className="space-y-1">
                {data.projets.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium">{p.nom}</span>
                      <span className="ml-2 text-muted-foreground">{p.client}</span>
                    </div>
                    {p.matchedById ? (
                      <Badge variant="success-soft">ID lié</Badge>
                    ) : p.matchedByNom ? (
                      <Badge variant="warning-soft">Nom similaire</Badge>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          size="xs"
                          variant="outline"
                          disabled={!!creating}
                          onClick={() => importProject(p.id, p.nom, p.client)}
                        >
                          {creating === p.id ? "..." : "Créer"}
                        </Button>
                        <Badge variant="destructive-soft">Inconnu</Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "entries" && (
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
                      <span className="text-muted-foreground">
                        {format(new Date(e.date), "dd MMM", { locale: fr })}
                      </span>
                      <span className="font-medium">{e.heures}h</span>
                    </div>
                    <p className="text-muted-foreground">{e.projet} — {e.etape}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="neutral">{e.status}</Badge>
                    {!e.consultantMatched && (
                      <Badge variant="destructive-soft">consultant inconnu</Badge>
                    )}
                  </div>
                </div>
              ))}
              {data.stats.totalEntries > data.stats.shownEntries && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  {data.stats.shownEntries} / {data.stats.totalEntries} entrées affichées
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
