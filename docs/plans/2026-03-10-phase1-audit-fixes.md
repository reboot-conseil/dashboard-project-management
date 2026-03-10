# Phase 1 Audit Fixes — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Corriger les 2 écarts MAJEURS identifiés lors de l'audit UX v2 — bande personnelle PM + onglet Activités projet enrichi.

**Architecture:**
- Tâche 1 : ajout d'un bloc stateless dans `DashboardOperationnel` — lit `data.consultants` déjà chargé + 1 fetch TJM au mount. Aucune nouvelle route API.
- Tâche 2 : enrichissement de l'onglet Activités existant dans `ProjectDetailPane` (`app/projets/page.tsx`) — CTA dialog SaisieRapide, footer total heures, colonne Facturable, suppression limite 20 items.

**Tech Stack:** Next.js 16, React 19, TypeScript, next-auth v5 (useSession), TailwindCSS, Sonner

---

## Task 1 : Bande personnelle PM dans DashboardOperationnel

**Files:**
- Modify: `components/dashboard/DashboardOperationnel.tsx`

### Contexte clé
- `session.user.id` = consultantId du PM connecté (string)
- `data.consultants[]` contient déjà `{ id, heuresPeriode, tauxOccupation }` pour chaque consultant
- TJM non disponible dans data → 1 fetch `GET /api/consultants/{id}` au mount
- Formule CA : `(heuresPeriode / 8) × tjm`
- N'afficher que si `session.user.role === "PM"`

### Step 1 : Écrire le test
Dans `__tests__/DashboardOperationnel.test.tsx` (ou créer si absent) :

```typescript
it("affiche la bande personnelle PM quand role=PM", async () => {
  // mock useSession → { user: { id: "3", role: "PM" } }
  // mock fetch /api/consultants/3 → { tjm: 600 }
  // mock data.consultants → [{ id: 3, heuresPeriode: 40, tauxOccupation: 70 }]
  // vérifier que "Mes heures" et "Mon CA" sont rendus
  expect(screen.getByText(/Mes heures/)).toBeInTheDocument();
  expect(screen.getByText(/Mon CA/)).toBeInTheDocument();
});

it("n'affiche pas la bande PM quand role=CONSULTANT", async () => {
  // mock useSession → { user: { id: "3", role: "CONSULTANT" } }
  expect(screen.queryByText(/Mes heures/)).not.toBeInTheDocument();
});
```

### Step 2 : Vérifier que le test échoue
```bash
npm run test:run -- --reporter=verbose 2>&1 | grep -A3 "bande"
```
Expected: FAIL

### Step 3 : Implémenter

Dans `components/dashboard/DashboardOperationnel.tsx` :

**a) Ajouter imports en haut du fichier :**
```typescript
import { useSession } from "next-auth/react";
```

**b) Dans le composant, après les useState existants (~ligne 96), ajouter :**
```typescript
const { data: session } = useSession();
const isPM = session?.user?.role === "PM";
const pmConsultantId = session?.user?.id ? parseInt(session.user.id) : null;
const [pmTjm, setPmTjm] = useState<number>(0);

useEffect(() => {
  if (!isPM || !pmConsultantId) return;
  fetch(`/api/consultants/${pmConsultantId}`)
    .then((r) => r.json())
    .then((c) => setPmTjm(c.tjm ?? 0))
    .catch(() => {});
}, [isPM, pmConsultantId]);
```

**c) Dans le return JSX, AVANT le bloc `{/* Filter bar */}` (~ligne 158), ajouter :**
```tsx
{/* ── Bande personnelle PM ── */}
{isPM && pmConsultantId && data && (() => {
  const me = data.consultants.find((c) => c.id === pmConsultantId);
  if (!me) return null;
  const mesHeures = me.heuresPeriode ?? 0;
  const monCA = Math.round((mesHeures / 8) * pmTjm);
  const occupation = me.tauxOccupation ?? 0;
  const mesProjets = data.projetsActifs?.filter((p) =>
    p.consultants?.some((c: { id: number }) => c.id === pmConsultantId)
  ).length ?? "—";
  return (
    <div className="flex items-center gap-4 px-4 py-2.5 rounded-xl bg-[var(--color-surface-raised)] border border-border text-[12.5px]">
      <span className="font-semibold text-muted-foreground shrink-0">Moi ce mois</span>
      <div className="flex items-center gap-4 flex-wrap">
        <span><span className="text-muted-foreground">Heures :</span> <span className="font-bold text-foreground">{mesHeures}h</span></span>
        <span><span className="text-muted-foreground">CA :</span> <span className="font-bold text-foreground">{pmTjm > 0 ? formatCA(monCA) : "—"}</span></span>
        <span><span className="text-muted-foreground">Occupation :</span> <span className="font-bold text-foreground">{occupation.toFixed(0)}%</span></span>
        <span><span className="text-muted-foreground">Projets :</span> <span className="font-bold text-foreground">{mesProjets}</span></span>
      </div>
    </div>
  );
})()}
```

### Step 4 : Vérifier que le test passe
```bash
npm run test:run -- --reporter=verbose 2>&1 | grep -A3 "bande\|PM"
```
Expected: PASS

### Step 5 : Vérifier TypeScript
```bash
npx tsc --noEmit 2>&1 | grep -v use-local-storage | grep -i "operationnel\|error" | head -20
```
Expected: aucune erreur sur ce fichier

### Step 6 : Commit
```bash
git add components/dashboard/DashboardOperationnel.tsx
git commit -m "feat: bande personnelle PM dans DashboardOperationnel

Affiche Heures · CA · Occupation · Projets du PM connecté
en haut du dashboard opérationnel (role PM uniquement).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2 : Enrichir l'onglet Activités du ProjectDetailPane

**Files:**
- Modify: `app/projets/page.tsx` (section `{tab === "activites"}`, lignes ~750-774)

### Contexte clé
- L'onglet existe déjà avec une liste basique (limite 20, pas de CTA, pas de total)
- `data.activites` est déjà chargé via `/api/projets/{id}` (inclut `facturable` ?)
- Vérifier si `facturable` est dans l'interface `activites` — si non, ajouter au type et au fetch
- `SaisieRapide` est dans `components/activites/saisie-rapide.tsx`

### Step 1 : Vérifier que `facturable` est disponible

```bash
grep -n "facturable" app/projets/page.tsx | head -10
grep -n "facturable\|activites" app/api/projets/\[id\]/route.ts | head -20
```

Si absent de l'interface `activites` dans page.tsx → ajouter `facturable?: boolean` au type et mapper depuis la réponse API.

### Step 2 : Écrire le test
Dans `__tests__/projets.test.tsx` (ou créer) :
```typescript
it("onglet Activités affiche total heures et CTA saisie", async () => {
  // render ProjectDetailPane avec data.activites = [{ heures: 4 }, { heures: 3 }]
  // cliquer sur onglet "Activités"
  expect(screen.getByText("7h")).toBeInTheDocument(); // total
  expect(screen.getByRole("button", { name: /saisir une activité/i })).toBeInTheDocument();
});
```

### Step 3 : Vérifier que le test échoue
```bash
npm run test:run -- --reporter=verbose 2>&1 | grep -A3 "Activités\|activites"
```
Expected: FAIL

### Step 4 : Implémenter

Remplacer le bloc `{tab === "activites" && (...)}` (~lignes 750-774) par :

```tsx
{/* ── Activités ── */}
{tab === "activites" && (
  <div className="p-5 flex flex-col gap-4">
    {/* CTA */}
    <button
      onClick={() => setShowSaisie(true)}
      className="flex items-center gap-2 self-start px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-semibold hover:bg-primary/90 transition-colors"
    >
      <Plus className="h-3.5 w-3.5" />
      Saisir une activité
    </button>

    {data.activites.length === 0 ? (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Aucune activité saisie sur ce projet
      </p>
    ) : (
      <>
        {/* Table */}
        <div className="space-y-0 divide-y divide-border/50">
          {data.activites.map((a) => (
            <div key={a.id} className="flex items-center gap-2.5 py-2.5">
              <div className="text-[11px] text-muted-foreground w-14 shrink-0">
                {format(new Date(a.date), "dd/MM", { locale: fr })}
              </div>
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                style={{ background: a.consultant.couleur }}
              >
                {a.consultant.nom.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <span className="flex-1 text-[12.5px] text-foreground truncate">
                {a.description ?? a.etape?.nom ?? "—"}
              </span>
              {a.facturable === false && (
                <span className="text-[10px] text-muted-foreground shrink-0">NF</span>
              )}
              <span className="text-[13px] font-bold text-foreground shrink-0">{a.heures}h</span>
            </div>
          ))}
        </div>

        {/* Footer total */}
        <div className="flex justify-between items-center pt-2 border-t border-border text-[12.5px]">
          <span className="text-muted-foreground">{data.activites.length} saisies</span>
          <span className="font-bold text-foreground">
            {data.activites.reduce((s, a) => s + a.heures, 0)}h total
          </span>
        </div>
      </>
    )}
  </div>
)}
```

**Ajouter state + dialog SaisieRapide** dans le composant `ProjectDetailPane` :

```tsx
// Après les useState existants :
const [showSaisie, setShowSaisie] = useState(false);

// Dans le JSX return, avant la fermeture de </div> :
{showSaisie && (
  <SaisieRapide
    open={showSaisie}
    onClose={() => setShowSaisie(false)}
    preselectedProjetId={data.projet.id}
    onSuccess={() => {
      setShowSaisie(false);
      // re-fetch activites — recharger le projectId
    }}
  />
)}
```

**Ajouter `facturable` au type et au mapping** (si absent) :
```typescript
// Dans l'interface activites[] du type DetailData :
facturable?: boolean;

// Dans le mapping des activites (~ligne 585) :
facturable: a.facturable as boolean | undefined,
```

**Ajouter import SaisieRapide** en haut du fichier :
```typescript
import { SaisieRapide } from "@/components/activites/saisie-rapide";
```

### Step 5 : Vérifier que le test passe
```bash
npm run test:run -- --reporter=verbose 2>&1 | grep -A3 "Activités\|activites"
```
Expected: PASS

### Step 6 : Vérifier TypeScript
```bash
npx tsc --noEmit 2>&1 | grep -v use-local-storage | grep -i "projets\|error" | head -20
```
Expected: aucune erreur sur ce fichier

### Step 7 : Vérifier que les 239 tests passent toujours
```bash
npm run test:run 2>&1 | tail -5
```
Expected: all tests pass (ou count stable)

### Step 8 : Commit
```bash
git add app/projets/page.tsx
git commit -m "feat: enrichir onglet Activités ProjectDetailPane

- CTA Saisir une activité (dialog SaisieRapide pré-sélectionné)
- Footer total heures
- Indicateur NF (non facturable)
- Suppression limite 20 items

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Vérification finale

```bash
npm run test:run 2>&1 | tail -3
npx tsc --noEmit 2>&1 | grep -v use-local-storage | grep "error" | wc -l
```

Les deux doivent retourner 0 erreur.
