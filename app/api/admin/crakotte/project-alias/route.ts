import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"

export async function DELETE(req: NextRequest) {
  const authError = await requireRole(["ADMIN"])
  if (authError) return authError

  const { crakotteProjectId } = await req.json().catch(() => ({}))
  if (!crakotteProjectId) return NextResponse.json({ error: "crakotteProjectId requis" }, { status: 400 })

  try {
    await prisma.crakotteProjectAlias.delete({ where: { crakotteProjectId } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Alias non trouvé" }, { status: 404 })
  }
}
