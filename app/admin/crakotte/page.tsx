import { requireRole } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"
import { ConfigSection } from "@/components/admin/crakotte/ConfigSection"
import { SyncLogSection } from "@/components/admin/crakotte/SyncLogSection"
import { ConflictsSection } from "@/components/admin/crakotte/ConflictsSection"
import { PendingProjectsSection } from "@/components/admin/crakotte/PendingProjectsSection"

export default async function CrakottePage() {
  const authError = await requireRole(["ADMIN"])
  if (authError) return authError

  const [config, logs, conflicts, pendingProjects] = await Promise.all([
    prisma.crakotteConfig.findFirst(),
    prisma.crakotteSyncLog.findMany({ orderBy: { startedAt: "desc" }, take: 50 }),
    prisma.crakotteConflict.findMany({
      where: { resolved: false },
      orderBy: { createdAt: "desc" },
    }),
    prisma.crakottePendingProject.findMany({
      where: { status: "PENDING" },
      include: { suggestedProjet: { select: { id: true, nom: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ])

  const enrichedConflicts = await Promise.all(
    conflicts.map(async (c) => {
      const [crakotteAct, manuelAct] = await Promise.all([
        prisma.activite.findUnique({
          where: { id: c.crakotteActiviteId },
          include: { projet: { select: { nom: true } }, consultant: { select: { nom: true } } },
        }),
        prisma.activite.findUnique({
          where: { id: c.manuelActiviteId },
          include: { projet: { select: { nom: true } }, consultant: { select: { nom: true } } },
        }),
      ])
      return { ...c, crakotteActivite: crakotteAct, manuelActivite: manuelAct }
    })
  )

  const configForClient = config
    ? {
        ...config,
        apiKey: "***" + config.apiKey.slice(-4),
        dateDebutSync: config.dateDebutSync.toISOString(),
        lastSyncAt: config.lastSyncAt?.toISOString() ?? null,
        createdAt: config.createdAt.toISOString(),
        updatedAt: config.updatedAt.toISOString(),
      }
    : null

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-10">
      <h1 className="text-2xl font-bold">Intégration Crakotte</h1>
      <ConfigSection initial={configForClient} />
      <SyncLogSection
        logs={logs.map((l) => ({
          ...l,
          startedAt: l.startedAt.toISOString(),
          finishedAt: l.finishedAt?.toISOString() ?? null,
          createdAt: l.createdAt.toISOString(),
        }))}
      />
      <ConflictsSection
        initial={enrichedConflicts.map((c) => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
          resolvedAt: c.resolvedAt?.toISOString() ?? null,
          crakotteActivite: c.crakotteActivite
            ? {
                ...c.crakotteActivite,
                date: c.crakotteActivite.date.toISOString(),
                heures: Number(c.crakotteActivite.heures),
              }
            : null,
          manuelActivite: c.manuelActivite
            ? {
                ...c.manuelActivite,
                date: c.manuelActivite.date.toISOString(),
                heures: Number(c.manuelActivite.heures),
              }
            : null,
        }))}
      />
      <PendingProjectsSection
        initial={pendingProjects.map((p) => ({
          ...p,
          createdAt: p.createdAt.toISOString(),
          resolvedAt: p.resolvedAt?.toISOString() ?? null,
        }))}
      />
    </div>
  )
}
