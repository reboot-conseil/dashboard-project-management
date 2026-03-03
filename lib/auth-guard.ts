/**
 * Helpers d'authentification pour les routes API.
 *
 * Usage :
 * - Utiliser `requireAuth()` pour les routes accessibles à tous les utilisateurs connectés.
 * - Utiliser `requireRole(["ADMIN"])` pour les routes avec restriction de rôle.
 *   requireRole() inclut déjà la vérification d'authentification — ne pas combiner les deux.
 * - `getSession()` retourne la session courante pour filtrer les données.
 */
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
