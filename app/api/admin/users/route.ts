import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const authError = await requireRole(["ADMIN"])
  if (authError) return authError
  const consultants = await prisma.consultant.findMany({
    select: { id: true, nom: true, email: true, role: true, actif: true, password: true },
    orderBy: { nom: "asc" },
  })
  return NextResponse.json(consultants.map((c) => ({ ...c, hasAccount: !!c.password, password: undefined })))
}

export async function POST(req: Request) {
  const authError = await requireRole(["ADMIN"])
  if (authError) return authError
  const { consultantId, role, password } = await req.json()
  if (!consultantId || !role || !password) return NextResponse.json({ error: "Champs manquants" }, { status: 400 })
  const bcrypt = await import("bcryptjs")
  const hash = await bcrypt.hash(password, 12)
  const updated = await prisma.consultant.update({ where: { id: consultantId }, data: { role, password: hash } })
  return NextResponse.json({ id: updated.id, email: updated.email, role: updated.role })
}

export async function DELETE(req: Request) {
  const authError = await requireRole(["ADMIN"])
  if (authError) return authError
  const { consultantId } = await req.json()
  if (!consultantId) return NextResponse.json({ error: "consultantId manquant" }, { status: 400 })
  await prisma.consultant.update({ where: { id: consultantId }, data: { password: null, actif: false } })
  return NextResponse.json({ success: true })
}

export async function PATCH(req: Request) {
  const authError = await requireRole(["ADMIN"])
  if (authError) return authError
  const { consultantId, password, role, actif } = await req.json()
  if (!consultantId) return NextResponse.json({ error: "consultantId manquant" }, { status: 400 })
  const data: Record<string, unknown> = {}
  if (password) { const bcrypt = await import("bcryptjs"); data.password = await bcrypt.hash(password, 12) }
  if (role) data.role = role
  if (actif !== undefined) data.actif = actif
  const updated = await prisma.consultant.update({ where: { id: consultantId }, data })
  return NextResponse.json({ id: updated.id, email: updated.email, role: updated.role })
}
