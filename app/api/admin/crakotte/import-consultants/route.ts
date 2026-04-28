import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"
import { fetchCrakotteConsultants } from "@/lib/crakotte"

const COLORS = ["#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#06B6D4", "#F97316"]

export async function POST(req: NextRequest) {
  const authError = await requireRole(["ADMIN"])
  if (authError) return authError

  const config = await prisma.crakotteConfig.findFirst()
  if (!config) return NextResponse.json({ error: "Aucune config Crakotte" }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const { mode = "reboot", ids } = body

  const all = await fetchCrakotteConsultants(config.apiKey)

  let toProcess = all
  if (mode === "reboot") {
    toProcess = all.filter((c) => c.email.toLowerCase().endsWith("@reboot-conseil.com"))
  } else if (mode === "selected" && Array.isArray(ids)) {
    toProcess = all.filter((c) => ids.includes(c.id))
  }

  const dbConsultants = await prisma.consultant.findMany({ select: { id: true, email: true, crakotteConsultantId: true } })
  const byEmail = new Map(dbConsultants.map((c) => [c.email.toLowerCase(), c]))

  let created = 0
  let linked = 0

  for (let i = 0; i < toProcess.length; i++) {
    const c = toProcess[i]
    const existing = byEmail.get(c.email.toLowerCase())
    if (existing) {
      if (!existing.crakotteConsultantId) {
        await prisma.consultant.update({ where: { id: existing.id }, data: { crakotteConsultantId: c.id } })
        linked++
      }
      continue
    }
    await prisma.consultant.create({
      data: {
        nom: `${c.firstName} ${c.lastName}`,
        email: c.email,
        couleur: COLORS[i % COLORS.length],
        crakotteConsultantId: c.id,
        actif: true,
        role: "CONSULTANT",
      },
    })
    created++
  }

  return NextResponse.json({ created, linked })
}
