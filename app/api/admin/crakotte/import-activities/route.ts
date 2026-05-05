import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"
import { runCrakotteSync } from "@/lib/crakotte-sync"

export async function POST(req: NextRequest) {
  const authError = await requireRole(["ADMIN"])
  if (authError) return authError

  const config = await prisma.crakotteConfig.findFirst()
  if (!config) return NextResponse.json({ error: "Aucune config Crakotte" }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const from = body.from ? new Date(body.from) : config.dateDebutSync
  const to = body.to ? new Date(body.to) : new Date()

  const result = await runCrakotteSync(config.apiKey, from, to)

  return NextResponse.json({
    activitesCreees: result.activitesCreees,
    consultantsSkippes: result.consultantsSkippes,
    projetsEnAttente: result.nouveauxProjets,
  })
}
