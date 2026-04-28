"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface Activite {
  id: number
  date: string
  heures: number
  description: string | null
  projet: { nom: string } | null
  consultant: { nom: string }
}

interface Conflict {
  id: number
  crakotteActivite: Activite | null
  manuelActivite: Activite | null
}

export function ConflictsSection({ initial }: { initial: Conflict[] }) {
  const [conflicts, setConflicts] = useState(initial)

  async function resolve(conflictId: number, keep: "CRAKOTTE" | "MANUEL") {
    const res = await fetch(`/api/admin/crakotte/conflicts/${conflictId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keep }),
    })
    if (res.ok) {
      setConflicts((prev) => prev.filter((c) => c.id !== conflictId))
      toast.success("Conflit résolu")
    } else {
      toast.error("Erreur lors de la résolution")
    }
  }

  if (conflicts.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-2">Conflits</h2>
        <p className="text-muted-foreground text-sm">Aucun conflit en attente.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Conflits à résoudre ({conflicts.length})</h2>
      {conflicts.map((c) => (
        <div key={c.id} className="rounded-lg border p-4 grid grid-cols-2 gap-4">
          {(["manuelActivite", "crakotteActivite"] as const).map((key) => {
            const act = c[key]
            const label = key === "manuelActivite" ? "Saisie manuelle" : "Crakotte"
            const keep = key === "manuelActivite" ? "MANUEL" as const : "CRAKOTTE" as const
            return (
              <div key={key} className="space-y-1">
                <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
                {act ? (
                  <>
                    <p className="text-sm">{format(new Date(act.date), "dd MMM yyyy", { locale: fr })}</p>
                    <p className="text-sm font-medium">{act.heures}h</p>
                    <p className="text-xs text-muted-foreground">{act.projet?.nom ?? "Sans projet"}</p>
                    <p className="text-xs text-muted-foreground">{act.description}</p>
                    <Button size="sm" variant="outline" onClick={() => resolve(c.id, keep)}>
                      Garder {label}
                    </Button>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Activité supprimée</p>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
