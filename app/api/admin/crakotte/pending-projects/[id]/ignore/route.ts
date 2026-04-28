import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireRole(["ADMIN"])
  if (authError) return authError

  const { id } = await params
  await prisma.crakottePendingProject.update({
    where: { id: parseInt(id) },
    data: { status: "IGNORED", resolvedAt: new Date() },
  })
  return NextResponse.json({ success: true })
}
