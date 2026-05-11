import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"

export async function POST() {
  const authError = await requireRole(["ADMIN"])
  if (authError) return authError

  const result = await prisma.$executeRaw`
    UPDATE "Activite" SET heures = heures * 7.5 WHERE source = 'CRAKOTTE'
  `

  return NextResponse.json({ updated: result })
}
