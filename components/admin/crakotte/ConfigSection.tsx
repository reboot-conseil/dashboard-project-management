"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface Config {
  apiKey: string
  actif: boolean
  dateDebutSync: string
  lastSyncAt: string | null
}

export function ConfigSection({ initial }: { initial: Config | null }) {
  const [apiKey, setApiKey] = useState(initial?.apiKey ?? "")
  const [actif, setActif] = useState(initial?.actif ?? true)
  const [dateDebut, setDateDebut] = useState(
    initial?.dateDebutSync ? initial.dateDebutSync.split("T")[0] : new Date().getFullYear() + "-01-01"
  )
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const res = await fetch("/api/admin/crakotte/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, actif, dateDebutSync: dateDebut }),
    })
    setSaving(false)
    if (res.ok) toast.success("Configuration sauvegardée")
    else toast.error("Erreur lors de la sauvegarde")
  }

  async function testConnection() {
    setTesting(true)
    const res = await fetch("/api/admin/crakotte/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey }),
    })
    const data = await res.json()
    setTesting(false)
    if (data.ok) toast.success("Connexion Crakotte OK")
    else toast.error("Erreur: " + (data.error ?? "inconnue"))
  }

  async function syncNow() {
    setSyncing(true)
    try {
      const res = await fetch("/api/admin/crakotte/sync", { method: "POST" })
      const data = await res.json()
      if (res.ok) toast.success(`Sync terminée — ${data.result?.activitesCreees ?? 0} activités créées`)
      else toast.error("Erreur sync: " + (data.error ?? "inconnue"))
    } catch {
      toast.error("Erreur réseau lors de la sync")
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Configuration Crakotte</h2>
      <div className="grid gap-4 max-w-lg">
        <div>
          <Label htmlFor="apiKey">Clé API</Label>
          <Input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Votre clé API Crakotte"
          />
        </div>
        <div>
          <Label htmlFor="dateDebut">Date de début de sync</Label>
          <Input
            id="dateDebut"
            type="date"
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            id="actif"
            type="checkbox"
            checked={actif}
            onChange={(e) => setActif(e.target.checked)}
            className="h-4 w-4"
          />
          <Label htmlFor="actif">Sync automatique activée</Label>
        </div>
        <div className="flex gap-2">
          <Button onClick={save} disabled={saving} size="sm">
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
          <Button onClick={testConnection} disabled={testing} variant="outline" size="sm">
            {testing ? "Test..." : "Tester la connexion"}
          </Button>
          <Button onClick={syncNow} disabled={syncing} variant="outline" size="sm">
            {syncing ? "Sync en cours..." : "Synchroniser maintenant"}
          </Button>
        </div>
      </div>
    </div>
  )
}
