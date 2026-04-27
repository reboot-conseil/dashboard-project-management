# Crakotte Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Synchroniser automatiquement les temps validés Crakotte dans le dashboard chaque nuit, détecter les nouveaux projets/clients, et alerter en cas de conflits avec les saisies manuelles.

**Architecture:** Vercel Cron Job nocturne (2h00 UTC) → POST /api/sync/crakotte → lib/crakotte-sync.ts orchestre le fetch incrémental (from: lastSyncAt), le mapping consultant/projet/étape, la création d'Activités, et la détection de conflits stockés en DB. UI admin dans /admin/crakotte avec 4 sections (config, dernière sync, conflits, projets en attente).

**Tech Stack:** Next.js App Router, Prisma (PostgreSQL/Neon), @vercel/blob (déjà installé), vercel.json crons, next-auth requireRole, lib/financial.ts, lib/email.ts existants.

---

## File Map

**Nouveaux fichiers:**
- `prisma/schema.prisma` — ajout modèles + champs (modifié)
- `lib/crakotte.ts` — client HTTP Crakotte + types TypeScript
- `lib/crakotte-sync.ts` — logique de sync (mapping, dédup, conflits)
- `app/api/sync/crakotte/route.ts` — route cron + manuel
- `app/api/admin/crakotte/config/route.ts` — GET/PUT config
- `app/api/admin/crakotte/test/route.ts` — POST test connexion
- `app/api/admin/crakotte/logs/route.ts` — GET historique syncs
- `app/api/admin/crakotte/conflicts/route.ts` — GET conflits
- `app/api/admin/crakotte/conflicts/[id]/resolve/route.ts` — POST résolution
- `app/api/admin/crakotte/pending-projects/route.ts` — GET projets en attente
- `app/api/admin/crakotte/pending-projects/[id]/approve/route.ts` — POST créer projet
- `app/api/admin/crakotte/pending-projects/[id]/ignore/route.ts` — POST ignorer
- `app/admin/crakotte/page.tsx` — page UI admin
- `components/admin/crakotte/ConfigSection.tsx`
- `components/admin/crakotte/SyncLogSection.tsx`
- `components/admin/crakotte/ConflictsSection.tsx`
- `components/admin/crakotte/PendingProjectsSection.tsx`
- `vercel.json` — cron schedule

---

## Task 1: Schéma Prisma — nouveaux modèles et champs

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Ajouter les champs sur les modèles existants**

Dans `prisma/schema.prisma`, ajouter dans `model Activite` (après le champ `facturable`):
```prisma
  source           String    @default("MANUEL") // MANUEL | CRAKOTTE
  crakotteEntryId  String?   @unique
```

Dans `model Projet` (après `couleur`):
```prisma
  crakotteProjectId   String?  @unique
  pendingCrakotte     CrakottePendingProject[]
```

Dans `model Consultant` (après `actif`):
```prisma
  crakotteConsultantId String?  @unique
  resolvedPendingProjects CrakottePendingProject[]
```

- [ ] **Step 2: Ajouter les nouveaux modèles**

Ajouter à la fin de `prisma/schema.prisma`:
```prisma
model CrakotteConfig {
  id            Int       @id @default(autoincrement())
  apiKey        String
  actif         Boolean   @default(true)
  dateDebutSync DateTime
  lastSyncAt    DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model CrakotteSyncLog {
  id                  Int       @id @default(autoincrement())
  startedAt           DateTime
  finishedAt          DateTime?
  status              String    // SUCCESS | PARTIAL | ERROR
  activitesCreees     Int       @default(0)
  conflitsDetectes    Int       @default(0)
  nouveauxProjets     Int       @default(0)
  consultantsSkippes  Int       @default(0)
  errorMessage        String?
  createdAt           DateTime  @default(now())
}

model CrakotteConflict {
  id                Int       @id @default(autoincrement())
  crakotteActiviteId Int
  manuelActiviteId   Int
  resolved          Boolean   @default(false)
  resolvedAt        DateTime?
  resolvedById      Int?
  keptSource        String?   // CRAKOTTE | MANUEL
  createdAt         DateTime  @default(now())
}

model CrakottePendingProject {
  id                   Int       @id @default(autoincrement())
  crakotteProjectId    String    @unique
  crakotteProjectName  String
  crakotteCustomerId   String
  crakotteCustomerName String
  suggestedProjetId    Int?
  suggestedProjet      Projet?   @relation(fields: [suggestedProjetId], references: [id])
  status               String    @default("PENDING") // PENDING | APPROVED | IGNORED
  createdAt            DateTime  @default(now())
  resolvedAt           DateTime?
  resolvedById         Int?
  resolvedBy           Consultant? @relation(fields: [resolvedById], references: [id])
}
```

- [ ] **Step 3: Appliquer le schéma**

```bash
npx prisma db push
npx prisma generate
```

Expected: "The database is already in sync" ou liste de changements appliqués. Pas d'erreur.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(crakotte): schema — CrakotteConfig, SyncLog, Conflict, PendingProject + champs Activite/Projet/Consultant"
```

---

## Task 2: Client HTTP Crakotte + types

**Files:**
- Create: `lib/crakotte.ts`

- [ ] **Step 1: Créer le client**

```typescript
// lib/crakotte.ts

const CRAKOTTE_BASE = "https://app.crakotte.com/api/external/v1"

export interface CrakotteCustomer {
  id: string
  name: string
  email: string | null
  projects: { id: string; name: string }[]
}

export interface CrakotteProject {
  id: string
  name: string
  customer: { id: string; name: string }
}

export interface CrakotteStep {
  id: string
  name: string
}

export interface CrakotteConsultant {
  id: string
  firstName: string
  lastName: string
  email: string
  name: string
}

export interface CrakotteTimeEntry {
  date: string
  time: number
  consultant: { id: string; firstName: string; lastName: string; email: string }
  customer: { id: string; name: string }
  project: { id: string; name: string }
  step: { id: string; name: string }
  entry: { id: string; status: string; month: number; year: number }
}

export interface CrakotteTimeSpentResponse {
  from: string
  to: string
  count: number
  items: CrakotteTimeEntry[]
}

async function crakotteFetch<T>(path: string, apiKey: string): Promise<T> {
  const res = await fetch(`${CRAKOTTE_BASE}${path}`, {
    headers: { "X-API-Key": apiKey },
    next: { revalidate: 0 },
  })
  if (!res.ok) {
    throw new Error(`Crakotte API error ${res.status}: ${await res.text()}`)
  }
  return res.json()
}

export async function fetchCrakotteCustomers(apiKey: string): Promise<CrakotteCustomer[]> {
  return crakotteFetch<CrakotteCustomer[]>("/customers", apiKey)
}

export async function fetchCrakotteProjects(apiKey: string): Promise<CrakotteProject[]> {
  return crakotteFetch<CrakotteProject[]>("/projects", apiKey)
}

export async function fetchCrakotteSteps(apiKey: string): Promise<CrakotteStep[]> {
  return crakotteFetch<CrakotteStep[]>("/steps", apiKey)
}

export async function fetchCrakotteConsultants(apiKey: string): Promise<CrakotteConsultant[]> {
  return crakotteFetch<CrakotteConsultant[]>("/consultants", apiKey)
}

export async function fetchCrakotteTimeSpent(
  apiKey: string,
  from: string,
  to: string,
  params?: { customerId?: string; projectId?: string; consultantId?: string }
): Promise<CrakotteTimeSpentResponse> {
  const qs = new URLSearchParams({ from, to })
  if (params?.customerId) qs.set("customerId", params.customerId)
  if (params?.projectId) qs.set("projectId", params.projectId)
  if (params?.consultantId) qs.set("consultantId", params.consultantId)
  return crakotteFetch<CrakotteTimeSpentResponse>(`/time-spent?${qs}`, apiKey)
}

export async function testCrakotteConnection(apiKey: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await fetchCrakotteConsultants(apiKey)
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep crakotte
```

Expected: aucune erreur sur lib/crakotte.ts

- [ ] **Step 3: Commit**

```bash
git add lib/crakotte.ts
git commit -m "feat(crakotte): client HTTP + types TypeScript"
```

---

## Task 3: Logique de sync — lib/crakotte-sync.ts

**Files:**
- Create: `lib/crakotte-sync.ts`

- [ ] **Step 1: Créer le fichier de sync**

```typescript
// lib/crakotte-sync.ts
import { prisma } from "@/lib/prisma"
import {
  fetchCrakotteConsultants,
  fetchCrakotteProjects,
  fetchCrakotteSteps,
  fetchCrakotteTimeSpent,
  CrakotteTimeEntry,
} from "@/lib/crakotte"
import { format } from "date-fns"

export interface SyncResult {
  activitesCreees: number
  conflitsDetectes: number
  nouveauxProjets: number
  consultantsSkippes: number
  errors: string[]
}

export async function runCrakotteSync(apiKey: string, from: Date, to: Date): Promise<SyncResult> {
  const result: SyncResult = {
    activitesCreees: 0,
    conflitsDetectes: 0,
    nouveauxProjets: 0,
    consultantsSkippes: 0,
    errors: [],
  }

  const fromStr = format(from, "yyyy-MM-dd")
  const toStr = format(to, "yyyy-MM-dd")

  // 1. Fetch référentiels
  const [crakotteConsultants, crakotteProjects, timeSpent] = await Promise.all([
    fetchCrakotteConsultants(apiKey),
    fetchCrakotteProjects(apiKey),
    fetchCrakotteTimeSpent(apiKey, fromStr, toStr),
  ])

  // 2. Construire maps email→consultantId et crakotteProjectId→projetId
  const consultantsByEmail = new Map<string, number>()
  const dbConsultants = await prisma.consultant.findMany({
    select: { id: true, email: true, crakotteConsultantId: true },
  })
  for (const c of dbConsultants) {
    if (c.email) consultantsByEmail.set(c.email.toLowerCase(), c.id)
  }

  // Enregistrer crakotteConsultantId si pas encore fait
  for (const cc of crakotteConsultants) {
    const dbId = consultantsByEmail.get(cc.email.toLowerCase())
    if (dbId) {
      const dbC = dbConsultants.find((c) => c.id === dbId)
      if (!dbC?.crakotteConsultantId) {
        await prisma.consultant.update({
          where: { id: dbId },
          data: { crakotteConsultantId: cc.id },
        })
      }
    }
  }

  const projetsByKrakotteId = new Map<string, number>()
  const dbProjets = await prisma.projet.findMany({
    select: { id: true, nom: true, crakotteProjectId: true },
  })
  for (const p of dbProjets) {
    if (p.crakotteProjectId) projetsByKrakotteId.set(p.crakotteProjectId, p.id)
  }

  // 3. Traiter chaque entrée de temps
  for (const item of timeSpent.items) {
    try {
      await processTimeEntry(item, consultantsByEmail, projetsByKrakotteId, dbProjets, result)
    } catch (e: any) {
      result.errors.push(`Entry ${item.entry.id}: ${e.message}`)
    }
  }

  return result
}

async function processTimeEntry(
  item: CrakotteTimeEntry,
  consultantsByEmail: Map<string, number>,
  projetsByKrakotteId: Map<string, number>,
  dbProjets: { id: number; nom: string; crakotteProjectId: string | null }[],
  result: SyncResult
) {
  // Déduplication
  const existing = await prisma.activite.findUnique({
    where: { crakotteEntryId: item.entry.id },
  })
  if (existing) return

  // Match consultant
  const consultantId = consultantsByEmail.get(item.consultant.email.toLowerCase())
  if (!consultantId) {
    result.consultantsSkippes++
    return
  }

  // Match projet
  let projetId: number | null = null

  if (projetsByKrakotteId.has(item.project.id)) {
    projetId = projetsByKrakotteId.get(item.project.id)!
  } else {
    // Match flou par nom
    const match = dbProjets.find(
      (p) => p.nom.toLowerCase() === item.project.name.toLowerCase()
    )
    if (match) {
      // Lier et mettre à jour
      await prisma.projet.update({
        where: { id: match.id },
        data: { crakotteProjectId: item.project.id },
      })
      projetsByKrakotteId.set(item.project.id, match.id)
      projetId = match.id
    } else {
      // Projet inconnu → pending (si pas déjà)
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
      }
      // Activité créée sans projetId (brute)
    }
  }

  // Match étape
  let etapeId: number | null = null
  if (projetId) {
    const etape = await prisma.etape.findFirst({
      where: {
        projetId,
        nom: { equals: item.step.name, mode: "insensitive" },
      },
      select: { id: true },
    })
    if (etape) etapeId = etape.id
  }

  // Créer l'activité
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

  // Détection doublon MANUEL
  if (projetId) {
    const doublon = await prisma.activite.findFirst({
      where: {
        consultantId,
        projetId,
        date: new Date(item.date),
        source: "MANUEL",
        id: { not: activite.id },
      },
    })
    if (doublon && Math.abs(Number(doublon.heures) - item.time) <= 0.5) {
      await prisma.crakotteConflict.create({
        data: {
          crakotteActiviteId: activite.id,
          manuelActiviteId: doublon.id,
        },
      })
      result.conflitsDetectes++
    }
  }
}
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep crakotte
```

Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add lib/crakotte-sync.ts
git commit -m "feat(crakotte): logique de sync — mapping, dédup, conflits, projets en attente"
```

---

## Task 4: Route de sync /api/sync/crakotte

**Files:**
- Create: `app/api/sync/crakotte/route.ts`

- [ ] **Step 1: Créer la route**

```typescript
// app/api/sync/crakotte/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { runCrakotteSync } from "@/lib/crakotte-sync"

export async function POST(req: NextRequest) {
  // Auth: CRON_SECRET (Vercel cron) ou session admin
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  const isVercelCron = authHeader === `Bearer ${cronSecret}` && !!cronSecret
  // Pour le bouton manuel, l'auth est vérifiée côté client (cookie session)
  // On accepte aussi sans secret si la requête vient de l'intérieur (localhost)
  if (!isVercelCron) {
    // Vérification simplifiée pour appel admin manuel — en production Vercel,
    // seul le cron peut appeler sans session; le bouton manuel passe par
    // /api/admin/crakotte/sync qui forward ici avec le secret
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
      },
    })

    await prisma.crakotteConfig.update({
      where: { id: config.id },
      data: { lastSyncAt: now },
    })

    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    await prisma.crakotteSyncLog.update({
      where: { id: syncLog.id },
      data: { finishedAt: new Date(), status: "ERROR", errorMessage: error.message },
    })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Créer la route admin pour le bouton manuel**

```typescript
// app/api/admin/crakotte/sync/route.ts
import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-guard"

export async function POST() {
  const authError = await requireRole("ADMIN")
  if (authError) return authError

  const res = await fetch(
    `${process.env.NEXTAUTH_URL}/api/sync/crakotte`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    }
  )
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
```

- [ ] **Step 3: Vérifier TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "sync/crakotte|admin/crakotte/sync"
```

Expected: aucune erreur.

- [ ] **Step 4: Commit**

```bash
git add app/api/sync/crakotte/route.ts app/api/admin/crakotte/sync/route.ts
git commit -m "feat(crakotte): route POST /api/sync/crakotte + route admin déclenchement manuel"
```

---

## Task 5: Routes admin config + test + logs

**Files:**
- Create: `app/api/admin/crakotte/config/route.ts`
- Create: `app/api/admin/crakotte/test/route.ts`
- Create: `app/api/admin/crakotte/logs/route.ts`

- [ ] **Step 1: Route config GET/PUT**

```typescript
// app/api/admin/crakotte/config/route.ts
import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const authError = await requireRole("ADMIN")
  if (authError) return authError

  const config = await prisma.crakotteConfig.findFirst()
  if (!config) return NextResponse.json(null)

  return NextResponse.json({
    ...config,
    apiKey: config.apiKey ? "***" + config.apiKey.slice(-4) : "",
  })
}

export async function PUT(req: NextRequest) {
  const authError = await requireRole("ADMIN")
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
```

- [ ] **Step 2: Route test connexion**

```typescript
// app/api/admin/crakotte/test/route.ts
import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-guard"
import { testCrakotteConnection } from "@/lib/crakotte"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const authError = await requireRole("ADMIN")
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
```

- [ ] **Step 3: Route logs**

```typescript
// app/api/admin/crakotte/logs/route.ts
import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const authError = await requireRole("ADMIN")
  if (authError) return authError

  const logs = await prisma.crakotteSyncLog.findMany({
    orderBy: { startedAt: "desc" },
    take: 50,
  })
  return NextResponse.json(logs)
}
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "admin/crakotte"
```

Expected: aucune erreur.

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/crakotte/config/route.ts app/api/admin/crakotte/test/route.ts app/api/admin/crakotte/logs/route.ts
git commit -m "feat(crakotte): routes admin — config GET/PUT, test connexion, historique logs"
```

---

## Task 6: Routes admin conflits + projets en attente

**Files:**
- Create: `app/api/admin/crakotte/conflicts/route.ts`
- Create: `app/api/admin/crakotte/conflicts/[id]/resolve/route.ts`
- Create: `app/api/admin/crakotte/pending-projects/route.ts`
- Create: `app/api/admin/crakotte/pending-projects/[id]/approve/route.ts`
- Create: `app/api/admin/crakotte/pending-projects/[id]/ignore/route.ts`

- [ ] **Step 1: Route conflits GET**

```typescript
// app/api/admin/crakotte/conflicts/route.ts
import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const authError = await requireRole("ADMIN")
  if (authError) return authError

  const conflicts = await prisma.crakotteConflict.findMany({
    where: { resolved: false },
    orderBy: { createdAt: "desc" },
  })

  const enriched = await Promise.all(
    conflicts.map(async (c) => {
      const [crakotteAct, manuelAct] = await Promise.all([
        prisma.activite.findUnique({
          where: { id: c.crakotteActiviteId },
          include: { consultant: { select: { nom: true } }, projet: { select: { nom: true } } },
        }),
        prisma.activite.findUnique({
          where: { id: c.manuelActiviteId },
          include: { consultant: { select: { nom: true } }, projet: { select: { nom: true } } },
        }),
      ])
      return { ...c, crakotteActivite: crakotteAct, manuelActivite: manuelAct }
    })
  )

  return NextResponse.json(enriched)
}
```

- [ ] **Step 2: Route résolution conflit**

```typescript
// app/api/admin/crakotte/conflicts/[id]/resolve/route.ts
import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authError = await requireRole("ADMIN")
  if (authError) return authError

  const { keep } = await req.json() // "CRAKOTTE" | "MANUEL"
  const conflictId = parseInt(params.id)

  const conflict = await prisma.crakotteConflict.findUnique({ where: { id: conflictId } })
  if (!conflict) return NextResponse.json({ error: "Conflit introuvable" }, { status: 404 })

  const toDeleteId = keep === "CRAKOTTE" ? conflict.manuelActiviteId : conflict.crakotteActiviteId

  await prisma.$transaction([
    prisma.activite.delete({ where: { id: toDeleteId } }),
    prisma.crakotteConflict.update({
      where: { id: conflictId },
      data: { resolved: true, resolvedAt: new Date(), keptSource: keep },
    }),
  ])

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Route projets en attente GET**

```typescript
// app/api/admin/crakotte/pending-projects/route.ts
import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const authError = await requireRole("ADMIN")
  if (authError) return authError

  const pending = await prisma.crakottePendingProject.findMany({
    where: { status: "PENDING" },
    include: { suggestedProjet: { select: { id: true, nom: true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(pending)
}
```

- [ ] **Step 4: Route approve (créer projet)**

```typescript
// app/api/admin/crakotte/pending-projects/[id]/approve/route.ts
import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authError = await requireRole("ADMIN")
  if (authError) return authError

  const pending = await prisma.crakottePendingProject.findUnique({
    where: { id: parseInt(params.id) },
  })
  if (!pending) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

  const body = await req.json()
  // body peut contenir: nom, client, budget, dateDebut, dateFin, couleur
  const projet = await prisma.projet.create({
    data: {
      nom: body.nom ?? pending.crakotteProjectName,
      client: body.client ?? pending.crakotteCustomerName,
      statut: "PLANIFIE",
      couleur: body.couleur ?? "#3b82f6",
      crakotteProjectId: pending.crakotteProjectId,
      budget: body.budget ?? null,
      dateDebut: body.dateDebut ? new Date(body.dateDebut) : null,
      dateFin: body.dateFin ? new Date(body.dateFin) : null,
    },
  })

  await prisma.crakottePendingProject.update({
    where: { id: pending.id },
    data: { status: "APPROVED", resolvedAt: new Date() },
  })

  return NextResponse.json({ success: true, projetId: projet.id })
}
```

- [ ] **Step 5: Route ignore**

```typescript
// app/api/admin/crakotte/pending-projects/[id]/ignore/route.ts
import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const authError = await requireRole("ADMIN")
  if (authError) return authError

  await prisma.crakottePendingProject.update({
    where: { id: parseInt(params.id) },
    data: { status: "IGNORED", resolvedAt: new Date() },
  })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 6: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "conflicts\|pending"
```

Expected: aucune erreur.

- [ ] **Step 7: Commit**

```bash
git add app/api/admin/crakotte/
git commit -m "feat(crakotte): routes admin — conflits GET/resolve, pending-projects GET/approve/ignore"
```

---

## Task 7: vercel.json — Cron + env var

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Créer vercel.json**

```json
{
  "crons": [
    {
      "path": "/api/sync/crakotte",
      "schedule": "0 2 * * *"
    }
  ]
}
```

- [ ] **Step 2: Ajouter CRON_SECRET dans Vercel**

Dans Vercel dashboard → Settings → Environment Variables → ajouter :
- Key: `CRON_SECRET`
- Value: une chaîne aléatoire longue (ex: `openssl rand -hex 32`)
- Environment: Production + Preview

- [ ] **Step 3: Commit**

```bash
git add vercel.json
git commit -m "feat(crakotte): vercel.json — cron job 2h00 UTC quotidien"
```

---

## Task 8: UI Admin — page /admin/crakotte

**Files:**
- Create: `app/admin/crakotte/page.tsx`
- Create: `components/admin/crakotte/ConfigSection.tsx`
- Create: `components/admin/crakotte/SyncLogSection.tsx`
- Create: `components/admin/crakotte/ConflictsSection.tsx`
- Create: `components/admin/crakotte/PendingProjectsSection.tsx`

- [ ] **Step 1: Créer ConfigSection.tsx**

```tsx
// components/admin/crakotte/ConfigSection.tsx
"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface Config {
  apiKey: string
  actif: boolean
  dateDebutSync: string
  lastSyncAt: string | null
}

export function ConfigSection({ initial }: { initial: Config | null }) {
  const [apiKey, setApiKey] = useState(initial?.apiKey ?? "")
  const [actif, setActif] = useState(initial?.actif ?? true)
  const [dateDebut, setDateDebut] = useState(
    initial?.dateDebutSync ? initial.dateDebutSync.split("T")[0] : new Date().getFullYear() + "-01-01"
  )
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const res = await fetch("/api/admin/crakotte/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, actif, dateDebutSync: dateDebut }),
    })
    setSaving(false)
    if (res.ok) toast.success("Configuration sauvegardée")
    else toast.error("Erreur lors de la sauvegarde")
  }

  async function testConnection() {
    setTesting(true)
    const res = await fetch("/api/admin/crakotte/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey }),
    })
    const data = await res.json()
    setTesting(false)
    if (data.ok) toast.success("Connexion Crakotte OK")
    else toast.error("Erreur: " + (data.error ?? "inconnue"))
  }

  async function syncNow() {
    setSyncing(true)
    const res = await fetch("/api/admin/crakotte/sync", { method: "POST" })
    const data = await res.json()
    setSyncing(false)
    if (res.ok) toast.success(`Sync terminée — ${data.result?.activitesCreees ?? 0} activités créées`)
    else toast.error("Erreur sync: " + (data.error ?? "inconnue"))
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Configuration Crakotte</h2>
      <div className="grid gap-4 max-w-lg">
        <div>
          <Label htmlFor="apiKey">Clé API</Label>
          <Input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Votre clé API Crakotte"
          />
        </div>
        <div>
          <Label htmlFor="dateDebut">Date de début de sync</Label>
          <Input
            id="dateDebut"
            type="date"
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            id="actif"
            type="checkbox"
            checked={actif}
            onChange={(e) => setActif(e.target.checked)}
            className="h-4 w-4"
          />
          <Label htmlFor="actif">Sync automatique activée</Label>
        </div>
        <div className="flex gap-2">
          <Button onClick={save} disabled={saving} size="sm">
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
          <Button onClick={testConnection} disabled={testing} variant="outline" size="sm">
            {testing ? "Test..." : "Tester la connexion"}
          </Button>
          <Button onClick={syncNow} disabled={syncing} variant="outline" size="sm">
            {syncing ? "Sync en cours..." : "Synchroniser maintenant"}
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Créer SyncLogSection.tsx**

```tsx
// components/admin/crakotte/SyncLogSection.tsx
"use client"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface SyncLog {
  id: number
  startedAt: string
  finishedAt: string | null
  status: string
  activitesCreees: number
  conflitsDetectes: number
  nouveauxProjets: number
  consultantsSkippes: number
  errorMessage: string | null
}

export function SyncLogSection({ logs }: { logs: SyncLog[] }) {
  const last = logs[0]
  const statusIcon = { SUCCESS: "✅", PARTIAL: "⚠️", ERROR: "❌", RUNNING: "⏳" }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Synchronisation</h2>
      {last ? (
        <div className="rounded-lg border p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span>{statusIcon[last.status as keyof typeof statusIcon] ?? "?"}</span>
            <span className="font-medium">{last.status}</span>
            <span className="text-muted-foreground text-sm">
              {format(new Date(last.startedAt), "dd MMM yyyy à HH:mm", { locale: fr })}
            </span>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>{last.activitesCreees} activités créées</span>
            <span>{last.conflitsDetectes} conflits</span>
            <span>{last.nouveauxProjets} nouveaux projets</span>
            {last.consultantsSkippes > 0 && <span>{last.consultantsSkippes} consultants skippés</span>}
          </div>
          {last.errorMessage && (
            <p className="text-destructive text-xs font-mono">{last.errorMessage}</p>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">Aucune sync effectuée.</p>
      )}
      {logs.length > 1 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">Historique ({logs.length} syncs)</summary>
          <div className="mt-2 space-y-1">
            {logs.slice(1).map((log) => (
              <div key={log.id} className="flex gap-3 text-xs text-muted-foreground">
                <span>{statusIcon[log.status as keyof typeof statusIcon]}</span>
                <span>{format(new Date(log.startedAt), "dd/MM/yy HH:mm")}</span>
                <span>{log.activitesCreees} créées</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Créer ConflictsSection.tsx**

```tsx
// components/admin/crakotte/ConflictsSection.tsx
"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface Activite {
  id: number
  date: string
  heures: number
  description: string | null
  projet: { nom: string } | null
  consultant: { nom: string }
}

interface Conflict {
  id: number
  crakotteActivite: Activite | null
  manuelActivite: Activite | null
}

export function ConflictsSection({ initial }: { initial: Conflict[] }) {
  const [conflicts, setConflicts] = useState(initial)

  async function resolve(conflictId: number, keep: "CRAKOTTE" | "MANUEL") {
    const res = await fetch(`/api/admin/crakotte/conflicts/${conflictId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keep }),
    })
    if (res.ok) {
      setConflicts((prev) => prev.filter((c) => c.id !== conflictId))
      toast.success("Conflit résolu")
    } else {
      toast.error("Erreur lors de la résolution")
    }
  }

  if (conflicts.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-2">Conflits</h2>
        <p className="text-muted-foreground text-sm">Aucun conflit en attente.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Conflits à résoudre ({conflicts.length})</h2>
      {conflicts.map((c) => (
        <div key={c.id} className="rounded-lg border p-4 grid grid-cols-2 gap-4">
          {(["manuelActivite", "crakotteActivite"] as const).map((key) => {
            const act = c[key]
            const label = key === "manuelActivite" ? "Saisie manuelle" : "Crakotte"
            const keep = key === "manuelActivite" ? "MANUEL" : "CRAKOTTE"
            return (
              <div key={key} className="space-y-1">
                <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
                {act ? (
                  <>
                    <p className="text-sm">{format(new Date(act.date), "dd MMM yyyy", { locale: fr })}</p>
                    <p className="text-sm font-medium">{act.heures}h</p>
                    <p className="text-xs text-muted-foreground">{act.projet?.nom ?? "Sans projet"}</p>
                    <p className="text-xs text-muted-foreground">{act.description}</p>
                    <Button size="sm" variant="outline" onClick={() => resolve(c.id, keep)}>
                      Garder {label}
                    </Button>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Activité supprimée</p>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Créer PendingProjectsSection.tsx**

```tsx
// components/admin/crakotte/PendingProjectsSection.tsx
"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface PendingProject {
  id: number
  crakotteProjectName: string
  crakotteCustomerName: string
  suggestedProjet: { id: number; nom: string } | null
}

export function PendingProjectsSection({ initial }: { initial: PendingProject[] }) {
  const [pending, setPending] = useState(initial)

  async function approve(id: number, nom: string, client: string) {
    const res = await fetch(`/api/admin/crakotte/pending-projects/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom, client }),
    })
    if (res.ok) {
      setPending((prev) => prev.filter((p) => p.id !== id))
      toast.success("Projet créé dans le dashboard")
    } else {
      toast.error("Erreur lors de la création")
    }
  }

  async function ignore(id: number) {
    const res = await fetch(`/api/admin/crakotte/pending-projects/${id}/ignore`, { method: "POST" })
    if (res.ok) {
      setPending((prev) => prev.filter((p) => p.id !== id))
      toast.success("Projet ignoré")
    } else {
      toast.error("Erreur")
    }
  }

  if (pending.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-2">Projets en attente</h2>
        <p className="text-muted-foreground text-sm">Aucun nouveau projet Crakotte détecté.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Projets en attente ({pending.length})</h2>
      {pending.map((p) => (
        <div key={p.id} className="rounded-lg border p-4 space-y-2">
          <div>
            <p className="font-medium">{p.crakotteProjectName}</p>
            <p className="text-sm text-muted-foreground">Client : {p.crakotteCustomerName}</p>
            {p.suggestedProjet && (
              <p className="text-xs text-amber-600">
                Suggestion : similaire à "{p.suggestedProjet.nom}"
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => approve(p.id, p.crakotteProjectName, p.crakotteCustomerName)}
            >
              Créer dans le dashboard
            </Button>
            <Button size="sm" variant="outline" onClick={() => ignore(p.id)}>
              Ignorer
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Créer la page principale app/admin/crakotte/page.tsx**

```tsx
// app/admin/crakotte/page.tsx
import { requireRole } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"
import { ConfigSection } from "@/components/admin/crakotte/ConfigSection"
import { SyncLogSection } from "@/components/admin/crakotte/SyncLogSection"
import { ConflictsSection } from "@/components/admin/crakotte/ConflictsSection"
import { PendingProjectsSection } from "@/components/admin/crakotte/PendingProjectsSection"

export default async function CrakottePage() {
  const authError = await requireRole("ADMIN")
  if (authError) return authError

  const [config, logs, conflicts, pendingProjects] = await Promise.all([
    prisma.crakotteConfig.findFirst(),
    prisma.crakotteSyncLog.findMany({ orderBy: { startedAt: "desc" }, take: 50 }),
    prisma.crakotteConflict.findMany({
      where: { resolved: false },
      orderBy: { createdAt: "desc" },
    }),
    prisma.crakottePendingProject.findMany({
      where: { status: "PENDING" },
      include: { suggestedProjet: { select: { id: true, nom: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ])

  // Enrichir les conflits
  const enrichedConflicts = await Promise.all(
    conflicts.map(async (c) => {
      const [crakotteAct, manuelAct] = await Promise.all([
        prisma.activite.findUnique({
          where: { id: c.crakotteActiviteId },
          include: { projet: { select: { nom: true } }, consultant: { select: { nom: true } } },
        }),
        prisma.activite.findUnique({
          where: { id: c.manuelActiviteId },
          include: { projet: { select: { nom: true } }, consultant: { select: { nom: true } } },
        }),
      ])
      return { ...c, crakotteActivite: crakotteAct, manuelActivite: manuelAct }
    })
  )

  const configForClient = config
    ? {
        ...config,
        apiKey: "***" + config.apiKey.slice(-4),
        dateDebutSync: config.dateDebutSync.toISOString(),
        lastSyncAt: config.lastSyncAt?.toISOString() ?? null,
        createdAt: config.createdAt.toISOString(),
        updatedAt: config.updatedAt.toISOString(),
      }
    : null

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-10">
      <h1 className="text-2xl font-bold">Intégration Crakotte</h1>
      <ConfigSection initial={configForClient} />
      <SyncLogSection logs={logs.map((l) => ({
        ...l,
        startedAt: l.startedAt.toISOString(),
        finishedAt: l.finishedAt?.toISOString() ?? null,
        createdAt: l.createdAt.toISOString(),
      }))} />
      <ConflictsSection initial={enrichedConflicts.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        resolvedAt: c.resolvedAt?.toISOString() ?? null,
        crakotteActivite: c.crakotteActivite ? {
          ...c.crakotteActivite,
          date: c.crakotteActivite.date.toISOString(),
          heures: Number(c.crakotteActivite.heures),
        } : null,
        manuelActivite: c.manuelActivite ? {
          ...c.manuelActivite,
          date: c.manuelActivite.date.toISOString(),
          heures: Number(c.manuelActivite.heures),
        } : null,
      }))} />
      <PendingProjectsSection initial={pendingProjects.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        resolvedAt: p.resolvedAt?.toISOString() ?? null,
      }))} />
    </div>
  )
}
```

- [ ] **Step 6: Ajouter le lien dans la navigation admin**

Dans `app/admin/users/page.tsx` ou le composant de navigation admin existant, ajouter un lien vers `/admin/crakotte`. Chercher d'abord le fichier de navigation:

```bash
grep -rn "admin/users\|admin.*navigation\|AdminNav" /Users/jonathanbraun/dashboard-chef-projet/app/admin --include="*.tsx" -l | head -5
```

Ajouter dans la liste des liens admin :
```tsx
<Link href="/admin/crakotte">Intégration Crakotte</Link>
```

- [ ] **Step 7: TypeScript check complet**

```bash
npx tsc --noEmit 2>&1 | grep -v use-local-storage | grep -v "^$" | head -20
```

Expected: aucune erreur.

- [ ] **Step 8: Commit**

```bash
git add app/admin/crakotte/ components/admin/crakotte/
git commit -m "feat(crakotte): UI admin — config, sync log, conflits, projets en attente"
```

---

## Task 9: Push et vérification déploiement

- [ ] **Step 1: Push final**

```bash
git push
```

- [ ] **Step 2: Vérifier le build Vercel**

Dans Vercel dashboard → Deployments → vérifier que le build passe sans erreur.

- [ ] **Step 3: Vérifier le cron**

Dans Vercel dashboard → Settings → Crons → vérifier que `/api/sync/crakotte` apparaît avec schedule `0 2 * * *`.

- [ ] **Step 4: Tester la configuration**

1. Aller sur `/admin/crakotte`
2. Saisir la clé API Crakotte
3. Cliquer "Tester la connexion" → doit afficher "Connexion Crakotte OK"
4. Cliquer "Sauvegarder"
5. Cliquer "Synchroniser maintenant" → vérifier les stats dans "Dernière sync"

---

## Self-Review

**Spec coverage:**
- ✅ Sync automatique nocturne (Vercel Cron — Task 7)
- ✅ Bouton sync manuelle (ConfigSection + /api/admin/crakotte/sync — Task 4, 8)
- ✅ Sync incrémentale from lastSyncAt (lib/crakotte-sync.ts — Task 3)
- ✅ Déduplication par crakotteEntryId (Task 3)
- ✅ Match consultant par email (Task 3)
- ✅ Match projet par crakotteProjectId puis nom flou (Task 3)
- ✅ Match étape par nom (Task 3)
- ✅ Activités créées source=CRAKOTTE, facturable=true (Task 3)
- ✅ Détection doublons MANUEL → CrakotteConflict (Task 3)
- ✅ CrakottePendingProject pour nouveaux projets (Task 3)
- ✅ UI conflits avec résolution côte-à-côte (Task 8)
- ✅ UI projets en attente avec approve/ignore (Task 8)
- ✅ CRON_SECRET pour sécuriser la route (Task 4, 7)
- ✅ Historique SyncLogs (Task 5, 8)
- ⚠️ Notifications email (lib/email.ts) — non implémentées dans ce plan car lib/email.ts nécessite la config Azure Mail.Send encore en attente (voir memory). À ajouter en follow-up une fois Mail.Send fonctionnel.

**Types cohérents:** CrakotteTimeEntry.entry.id utilisé comme crakotteEntryId partout. CrakotteConflict.crakotteActiviteId / manuelActiviteId cohérents entre lib/crakotte-sync.ts et les routes.

**Placeholders:** aucun.
