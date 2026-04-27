import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-guard"
import { testCrakotteConnection } from "@/lib/crakotte"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const authError = await requireRole(["ADMIN"])
  if (authError) return authError

  const body = await req.json().catch(() => ({}))
  let apiKey = body.apiKey

  if (!apiKey || apiKey.startsWith("***")) {
    const config = await prisma.crakotteConfig.findFirst()
    apiKey = config?.apiKey
  }

  if (!apiKey) return NextResponse.json({ ok: false, error: "Aucune clé API configurée" })

  const result = await testCrakotteConnection(apiKey)
  return NextResponse.json(result)
}
