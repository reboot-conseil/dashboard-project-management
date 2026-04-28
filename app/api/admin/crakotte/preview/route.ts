import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"
import {
  fetchCrakotteConsultants,
  fetchCrakotteProjects,
  fetchCrakotteTimeSpent,
} from "@/lib/crakotte"
import { format, subDays } from "date-fns"

export async function GET() {
  const authError = await requireRole(["ADMIN"])
  if (authError) return authError

  const config = await prisma.crakotteConfig.findFirst()
  if (!config) return NextResponse.json({ error: "Aucune config Crakotte" }, { status: 400 })

  const to = format(new Date(), "yyyy-MM-dd")
  const from = format(subDays(new Date(), 30), "yyyy-MM-dd")

  const [crakotteConsultants, crakotteProjets, timeSpent, dbConsultants, dbProjets] =
    await Promise.all([
      fetchCrakotteConsultants(config.apiKey),
      fetchCrakotteProjects(config.apiKey),
      fetchCrakotteTimeSpent(config.apiKey, from, to),
      prisma.consultant.findMany({ select: { id: true, nom: true, email: true } }),
      prisma.projet.findMany({ select: { id: true, nom: true, crakotteProjectId: true } }),
    ])

  const dbEmailSet = new Set(dbConsultants.map((c) => c.email?.toLowerCase()))
  const dbProjetNomSet = new Set(dbProjets.map((p) => p.nom.toLowerCase()))
  const dbProjetCrakotteIdSet = new Set(
    dbProjets.filter((p) => p.crakotteProjectId).map((p) => p.crakotteProjectId!)
  )

  const consultants = crakotteConsultants.map((c) => ({
    id: c.id,
    nom: `${c.firstName} ${c.lastName}`,
    email: c.email,
    matched: dbEmailSet.has(c.email.toLowerCase()),
    matchedWith: dbConsultants.find((d) => d.email?.toLowerCase() === c.email.toLowerCase())?.nom ?? null,
  }))

  const projets = crakotteProjets.map((p) => ({
    id: p.id,
    nom: p.name,
    client: p.customer?.name ?? "",
    matchedById: dbProjetCrakotteIdSet.has(p.id),
    matchedByNom: dbProjetNomSet.has(p.name.toLowerCase()),
  }))

  const entries = timeSpent.items.slice(0, 50).map((e) => ({
    id: e.entry.id,
    date: e.date,
    heures: e.time,
    consultant: `${e.consultant.firstName} ${e.consultant.lastName}`,
    consultantEmail: e.consultant.email,
    projet: e.project.name,
    etape: e.step.name,
    status: e.entry.status,
    consultantMatched: dbEmailSet.has(e.consultant.email.toLowerCase()),
  }))

  return NextResponse.json({
    periode: { from, to },
    consultants,
    projets,
    entries,
    stats: {
      totalEntries: timeSpent.count,
      shownEntries: entries.length,
      consultantsMatches: consultants.filter((c) => c.matched).length,
      consultantsTotal: consultants.length,
      projetsMatches: projets.filter((p) => p.matchedById || p.matchedByNom).length,
      projetsTotal: projets.length,
    },
  })
}
