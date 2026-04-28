import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const authError = await requireRole(["ADMIN"])
  if (authError) return authError

  const config = await prisma.crakotteConfig.findFirst()
  if (!config) return NextResponse.json(null)

  return NextResponse.json({
    ...config,
    apiKey: config.apiKey ? "***" + config.apiKey.slice(-4) : "",
  })
}

export async function PUT(req: NextRequest) {
  const authError = await requireRole(["ADMIN"])
  if (authError) return authError

  const body = await req.json()
  const { apiKey, actif, dateDebutSync } = body

  const existing = await prisma.crakotteConfig.findFirst()
  if (existing) {
    const updated = await prisma.crakotteConfig.update({
      where: { id: existing.id },
      data: {
        ...(apiKey && !apiKey.startsWith("***") ? { apiKey } : {}),
        ...(actif !== undefined ? { actif } : {}),
        ...(dateDebutSync ? { dateDebutSync: new Date(dateDebutSync) } : {}),
      },
    })
    return NextResponse.json({ success: true, id: updated.id })
  } else {
    const created = await prisma.crakotteConfig.create({
      data: {
        apiKey,
        actif: actif ?? true,
        dateDebutSync: new Date(dateDebutSync ?? new Date().getFullYear() + "-01-01"),
      },
    })
    return NextResponse.json({ success: true, id: created.id })
  }
}
