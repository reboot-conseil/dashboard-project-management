import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"
import { backfillOrphanedActivitiesForProject } from "@/lib/crakotte-sync"

export async function POST() {
  const authError = await requireRole(["ADMIN"])
  if (authError) return authError

  const config = await prisma.crakotteConfig.findFirst()
  if (!config) return NextResponse.json({ error: "Aucune config Crakotte" }, { status: 400 })

  // Quick check — nothing to do
  const orphanCount = await prisma.activite.count({ where: { source: "CRAKOTTE", projetId: null } })
  if (orphanCount === 0) return NextResponse.json({ rattachees: 0 })

  // All mapped projects: direct crakotteProjectId + aliases
  const [directProjets, aliases] = await Promise.all([
    prisma.projet.findMany({
      where: { crakotteProjectId: { not: null } },
      select: { id: true, crakotteProjectId: true },
    }),
    prisma.crakotteProjectAlias.findMany({ select: { crakotteProjectId: true, projetId: true } }),
  ])

  const mappings: { crakotteProjectId: string; projetId: number }[] = [
    ...directProjets.map((p) => ({ crakotteProjectId: p.crakotteProjectId!, projetId: p.id })),
    ...aliases,
  ]

  let totalRattachees = 0
  for (const m of mappings) {
    try {
      totalRattachees += await backfillOrphanedActivitiesForProject(
        config.apiKey,
        m.crakotteProjectId,
        m.projetId,
        config.dateDebutSync,
        new Date()
      )
    } catch {
      // Skip silently per project — one failure shouldn't block the rest
    }
  }

  return NextResponse.json({ rattachees: totalRattachees })
}
