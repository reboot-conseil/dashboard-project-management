import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { Role } from "@prisma/client"

export async function requireAuth(): Promise<NextResponse | null> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }
  return null
}

export async function requireRole(allowedRoles: Role[]): Promise<NextResponse | null> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }
  if (!allowedRoles.includes(session.user.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }
  return null
}

export async function getSession() {
  return auth()
}
