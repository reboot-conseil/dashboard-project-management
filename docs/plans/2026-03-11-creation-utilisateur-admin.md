# Création Utilisateur depuis Admin — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Permettre à un ADMIN de créer un nouveau consultant + compte en une seule action depuis /admin/users.

**Architecture:** Enrichir `POST /api/admin/users` avec un body `{ action: "create", ... }` pour créer atomiquement un Consultant avec password hashé. Le panel inline dans `admin-users-client.tsx` suit le même pattern que les panneaux "Activer" et "Modifier" existants.

**Tech Stack:** Next.js 16, Prisma, bcryptjs, React useState, TypeScript strict

---

## Task 1 : API — Créer consultant + compte

**Files:**
- Modify: `app/api/admin/users/route.ts`

### Contexte
Le `POST` actuel gère l'activation d'un consultant existant (`{ consultantId, role, password }`).
On ajoute un nouveau cas : `{ action: "create", nom, email, role, password, tjm? }` qui crée un Consultant en DB avec le password hashé.

La couleur est auto-assignée par rotation sur la palette consultants :
`["#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#06B6D4", "#F97316"]`

**Step 1 : Remplacer le handler POST dans `app/api/admin/users/route.ts`**

```typescript
export async function POST(req: Request) {
  const authError = await requireRole(["ADMIN"])
  if (authError) return authError
  const body = await req.json()

  // ── Cas 1 : création d'un nouveau consultant + compte ──
  if (body.action === "create") {
    const { nom, email, role, password, tjm } = body
    if (!nom || !email || !role || !password)
      return NextResponse.json({ error: "Champs manquants" }, { status: 400 })

    const existing = await prisma.consultant.findUnique({ where: { email } })
    if (existing)
      return NextResponse.json({ error: "Email déjà utilisé" }, { status: 409 })

    const CONSULTANT_COLORS = ["#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#06B6D4", "#F97316"]
    const count = await prisma.consultant.count()
    const couleur = CONSULTANT_COLORS[count % CONSULTANT_COLORS.length]

    const bcrypt = await import("bcryptjs")
    const hash = await bcrypt.hash(password, 12)

    const consultant = await prisma.consultant.create({
      data: {
        nom,
        email,
        role,
        password: hash,
        couleur,
        tjm: tjm ? Number(tjm) : null,
        actif: true,
      },
    })
    return NextResponse.json({ id: consultant.id, email: consultant.email, role: consultant.role }, { status: 201 })
  }

  // ── Cas 2 : activation d'un consultant existant (comportement actuel) ──
  const { consultantId, role, password } = body
  if (!consultantId || !role || !password)
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 })
  const bcrypt = await import("bcryptjs")
  const hash = await bcrypt.hash(password, 12)
  const updated = await prisma.consultant.update({ where: { id: consultantId }, data: { role, password: hash } })
  return NextResponse.json({ id: updated.id, email: updated.email, role: updated.role })
}
```

**Step 2 : Vérifier TypeScript**
```bash
npx tsc --noEmit 2>&1 | grep -v use-local-storage | grep "admin" | head -5
```
Expected: aucune erreur sur ce fichier.

**Step 3 : Vérifier tests**
```bash
npm run test:run 2>&1 | grep -E "passed|failed"
```
Expected: 267 passed.

**Step 4 : Commit**
```bash
git add app/api/admin/users/route.ts
git commit -m "feat: POST /api/admin/users — créer consultant + compte (action=create)"
```

---

## Task 2 : UI — Bouton + formulaire de création

**Files:**
- Modify: `app/admin/users/admin-users-client.tsx`

### Contexte
Le fichier a déjà 3 panneaux inline : `selected` (activer), `editingRole` (modifier rôle), `confirmDelete` (supprimer).
On ajoute un 4e panneau : `showCreate` (créer un nouvel utilisateur).

Le bouton "Nouvel utilisateur" est ajouté en haut à droite de la page (dans le `<div>` qui contient le titre "Équipe").

**Step 1 : Ajouter l'import `UserPlus` manquant si nécessaire**

`UserPlus` est déjà importé. Pas de changement nécessaire.

**Step 2 : Ajouter le state et la fonction dans `AdminUsersClient`**

Après les autres états existants (`selected`, `editingRole`, `confirmDelete`...) :

```typescript
const [showCreate, setShowCreate] = useState(false)
const [createForm, setCreateForm] = useState({ nom: "", email: "", role: "CONSULTANT" as Role, password: "", tjm: "" })
```

Ajouter la fonction `createUser` après `deleteUser` :

```typescript
async function createUser() {
  if (!createForm.nom || !createForm.email || !createForm.password) {
    toast.error("Nom, email et mot de passe sont requis")
    return
  }
  setLoading(true)
  try {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        nom: createForm.nom,
        email: createForm.email,
        role: createForm.role,
        password: createForm.password,
        tjm: createForm.tjm || undefined,
      }),
    })
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? "Erreur lors de la création")
      return
    }
    toast.success(`Compte créé pour ${createForm.nom}`)
    router.refresh()
    setShowCreate(false)
    setCreateForm({ nom: "", email: "", role: "CONSULTANT", password: "", tjm: "" })
  } catch { toast.error("Erreur") } finally { setLoading(false) }
}
```

**Step 3 : Ajouter le bouton en haut de la liste**

Remplacer :
```typescript
<div className="flex items-center justify-between">
  <h2 className="text-base font-semibold">Équipe <span ...>({users.length})</span></h2>
</div>
```

Par :
```typescript
<div className="flex items-center justify-between">
  <h2 className="text-base font-semibold">Équipe <span className="text-muted-foreground font-normal text-sm">({users.length})</span></h2>
  <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5 text-xs">
    <UserPlus className="h-3.5 w-3.5" />Nouvel utilisateur
  </Button>
</div>
```

**Step 4 : Ajouter le panneau de création (après le panneau `confirmDelete`)**

```typescript
{showCreate && (
  <Card>
    <CardHeader><CardTitle>Créer un utilisateur</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="create-nom">Nom complet *</Label>
          <Input id="create-nom" placeholder="Julie Chen" value={createForm.nom}
            onChange={(e) => setCreateForm((f) => ({ ...f, nom: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="create-email">Email *</Label>
          <Input id="create-email" type="email" placeholder="julie.chen@reboot-conseil.com"
            value={createForm.email}
            onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Rôle</Label>
          <Select value={createForm.role} onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value as Role }))}>
            <option value="ADMIN">Administrateur</option>
            <option value="PM">Chef de projet</option>
            <option value="CONSULTANT">Consultant</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="create-tjm">TJM €/j (optionnel)</Label>
          <Input id="create-tjm" type="number" min={0} placeholder="600"
            value={createForm.tjm}
            onChange={(e) => setCreateForm((f) => ({ ...f, tjm: e.target.value }))} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="create-password">Mot de passe initial *</Label>
        <Input id="create-password" type="password" placeholder="Minimum 8 caractères"
          value={createForm.password}
          onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))} />
      </div>
      <div className="flex gap-2">
        <Button onClick={createUser} disabled={loading}>Créer le compte</Button>
        <Button variant="outline" onClick={() => { setShowCreate(false); setCreateForm({ nom: "", email: "", role: "CONSULTANT", password: "", tjm: "" }) }}>
          Annuler
        </Button>
      </div>
    </CardContent>
  </Card>
)}
```

**Step 5 : Vérifier TypeScript**
```bash
npx tsc --noEmit 2>&1 | grep -v use-local-storage | grep "admin" | head -5
```
Expected: 0 erreurs.

**Step 6 : Vérifier tests**
```bash
npm run test:run 2>&1 | grep -E "passed|failed"
```
Expected: 267 passed.

**Step 7 : Commit**
```bash
git add app/admin/users/admin-users-client.tsx
git commit -m "feat: admin/users — bouton + formulaire création utilisateur

Bouton Nouvel utilisateur, panel inline avec nom/email/rôle/TJM/password.
Appelle POST /api/admin/users {action:create} — visible immédiatement
dans /consultants après router.refresh().

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Vérification finale

```bash
npm run test:run 2>&1 | tail -3
npx tsc --noEmit 2>&1 | grep -v use-local-storage | grep "error" | wc -l
```
Les deux doivent retourner 0 erreur.
