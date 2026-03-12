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

  const sid = typeof sourceId === "number" ? sourceId : parseInt(sourceId)
  const tid = typeof targetId === "number" ? targetId : parseInt(targetId)
  if (!sid || !tid || isNaN(sid) || isNaN(tid))
    return NextResponse.json({ error: "sourceId et targetId doivent être des nombres valides" }, { status: 400 })

  const source = await prisma.consultant.findUnique({
    where: { id: sid },
    select: { id: true, nom: true, email: true, actif: true },
  })
  if (!source)
    return NextResponse.json({ error: "Consultant source introuvable" }, { status: 404 })

  if (source.actif)
    return NextResponse.json(
      { error: "Impossible de fusionner un consultant avec un compte actif" },
      { status: 400 }
    )

  const target = await prisma.consultant.findUnique({
    where: { id: tid },
    select: { id: true, nom: true, actif: true },
  })
  if (!target)
    return NextResponse.json({ error: "Consultant cible introuvable" }, { status: 404 })

  if (!target.actif)
    return NextResponse.json(
      { error: "Le consultant cible est inactif" },
      { status: 400 }
    )

  const result = await prisma.$transaction(async (tx) => {
    const { count } = await tx.activite.updateMany({
      where: { consultantId: source.id },
      data: { consultantId: target.id },
    })
    await tx.consultant.delete({ where: { id: source.id } })
    return count
  })

  console.log(
    `[MERGE] ${source.nom} (id:${source.id}) → ${target.nom} (id:${target.id}) — ${result} activités migrées`
  )

  return NextResponse.json({
    success: true,
    activitesMigrees: result,
    sourceNom: source.nom,
    targetNom: target.nom,
  })
}
