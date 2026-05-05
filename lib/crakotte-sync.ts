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

  // Fetch everything in parallel — one round trip instead of N+1
  const [crakotteConsultants, , timeSpent, dbConsultants, dbProjets, dbAliases, existingActivites, allEtapes] =
    await Promise.all([
      fetchCrakotteConsultants(apiKey),
      fetchCrakotteProjects(apiKey),
      fetchCrakotteTimeSpent(apiKey, fromStr, toStr),
      prisma.consultant.findMany({ select: { id: true, nom: true, email: true, crakotteConsultantId: true } }),
      prisma.projet.findMany({ select: { id: true, nom: true, crakotteProjectId: true } }),
      prisma.crakotteProjectAlias.findMany({ select: { crakotteProjectId: true, projetId: true } }),
      // Pre-load all existing Crakotte entry IDs — eliminates findUnique per entry
      prisma.activite.findMany({
        where: { crakotteEntryId: { not: null } },
        select: { crakotteEntryId: true },
      }),
      // Pre-load all etapes — eliminates findFirst per entry
      prisma.etape.findMany({ select: { id: true, projetId: true, nom: true } }),
    ])

  // Build lookup maps
  const existingIds = new Set(existingActivites.map((a) => a.crakotteEntryId!))

  const consultantsByEmail = new Map<string, number>()
  const consultantsByNom = new Map<string, number>()
  for (const c of dbConsultants) {
    if (c.email) consultantsByEmail.set(c.email.toLowerCase(), c.id)
    if (c.nom) consultantsByNom.set(c.nom.toLowerCase(), c.id)
  }

  const projetsByKrakotteId = new Map<string, number>()
  for (const p of dbProjets) {
    if (p.crakotteProjectId) projetsByKrakotteId.set(p.crakotteProjectId, p.id)
  }
  for (const a of dbAliases) {
    projetsByKrakotteId.set(a.crakotteProjectId, a.projetId)
  }

  // etape lookup: `${projetId}:${nom.toLowerCase()}` → etapeId
  const etapesByKey = new Map<string, number>()
  for (const e of allEtapes) {
    etapesByKey.set(`${e.projetId}:${e.nom.toLowerCase()}`, e.id)
  }

  // Update consultant Crakotte links for unlinked consultants
  for (const cc of crakotteConsultants) {
    const dbId = consultantsByEmail.get(cc.email.trim().toLowerCase())
    if (dbId) {
      const dbC = dbConsultants.find((c) => c.id === dbId)
      if (!dbC?.crakotteConsultantId) {
        await prisma.consultant.update({ where: { id: dbId }, data: { crakotteConsultantId: cc.id } })
      }
    }
  }

  // Filter to new entries only — skip everything already imported
  const newItems = timeSpent.items.filter((item) => !existingIds.has(item.entry.id))

  // Pre-load MANUEL activities for conflict detection (only if there are new entries)
  const manuelByKey = new Map<string, { id: number; heures: number }>()
  if (newItems.length > 0) {
    const manuelActivites = await prisma.activite.findMany({
      where: { source: "MANUEL", date: { gte: from, lte: to } },
      select: { id: true, consultantId: true, projetId: true, date: true, heures: true },
    })
    for (const a of manuelActivites) {
      if (a.projetId) {
        const key = `${a.consultantId}:${a.projetId}:${format(a.date, "yyyy-MM-dd")}`
        manuelByKey.set(key, { id: a.id, heures: Number(a.heures) })
      }
    }
  }

  // Process new entries
  for (const item of newItems) {
    try {
      await processTimeEntry(
        item,
        consultantsByEmail,
        consultantsByNom,
        projetsByKrakotteId,
        dbProjets,
        etapesByKey,
        manuelByKey,
        result
      )
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
  etapesByKey: Map<string, number>,
  manuelByKey: Map<string, { id: number; heures: number }>,
  result: SyncResult
) {
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

  // Etape lookup from pre-loaded map — no DB call
  const etapeId = projetId ? (etapesByKey.get(`${projetId}:${item.step.name.toLowerCase()}`) ?? null) : null

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

  // Conflict detection from pre-loaded map — no DB call
  if (projetId) {
    const key = `${consultantId}:${projetId}:${item.date}`
    const doublon = manuelByKey.get(key)
    if (doublon && Math.abs(doublon.heures - item.time) <= 0.5) {
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
