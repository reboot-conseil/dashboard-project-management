import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"

export async function POST() {
  const authError = await requireRole(["ADMIN"])
  if (authError) return authError

  const config = await prisma.crakotteConfig.findFirst()
  if (!config) return NextResponse.json({ error: "Aucune config Crakotte" }, { status: 400 })

  const now = new Date()
  await prisma.crakotteConfig.update({
    where: { id: config.id },
    data: { lastSyncAt: now },
  })

  return NextResponse.json({ success: true, lastSyncAt: now.toISOString() })
}
