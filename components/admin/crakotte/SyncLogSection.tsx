"use client"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface SyncLog {
  id: number
  startedAt: string
  finishedAt: string | null
  status: string
  activitesCreees: number
  conflitsDetectes: number
  nouveauxProjets: number
  consultantsSkippes: number
  errorMessage: string | null
}

const STATUS_LABEL: Record<string, string> = {
  SUCCESS: "Succès",
  PARTIAL: "Partiel",
  ERROR: "Erreur",
  RUNNING: "En cours",
}

export function SyncLogSection({ logs }: { logs: SyncLog[] }) {
  const last = logs[0]

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Synchronisation</h2>
      {last ? (
        <div className="rounded-lg border p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">{STATUS_LABEL[last.status] ?? last.status}</span>
            <span className="text-muted-foreground text-sm">
              {format(new Date(last.startedAt), "dd MMM yyyy à HH:mm", { locale: fr })}
            </span>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>{last.activitesCreees} activités créées</span>
            <span>{last.conflitsDetectes} conflits</span>
            <span>{last.nouveauxProjets} nouveaux projets</span>
            {last.consultantsSkippes > 0 && <span>{last.consultantsSkippes} consultants skippés</span>}
          </div>
          {last.errorMessage && (
            <p className="text-destructive text-xs font-mono">{last.errorMessage}</p>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">Aucune sync effectuée.</p>
      )}
      {logs.length > 1 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">Historique ({logs.length} syncs)</summary>
          <div className="mt-2 space-y-1">
            {logs.slice(1).map((log) => (
              <div key={log.id} className="flex gap-3 text-xs text-muted-foreground">
                <span>{STATUS_LABEL[log.status] ?? log.status}</span>
                <span>{format(new Date(log.startedAt), "dd/MM/yy HH:mm")}</span>
                <span>{log.activitesCreees} créées</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
