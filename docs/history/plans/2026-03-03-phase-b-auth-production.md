# Phase B — Auth & Production Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rendre l'application déployable sur Vercel Enterprise avec authentification NextAuth v5, RBAC (ADMIN/PM/CONSULTANT) et migration SQLite → Azure PostgreSQL.

**Architecture:** Le modèle `Consultant` est étendu avec `password` (bcrypt) et `role` (enum). NextAuth v5 Credentials provider avec session JWT edge-compatible. Middleware Next.js intercepte toutes les routes sauf `/login` et `/api/auth`. Les APIs retournent 401/403 via un helper centralisé `lib/auth-guard.ts`.

**Tech Stack:** NextAuth v5 (`next-auth@beta`), bcryptjs, Prisma (SQLite local → PostgreSQL prod), Vercel Enterprise, Azure Database for PostgreSQL.

---

## Task 1 : Installer les dépendances

**Files:**
- Modify: `package.json`

**Step 1 : Installer next-auth, bcryptjs**

```bash
npm install next-auth@beta bcryptjs
npm install --save-dev @types/bcryptjs
```

**Step 2 : Vérifier l'installation**

```bash
node -e "require('bcryptjs'); console.log('bcryptjs OK')"
```

Expected: `bcryptjs OK`

**Step 3 : Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install next-auth@beta + bcryptjs"
```

---

## Task 2 : Prisma schema — Role enum + champs auth sur Consultant

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1 : Écrire le test qui vérifie que le type Role existe**

Créer `__tests__/lib/role.test.ts` :

```typescript
import { describe, it, expect } from 'vitest'

describe('Role enum', () => {
  it('les valeurs ADMIN, PM, CONSULTANT sont définies dans le type Prisma', async () => {
    // On vérifie via l'import du client Prisma généré
    const { Role } = await import('@prisma/client')
    expect(Role.ADMIN).toBe('ADMIN')
    expect(Role.PM).toBe('PM')
    expect(Role.CONSULTANT).toBe('CONSULTANT')
  })
})
```

**Step 2 : Lancer le test (doit échouer)**

```bash
npm run test:run -- __tests__/lib/role.test.ts
```

Expected: FAIL — `Role` is not exported from `@prisma/client`

**Step 3 : Modifier `prisma/schema.prisma`**

Ajouter l'enum et les champs après la définition existante de `Consultant` :

```prisma
// Ajouter AVANT le model Consultant
enum Role {
  ADMIN
  PM
  CONSULTANT
}
```

Dans `model Consultant`, ajouter avant `createdAt` :

```prisma
  password  String?
  role      Role    @default(CONSULTANT)
```

> ⚠️ SQLite ne supporte pas les enums natifs — Prisma les stocke en TEXT. C'est prévu : la migration PostgreSQL (Task 12) utilisera les vrais enums PostgreSQL.

**Step 4 : Créer la migration**

```bash
npm run db:migrate -- --name add_auth_to_consultant
```

Expected: `✔ Your database is now in sync with your schema.`

**Step 5 : Vérifier que le test passe**

```bash
npm run test:run -- __tests__/lib/role.test.ts
```

Expected: PASS

**Step 6 : Vérifier que tous les tests existants passent encore**

```bash
npm run test:run
```

Expected: 246 passed (245 existants + 1 nouveau)

**Step 7 : Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ __tests__/lib/role.test.ts
git commit -m "feat: add Role enum + password field to Consultant"
```

---

## Task 3 : Configuration NextAuth — `auth.ts`

**Files:**
- Create: `auth.ts` (racine du projet)
- Create: `types/next-auth.d.ts`

**Step 1 : Créer `types/next-auth.d.ts`**

```typescript
import { Role } from "@prisma/client"
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: Role
    } & DefaultSession["user"]
  }

  interface User {
    role: Role
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: Role
  }
}
```

**Step 2 : Créer `auth.ts`**

```typescript
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined
        const password = credentials?.password as string | undefined

        if (!email || !password) return null

        const consultant = await prisma.consultant.findUnique({
          where: { email },
          select: { id: true, email: true, nom: true, password: true, role: true, actif: true },
        })

        if (!consultant || !consultant.password || !consultant.actif) return null

        const valid = await bcrypt.compare(password, consultant.password)
        if (!valid) return null

        return {
          id: String(consultant.id),
          email: consultant.email,
          name: consultant.nom,
          role: consultant.role,
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.role = (user as { role: Role }).role
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.role = token.role
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})
```

**Step 3 : Vérifier que TypeScript compile**

```bash
npx tsc --noEmit
```

Expected: pas d'erreurs liées à auth.ts ni types/next-auth.d.ts

**Step 4 : Commit**

```bash
git add auth.ts types/next-auth.d.ts
git commit -m "feat: NextAuth v5 config with Credentials provider + JWT"
```

---

## Task 4 : Route handler NextAuth

**Files:**
- Create: `app/api/auth/[...nextauth]/route.ts`

**Step 1 : Créer le route handler**

```typescript
import { handlers } from "@/auth"

export const { GET, POST } = handlers
```

**Step 2 : Vérifier que le serveur démarre sans erreur**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ Compiled successfully` (ou `Route (app)` sans erreur auth)

**Step 3 : Commit**

```bash
git add app/api/auth/
git commit -m "feat: NextAuth route handler"
```

---

## Task 5 : Page de login `/login`

**Files:**
- Create: `app/login/page.tsx`
- Create: `__tests__/components/auth/login-page.test.tsx`

**Step 1 : Écrire les tests**

Créer `__tests__/components/auth/login-page.test.tsx` :

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import LoginPage from '@/app/login/page'

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
  useRouter: () => ({ push: vi.fn() }),
}))

describe('LoginPage', () => {
  it('affiche le formulaire email et mot de passe', () => {
    render(<LoginPage />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument()
  })

  it('affiche un bouton de connexion', () => {
    render(<LoginPage />)
    expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument()
  })

  it('appelle signIn au submit avec les credentials', async () => {
    const { signIn } = await import('next-auth/react')
    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'admin@company.com' },
    })
    fireEvent.change(screen.getByLabelText(/mot de passe/i), {
      target: { value: 'password123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }))

    expect(signIn).toHaveBeenCalledWith('credentials', expect.objectContaining({
      email: 'admin@company.com',
      password: 'password123',
    }))
  })
})
```

**Step 2 : Lancer les tests (doit échouer)**

```bash
npm run test:run -- __tests__/components/auth/login-page.test.tsx
```

Expected: FAIL — `Cannot find module '@/app/login/page'`

**Step 3 : Implémenter `app/login/page.tsx`**

```typescript
"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") ?? "/"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (res?.error) {
      setError("Email ou mot de passe incorrect.")
    } else {
      router.push(callbackUrl)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold">PM Dashboard</CardTitle>
          <CardDescription>Connectez-vous pour accéder à votre espace</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@entreprise.com"
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Se connecter
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 4 : Lancer les tests (doit passer)**

```bash
npm run test:run -- __tests__/components/auth/login-page.test.tsx
```

Expected: PASS (3 tests)

**Step 5 : Vérifier tous les tests**

```bash
npm run test:run
```

Expected: 249 passed

**Step 6 : Commit**

```bash
git add app/login/ __tests__/components/auth/
git commit -m "feat: login page with credentials form"
```

---

## Task 6 : SessionProvider + logout dans la sidebar

**Files:**
- Modify: `app/layout.tsx`
- Modify: `components/sidebar.tsx`

**Step 1 : Créer `components/session-provider.tsx`** (wrapper client obligatoire)

```typescript
"use client"

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react"

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>
}
```

**Step 2 : Modifier `app/layout.tsx`** — envelopper `<body>` avec SessionProvider

Importer en haut :
```typescript
import { SessionProvider } from "@/components/session-provider"
```

Modifier le JSX pour envelopper le contenu :
```typescript
<body ...>
  <SessionProvider>
    {/* contenu existant */}
  </SessionProvider>
</body>
```

**Step 3 : Ajouter logout dans `components/sidebar.tsx`**

Importer en haut :
```typescript
import { signOut, useSession } from "next-auth/react"
import { LogOut } from "lucide-react"
```

Ajouter dans le JSX de la sidebar (en bas, avant la fermeture du nav) :
```typescript
<button
  onClick={() => signOut({ callbackUrl: "/login" })}
  className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
  aria-label="Se déconnecter"
>
  <LogOut className="h-4 w-4" aria-hidden="true" />
  <span className={sidebarMode === "collapsed" ? "sr-only" : ""}>Déconnexion</span>
</button>
```

**Step 4 : Vérifier tous les tests**

```bash
npm run test:run
```

Expected: 249 passed (les tests sidebar existants doivent passer — ils mockent next-auth/react si nécessaire)

> ⚠️ Si des tests sidebar échouent à cause de `useSession`, ajouter dans le fichier de test :
> ```typescript
> vi.mock('next-auth/react', () => ({ useSession: () => ({ data: null }), signOut: vi.fn() }))
> ```

**Step 5 : Commit**

```bash
git add components/session-provider.tsx app/layout.tsx components/sidebar.tsx
git commit -m "feat: SessionProvider + logout button in sidebar"
```

---

## Task 7 : Helper d'authentification API — `lib/auth-guard.ts`

**Files:**
- Create: `lib/auth-guard.ts`
- Create: `__tests__/lib/auth-guard.test.ts`

**Step 1 : Écrire les tests**

Créer `__tests__/lib/auth-guard.test.ts` :

```typescript
import { describe, it, expect, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock de auth()
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

import { requireAuth, requireRole } from '@/lib/auth-guard'
import { auth } from '@/auth'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>

describe('requireAuth', () => {
  it('retourne 401 si pas de session', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await requireAuth()
    expect(res?.status).toBe(401)
  })

  it('retourne null si session valide', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', role: 'ADMIN', email: 'a@b.com', name: 'A' } })
    const res = await requireAuth()
    expect(res).toBeNull()
  })
})

describe('requireRole', () => {
  it('retourne 403 si rôle insuffisant', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', role: 'CONSULTANT', email: 'a@b.com', name: 'A' } })
    const res = await requireRole(['ADMIN', 'PM'])
    expect(res?.status).toBe(403)
  })

  it('retourne null si rôle autorisé', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', role: 'PM', email: 'a@b.com', name: 'A' } })
    const res = await requireRole(['ADMIN', 'PM'])
    expect(res).toBeNull()
  })

  it('retourne la session si rôle autorisé', async () => {
    const session = { user: { id: '1', role: 'ADMIN', email: 'a@b.com', name: 'A' } }
    mockAuth.mockResolvedValue(session)
    const res = await requireRole(['ADMIN'])
    expect(res).toBeNull()
  })
})
```

**Step 2 : Lancer les tests (doit échouer)**

```bash
npm run test:run -- __tests__/lib/auth-guard.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/auth-guard'`

**Step 3 : Implémenter `lib/auth-guard.ts`**

```typescript
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { Role } from "@prisma/client"

/**
 * Vérifie qu'une session existe.
 * Retourne une NextResponse 401 si non authentifié, null sinon.
 */
export async function requireAuth(): Promise<NextResponse | null> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }
  return null
}

/**
 * Vérifie qu'une session existe ET que le rôle est dans la liste autorisée.
 * Retourne 401 si non authentifié, 403 si rôle insuffisant, null sinon.
 */
export async function requireRole(
  allowedRoles: Role[]
): Promise<NextResponse | null> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }
  if (!allowedRoles.includes(session.user.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }
  return null
}

/**
 * Retourne la session courante (ou null).
 * Utile pour filtrer les données par consultant dans les APIs.
 */
export async function getSession() {
  return auth()
}
```

**Step 4 : Lancer les tests**

```bash
npm run test:run -- __tests__/lib/auth-guard.test.ts
```

Expected: PASS (5 tests)

**Step 5 : Commit**

```bash
git add lib/auth-guard.ts __tests__/lib/auth-guard.test.ts
git commit -m "feat: auth-guard helper for API route protection"
```

---

## Task 8 : Middleware de protection des routes

**Files:**
- Create: `middleware.ts` (racine)
- Create: `__tests__/lib/middleware-utils.test.ts`

**Step 1 : Écrire les tests de la logique de rôles**

Créer `__tests__/lib/middleware-utils.test.ts` :

```typescript
import { describe, it, expect } from 'vitest'
import { getRedirectPath } from '@/lib/middleware-utils'

describe('getRedirectPath', () => {
  it('redirige vers /login si pas de session', () => {
    expect(getRedirectPath(null, '/dashboard')).toBe('/login')
  })

  it('redirige vers / si CONSULTANT tente /consultants', () => {
    expect(getRedirectPath({ role: 'CONSULTANT' }, '/consultants')).toBe('/')
  })

  it('redirige vers / si CONSULTANT tente /executive', () => {
    expect(getRedirectPath({ role: 'CONSULTANT' }, '/executive')).toBe('/')
  })

  it('redirige vers / si PM tente /admin/users', () => {
    expect(getRedirectPath({ role: 'PM' }, '/admin/users')).toBe('/')
  })

  it('redirige vers / si CONSULTANT tente /admin/users', () => {
    expect(getRedirectPath({ role: 'CONSULTANT' }, '/admin/users')).toBe('/')
  })

  it('retourne null si ADMIN accède à tout', () => {
    expect(getRedirectPath({ role: 'ADMIN' }, '/consultants')).toBeNull()
    expect(getRedirectPath({ role: 'ADMIN' }, '/admin/users')).toBeNull()
  })

  it('retourne null si PM accède aux pages autorisées', () => {
    expect(getRedirectPath({ role: 'PM' }, '/consultants')).toBeNull()
    expect(getRedirectPath({ role: 'PM' }, '/executive')).toBeNull()
  })

  it('redirige vers / si déjà connecté et tente /login', () => {
    expect(getRedirectPath({ role: 'PM' }, '/login')).toBe('/')
  })
})
```

**Step 2 : Lancer les tests (doit échouer)**

```bash
npm run test:run -- __tests__/lib/middleware-utils.test.ts
```

Expected: FAIL

**Step 3 : Créer `lib/middleware-utils.ts`**

```typescript
const ADMIN_ONLY = ["/admin"]
const PM_PLUS_ONLY = ["/consultants", "/executive"]

/**
 * Retourne le chemin de redirection si nécessaire, null sinon.
 * Fonction pure (testable) extraite de la logique middleware.
 */
export function getRedirectPath(
  user: { role: string } | null,
  pathname: string
): string | null {
  // Déjà connecté → pas besoin de /login
  if (user && pathname === "/login") return "/"

  // Non authentifié → /login
  if (!user) return "/login"

  const { role } = user

  // ADMIN only
  if (ADMIN_ONLY.some((p) => pathname.startsWith(p)) && role !== "ADMIN") {
    return "/"
  }

  // PM + ADMIN only (CONSULTANT exclu)
  if (PM_PLUS_ONLY.some((p) => pathname.startsWith(p)) && role === "CONSULTANT") {
    return "/"
  }

  return null
}
```

**Step 4 : Lancer les tests**

```bash
npm run test:run -- __tests__/lib/middleware-utils.test.ts
```

Expected: PASS (8 tests)

**Step 5 : Créer `middleware.ts`**

```typescript
import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { getRedirectPath } from "@/lib/middleware-utils"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const user = req.auth?.user ?? null

  const redirectTo = getRedirectPath(
    user ? { role: user.role as string } : null,
    pathname
  )

  if (redirectTo) {
    const url = req.nextUrl.clone()
    url.pathname = redirectTo
    if (redirectTo === "/login" && pathname !== "/login") {
      url.searchParams.set("callbackUrl", pathname)
    }
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|uploads).*)",
  ],
}
```

**Step 6 : Vérifier tous les tests**

```bash
npm run test:run
```

Expected: 257 passed (249 + 1 role + 8 middleware-utils)

**Step 7 : Commit**

```bash
git add middleware.ts lib/middleware-utils.ts __tests__/lib/middleware-utils.test.ts
git commit -m "feat: middleware route protection with RBAC"
```

---

## Task 9 : Protéger les routes API avec auth-guard

**Files:**
- Modify: `app/api/dashboard/route.ts`
- Modify: `app/api/consultants/route.ts` (si existe)
- Modify: `app/api/activites/route.ts` (si existe)
- Modify: `app/api/projets/route.ts`
- Modify: `app/api/executive/route.ts` (si existe)
- Modify: `app/api/admin/*/route.ts`

**Step 1 : Pattern à appliquer à chaque route**

Pour **toutes les routes** (authentification requise) :

```typescript
import { requireAuth } from "@/lib/auth-guard"

export async function GET(req: Request) {
  const authError = await requireAuth()
  if (authError) return authError

  // ... reste du code existant
}
```

Pour les routes **ADMIN + PM uniquement** (`/api/consultants`, `/api/executive`, `/api/rapports`) :

```typescript
import { requireRole } from "@/lib/auth-guard"

export async function GET(req: Request) {
  const authError = await requireRole(["ADMIN", "PM"])
  if (authError) return authError

  // ... reste du code existant
}
```

Pour les routes **ADMIN uniquement** (`/api/admin/*`) :

```typescript
import { requireRole } from "@/lib/auth-guard"

export async function GET(req: Request) {
  const authError = await requireRole(["ADMIN"])
  if (authError) return authError

  // ... reste du code existant
}
```

**Step 2 : Appliquer à chaque fichier route**

Appliquer le pattern ci-dessus à :
- `app/api/dashboard/route.ts` → `requireAuth()`
- `app/api/dashboard/consultants/route.ts` → `requireAuth()`
- `app/api/dashboard/strategique/route.ts` → `requireAuth()`
- `app/api/kpis/route.ts` → `requireAuth()`
- `app/api/alertes/route.ts` → `requireAuth()`
- `app/api/projets/route.ts` → `requireAuth()`
- `app/api/projets/[id]/route.ts` → `requireAuth()`
- `app/api/projets/[id]/progression/route.ts` → `requireAuth()`
- `app/api/projets/search/route.ts` → `requireAuth()`
- `app/api/etapes/route.ts` → `requireAuth()`
- `app/api/etapes/[id]/route.ts` → `requireAuth()`
- `app/api/executive/route.ts` → `requireRole(["ADMIN", "PM"])`  *(si la route existe)*
- `app/api/consultants/route.ts` → `requireRole(["ADMIN", "PM"])`  *(si la route existe)*
- `app/api/activites/route.ts` → `requireAuth()`  *(si la route existe)*
- `app/api/rapports/route.ts` → `requireRole(["ADMIN", "PM"])`
- `app/api/rapports/export-csv/route.ts` → `requireRole(["ADMIN", "PM"])`
- `app/api/admin/cleanup/route.ts` → `requireRole(["ADMIN"])`
- `app/api/admin/teams-config/route.ts` → `requireRole(["ADMIN"])`
- `app/api/admin/teams-config/[id]/route.ts` → `requireRole(["ADMIN"])`
- `app/api/admin/audit-reports/route.ts` → `requireRole(["ADMIN"])`
- `app/api/teams-dashboard/stats/route.ts` → `requireAuth()`

**Step 3 : Vérifier que TypeScript compile**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: pas d'erreurs

**Step 4 : Vérifier tous les tests**

```bash
npm run test:run
```

Expected: 257 passed (les tests existants mokkent les routes via fetch, pas d'impact)

**Step 5 : Commit**

```bash
git add app/api/
git commit -m "feat: protect all API routes with requireAuth/requireRole"
```

---

## Task 10 : Filtrage des données par rôle CONSULTANT

**Files:**
- Modify: `app/api/activites/route.ts` (si existe)
- Modify: `app/api/projets/route.ts`
- Create: `__tests__/lib/consultant-filter.test.ts`

**Step 1 : Créer un helper de filtrage**

Créer `lib/consultant-filter.ts` :

```typescript
import { Session } from "next-auth"
import { Role } from "@prisma/client"

/**
 * Pour un CONSULTANT, retourne son consultantId (extrait de session.user.id).
 * Pour ADMIN/PM, retourne undefined (pas de filtre).
 */
export function getConsultantFilter(session: Session | null): number | undefined {
  if (!session?.user) return undefined
  if (session.user.role === Role.CONSULTANT) {
    return parseInt(session.user.id, 10)
  }
  return undefined
}
```

**Step 2 : Écrire les tests**

Créer `__tests__/lib/consultant-filter.test.ts` :

```typescript
import { describe, it, expect } from 'vitest'
import { getConsultantFilter } from '@/lib/consultant-filter'

describe('getConsultantFilter', () => {
  it('retourne undefined pour ADMIN', () => {
    const session = { user: { id: '1', role: 'ADMIN', email: 'a@b.com', name: 'A' } } as any
    expect(getConsultantFilter(session)).toBeUndefined()
  })

  it('retourne undefined pour PM', () => {
    const session = { user: { id: '2', role: 'PM', email: 'b@c.com', name: 'B' } } as any
    expect(getConsultantFilter(session)).toBeUndefined()
  })

  it('retourne le consultantId pour CONSULTANT', () => {
    const session = { user: { id: '5', role: 'CONSULTANT', email: 'c@d.com', name: 'C' } } as any
    expect(getConsultantFilter(session)).toBe(5)
  })

  it('retourne undefined si session null', () => {
    expect(getConsultantFilter(null)).toBeUndefined()
  })
})
```

**Step 3 : Lancer les tests**

```bash
npm run test:run -- __tests__/lib/consultant-filter.test.ts
```

Expected: PASS (4 tests)

**Step 4 : Appliquer le filtre dans les APIs concernées**

Dans `app/api/activites/route.ts` (si existe), après requireAuth, ajouter :

```typescript
import { getSession } from "@/lib/auth-guard"
import { getConsultantFilter } from "@/lib/consultant-filter"

// Dans le GET handler :
const session = await getSession()
const consultantId = getConsultantFilter(session)

// Dans la requête Prisma, ajouter :
where: {
  ...(consultantId ? { consultantId } : {}),
  // ... filtres existants
}
```

Même pattern dans `app/api/projets/route.ts` pour filtrer par consultant via les activités.

**Step 5 : Vérifier tous les tests**

```bash
npm run test:run
```

Expected: 261 passed

**Step 6 : Commit**

```bash
git add lib/consultant-filter.ts __tests__/lib/consultant-filter.test.ts app/api/activites/ app/api/projets/
git commit -m "feat: filter data by consultantId for CONSULTANT role"
```

---

## Task 11 : Page `/admin/users`

**Files:**
- Create: `app/admin/users/page.tsx`
- Create: `__tests__/components/admin/users-page.test.tsx`

**Step 1 : Écrire les tests**

Créer `__tests__/components/admin/users-page.test.tsx` :

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock fetch
global.fetch = vi.fn()

// Mock next-auth
vi.mock('@/auth', () => ({
  auth: vi.fn(() => ({ user: { id: '1', role: 'ADMIN', name: 'Admin', email: 'admin@co.com' } })),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

import AdminUsersPage from '@/app/admin/users/page'

describe('AdminUsersPage', () => {
  it('affiche le titre Gestion des utilisateurs', async () => {
    const page = await AdminUsersPage()
    render(page)
    expect(screen.getByRole('heading', { name: /gestion des utilisateurs/i })).toBeInTheDocument()
  })
})
```

**Step 2 : Lancer les tests (doit échouer)**

```bash
npm run test:run -- __tests__/components/admin/users-page.test.tsx
```

Expected: FAIL

**Step 3 : Créer une API route `/api/admin/users`**

Créer `app/api/admin/users/route.ts` :

```typescript
import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const authError = await requireRole(["ADMIN"])
  if (authError) return authError

  const consultants = await prisma.consultant.findMany({
    select: { id: true, nom: true, email: true, role: true, actif: true, password: true },
    orderBy: { nom: "asc" },
  })

  // Ne jamais exposer le hash — juste un booléen "a un compte"
  return NextResponse.json(
    consultants.map((c) => ({ ...c, hasAccount: !!c.password, password: undefined }))
  )
}

export async function POST(req: Request) {
  const authError = await requireRole(["ADMIN"])
  if (authError) return authError

  const { consultantId, role, password } = await req.json()
  if (!consultantId || !role || !password) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 })
  }

  const bcrypt = await import("bcryptjs")
  const hash = await bcrypt.hash(password, 12)

  const updated = await prisma.consultant.update({
    where: { id: consultantId },
    data: { role, password: hash },
  })

  return NextResponse.json({ id: updated.id, email: updated.email, role: updated.role })
}

export async function PATCH(req: Request) {
  const authError = await requireRole(["ADMIN"])
  if (authError) return authError

  const { consultantId, password, role, actif } = await req.json()
  if (!consultantId) {
    return NextResponse.json({ error: "consultantId manquant" }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (password) {
    const bcrypt = await import("bcryptjs")
    data.password = await bcrypt.hash(password, 12)
  }
  if (role) data.role = role
  if (actif !== undefined) data.actif = actif

  const updated = await prisma.consultant.update({
    where: { id: consultantId },
    data,
  })

  return NextResponse.json({ id: updated.id, email: updated.email, role: updated.role })
}
```

**Step 4 : Créer `app/admin/users/page.tsx`**

```typescript
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/layout/page-header"
import { AdminUsersClient } from "./admin-users-client"

export default async function AdminUsersPage() {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") redirect("/")

  const consultants = await prisma.consultant.findMany({
    select: { id: true, nom: true, email: true, role: true, actif: true, password: true },
    orderBy: { nom: "asc" },
  })

  const users = consultants.map((c) => ({
    ...c,
    hasAccount: !!c.password,
    password: undefined,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des utilisateurs"
        subtitle="Activez et gérez les comptes d'accès de l'équipe"
      />
      <AdminUsersClient users={users} />
    </div>
  )
}
```

**Step 5 : Créer `app/admin/users/admin-users-client.tsx`**

```typescript
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Role } from "@prisma/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPlus, RotateCcw, UserX, UserCheck } from "lucide-react"
import { toast } from "sonner"

type UserEntry = {
  id: number
  nom: string
  email: string
  role: Role
  actif: boolean
  hasAccount: boolean
}

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrateur",
  PM: "Chef de projet",
  CONSULTANT: "Consultant",
}

export function AdminUsersClient({ users }: { users: UserEntry[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<UserEntry | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [selectedRole, setSelectedRole] = useState<Role>(Role.CONSULTANT)
  const [loading, setLoading] = useState(false)

  async function activateAccount() {
    if (!selected || !newPassword) return
    setLoading(true)
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultantId: selected.id, role: selectedRole, password: newPassword }),
      })
      if (!res.ok) throw new Error()
      toast.success(`Compte activé pour ${selected.nom}`)
      router.refresh()
      setSelected(null)
      setNewPassword("")
    } catch {
      toast.error("Erreur lors de l'activation")
    } finally {
      setLoading(false)
    }
  }

  async function resetPassword(user: UserEntry) {
    const password = prompt(`Nouveau mot de passe pour ${user.nom} :`)
    if (!password) return
    setLoading(true)
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultantId: user.id, password }),
      })
      if (!res.ok) throw new Error()
      toast.success("Mot de passe réinitialisé")
    } catch {
      toast.error("Erreur")
    } finally {
      setLoading(false)
    }
  }

  async function toggleActive(user: UserEntry) {
    setLoading(true)
    try {
      await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultantId: user.id, actif: !user.actif }),
      })
      toast.success(user.actif ? "Compte désactivé" : "Compte réactivé")
      router.refresh()
    } catch {
      toast.error("Erreur")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Liste */}
      <Card>
        <CardHeader>
          <CardTitle>Équipe ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-sm">{user.nom}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {user.hasAccount ? (
                    <Badge variant="default">{ROLE_LABELS[user.role]}</Badge>
                  ) : (
                    <Badge variant="outline">Pas de compte</Badge>
                  )}
                  {!user.actif && <Badge variant="destructive">Inactif</Badge>}
                  <div className="flex gap-1">
                    {!user.hasAccount && (
                      <Button size="sm" variant="outline" onClick={() => setSelected(user)}>
                        <UserPlus className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {user.hasAccount && (
                      <Button size="sm" variant="ghost" onClick={() => resetPassword(user)}>
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {user.hasAccount && (
                      <Button size="sm" variant="ghost" onClick={() => toggleActive(user)}>
                        {user.actif ? (
                          <UserX className="h-3.5 w-3.5 text-destructive" />
                        ) : (
                          <UserCheck className="h-3.5 w-3.5 text-green-600" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Formulaire d'activation */}
      {selected && (
        <Card>
          <CardHeader>
            <CardTitle>Activer le compte — {selected.nom}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Rôle</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Administrateur</SelectItem>
                  <SelectItem value="PM">Chef de projet</SelectItem>
                  <SelectItem value="CONSULTANT">Consultant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">Mot de passe initial</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 caractères"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={activateAccount} disabled={loading || !newPassword}>
                Activer le compte
              </Button>
              <Button variant="outline" onClick={() => setSelected(null)}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

**Step 6 : Ajouter le lien dans la sidebar**

Dans `components/sidebar.tsx`, ajouter dans `NAV_ITEMS` (conditionnel au rôle ADMIN) :

```typescript
// Afficher uniquement si session.user.role === "ADMIN"
{ href: "/admin/users", label: "Utilisateurs", icon: Users2, adminOnly: true }
```

Et dans le rendu :
```typescript
{NAV_ITEMS.filter(item => !item.adminOnly || session?.user?.role === 'ADMIN').map(...)}
```

**Step 7 : Lancer les tests**

```bash
npm run test:run
```

Expected: 262 passed

**Step 8 : Commit**

```bash
git add app/admin/ app/api/admin/users/ components/sidebar.tsx
git commit -m "feat: /admin/users page for account management"
```

---

## Task 12 : Seed — créer le premier compte ADMIN

**Files:**
- Create: `prisma/seed-admin.ts`
- Modify: `package.json`

**Step 1 : Créer `prisma/seed-admin.ts`**

```typescript
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@company.com"
  const password = process.env.ADMIN_PASSWORD ?? "ChangeMe123!"
  const nom = process.env.ADMIN_NOM ?? "Administrateur"

  const hash = await bcrypt.hash(password, 12)

  const admin = await prisma.consultant.upsert({
    where: { email },
    update: { password: hash, role: "ADMIN", actif: true },
    create: {
      nom,
      email,
      password: hash,
      role: "ADMIN",
      actif: true,
    },
  })

  console.log(`✅ Compte ADMIN créé/mis à jour : ${admin.email}`)
  console.log(`   Mot de passe initial : ${password}`)
  console.log(`   ⚠️  Changez ce mot de passe après la première connexion.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

**Step 2 : Ajouter le script dans `package.json`**

```json
"db:seed-admin": "npx tsx prisma/seed-admin.ts"
```

**Step 3 : Tester le seed en local**

```bash
ADMIN_EMAIL=admin@monentreprise.com ADMIN_PASSWORD=MonMotDePasse123! npm run db:seed-admin
```

Expected: `✅ Compte ADMIN créé/mis à jour : admin@monentreprise.com`

**Step 4 : Vérifier en base**

```bash
npm run db:studio
```

Vérifier dans Prisma Studio que le Consultant a `password` non-null et `role = ADMIN`.

**Step 5 : Commit**

```bash
git add prisma/seed-admin.ts package.json
git commit -m "feat: seed-admin script to create first ADMIN account"
```

---

## Task 13 : Migration PostgreSQL — schema

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `.env.production.local` (gitignore — ne pas committer)

**Prérequis :** Provisionner une instance Azure Database for PostgreSQL Flexible Server.
Récupérer la connection string : `postgresql://user:password@host.postgres.database.azure.com:5432/dashboard?sslmode=require`

**Step 1 : Modifier `prisma/schema.prisma`**

Remplacer le datasource :

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

> `directUrl` = connexion directe (sans pooler) utilisée par les migrations.
> `url` peut pointer vers le pooler PgBouncer (intégré Azure Flexible Server).

**Step 2 : Créer `.env.production.local`** (ne pas committer)

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST.postgres.database.azure.com:5432/dashboard?sslmode=require
DIRECT_URL=postgresql://USER:PASSWORD@HOST.postgres.database.azure.com:5432/dashboard?sslmode=require
NEXTAUTH_SECRET=<générer avec: openssl rand -base64 32>
NEXTAUTH_URL=https://votre-app.vercel.app
```

**Step 3 : Créer les migrations PostgreSQL**

```bash
DATABASE_URL="postgresql://..." DIRECT_URL="postgresql://..." npx prisma migrate deploy
```

Expected: toutes les migrations appliquées

**Step 4 : Vérifier la connexion**

```bash
DATABASE_URL="postgresql://..." npx prisma db push --skip-generate 2>&1 | tail -3
```

Expected: `Your database is now in sync with your schema`

**Step 5 : Commit du schema seulement (pas le .env)**

```bash
git add prisma/schema.prisma
git commit -m "feat: switch Prisma datasource to PostgreSQL"
```

---

## Task 14 : Migration des données SQLite → PostgreSQL

**Files:**
- Create: `prisma/migrate-data.ts`

**Step 1 : Créer le script de migration**

```typescript
// prisma/migrate-data.ts
// Script one-shot : migre les données de SQLite vers PostgreSQL
// Usage: SQLITE_URL="file:./prisma/dev.db" DATABASE_URL="postgresql://..." npx tsx prisma/migrate-data.ts

import { PrismaClient as PrismaPostgres } from "@prisma/client"

// Client SQLite (ancien)
const sqliteClient = new PrismaPostgres({
  datasourceUrl: process.env.SQLITE_URL ?? "file:./prisma/dev.db",
})

// Client PostgreSQL (nouveau)
const pgClient = new PrismaPostgres({
  datasourceUrl: process.env.DATABASE_URL,
})

async function migrate() {
  console.log("📦 Lecture des données SQLite...")

  const consultants = await sqliteClient.consultant.findMany()
  const projets = await sqliteClient.projet.findMany()
  const etapes = await sqliteClient.etape.findMany()
  const activites = await sqliteClient.activite.findMany()

  console.log(`  ${consultants.length} consultants`)
  console.log(`  ${projets.length} projets`)
  console.log(`  ${etapes.length} étapes`)
  console.log(`  ${activites.length} activités`)

  console.log("\n🚀 Import vers PostgreSQL...")

  // Ordre : respecter les FK (Consultant et Projet avant Etape et Activite)
  for (const c of consultants) {
    await pgClient.consultant.upsert({
      where: { email: c.email },
      update: c,
      create: c,
    })
  }
  console.log(`  ✅ ${consultants.length} consultants`)

  for (const p of projets) {
    await pgClient.projet.upsert({
      where: { id: p.id },
      update: p,
      create: p,
    })
  }
  console.log(`  ✅ ${projets.length} projets`)

  for (const e of etapes) {
    await pgClient.etape.upsert({
      where: { id: e.id },
      update: e,
      create: e,
    })
  }
  console.log(`  ✅ ${etapes.length} étapes`)

  for (const a of activites) {
    await pgClient.activite.upsert({
      where: { id: a.id },
      update: a,
      create: a,
    })
  }
  console.log(`  ✅ ${activites.length} activités`)

  console.log("\n🎉 Migration terminée !")
}

migrate()
  .catch(console.error)
  .finally(async () => {
    await sqliteClient.$disconnect()
    await pgClient.$disconnect()
  })
```

**Step 2 : Ajouter le script dans `package.json`**

```json
"db:migrate-data": "npx tsx prisma/migrate-data.ts"
```

**Step 3 : Exécuter la migration**

```bash
SQLITE_URL="file:./prisma/dev.db" DATABASE_URL="postgresql://..." npm run db:migrate-data
```

Expected: `🎉 Migration terminée !` avec tous les compteurs

**Step 4 : Créer le compte ADMIN sur PostgreSQL**

```bash
DATABASE_URL="postgresql://..." ADMIN_EMAIL=admin@monentreprise.com ADMIN_PASSWORD=MonMotDePasse123! npm run db:seed-admin
```

**Step 5 : Commit**

```bash
git add prisma/migrate-data.ts package.json
git commit -m "feat: data migration script SQLite → PostgreSQL"
```

---

## Task 15 : Déploiement Vercel Enterprise

**Files:**
- Modify: `package.json` (build script)
- Modify: `.gitignore`

**Step 1 : Mettre à jour le build script pour inclure `prisma generate`**

Dans `package.json`, modifier :

```json
"build": "prisma generate && next build"
```

**Step 2 : Vérifier `.gitignore`**

S'assurer que ces lignes sont présentes :

```
.env*.local
.env.production
prisma/dev.db
```

**Step 3 : Build local de vérification**

```bash
npm run build 2>&1 | tail -10
```

Expected: `✓ Compiled successfully`

**Step 4 : Configurer le projet Vercel**

Dans le dashboard Vercel Enterprise :
1. Connecter le repo GitHub
2. Framework: Next.js (auto-détecté)
3. Build Command: `prisma generate && next build`
4. Ajouter les variables d'environnement :
   - `DATABASE_URL` = connection string PostgreSQL Azure (avec pooler si disponible)
   - `DIRECT_URL` = connection string directe Azure
   - `NEXTAUTH_SECRET` = `openssl rand -base64 32`
   - `NEXTAUTH_URL` = URL Vercel (ex: `https://pm-dashboard.vercel.app`)

**Step 5 : Premier déploiement**

```bash
git push origin main
```

Suivre le déploiement dans le dashboard Vercel. Expected: `Deployment ready` ✅

**Step 6 : Vérification post-déploiement**

- [ ] Ouvrir `https://votre-app.vercel.app` → redirige vers `/login`
- [ ] Login avec admin@monentreprise.com → accède au dashboard
- [ ] Tester `/consultants` avec un compte CONSULTANT → redirigé vers `/`
- [ ] `/admin/users` → accessible uniquement avec ADMIN

**Step 7 : Commit final**

```bash
git add package.json .gitignore
git commit -m "feat: Vercel build config + prisma generate"
```

---

## Récapitulatif des commits Phase B

| # | Commit | Contenu |
|---|--------|---------|
| 1 | `chore: install next-auth@beta + bcryptjs` | Dépendances |
| 2 | `feat: add Role enum + password field to Consultant` | Schema + migration |
| 3 | `feat: NextAuth v5 config with Credentials provider + JWT` | auth.ts + types |
| 4 | `feat: NextAuth route handler` | app/api/auth |
| 5 | `feat: login page with credentials form` | /login |
| 6 | `feat: SessionProvider + logout button in sidebar` | layout + sidebar |
| 7 | `feat: middleware route protection with RBAC` | middleware.ts |
| 8 | `feat: protect all API routes with requireAuth/requireRole` | APIs |
| 9 | `feat: filter data by consultantId for CONSULTANT role` | Data filtering |
| 10 | `feat: /admin/users page for account management` | Admin UI |
| 11 | `feat: seed-admin script to create first ADMIN account` | Seed |
| 12 | `feat: switch Prisma datasource to PostgreSQL` | Schema PostgreSQL |
| 13 | `feat: data migration script SQLite → PostgreSQL` | Migration one-shot |
| 14 | `feat: Vercel build config + prisma generate` | Deploy |

## Critères de succès finaux

- [ ] 262+ tests Vitest passent
- [ ] `npm run build` sans erreur
- [ ] Login/logout fonctionnel sur Vercel
- [ ] Un CONSULTANT ne peut pas accéder à `/consultants` ni `/executive`
- [ ] Un ADMIN peut créer/désactiver des comptes depuis `/admin/users`
- [ ] Les données SQLite sont migrées sans perte
- [ ] L'équipe peut se connecter depuis leur navigateur
