"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface PendingProject {
  id: number
  crakotteProjectName: string
  crakotteCustomerName: string
  suggestedProjet: { id: number; nom: string } | null
}

export function PendingProjectsSection({ initial }: { initial: PendingProject[] }) {
  const [pending, setPending] = useState(initial)

  async function approve(id: number, nom: string, client: string) {
    const res = await fetch(`/api/admin/crakotte/pending-projects/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom, client }),
    })
    if (res.ok) {
      setPending((prev) => prev.filter((p) => p.id !== id))
      toast.success("Projet créé dans le dashboard")
    } else {
      toast.error("Erreur lors de la création")
    }
  }

  async function ignore(id: number) {
    const res = await fetch(`/api/admin/crakotte/pending-projects/${id}/ignore`, { method: "POST" })
    if (res.ok) {
      setPending((prev) => prev.filter((p) => p.id !== id))
      toast.success("Projet ignoré")
    } else {
      toast.error("Erreur")
    }
  }

  if (pending.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-2">Projets en attente</h2>
        <p className="text-muted-foreground text-sm">Aucun nouveau projet Crakotte détecté.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Projets en attente ({pending.length})</h2>
      {pending.map((p) => (
        <div key={p.id} className="rounded-lg border p-4 space-y-2">
          <div>
            <p className="font-medium">{p.crakotteProjectName}</p>
            <p className="text-sm text-muted-foreground">Client : {p.crakotteCustomerName}</p>
            {p.suggestedProjet && (
              <p className="text-xs text-amber-600">
                Suggestion : similaire à &quot;{p.suggestedProjet.nom}&quot;
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => approve(p.id, p.crakotteProjectName, p.crakotteCustomerName)}
            >
              Créer dans le dashboard
            </Button>
            <Button size="sm" variant="outline" onClick={() => ignore(p.id)}>
              Ignorer
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
