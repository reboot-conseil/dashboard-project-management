import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"
import { fetchCrakotteProjects } from "@/lib/crakotte"

const COLORS = ["#3b82f6", "#6366f1", "#14b8a6", "#f43f5e", "#84cc16", "#f97316"]

export async function POST(req: NextRequest) {
  const authError = await requireRole(["ADMIN"])
  if (authError) return authError

  const config = await prisma.crakotteConfig.findFirst()
  if (!config) return NextResponse.json({ error: "Aucune config Crakotte" }, { status: 400 })

  const body = await req.json().catch(() => ({}))

  const crakotteProjets = await fetchCrakotteProjects(config.apiKey)

  const [dbProjets, dbAliases] = await Promise.all([
    prisma.projet.findMany({ select: { id: true, nom: true, crakotteProjectId: true } }),
    prisma.crakotteProjectAlias.findMany({ select: { crakotteProjectId: true } }),
  ])
  const linkedIds = new Set([
    ...dbProjets.filter((p) => p.crakotteProjectId).map((p) => p.crakotteProjectId!),
    ...dbAliases.map((a) => a.crakotteProjectId),
  ])

  // Fusionner un projet Crakotte avec un projet dashboard existant (crée un alias)
  if (body.mode === "link") {
    const { projectId, existingProjetId } = body
    if (!projectId || !existingProjetId) return NextResponse.json({ error: "projectId et existingProjetId requis" }, { status: 400 })
    if (linkedIds.has(projectId)) return NextResponse.json({ error: "Déjà lié" }, { status: 409 })
    await prisma.crakotteProjectAlias.create({ data: { crakotteProjectId: projectId, projetId: existingProjetId } })
    return NextResponse.json({ success: true, projetId: existingProjetId })
  }

  if (body.mode === "all") {
    const dbProjetNoms = new Set(dbProjets.map((p) => p.nom.toLowerCase()))
    const toCreate = crakotteProjets.filter((p) => !linkedIds.has(p.id) && !dbProjetNoms.has(p.name.toLowerCase()))
    await prisma.projet.createMany({
      data: toCreate.map((p, i) => ({
        nom: p.name,
        client: p.customer.name,
        statut: "EN_COURS" as const,
        couleur: COLORS[i % COLORS.length],
        crakotteProjectId: p.id,
      })),
      skipDuplicates: true,
    })
    return NextResponse.json({ created: toCreate.length })
  }

  const { projectId, nom, client, couleur } = body
  if (!projectId) return NextResponse.json({ error: "projectId requis" }, { status: 400 })

  if (linkedIds.has(projectId)) {
    const existing = dbProjets.find((p) => p.crakotteProjectId === projectId)
    return NextResponse.json({ error: "Déjà lié", projetId: existing?.id })
  }

  const source = crakotteProjets.find((p) => p.id === projectId)
  const projet = await prisma.projet.create({
    data: {
      nom: nom ?? source?.name ?? projectId,
      client: client ?? source?.customer.name ?? "",
      statut: "EN_COURS",
      couleur: couleur ?? "#3b82f6",
      crakotteProjectId: projectId,
    },
  })

  return NextResponse.json({ success: true, projetId: projet.id })
}
