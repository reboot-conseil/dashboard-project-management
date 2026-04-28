import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { runCrakotteSync } from "@/lib/crakotte-sync"

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  const isVercelCron = authHeader === `Bearer ${cronSecret}` && !!cronSecret
  if (!isVercelCron) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const config = await prisma.crakotteConfig.findFirst()
  if (!config || !config.actif) {
    return NextResponse.json({ skipped: true, reason: "Crakotte sync disabled or not configured" })
  }

  const now = new Date()
  const from = config.lastSyncAt ?? config.dateDebutSync
  const syncLog = await prisma.crakotteSyncLog.create({
    data: { startedAt: now, status: "RUNNING" },
  })

  try {
    const result = await runCrakotteSync(config.apiKey, from, now)

    await prisma.crakotteSyncLog.update({
      where: { id: syncLog.id },
      data: {
        finishedAt: new Date(),
        status: result.errors.length === 0 ? "SUCCESS" : "PARTIAL",
        activitesCreees: result.activitesCreees,
        conflitsDetectes: result.conflitsDetectes,
        nouveauxProjets: result.nouveauxProjets,
        consultantsSkippes: result.consultantsSkippes,
        errorMessage: result.errors.length > 0 ? result.errors.join("\n") : null,
        details: result.detail as object,
      },
    })

    await prisma.crakotteConfig.update({
      where: { id: config.id },
      data: { lastSyncAt: now },
    })

    return NextResponse.json({ success: true, result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    await prisma.crakotteSyncLog.update({
      where: { id: syncLog.id },
      data: { finishedAt: new Date(), status: "ERROR", errorMessage: message },
    })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
