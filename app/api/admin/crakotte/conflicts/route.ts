import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const authError = await requireRole(["ADMIN"])
  if (authError) return authError

  const conflicts = await prisma.crakotteConflict.findMany({
    where: { resolved: false },
    orderBy: { createdAt: "desc" },
  })

  const enriched = await Promise.all(
    conflicts.map(async (c) => {
      const [crakotteAct, manuelAct] = await Promise.all([
        prisma.activite.findUnique({
          where: { id: c.crakotteActiviteId },
          include: { consultant: { select: { nom: true } }, projet: { select: { nom: true } } },
        }),
        prisma.activite.findUnique({
          where: { id: c.manuelActiviteId },
          include: { consultant: { select: { nom: true } }, projet: { select: { nom: true } } },
        }),
      ])
      return { ...c, crakotteActivite: crakotteAct, manuelActivite: manuelAct }
    })
  )

  return NextResponse.json(enriched)
}
