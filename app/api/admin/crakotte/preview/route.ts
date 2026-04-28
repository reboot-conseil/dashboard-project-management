import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"
import {
  fetchCrakotteConsultants,
  fetchCrakotteProjects,
  fetchCrakotteTimeSpent,
} from "@/lib/crakotte"
import { format, subDays } from "date-fns"

function strSimilarity(a: string, b: string): number {
  const s = a.toLowerCase().trim()
  const t = b.toLowerCase().trim()
  if (s === t) return 1
  if (s.includes(t) || t.includes(s)) return 0.9
  const maxLen = Math.max(s.length, t.length)
  if (maxLen === 0) return 1
  const d: number[] = Array.from({ length: t.length + 1 }, (_, i) => i)
  for (let i = 0; i < s.length; i++) {
    let prev = i + 1
    for (let j = 0; j < t.length; j++) {
      const val = s[i] === t[j] ? d[j] : 1 + Math.min(d[j], d[j + 1], prev)
      d[j] = prev
      prev = val
    }
    d[t.length] = prev
  }
  return 1 - d[t.length] / maxLen
}

export async function GET() {
  const authError = await requireRole(["ADMIN"])
  if (authError) return authError

  const config = await prisma.crakotteConfig.findFirst()
  if (!config) return NextResponse.json({ error: "Aucune config Crakotte" }, { status: 400 })

  const to = format(new Date(), "yyyy-MM-dd")
  const from = format(subDays(new Date(), 30), "yyyy-MM-dd")

  const [crakotteConsultants, crakotteProjets, timeSpent, dbConsultants, dbProjets, dbAliases] =
    await Promise.all([
      fetchCrakotteConsultants(config.apiKey),
      fetchCrakotteProjects(config.apiKey),
      fetchCrakotteTimeSpent(config.apiKey, from, to),
      prisma.consultant.findMany({ select: { id: true, nom: true, email: true } }),
      prisma.projet.findMany({ select: { id: true, nom: true, client: true, crakotteProjectId: true } }),
      prisma.crakotteProjectAlias.findMany({ select: { crakotteProjectId: true, projetId: true } }),
    ])

  const dbByEmail = new Map(dbConsultants.map((c) => [c.email?.trim().toLowerCase() ?? "", c]))
  const dbByNom = new Map(dbConsultants.map((c) => [c.nom.toLowerCase(), c]))

  const linkedCrakotteIds = new Set([
    ...dbProjets.filter((p) => p.crakotteProjectId).map((p) => p.crakotteProjectId!),
    ...dbAliases.map((a) => a.crakotteProjectId),
  ])
  const dbProjetNomSet = new Set(dbProjets.map((p) => p.nom.toLowerCase()))

  const consultants = crakotteConsultants.map((c) => {
    const fullName = `${c.firstName} ${c.lastName}`.toLowerCase()
    const fullNameRev = `${c.lastName} ${c.firstName}`.toLowerCase()
    const emailKey = c.email.trim().toLowerCase()
    const dbMatch =
      dbByEmail.get(emailKey) ?? dbByNom.get(fullName) ?? dbByNom.get(fullNameRev)
    return {
      id: c.id,
      nom: `${c.firstName} ${c.lastName}`,
      email: c.email,
      matched: !!dbMatch,
      matchedWith: dbMatch?.nom ?? null,
      matchedByNom: !dbByEmail.has(emailKey) && !!(dbByNom.get(fullName) ?? dbByNom.get(fullNameRev)),
    }
  })

  const projets = crakotteProjets.map((p) => {
    const matchedById = linkedCrakotteIds.has(p.id)
    const matchedByNom = dbProjetNomSet.has(p.name.toLowerCase())
    let suggestions: { projetId: number; nom: string; score: number }[] = []
    if (!matchedById && !matchedByNom) {
      suggestions = dbProjets
        .map((dp) => ({ projetId: dp.id, nom: dp.nom, client: dp.client, score: strSimilarity(p.name, dp.nom) }))
        .filter((s) => s.score >= 0.55)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
    }
    return { id: p.id, nom: p.name, client: p.customer?.name ?? "", matchedById, matchedByNom, suggestions }
  })

  const entries = timeSpent.items.slice(0, 50).map((e) => ({
    id: e.entry.id,
    date: e.date,
    heures: e.time,
    consultant: `${e.consultant.firstName} ${e.consultant.lastName}`,
    consultantEmail: e.consultant.email,
    projet: e.project.name,
    etape: e.step.name,
    status: e.entry.status,
    consultantMatched:
      dbByEmail.has(e.consultant.email.trim().toLowerCase()) ||
      dbByNom.has(`${e.consultant.firstName} ${e.consultant.lastName}`.toLowerCase()) ||
      dbByNom.has(`${e.consultant.lastName} ${e.consultant.firstName}`.toLowerCase()),
  }))

  const allDbProjets = dbProjets.map((p) => ({ id: p.id, nom: p.nom, client: (p as typeof p & { client: string }).client }))

  return NextResponse.json({
    periode: { from, to },
    consultants,
    projets,
    allDbProjets,
    entries,
    stats: {
      totalEntries: timeSpent.count,
      shownEntries: entries.length,
      consultantsMatches: consultants.filter((c) => c.matched || c.matchedByNom).length,
      consultantsTotal: consultants.length,
      projetsMatches: projets.filter((p) => p.matchedById || p.matchedByNom).length,
      projetsTotal: projets.length,
    },
  })
}
