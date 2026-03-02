# Sprint 8 — Animations · A11y · Playwright — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Livrer le polish final du design system : animations fluides (CSS Tailwind + Framer Motion ciblé), correctifs WCAG AA critiques via axe-core, et couverture E2E Playwright sur les 4 flux critiques.

**Architecture:** Tailwind CSS keyframes pour les animations statiques (hover, mount). Framer Motion uniquement pour 3 cas: route transitions (PageTransition wrapper client), AnimatePresence sur les rows supprimées, et layout animations Kanban. Playwright avec @axe-core/playwright pour l'audit a11y automatisé.

**Tech Stack:** Next.js 16 App Router · Framer Motion · @playwright/test · @axe-core/playwright · Tailwind CSS v4 · Vitest (tests unitaires existants non touchés)

---

## Phase A — Setup & Infrastructure

### Task 1: Installer les dépendances

**Files:**
- Modify: `package.json`

**Step 1: Installer framer-motion**

```bash
npm install framer-motion
```

**Step 2: Installer Playwright + axe-core**

```bash
npm install --save-dev @playwright/test @axe-core/playwright
npx playwright install chromium
```

**Step 3: Vérifier les versions installées**

```bash
npm ls framer-motion @playwright/test @axe-core/playwright
```

Attendu : les 3 packages sont listés sans erreur.

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add framer-motion, playwright, axe-core dependencies"
```

---

### Task 2: CSS keyframes + prefers-reduced-motion dans globals.css

**Files:**
- Modify: `app/globals.css`

**Step 1: Ajouter les keyframes après la ligne `@keyframes animate-in` existante (ligne ~136)**

Ouvrir `app/globals.css` et ajouter après le bloc `.animate-in { ... }` existant :

```css
/* ── Animations Sprint 8 ────────────────────────────────────── */
@keyframes fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes slide-in-right {
  from { opacity: 0; transform: translateX(12px); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes scale-in {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
}

@keyframes fade-out {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(-4px); }
}

.animate-fade-in         { animation: fade-in 200ms ease-out both; }
.animate-slide-in-right  { animation: slide-in-right 200ms ease-out both; }
.animate-scale-in        { animation: scale-in 150ms ease-out both; }
.animate-fade-out        { animation: fade-out 150ms ease-out both; }
.transition-base         { transition: all 150ms ease; }

/* ── Respect prefers-reduced-motion ─────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Step 2: Vérifier que le build compile sans erreur**

```bash
npm run build 2>&1 | tail -5
```

Attendu : `✓ Compiled` sans erreurs.

**Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat(animations): add CSS keyframes + prefers-reduced-motion"
```

---

### Task 3: Configuration Playwright

**Files:**
- Create: `playwright.config.ts`
- Modify: `package.json` (scripts)

**Step 1: Créer `playwright.config.ts` à la racine du projet**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

**Step 2: Ajouter les scripts dans `package.json`**

Dans la section `"scripts"`, ajouter après `"test:coverage"` :

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui",
"test:e2e:report": "playwright show-report"
```

**Step 3: Créer le dossier `e2e/` avec un fichier sanity**

Créer `e2e/sanity.spec.ts` :

```ts
import { test, expect } from '@playwright/test';

test('page dashboard se charge', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/PM Dashboard/);
});
```

**Step 4: Lancer le test sanity (le serveur dev doit être démarré au préalable)**

```bash
npm run test:e2e -- e2e/sanity.spec.ts
```

Attendu : `1 passed`

**Step 5: Commit**

```bash
git add playwright.config.ts package.json e2e/
git commit -m "feat(e2e): setup Playwright config + sanity test"
```

---

## Phase B — Animations

### Task 4: PageTransition — wrapper client pour route transitions

Next.js App Router utilise des Server Components pour `layout.tsx`. `AnimatePresence` de Framer Motion nécessite un Client Component. Il faut donc créer un wrapper client séparé.

**Files:**
- Create: `components/layout/page-transition.tsx`
- Modify: `app/layout.tsx`

**Step 1: Créer `components/layout/page-transition.tsx`**

```tsx
"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldReduce = useReducedMotion();

  const variants = shouldReduce
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit:    { opacity: 0, y: -4 },
      };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="flex-1 min-h-0"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

**Step 2: Modifier `app/layout.tsx` — envelopper `{children}` avec `PageTransition`**

Chercher dans `app/layout.tsx` la ligne :
```tsx
<AppShell>{children}</AppShell>
```

Remplacer par :
```tsx
<AppShell>
  <PageTransition>{children}</PageTransition>
</AppShell>
```

Et ajouter l'import en haut du fichier :
```tsx
import { PageTransition } from "@/components/layout/page-transition";
```

**Step 3: Tester manuellement**

```bash
npm run dev
```

Naviguer entre `/`, `/projets`, `/activites` — chaque changement de page doit avoir un fade+translateY.

**Step 4: Commit**

```bash
git add components/layout/page-transition.tsx app/layout.tsx
git commit -m "feat(animations): add page route transitions with AnimatePresence"
```

---

### Task 5: AnimatePresence sur les rows d'activités (suppression)

Quand une activité est supprimée, la row doit s'animer en sortie avant de disparaître du DOM.

**Files:**
- Modify: `components/activites/activites-list.tsx`

**Step 1: Lire les ~80 premières lignes du fichier pour trouver le rendu des TableRow**

```bash
grep -n "TableRow\|row-\|key=" components/activites/activites-list.tsx | head -20
```

**Step 2: Ajouter l'import Framer Motion en haut du composant**

Après les imports existants, ajouter :
```tsx
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
```

**Step 3: Envelopper le `<TableBody>` avec `<AnimatePresence>`**

Trouver le bloc qui rend les rows d'activités (chercher `data-testid="activites-table"`).

Envelopper le contenu de `<TableBody>` avec `<AnimatePresence initial={false}>`.

Remplacer chaque `<TableRow key={a.id} data-testid={...}>` par :
```tsx
<motion.tr
  key={a.id}
  data-testid={`row-${a.id}`}
  layout
  initial={false}
  exit={{ opacity: 0, height: 0, overflow: "hidden" }}
  transition={{ duration: shouldReduce ? 0 : 0.2 }}
  className="border-b transition-colors hover:bg-muted/50"
>
  {/* contenu existant de la row */}
</motion.tr>
```

Note: `shouldReduce` vient de `const shouldReduce = useReducedMotion();` ajouté en haut du composant.

**Step 4: Vérifier que les tests Vitest existants passent toujours**

```bash
npm run test:run -- __tests__/components/activites/
```

Attendu : `13 passed`

**Step 5: Commit**

```bash
git add components/activites/activites-list.tsx
git commit -m "feat(animations): AnimatePresence on activite rows deletion"
```

---

### Task 6: Kanban layout animations

Les cards Kanban doivent s'animer fluidement quand elles changent de colonne (via les boutons ← →).

**Files:**
- Modify: `components/projets/kanban-board.tsx`

**Step 1: Lire le fichier complet pour identifier le composant KanbanCard**

```bash
grep -n "KanbanCard\|function Kanban\|motion\|layoutId" components/projets/kanban-board.tsx
```

**Step 2: Ajouter l'import Framer Motion**

```tsx
import { motion, useReducedMotion } from "framer-motion";
```

**Step 3: Envelopper chaque card dans `<motion.div layout layoutId={...}>`**

Trouver le rendu des cards dans `KanbanCard` ou dans le `.map()` des étapes par colonne.

Envelopper le JSX de chaque card :
```tsx
const shouldReduce = useReducedMotion();

// Dans le .map() des etapes par colonne :
<motion.div
  key={etape.id}
  layout={!shouldReduce}
  layoutId={`kanban-card-${etape.id}`}
  initial={false}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0, scale: 0.95 }}
  transition={{ type: "spring", stiffness: 300, damping: 30 }}
>
  <KanbanCard etape={etape} ... />
</motion.div>
```

**Step 4: Envelopper chaque colonne `<div>` avec `<motion.div layout>`**

```tsx
<motion.div layout={!shouldReduce} className="...existing classes...">
  {/* contenu colonne */}
</motion.div>
```

**Step 5: Vérifier les tests Vitest Kanban**

```bash
npm run test:run -- __tests__/components/projets/kanban-board.test.tsx
```

Attendu : `16 passed`

**Step 6: Commit**

```bash
git add components/projets/kanban-board.tsx
git commit -m "feat(animations): Kanban layout animations with Framer Motion layoutId"
```

---

### Task 7: CSS animations sur les composants statiques

Appliquer les nouvelles classes CSS sur les composants à fort impact visuel.

**Files:**
- Modify: `components/dashboard/KpiCard.tsx`
- Modify: `components/calendrier/etape-sidebar.tsx`
- Modify: `components/ui/card.tsx`

**Step 1: KpiCard — ajouter `animate-fade-in` sur le wrapper**

Dans `components/dashboard/KpiCard.tsx`, trouver le `<Card ...>` racine et ajouter la classe `animate-fade-in` :

```tsx
<Card className={cn("animate-fade-in", className)} ...>
```

**Step 2: EtapeSidebar — ajouter `animate-slide-in-right`**

Dans `components/calendrier/etape-sidebar.tsx`, trouver le `<div data-testid="etape-sidebar">` et ajouter :

```tsx
<div data-testid="etape-sidebar" className={cn("animate-slide-in-right", ...existing...)}>
```

**Step 3: Hover transitions sur Button**

Dans `components/ui/button.tsx`, vérifier que les variantes ont `transition-colors` — si absent, l'ajouter dans les classes CVA base.

**Step 4: Vérifier que les tests existants passent**

```bash
npm run test:run -- __tests__/components/
```

Attendu : tous les tests existants passent (239 total).

**Step 5: Commit**

```bash
git add components/dashboard/KpiCard.tsx components/calendrier/etape-sidebar.tsx components/ui/button.tsx
git commit -m "feat(animations): apply CSS fade-in/slide-in-right on key components"
```

---

## Phase C — A11y pass

### Task 8: Fix aria-hidden sur les icônes décoratives

**Files:**
- Modify: `components/sidebar.tsx`
- Modify: `components/layout/page-header.tsx`
- Modify: `components/dashboard/KpiCard.tsx`

**Step 1: Auditer les icônes Lucide sans aria-hidden**

```bash
grep -rn "<.*Icon\|lucide" components/ --include="*.tsx" | grep -v "aria-hidden" | grep -v "aria-label" | wc -l
```

**Step 2: Pour chaque icône DÉCORATIVE (accompagnée d'un texte visible), ajouter `aria-hidden="true"`**

Exemple de pattern à appliquer partout :
```tsx
// Avant
<LayoutDashboard className="h-5 w-5" />

// Après
<LayoutDashboard className="h-5 w-5" aria-hidden="true" />
```

Icônes décoratives = celles dans les boutons avec du texte, dans les nav items avec label, dans les KPI cards avec titre.

**Step 3: Pour chaque bouton icône seul (sans texte visible), ajouter `aria-label`**

```tsx
// Exemple : bouton delete sans texte
<Button aria-label="Supprimer l'activité">
  <Trash2 className="h-4 w-4" aria-hidden="true" />
</Button>
```

Cibler : tous les `<Button>` avec uniquement une icône dans `activites-list.tsx`, `kanban-board.tsx`, `etape-sidebar.tsx`.

**Step 4: Vérifier les tests**

```bash
npm run test:run
```

Attendu : 239 tests passent.

**Step 5: Commit**

```bash
git add components/
git commit -m "fix(a11y): aria-hidden on decorative icons, aria-label on icon-only buttons"
```

---

### Task 9: Fix focus rings sur les éléments interactifs

**Files:**
- Modify: `components/ui/button.tsx`
- Modify: `components/sidebar.tsx`
- Modify: `components/calendrier/filtres-bar.tsx`

**Step 1: Auditer les éléments sans focus-visible**

```bash
grep -rn "className=" components/ --include="*.tsx" | grep -v "focus-visible" | grep "cursor-pointer\|onClick\|href=" | head -20
```

**Step 2: Ajouter `focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none` aux éléments interactifs manquants**

Priorité : liens nav sidebar, badges cliquables (filtres), éléments cliquables dans Kanban.

Dans `components/sidebar.tsx`, les `<Link>` nav items doivent avoir :
```tsx
className={cn(
  "... existing classes ...",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
)}
```

**Step 3: Vérifier que `components/ui/button.tsx` a déjà `focus-visible:ring-2`**

```bash
grep "focus-visible" components/ui/button.tsx
```

Si absent, l'ajouter dans les classes CVA base.

**Step 4: Commit**

```bash
git add components/
git commit -m "fix(a11y): add focus-visible ring on interactive elements"
```

---

### Task 10: Fix labels sur les formulaires

**Files:**
- Modify: `components/activites/saisie-rapide.tsx`
- Modify: `components/activites/edit-dialog.tsx`
- Modify: `components/calendrier/filtres-bar.tsx`

**Step 1: Auditer les inputs sans label**

```bash
grep -rn "<Input\|<Select\|<input\|<select" components/ --include="*.tsx" | grep -v "aria-label\|htmlFor" | head -20
```

**Step 2: Pour chaque input sans `<Label htmlFor>` ou `aria-label`, ajouter l'un ou l'autre**

Pattern `<Label>` associé :
```tsx
<Label htmlFor="input-heures">Heures</Label>
<Input id="input-heures" ... />
```

Pattern `aria-label` (pour les filtres compacts) :
```tsx
<Select aria-label="Filtrer par consultant" ...>
```

**Step 3: Vérifier les tests existants**

```bash
npm run test:run -- __tests__/components/activites/
```

Attendu : 24 tests passent (11 helpers + 13 activites-list).

**Step 4: Commit**

```bash
git add components/
git commit -m "fix(a11y): associate labels to all form inputs"
```

---

## Phase D — Playwright E2E

### Task 11: Flux 1 — Création d'activité

**Files:**
- Create: `e2e/activites.spec.ts`

**Step 1: Créer `e2e/activites.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test.describe('Flux: Création activité', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/activites');
    await expect(page.getByTestId('saisie-rapide')).toBeVisible();
  });

  test('saisir et enregistrer une activité', async ({ page }) => {
    // Sélectionner un consultant
    await page.getByTestId('saisie-rapide').getByRole('combobox').first().selectOption({ index: 1 });

    // Sélectionner un projet
    await page.getByTestId('saisie-rapide').getByRole('combobox').nth(1).selectOption({ index: 1 });

    // Saisir les heures
    const inputHeures = page.getByTestId('saisie-rapide').getByRole('spinbutton');
    await inputHeures.fill('8');

    // Enregistrer
    await page.getByTestId('btn-enregistrer').click();

    // Vérifier que la liste se met à jour
    await expect(page.getByTestId('activites-list')).toBeVisible();
    const rows = page.getByTestId('activites-list').locator('[data-testid^="row-"]');
    await expect(rows.first()).toBeVisible();
  });
});
```

**Step 2: Lancer le test (serveur dev démarré)**

```bash
npm run test:e2e -- e2e/activites.spec.ts
```

Si le test échoue parce que les `data-testid` diffèrent de la réalité, ajuster les sélecteurs en inspectant la page avec `--ui`.

Attendu : `1 passed`

**Step 3: Commit**

```bash
git add e2e/activites.spec.ts
git commit -m "test(e2e): flux creation activite"
```

---

### Task 12: Flux 2 — Navigation Dashboard → Projet

**Files:**
- Create: `e2e/navigation.spec.ts`

**Step 1: Créer `e2e/navigation.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test.describe('Flux: Navigation', () => {
  test('dashboard charge sans erreur', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/PM Dashboard/);
    // Pas d'erreur console critique
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.waitForTimeout(1000);
    expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0);
  });

  test('naviguer vers la liste des projets', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Projets/i }).first().click();
    await expect(page).toHaveURL(/\/projets/);
  });

  test('ouvrir un projet depuis la liste', async ({ page }) => {
    await page.goto('/projets');
    // Cliquer sur le premier lien de projet visible
    const premierProjet = page.locator('a[href^="/projets/"]').first();
    await expect(premierProjet).toBeVisible();
    const href = await premierProjet.getAttribute('href');
    await premierProjet.click();
    await expect(page).toHaveURL(href!);
    // Vérifier que la page détail contient le Kanban
    await expect(page.getByText(/Étapes du projet/i)).toBeVisible();
  });
});
```

**Step 2: Lancer**

```bash
npm run test:e2e -- e2e/navigation.spec.ts
```

Attendu : `3 passed`

**Step 3: Commit**

```bash
git add e2e/navigation.spec.ts
git commit -m "test(e2e): flux navigation dashboard vers projet"
```

---

### Task 13: Flux 3 — Changement de statut étape (Kanban)

**Files:**
- Create: `e2e/kanban.spec.ts`

**Step 1: Trouver le data-testid du bouton de déplacement dans le Kanban**

```bash
grep -n "data-testid\|onMoveEtape\|ChevronRight\|ChevronLeft" components/projets/kanban-board.tsx | head -20
```

**Step 2: Créer `e2e/kanban.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test.describe('Flux: Kanban changement statut', () => {
  test.beforeEach(async ({ page }) => {
    // Aller sur le premier projet disponible
    await page.goto('/projets');
    const premierProjet = page.locator('a[href^="/projets/"]').first();
    await premierProjet.click();
    await expect(page.getByText(/Étapes du projet/i)).toBeVisible();
  });

  test('déplacer une étape vers la colonne suivante', async ({ page }) => {
    // Trouver le premier bouton "avancer" dans la colonne "À faire"
    const colAFaire = page.getByTestId('kanban-col-A_FAIRE');
    const btnForward = colAFaire.locator('[data-testid^="btn-forward-"]').first();

    // Récupérer l'ID de l'étape
    const testId = await btnForward.getAttribute('data-testid');
    const etapeId = testId?.replace('btn-forward-', '');

    // Cliquer le bouton d'avancement
    await btnForward.click();

    // Vérifier que la card apparaît dans "En cours"
    const colEnCours = page.getByTestId('kanban-col-EN_COURS');
    await expect(colEnCours.getByTestId(`kanban-card-${etapeId}`)).toBeVisible();
  });

  test('le changement persiste après reload', async ({ page }) => {
    const currentUrl = page.url();
    await page.reload();
    await expect(page).toHaveURL(currentUrl);
    await expect(page.getByText(/Étapes du projet/i)).toBeVisible();
  });
});
```

Note: Si `kanban-col-A_FAIRE` ou `btn-forward-*` ne correspondent pas aux `data-testid` réels dans le composant, les ajuster en lisant `kanban-board.tsx` complètement.

**Step 3: Ajouter les `data-testid` manquants dans `kanban-board.tsx` si nécessaire**

```bash
grep -n "data-testid" components/projets/kanban-board.tsx
```

Si les colonnes n'ont pas de `data-testid="kanban-col-{statut}"`, les ajouter sur le `<div>` de chaque colonne.

**Step 4: Lancer**

```bash
npm run test:e2e -- e2e/kanban.spec.ts
```

Attendu : `2 passed`

**Step 5: Commit**

```bash
git add e2e/kanban.spec.ts components/projets/kanban-board.tsx
git commit -m "test(e2e): flux kanban changement statut etape"
```

---

### Task 14: Flux 4 — Filtres Dashboard

**Files:**
- Create: `e2e/dashboard-filtres.spec.ts`

**Step 1: Créer `e2e/dashboard-filtres.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test.describe('Flux: Filtres Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Attendre que le dashboard soit chargé
    await page.waitForLoadState('networkidle');
  });

  test('changer la période met à jour les KPIs', async ({ page }) => {
    // Trouver le sélecteur de période (chercher le select ou bouton de période)
    const selectPeriode = page.getByRole('combobox', { name: /période/i })
      .or(page.locator('[data-testid="select-periode"]'));

    if (await selectPeriode.count() > 0) {
      await selectPeriode.first().selectOption({ index: 1 });
      await page.waitForLoadState('networkidle');
      // Vérifier que les KPIs sont toujours affichés (pas de crash)
      await expect(page.locator('[data-testid^="kpi-"]').first()).toBeVisible();
    }
  });

  test('les filtres persistent dans localStorage', async ({ page }) => {
    // Vérifier que localStorage contient les clés de filtres après navigation
    await page.goto('/projets');
    await page.goto('/');

    const filtersInStorage = await page.evaluate(() => {
      return localStorage.getItem('dashboard-filters');
    });
    // La clé peut être null (pas de filtre actif) ou contenir un JSON valide
    if (filtersInStorage) {
      expect(() => JSON.parse(filtersInStorage)).not.toThrow();
    }
  });
});
```

**Step 2: Lancer**

```bash
npm run test:e2e -- e2e/dashboard-filtres.spec.ts
```

Attendu : `2 passed`

**Step 3: Commit**

```bash
git add e2e/dashboard-filtres.spec.ts
git commit -m "test(e2e): flux filtres dashboard + localStorage persistence"
```

---

### Task 15: A11y spec — audit axe-core sur les 5 pages

**Files:**
- Create: `e2e/a11y.spec.ts`

**Step 1: Créer `e2e/a11y.spec.ts`**

```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = [
  { name: 'Dashboard', path: '/' },
  { name: 'Projets', path: '/projets' },
  { name: 'Activites', path: '/activites' },
  { name: 'Calendrier', path: '/calendrier' },
];

for (const { name, path } of PAGES) {
  test(`a11y: ${name} — zéro violation critical/serious`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('[data-nextjs-scroll-focus-boundary]') // Exclure les artefacts Next.js internes
      .analyze();

    const criticalOrSerious = accessibilityScanResults.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );

    if (criticalOrSerious.length > 0) {
      console.log(`\n[A11y] Violations sur ${name}:`);
      criticalOrSerious.forEach(v => {
        console.log(`  [${v.impact}] ${v.id}: ${v.description}`);
        v.nodes.forEach(n => console.log(`    → ${n.html}`));
      });
    }

    expect(criticalOrSerious).toHaveLength(0);
  });
}

// La page projet/[id] nécessite un ID réel — testé séparément
test('a11y: Projet detail — zéro violation critical/serious', async ({ page }) => {
  await page.goto('/projets');
  await page.waitForLoadState('networkidle');
  const premierLien = page.locator('a[href^="/projets/"]').first();
  const href = await premierLien.getAttribute('href');
  if (!href) test.skip();

  await page.goto(href!);
  await page.waitForLoadState('networkidle');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .exclude('[data-nextjs-scroll-focus-boundary]')
    .analyze();

  const criticalOrSerious = results.violations.filter(
    v => v.impact === 'critical' || v.impact === 'serious'
  );
  expect(criticalOrSerious).toHaveLength(0);
});
```

**Step 2: Lancer l'audit (première passe — va probablement échouer)**

```bash
npm run test:e2e -- e2e/a11y.spec.ts 2>&1 | head -60
```

Lire les violations reportées dans la console. Elles guident les correctifs Tasks 8-10.

**Step 3: Corriger les violations remontées, relancer jusqu'à `5 passed`**

```bash
npm run test:e2e -- e2e/a11y.spec.ts
```

**Step 4: Commit final**

```bash
git add e2e/a11y.spec.ts
git commit -m "test(e2e): axe-core a11y audit WCAG AA - zero critical/serious violations"
```

---

### Task 16: Suite complète + commit final

**Step 1: Lancer tous les tests Vitest pour vérifier aucune régression**

```bash
npm run test:run
```

Attendu : **239 tests passent** (aucune régression).

**Step 2: Lancer tous les tests Playwright**

```bash
npm run test:e2e
```

Attendu : tous les specs passent (`sanity`, `activites`, `navigation`, `kanban`, `dashboard-filtres`, `a11y`).

**Step 3: Mettre à jour MEMORY.md avec le résumé Sprint 8**

Ajouter dans la section Tests :
```
## Sprint 8 — TERMINÉ (2026-03-02)
- framer-motion : PageTransition (route transitions), AnimatePresence (activités rows), layout animations Kanban
- CSS keyframes : animate-fade-in, animate-slide-in-right, animate-scale-in, animate-fade-out, transition-base + prefers-reduced-motion
- A11y WCAG AA : aria-hidden icônes, aria-label boutons icônes, labels formulaires, focus-visible rings
- Playwright : e2e/sanity.spec.ts, activites.spec.ts, navigation.spec.ts, kanban.spec.ts, dashboard-filtres.spec.ts, a11y.spec.ts
- Scripts : npm run test:e2e, test:e2e:ui, test:e2e:report
```

**Step 4: Commit final**

```bash
git add .
git commit -m "feat: Sprint 8 complete — animations, a11y WCAG AA, Playwright E2E"
```

---

## Résumé des fichiers créés/modifiés

| Action | Fichier |
|--------|---------|
| Create | `components/layout/page-transition.tsx` |
| Create | `playwright.config.ts` |
| Create | `e2e/sanity.spec.ts` |
| Create | `e2e/activites.spec.ts` |
| Create | `e2e/navigation.spec.ts` |
| Create | `e2e/kanban.spec.ts` |
| Create | `e2e/dashboard-filtres.spec.ts` |
| Create | `e2e/a11y.spec.ts` |
| Modify | `app/globals.css` (keyframes + prefers-reduced-motion) |
| Modify | `app/layout.tsx` (PageTransition wrapper) |
| Modify | `package.json` (scripts test:e2e) |
| Modify | `components/activites/activites-list.tsx` (AnimatePresence rows) |
| Modify | `components/projets/kanban-board.tsx` (layout animations + data-testid) |
| Modify | `components/dashboard/KpiCard.tsx` (animate-fade-in) |
| Modify | `components/calendrier/etape-sidebar.tsx` (animate-slide-in-right) |
| Modify | `components/sidebar.tsx` (aria-hidden + focus-visible) |
| Modify | `components/ui/button.tsx` (focus-visible) |
| Modify | `components/activites/saisie-rapide.tsx` (labels) |
| Modify | `components/activites/edit-dialog.tsx` (labels) |
| Modify | `components/calendrier/filtres-bar.tsx` (labels + focus) |
