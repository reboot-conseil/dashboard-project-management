import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireRole(["ADMIN"])
  if (authError) return authError

  const { id } = await params
  const pending = await prisma.crakottePendingProject.findUnique({
    where: { id: parseInt(id) },
  })
  if (!pending) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

  const body = await req.json()
  const projet = await prisma.projet.create({
    data: {
      nom: body.nom ?? pending.crakotteProjectName,
      client: body.client ?? pending.crakotteCustomerName,
      statut: "PLANIFIE",
      couleur: body.couleur ?? "#3b82f6",
      crakotteProjectId: pending.crakotteProjectId,
      budget: body.budget ?? null,
      dateDebut: body.dateDebut ? new Date(body.dateDebut) : null,
      dateFin: body.dateFin ? new Date(body.dateFin) : null,
    },
  })

  await prisma.crakottePendingProject.update({
    where: { id: pending.id },
    data: { status: "APPROVED", resolvedAt: new Date() },
  })

  return NextResponse.json({ success: true, projetId: projet.id })
}
