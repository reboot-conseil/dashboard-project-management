import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const authError = await requireRole(["ADMIN"])
  if (authError) return authError

  const pending = await prisma.crakottePendingProject.findMany({
    where: { status: "PENDING" },
    include: { suggestedProjet: { select: { id: true, nom: true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(pending)
}
