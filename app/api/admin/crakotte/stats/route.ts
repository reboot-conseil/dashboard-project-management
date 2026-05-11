import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const authError = await requireRole(["ADMIN"])
  if (authError) return authError

  const [activitesTotal, activitesOrphelines, projetsMappesCount, consultantsMappesCount] =
    await Promise.all([
      prisma.activite.count({ where: { source: "CRAKOTTE" } }),
      prisma.activite.count({ where: { source: "CRAKOTTE", projetId: null } }),
      prisma.projet.count({ where: { crakotteProjectId: { not: null } } }),
      prisma.consultant.count({ where: { crakotteConsultantId: { not: null } } }),
    ])

  return NextResponse.json({
    activitesTotal,
    activitesOrphelines,
    projetsMappés: projetsMappesCount,
    consultantsMappés: consultantsMappesCount,
  })
}
