"use client"
import { useState } from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

interface SyncDetail {
  activites: { consultant: string; projet: string; date: string; heures: number }[]
  conflits: { consultant: string; projet: string; date: string }[]
  projetsEnAttente: { nom: string; client: string }[]
  consultantsSkippes: string[]
}

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
  details: unknown
}

const STATUS_BADGE: Record<string, { variant: "success-soft" | "warning-soft" | "destructive-soft" | "neutral"; label: string }> = {
  SUCCESS:  { variant: "success-soft",     label: "Succès"       },
  PARTIAL:  { variant: "warning-soft",     label: "Partiel"      },
  ERROR:    { variant: "destructive-soft", label: "Erreur"       },
  RUNNING:  { variant: "neutral",          label: "En cours"     },
  TIMEOUT:  { variant: "destructive-soft", label: "Interrompue"  },
}

function resolveStatus(log: SyncLog) {
  if (log.status === "RUNNING" && !log.finishedAt) {
    const age = Date.now() - new Date(log.startedAt).getTime()
    if (age > 5 * 60 * 1000) return "TIMEOUT"
  }
  return log.status
}

function parseDetail(details: unknown): SyncDetail | null {
  if (!details || typeof details !== "object") return null
  return details as SyncDetail
}

function DetailPanel({ log, onClose }: { log: SyncLog; onClose: () => void }) {
  const detail = parseDetail(log.details)
  const status = resolveStatus(log)
  const { variant, label } = STATUS_BADGE[status] ?? { variant: "neutral" as const, label: status }
  const consultantCount = detail ? new Set(detail.activites.map((a) => a.consultant)).size : null
  const projetCount = detail ? new Set(detail.activites.map((a) => a.projet)).size : null

  return (
    <>
      <div className="fixed inset-0 z-[99] bg-black/20" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-[100] w-[420px] max-w-full bg-background border-l shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Badge variant={variant}>{label}</Badge>
              <span className="text-sm text-muted-foreground">
                {format(new Date(log.startedAt), "dd MMM yyyy à HH:mm", { locale: fr })}
              </span>
            </div>
            {log.finishedAt && (
              <p className="text-xs text-muted-foreground">
                Durée : {Math.round((new Date(log.finishedAt).getTime() - new Date(log.startedAt).getTime()) / 1000)}s
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 text-sm">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Activités créées",      value: log.activitesCreees },
              { label: "Consultants synchronisés", value: consultantCount ?? "—" },
              { label: "Projets synchronisés",   value: projetCount ?? "—" },
              { label: "Conflits",               value: log.conflitsDetectes },
              { label: "Projets en attente",     value: log.nouveauxProjets },
              { label: "Consultants skippés",    value: log.consultantsSkippes },
            ].map(({ label: l, value }) => (
              <div key={l} className="rounded-lg border px-3 py-2">
                <p className="text-lg font-semibold">{value}</p>
                <p className="text-xs text-muted-foreground">{l}</p>
              </div>
            ))}
          </div>

          {log.errorMessage && (
            <div>
              <p className="text-xs font-semibold uppercase text-destructive mb-1">Erreurs</p>
              <pre className="text-xs font-mono bg-destructive/10 rounded p-2 whitespace-pre-wrap">{log.errorMessage}</pre>
            </div>
          )}

          {/* Details (only present for syncs after the feature was added) */}
          {!detail && (
            <p className="text-xs text-muted-foreground italic">Détail non disponible pour les syncs antérieures.</p>
          )}

          {detail && detail.activites.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                Activités créées ({detail.activites.length})
              </p>
              <div className="space-y-1">
                {detail.activites.map((a, i) => (
                  <div key={i} className="flex items-center justify-between rounded border px-2.5 py-1.5 text-xs">
                    <div className="min-w-0">
                      <span className="font-medium">{a.consultant}</span>
                      <span className="text-muted-foreground ml-1.5 truncate block">{a.projet}</span>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p>{a.heures}h</p>
                      <p className="text-muted-foreground">{format(new Date(a.date), "dd/MM")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {detail && detail.conflits.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase text-amber-600 mb-2">
                Conflits ({detail.conflits.length})
              </p>
              <div className="space-y-1">
                {detail.conflits.map((c, i) => (
                  <div key={i} className="rounded border border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20 px-2.5 py-1.5 text-xs">
                    <span className="font-medium">{c.consultant}</span>
                    <span className="text-muted-foreground ml-1.5">{c.projet}</span>
                    <span className="text-muted-foreground ml-1.5">{format(new Date(c.date), "dd/MM")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {detail && detail.projetsEnAttente.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                Nouveaux projets détectés ({detail.projetsEnAttente.length})
              </p>
              <div className="space-y-1">
                {detail.projetsEnAttente.map((p, i) => (
                  <div key={i} className="rounded border px-2.5 py-1.5 text-xs">
                    <span className="font-medium">{p.nom}</span>
                    <span className="text-muted-foreground ml-1.5">{p.client}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {detail && detail.consultantsSkippes.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                Consultants non trouvés ({detail.consultantsSkippes.length})
              </p>
              <div className="space-y-1">
                {detail.consultantsSkippes.map((c, i) => (
                  <p key={i} className="text-xs text-muted-foreground rounded border px-2.5 py-1.5">{c}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export function SyncLogSection({ logs }: { logs: SyncLog[] }) {
  const [selectedLog, setSelectedLog] = useState<SyncLog | null>(null)

  if (logs.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-2">Historique des synchronisations</h2>
        <p className="text-muted-foreground text-sm">Aucune sync effectuée.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Historique des synchronisations</h2>
      <div className="space-y-1.5">
        {logs.map((log) => {
          const rowStatus = resolveStatus(log)
          const { variant, label } = STATUS_BADGE[rowStatus] ?? { variant: "neutral" as const, label: rowStatus }
          const rowDetail = parseDetail(log.details)
          const rowConsultants = rowDetail ? new Set(rowDetail.activites.map((a) => a.consultant)).size : null
          const rowProjets = rowDetail ? new Set(rowDetail.activites.map((a) => a.projet)).size : null
          return (
            <button
              key={log.id}
              onClick={() => setSelectedLog(log)}
              className="w-full flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Badge variant={variant}>{label}</Badge>
                <span className="text-muted-foreground">
                  {format(new Date(log.startedAt), "dd MMM yyyy à HH:mm", { locale: fr })}
                </span>
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>{log.activitesCreees} activités</span>
                {rowConsultants !== null && rowConsultants > 0 && <span>{rowConsultants} consultants</span>}
                {rowProjets !== null && rowProjets > 0 && <span>{rowProjets} projets</span>}
                {log.conflitsDetectes > 0 && <span className="text-amber-600">{log.conflitsDetectes} conflits</span>}
                <span className="text-muted-foreground/50">→</span>
              </div>
            </button>
          )
        })}
      </div>

      {selectedLog && <DetailPanel log={selectedLog} onClose={() => setSelectedLog(null)} />}
    </div>
  )
}
