import { prisma } from "@/lib/prisma"
import {
  fetchCrakotteConsultants,
  fetchCrakotteProjects,
  fetchCrakotteTimeSpent,
  CrakotteTimeEntry,
} from "@/lib/crakotte"
import { format } from "date-fns"

export interface SyncDetail {
  activites: { consultant: string; projet: string; date: string; heures: number }[]
  conflits: { consultant: string; projet: string; date: string }[]
  projetsEnAttente: { nom: string; client: string }[]
  consultantsSkippes: string[]
}

export interface SyncResult {
  activitesCreees: number
  conflitsDetectes: number
  nouveauxProjets: number
  consultantsSkippes: number
  errors: string[]
  detail: SyncDetail
}

export async function runCrakotteSync(apiKey: string, from: Date, to: Date): Promise<SyncResult> {
  const result: SyncResult = {
    activitesCreees: 0,
    conflitsDetectes: 0,
    nouveauxProjets: 0,
    consultantsSkippes: 0,
    errors: [],
    detail: { activites: [], conflits: [], projetsEnAttente: [], consultantsSkippes: [] },
  }

  const fromStr = format(from, "yyyy-MM-dd")
  const toStr = format(to, "yyyy-MM-dd")

  const [crakotteConsultants, , timeSpent] = await Promise.all([
    fetchCrakotteConsultants(apiKey),
    fetchCrakotteProjects(apiKey),
    fetchCrakotteTimeSpent(apiKey, fromStr, toStr),
  ])

  const consultantsByEmail = new Map<string, number>()
  const consultantsByNom = new Map<string, number>()
  const dbConsultants = await prisma.consultant.findMany({
    select: { id: true, nom: true, email: true, crakotteConsultantId: true },
  })
  for (const c of dbConsultants) {
    if (c.email) consultantsByEmail.set(c.email.toLowerCase(), c.id)
    if (c.nom) consultantsByNom.set(c.nom.toLowerCase(), c.id)
  }

  for (const cc of crakotteConsultants) {
    const dbId = consultantsByEmail.get(cc.email.trim().toLowerCase())
    if (dbId) {
      const dbC = dbConsultants.find((c) => c.id === dbId)
      if (!dbC?.crakotteConsultantId) {
        await prisma.consultant.update({ where: { id: dbId }, data: { crakotteConsultantId: cc.id } })
      }
    }
  }

  const projetsByKrakotteId = new Map<string, number>()
  const [dbProjets, dbAliases] = await Promise.all([
    prisma.projet.findMany({ select: { id: true, nom: true, crakotteProjectId: true } }),
    prisma.crakotteProjectAlias.findMany({ select: { crakotteProjectId: true, projetId: true } }),
  ])
  for (const p of dbProjets) {
    if (p.crakotteProjectId) projetsByKrakotteId.set(p.crakotteProjectId, p.id)
  }
  for (const a of dbAliases) {
    projetsByKrakotteId.set(a.crakotteProjectId, a.projetId)
  }

  for (const item of timeSpent.items) {
    try {
      await processTimeEntry(item, consultantsByEmail, consultantsByNom, projetsByKrakotteId, dbProjets, result)
    } catch (e: unknown) {
      result.errors.push(`Entry ${item.entry.id}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return result
}

async function processTimeEntry(
  item: CrakotteTimeEntry,
  consultantsByEmail: Map<string, number>,
  consultantsByNom: Map<string, number>,
  projetsByKrakotteId: Map<string, number>,
  dbProjets: { id: number; nom: string; crakotteProjectId: string | null }[],
  result: SyncResult
) {
  const existing = await prisma.activite.findUnique({ where: { crakotteEntryId: item.entry.id } })
  if (existing) return

  const fullName = `${item.consultant.firstName} ${item.consultant.lastName}`.toLowerCase()
  const fullNameRev = `${item.consultant.lastName} ${item.consultant.firstName}`.toLowerCase()
  const consultantId =
    consultantsByEmail.get(item.consultant.email.trim().toLowerCase()) ??
    consultantsByNom.get(fullName) ??
    consultantsByNom.get(fullNameRev)

  if (!consultantId) {
    result.consultantsSkippes++
    result.detail.consultantsSkippes.push(
      `${item.consultant.firstName} ${item.consultant.lastName} (${item.consultant.email})`
    )
    return
  }

  let projetId: number | null = null

  if (projetsByKrakotteId.has(item.project.id)) {
    projetId = projetsByKrakotteId.get(item.project.id)!
  } else {
    const match = dbProjets.find((p) => p.nom.toLowerCase() === item.project.name.toLowerCase())
    if (match) {
      await prisma.projet.update({ where: { id: match.id }, data: { crakotteProjectId: item.project.id } })
      projetsByKrakotteId.set(item.project.id, match.id)
      projetId = match.id
    } else {
      const pending = await prisma.crakottePendingProject.findUnique({
        where: { crakotteProjectId: item.project.id },
      })
      if (!pending) {
        await prisma.crakottePendingProject.create({
          data: {
            crakotteProjectId: item.project.id,
            crakotteProjectName: item.project.name,
            crakotteCustomerId: item.customer.id,
            crakotteCustomerName: item.customer.name,
          },
        })
        result.nouveauxProjets++
        result.detail.projetsEnAttente.push({ nom: item.project.name, client: item.customer.name })
      }
    }
  }

  let etapeId: number | null = null
  if (projetId) {
    const etape = await prisma.etape.findFirst({
      where: { projetId, nom: { equals: item.step.name, mode: "insensitive" } },
      select: { id: true },
    })
    if (etape) etapeId = etape.id
  }

  const activite = await prisma.activite.create({
    data: {
      consultantId,
      projetId,
      etapeId,
      date: new Date(item.date),
      heures: item.time,
      description: item.step.name,
      facturable: true,
      source: "CRAKOTTE",
      crakotteEntryId: item.entry.id,
    },
  })
  result.activitesCreees++
  result.detail.activites.push({
    consultant: `${item.consultant.firstName} ${item.consultant.lastName}`,
    projet: item.project.name,
    date: item.date,
    heures: item.time,
  })

  if (projetId) {
    const doublon = await prisma.activite.findFirst({
      where: { consultantId, projetId, date: new Date(item.date), source: "MANUEL", id: { not: activite.id } },
    })
    if (doublon && Math.abs(Number(doublon.heures) - item.time) <= 0.5) {
      await prisma.crakotteConflict.create({
        data: { crakotteActiviteId: activite.id, manuelActiviteId: doublon.id },
      })
      result.conflitsDetectes++
      result.detail.conflits.push({
        consultant: `${item.consultant.firstName} ${item.consultant.lastName}`,
        projet: item.project.name,
        date: item.date,
      })
    }
  }
}
