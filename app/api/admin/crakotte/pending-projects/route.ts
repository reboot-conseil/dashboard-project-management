import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const authError = await requireRole(["ADMIN"])
  if (authError) return authError

  // Auto-resolve pending projects whose crakotteProjectId is already linked in DB
  const [directLinks, aliases] = await Promise.all([
    prisma.projet.findMany({ where: { crakotteProjectId: { not: null } }, select: { crakotteProjectId: true } }),
    prisma.crakotteProjectAlias.findMany({ select: { crakotteProjectId: true } }),
  ])
  const linkedIds = [
    ...directLinks.map((p) => p.crakotteProjectId!),
    ...aliases.map((a) => a.crakotteProjectId),
  ]
  if (linkedIds.length > 0) {
    await prisma.crakottePendingProject.updateMany({
      where: { status: "PENDING", crakotteProjectId: { in: linkedIds } },
      data: { status: "APPROVED", resolvedAt: new Date() },
    })
  }

  const pending = await prisma.crakottePendingProject.findMany({
    where: { status: "PENDING" },
    include: { suggestedProjet: { select: { id: true, nom: true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(pending)
}
