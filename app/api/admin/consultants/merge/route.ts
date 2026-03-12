import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-guard"

export async function POST(req: NextRequest) {
  const authError = await requireRole(["ADMIN"])
  if (authError) return authError

  const { sourceId, targetId } = await req.json()

  if (!sourceId || !targetId)
    return NextResponse.json({ error: "sourceId et targetId requis" }, { status: 400 })

  if (sourceId === targetId)
    return NextResponse.json({ error: "sourceId et targetId doivent être différents" }, { status: 400 })

  const source = await prisma.consultant.findUnique({
    where: { id: parseInt(sourceId) },
    select: { id: true, nom: true, email: true, password: true },
  })
  if (!source)
    return NextResponse.json({ error: "Consultant source introuvable" }, { status: 404 })

  if (source.password)
    return NextResponse.json(
      { error: "Impossible de fusionner un consultant avec un compte actif — réinitialisez d'abord le mot de passe" },
      { status: 400 }
    )

  const target = await prisma.consultant.findUnique({
    where: { id: parseInt(targetId) },
    select: { id: true, nom: true },
  })
  if (!target)
    return NextResponse.json({ error: "Consultant cible introuvable" }, { status: 404 })

  const { count } = await prisma.$transaction(async (tx) => {
    const { count } = await tx.activite.updateMany({
      where: { consultantId: source.id },
      data: { consultantId: target.id },
    })
    await tx.consultant.delete({ where: { id: source.id } })
    return { count }
  })

  console.log(
    `[MERGE] ${source.nom} (id:${source.id}) → ${target.nom} (id:${target.id}) — ${count} activités migrées`
  )

  return NextResponse.json({
    success: true,
    activitesMigrees: count,
    sourceNom: source.nom,
    targetNom: target.nom,
  })
}
