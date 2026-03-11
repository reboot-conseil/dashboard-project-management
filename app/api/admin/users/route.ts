import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
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
  const body = await req.json()

  // ── Cas 1 : création d'un nouveau consultant + compte ──
  if (body.action === "create") {
    const { nom, email, role, password, tjm } = body
    if (!nom || !email || !role || !password)
      return NextResponse.json({ error: "Champs manquants" }, { status: 400 })

    if (!["ADMIN", "PM", "CONSULTANT"].includes(role))
      return NextResponse.json({ error: "Rôle invalide" }, { status: 400 })

    const existing = await prisma.consultant.findUnique({ where: { email } })
    if (existing)
      return NextResponse.json({ error: "Email déjà utilisé" }, { status: 409 })

    const CONSULTANT_COLORS = ["#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#06B6D4", "#F97316"]
    const count = await prisma.consultant.count()
    const couleur = CONSULTANT_COLORS[count % CONSULTANT_COLORS.length]

    const hash = await bcrypt.hash(password, 12)

    const consultant = await prisma.consultant.create({
      data: {
        nom,
        email,
        role,
        password: hash,
        couleur,
        tjm: tjm != null && tjm !== "" ? Number(tjm) : null,
        actif: true,
      },
    })
    return NextResponse.json({ id: consultant.id, email: consultant.email, role: consultant.role }, { status: 201 })
  }

  // ── Cas 2 : activation d'un consultant existant (comportement actuel) ──
  const { consultantId, role, password } = body
  if (!consultantId || !role || !password)
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 })
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
  if (password) data.password = await bcrypt.hash(password, 12)
  if (role) data.role = role
  if (actif !== undefined) data.actif = actif
  const updated = await prisma.consultant.update({ where: { id: consultantId }, data })
  return NextResponse.json({ id: updated.id, email: updated.email, role: updated.role })
}
