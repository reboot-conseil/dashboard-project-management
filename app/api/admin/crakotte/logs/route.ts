import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const authError = await requireRole(["ADMIN"])
  if (authError) return authError

  const logs = await prisma.crakotteSyncLog.findMany({
    orderBy: { startedAt: "desc" },
    take: 50,
  })
  return NextResponse.json(logs)
}
