import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireRole(["ADMIN"])
  if (authError) return authError

  const { keep } = await req.json()
  const { id } = await params
  const conflictId = parseInt(id)

  const conflict = await prisma.crakotteConflict.findUnique({ where: { id: conflictId } })
  if (!conflict) return NextResponse.json({ error: "Conflit introuvable" }, { status: 404 })

  const toDeleteId = keep === "CRAKOTTE" ? conflict.manuelActiviteId : conflict.crakotteActiviteId

  await prisma.$transaction([
    prisma.activite.delete({ where: { id: toDeleteId } }),
    prisma.crakotteConflict.update({
      where: { id: conflictId },
      data: { resolved: true, resolvedAt: new Date(), keptSource: keep },
    }),
  ])

  return NextResponse.json({ success: true })
}
