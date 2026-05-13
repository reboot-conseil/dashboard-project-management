import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"

export async function POST() {
  const authError = await requireRole(["ADMIN"])
  if (authError) return authError

  const result = await prisma.consultant.updateMany({
    where: { tjm: null },
    data: { tjm: 400 },
  })

  return NextResponse.json({ updated: result.count })
}
