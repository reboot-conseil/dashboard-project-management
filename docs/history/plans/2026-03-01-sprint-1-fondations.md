# Sprint 1 — Fondations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Poser les fondations du design system (tokens CSS light/dark, Inter, dark mode toggle) et mettre en place Vitest avec des tests couvrant la logique financière critique.

**Architecture:** Token-First — on établit le design system dans `globals.css` avant de toucher aux composants. Les tests couvrent `lib/financial.ts` (nouveau) et `lib/projet-metrics.ts` (existant). Le dark mode utilise la classe `.dark` sur `<html>`, persistée en localStorage.

**Tech Stack:** Next.js 16 App Router · Tailwind v4 CSS-first · Vitest · @testing-library/react · next/font/google (Inter)

---

## Task 1: Installer Vitest et configurer l'environnement de tests

**Files:**
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Modify: `package.json`

**Step 1: Installer les dépendances**

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

Expected output: packages ajoutés dans `node_modules/`, `package-lock.json` mis à jour.

**Step 2: Créer `vitest.config.ts` à la racine**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

**Step 3: Créer `vitest.setup.ts` à la racine**

```ts
import '@testing-library/jest-dom'
```

**Step 4: Mettre à jour les scripts dans `package.json`**

Ajouter dans `"scripts"` :
```json
"test": "vitest",
"test:run": "vitest run",
"test:coverage": "vitest run --coverage"
```

**Step 5: Créer un test de sanité pour vérifier que Vitest fonctionne**

Créer `__tests__/sanity.test.ts` :
```ts
import { describe, it, expect } from 'vitest'

describe('sanity', () => {
  it('vitest fonctionne', () => {
    expect(1 + 1).toBe(2)
  })
})
```

**Step 6: Lancer le test de sanité**

```bash
npm run test:run
```

Expected: `1 passed` — si échec, vérifier que `vitest.config.ts` est bien à la racine et que `@vitejs/plugin-react` est installé.

**Step 7: Commit**

```bash
git add vitest.config.ts vitest.setup.ts __tests__/sanity.test.ts package.json package-lock.json
git commit -m "chore: setup Vitest with jsdom and React Testing Library"
```

---

## Task 2: Créer `lib/financial.ts` en TDD

**Files:**
- Create: `__tests__/lib/financial.test.ts`
- Create: `lib/financial.ts`

**Step 1: Créer `__tests__/lib/` et écrire les tests en premier**

Créer `__tests__/lib/financial.test.ts` :
```ts
import { describe, it, expect } from 'vitest'
import { CA, cout, marge, margePct, margeLabel } from '@/lib/financial'

describe('CA', () => {
  it('calcule le CA pour une journée complète (8h) à TJM 500', () => {
    expect(CA(8, 500)).toBe(500)
  })
  it('calcule le CA pour une demi-journée (4h) à TJM 500', () => {
    expect(CA(4, 500)).toBe(250)
  })
  it('calcule le CA pour 1h à TJM 800', () => {
    expect(CA(1, 800)).toBe(100)
  })
  it('retourne 0 si heures = 0', () => {
    expect(CA(0, 500)).toBe(0)
  })
  it('retourne 0 si TJM = 0', () => {
    expect(CA(8, 0)).toBe(0)
  })
  it('fonctionne avec des heures fractionnaires', () => {
    expect(CA(2.5, 400)).toBeCloseTo(125)
  })
})

describe('cout', () => {
  it('calcule le coût pour une journée complète à 350€/jour', () => {
    expect(cout(8, 350)).toBe(350)
  })
  it('calcule le coût pour une demi-journée', () => {
    expect(cout(4, 350)).toBe(175)
  })
  it('retourne 0 si heures = 0', () => {
    expect(cout(0, 350)).toBe(0)
  })
})

describe('marge', () => {
  it('calcule la marge (CA - coût)', () => {
    expect(marge(500, 350)).toBe(150)
  })
  it('retourne une marge négative si coût > CA', () => {
    expect(marge(300, 350)).toBe(-50)
  })
  it('retourne 0 si CA = coût', () => {
    expect(marge(500, 500)).toBe(0)
  })
})

describe('margePct', () => {
  it('calcule 40% de marge sur CA=500 coût=300', () => {
    expect(margePct(500, 300)).toBe(40)
  })
  it('retourne 0 si CA = 0 (pas de division par zéro)', () => {
    expect(margePct(0, 0)).toBe(0)
  })
  it('retourne une valeur négative si coût > CA', () => {
    expect(margePct(300, 350)).toBeCloseTo(-16.67, 1)
  })
  it('retourne 0% si CA = coût', () => {
    expect(margePct(500, 500)).toBe(0)
  })
  it('retourne 100% si coût = 0', () => {
    expect(margePct(500, 0)).toBe(100)
  })
})

describe('margeLabel', () => {
  it('retourne "bon" pour 40% exactement (seuil inclus)', () => {
    expect(margeLabel(40)).toBe('bon')
  })
  it('retourne "bon" pour 50%', () => {
    expect(margeLabel(50)).toBe('bon')
  })
  it('retourne "moyen" pour 30% exactement (seuil inclus)', () => {
    expect(margeLabel(30)).toBe('moyen')
  })
  it('retourne "moyen" pour 39%', () => {
    expect(margeLabel(39)).toBe('moyen')
  })
  it('retourne "faible" pour 29%', () => {
    expect(margeLabel(29)).toBe('faible')
  })
  it('retourne "faible" pour 0%', () => {
    expect(margeLabel(0)).toBe('faible')
  })
  it('retourne "faible" pour une marge négative', () => {
    expect(margeLabel(-5)).toBe('faible')
  })
})
```

**Step 2: Lancer les tests pour vérifier qu'ils échouent**

```bash
npm run test:run -- __tests__/lib/financial.test.ts
```

Expected: `Cannot find module '@/lib/financial'` — c'est le comportement attendu en TDD.

**Step 3: Créer `lib/financial.ts`**

```ts
/**
 * Formules financières centralisées.
 * Règle universelle : 1 jour = 8 heures.
 */

export const CA = (heures: number, tjm: number): number =>
  (heures / 8) * tjm

export const cout = (heures: number, coutJour: number): number =>
  (heures / 8) * coutJour

export const marge = (ca: number, coutVal: number): number =>
  ca - coutVal

export const margePct = (ca: number, coutVal: number): number =>
  ca > 0 ? ((ca - coutVal) / ca) * 100 : 0

export const margeLabel = (pct: number): 'bon' | 'moyen' | 'faible' =>
  pct >= 40 ? 'bon' : pct >= 30 ? 'moyen' : 'faible'
```

**Step 4: Lancer les tests pour vérifier qu'ils passent**

```bash
npm run test:run -- __tests__/lib/financial.test.ts
```

Expected: `17 passed` — tous les tests verts.

**Step 5: Commit**

```bash
git add lib/financial.ts __tests__/lib/financial.test.ts
git commit -m "feat: add lib/financial.ts with centralized CA/coût/marge formulas (TDD)"
```

---

## Task 3: Tests pour `lib/projet-metrics.ts` (existant)

**Files:**
- Create: `__tests__/lib/projet-metrics.test.ts`

**Step 1: Écrire les tests**

Créer `__tests__/lib/projet-metrics.test.ts` :
```ts
import { describe, it, expect } from 'vitest'
import { calculerProgression } from '@/lib/projet-metrics'

const projetBase = {
  dateDebut: '2026-01-01',
  dateFin: '2026-06-30',
  chargeEstimeeTotale: 20,
}

describe('calculerProgression — sans données', () => {
  it('retourne 0% budget consommé sans activités', () => {
    const result = calculerProgression(projetBase, [], [])
    expect(result.budgetConsommePct).toBe(0)
  })
  it('retourne 0% réalisation sans étapes', () => {
    const result = calculerProgression(projetBase, [], [])
    expect(result.realisationPct).toBe(0)
  })
  it('health est "normal" sans données', () => {
    const result = calculerProgression(projetBase, [], [])
    expect(result.health).toBe('normal')
  })
  it('ne plante pas si etapes est null', () => {
    expect(() => calculerProgression(projetBase, null as any, [])).not.toThrow()
  })
  it('ne plante pas si activites est null', () => {
    expect(() => calculerProgression(projetBase, [], null as any)).not.toThrow()
  })
})

describe('calculerProgression — méthode par charges', () => {
  const etapes = [
    { id: 1, nom: 'Phase 1', statut: 'VALIDEE' as const, chargeEstimeeJours: 10 },
    { id: 2, nom: 'Phase 2', statut: 'A_FAIRE' as const, chargeEstimeeJours: 10 },
  ]

  it('utilise la méthode "charges" quand les étapes ont des estimations', () => {
    const result = calculerProgression(projetBase, etapes, [])
    expect(result.methodeRealisation).toBe('charges')
  })
  it('calcule 50% réalisation si 1 étape sur 2 validée (poids égal)', () => {
    const result = calculerProgression(projetBase, etapes, [])
    expect(result.realisationPct).toBe(50)
  })
  it('calcule 100% si toutes les étapes sont validées', () => {
    const toutesValidees = etapes.map(e => ({ ...e, statut: 'VALIDEE' as const }))
    const result = calculerProgression(projetBase, toutesValidees, [])
    expect(result.realisationPct).toBe(100)
  })
})

describe('calculerProgression — méthode par nombre d\'étapes', () => {
  const etapesSansCharge = [
    { id: 1, nom: 'Phase 1', statut: 'VALIDEE' as const, chargeEstimeeJours: null },
    { id: 2, nom: 'Phase 2', statut: 'A_FAIRE' as const, chargeEstimeeJours: null },
  ]

  it('utilise la méthode "etapes" quand aucune étape n\'a d\'estimation', () => {
    const result = calculerProgression(projetBase, etapesSansCharge, [])
    expect(result.methodeRealisation).toBe('etapes')
  })
  it('calcule 50% si 1 étape sur 2 validée', () => {
    const result = calculerProgression(projetBase, etapesSansCharge, [])
    expect(result.realisationPct).toBe(50)
  })
})

describe('calculerProgression — budget consommé', () => {
  it('calcule le budget consommé en fonction des heures saisies', () => {
    const projet = { dateDebut: '2026-01-01', dateFin: '2026-06-30', chargeEstimeeTotale: 10 }
    const activites = [
      { heures: 40, date: '2026-01-10', etapeId: null }, // 40h / 8 = 5 jours sur 10 = 50%
    ]
    const result = calculerProgression(projet, [], activites)
    expect(result.budgetConsommePct).toBe(50)
  })
  it('retourne 0% si chargeEstimeeTotale = 0', () => {
    const projet = { dateDebut: '2026-01-01', dateFin: '2026-06-30', chargeEstimeeTotale: 0 }
    const activites = [{ heures: 8, date: '2026-01-10', etapeId: null }]
    const result = calculerProgression(projet, [], activites)
    expect(result.budgetConsommePct).toBe(0)
  })
})

describe('calculerProgression — health score', () => {
  it('health est "bon" si réalisation > budget consommé', () => {
    const etapes = [
      { id: 1, nom: 'Phase 1', statut: 'VALIDEE' as const, chargeEstimeeJours: 10 },
    ]
    const activites = [
      { heures: 8, date: '2026-01-10', etapeId: 1 }, // 1 jour sur 10 = 10% budget
    ]
    // réalisation = 100% (validée), budget = 10% → écart = +90 → "bon"
    const result = calculerProgression(projetBase, etapes, activites)
    expect(result.health).toBe('bon')
    expect(result.ecart).toBeGreaterThan(0)
  })

  it('health est "critique" si écart < -10%', () => {
    const projet = { dateDebut: '2026-01-01', dateFin: '2026-06-30', chargeEstimeeTotale: 10 }
    const etapes = [
      { id: 1, nom: 'Phase 1', statut: 'A_FAIRE' as const, chargeEstimeeJours: 10 },
    ]
    const activites = [
      { heures: 200, date: '2026-01-15', etapeId: null }, // 25 jours sur 10 = 250% budget
    ]
    const result = calculerProgression(projet, etapes, activites)
    expect(result.health).toBe('critique')
  })
})

describe('calculerProgression — alertes', () => {
  it('génère une alerte critique si budget > 90% et réalisation < 70%', () => {
    const projet = { dateDebut: '2026-01-01', dateFin: '2026-06-30', chargeEstimeeTotale: 10 }
    const etapes = [
      { id: 1, nom: 'Phase 1', statut: 'A_FAIRE' as const, chargeEstimeeJours: null },
      { id: 2, nom: 'Phase 2', statut: 'A_FAIRE' as const, chargeEstimeeJours: null },
      { id: 3, nom: 'Phase 3', statut: 'A_FAIRE' as const, chargeEstimeeJours: null },
    ]
    const activites = [
      { heures: 76, date: '2026-01-15', etapeId: null }, // 9.5 jours sur 10 = 95%
    ]
    const result = calculerProgression(projet, etapes, activites)
    const alertesCritiques = result.alertes.filter(a => a.type === 'critique')
    expect(alertesCritiques.length).toBeGreaterThan(0)
  })
  it('ne génère pas d\'alerte si le projet est on-track', () => {
    const etapes = [
      { id: 1, nom: 'Phase 1', statut: 'VALIDEE' as const, chargeEstimeeJours: 10 },
    ]
    const activites = [
      { heures: 16, date: '2026-01-10', etapeId: 1 }, // 2j sur 10 = 20% budget
    ]
    const result = calculerProgression(projetBase, etapes, activites)
    expect(result.alertes).toHaveLength(0)
  })
})
```

**Step 2: Lancer les tests**

```bash
npm run test:run -- __tests__/lib/projet-metrics.test.ts
```

Expected: tous les tests passent (la fonction `calculerProgression` existe déjà). Si un test échoue, lire le message d'erreur et ajuster l'assertion — les comportements limites peuvent différer légèrement.

**Step 3: Commit**

```bash
git add __tests__/lib/projet-metrics.test.ts
git commit -m "test: add comprehensive tests for calculerProgression"
```

---

## Task 4: Mettre à jour `globals.css` avec les nouveaux tokens

**Files:**
- Modify: `app/globals.css`

**Step 1: Remplacer le contenu de `app/globals.css`**

```css
@import "tailwindcss";

/* ── Dark mode variant (Tailwind v4) ─────────────────────────── */
@variant dark (&:where(.dark, .dark *));

@theme {
  /* Surfaces */
  --color-background:     #f8fafc;
  --color-surface:        #ffffff;
  --color-surface-raised: #f1f5f9;

  /* Brand */
  --color-primary:        #2563eb;
  --color-primary-hover:  #1d4ed8;
  --color-accent:         #7c3aed;

  /* Sémantique */
  --color-success:        #16a34a;
  --color-warning:        #ea580c;
  --color-destructive:    #dc2626;
  --color-info:           #0891b2;

  /* Foregrounds sémantiques */
  --color-primary-foreground:     #ffffff;
  --color-accent-foreground:      #ffffff;
  --color-success-foreground:     #ffffff;
  --color-warning-foreground:     #ffffff;
  --color-destructive-foreground: #ffffff;

  /* Text */
  --color-foreground:       #0f172a;
  --color-muted-foreground: #64748b;
  --color-card-foreground:  #0f172a;
  --color-secondary-foreground: #0f172a;

  /* Surfaces (compat aliases) */
  --color-card:      #ffffff;
  --color-muted:     #f1f5f9;
  --color-secondary: #f1f5f9;

  /* Borders */
  --color-border: #e2e8f0;
  --color-ring:   #2563eb;

  /* Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.07);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.08);

  /* Consultant palette (inchangée) */
  --color-consultant-1-bg:   #dbeafe;
  --color-consultant-1-text: #1e40af;
  --color-consultant-2-bg:   #d1fae5;
  --color-consultant-2-text: #065f46;
  --color-consultant-3-bg:   #fed7aa;
  --color-consultant-3-text: #9a3412;
  --color-consultant-4-bg:   #e9d5ff;
  --color-consultant-4-text: #6b21a8;
  --color-consultant-5-bg:   #fecdd3;
  --color-consultant-5-text: #9f1239;
  --color-consultant-6-bg:   #fef3c7;
  --color-consultant-6-text: #92400e;

  /* Projet palette (inchangée) */
  --color-projet-1: #bfdbfe;
  --color-projet-2: #bbf7d0;
  --color-projet-3: #fecaca;
  --color-projet-4: #fde68a;
  --color-projet-5: #ddd6fe;
}

/* ── Dark mode overrides ──────────────────────────────────────── */
.dark {
  --color-background:     #09090b;
  --color-surface:        #18181b;
  --color-surface-raised: #27272a;
  --color-card:           #18181b;
  --color-muted:          #27272a;
  --color-secondary:      #27272a;

  --color-foreground:           #fafafa;
  --color-card-foreground:      #fafafa;
  --color-muted-foreground:     #a1a1aa;
  --color-secondary-foreground: #fafafa;

  --color-border: #27272a;
  --color-ring:   #3b82f6;
}

/* ── Glassmorphism utility ────────────────────────────────────── */
.glass {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.9);
}

.dark .glass {
  background: rgba(24, 24, 27, 0.7);
  border-color: rgba(63, 63, 70, 0.8);
}

/* ── Base ─────────────────────────────────────────────────────── */
body {
  background-color: var(--color-background);
  color: var(--color-foreground);
  font-family: var(--font-sans, system-ui, -apple-system, sans-serif);
}

html {
  scroll-behavior: smooth;
}

/* ── Scrollbar ────────────────────────────────────────────────── */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover { background: var(--color-muted-foreground); }

.scrollbar-none {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.scrollbar-none::-webkit-scrollbar { display: none; }

/* ── Animations ───────────────────────────────────────────────── */
@keyframes animate-in {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}
.animate-in {
  animation: animate-in 0.15s ease-out;
}
```

**Step 2: Lancer le serveur de dev et vérifier visuellement**

```bash
npm run dev
```

Ouvrir http://localhost:3000 et vérifier que l'interface a le même aspect qu'avant (les tokens sont rétrocompatibles).

**Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: update design tokens with full light/dark theme support and glass utility"
```

---

## Task 5: Ajouter Inter via `next/font/google`

**Files:**
- Modify: `app/layout.tsx`

**Step 1: Modifier `app/layout.tsx`**

Remplacer le contenu par :
```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { AppShell } from "@/components/sidebar";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PM Dashboard — Gestion de Projet",
  description: "Tableau de bord professionnel de gestion de projet",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="min-h-screen antialiased">
        <AppShell>{children}</AppShell>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
```

**Step 2: Vérifier dans le navigateur**

```bash
npm run dev
```

Ouvrir http://localhost:3000 et vérifier que la typo est Inter (inspecter l'élément `<body>` → font-family devrait afficher `Inter`).

**Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: add Inter font via next/font/google"
```

---

## Task 6: Dark mode toggle

**Files:**
- Create: `lib/hooks/use-theme.ts`
- Modify: `app/layout.tsx`
- Modify: `components/sidebar.tsx`

**Step 1: Créer `lib/hooks/use-theme.ts`**

```ts
"use client";

import { useState, useEffect } from "react";

type Theme = "light" | "dark";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme") as Theme | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial: Theme = saved ?? (prefersDark ? "dark" : "light");
    applyTheme(initial);
    setTheme(initial);
    setHydrated(true);
  }, []);

  function toggle() {
    setTheme((prev) => {
      const next: Theme = prev === "light" ? "dark" : "light";
      applyTheme(next);
      localStorage.setItem("theme", next);
      return next;
    });
  }

  return { theme, toggle, hydrated };
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}
```

**Step 2: Ajouter le toggle dans `components/sidebar.tsx`**

Localiser dans `SidebarVertical` la section `/* Controls */` (ligne ~131). Ajouter le toggle à côté des boutons existants :

Dans les imports en haut du fichier, ajouter `Sun, Moon` depuis `lucide-react`.

Ajouter l'import du hook :
```tsx
import { useTheme } from "@/lib/hooks/use-theme";
```

Dans `SidebarVertical`, ajouter à l'intérieur de la fonction (avant le return) :
```tsx
const { theme, toggle } = useTheme();
```

Dans la section `/* Controls */`, ajouter le bouton dark mode à côté du bouton `onToggle` :
```tsx
<button
  onClick={toggle}
  className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
  title={theme === "dark" ? "Mode clair" : "Mode sombre"}
>
  {theme === "dark" ? (
    <Sun className="h-4 w-4" />
  ) : (
    <Moon className="h-4 w-4" />
  )}
</button>
```

Faire de même dans `NavbarHorizontal` : ajouter le toggle dans `/* Controls */` à côté du bouton `onSwitchVertical`.

**Step 3: Lancer le dev et tester le dark mode manuellement**

```bash
npm run dev
```

Cliquer le bouton Moon/Sun dans la sidebar → l'interface doit basculer en dark mode. Recharger la page → le mode doit être persisté.

**Step 4: Lancer tous les tests pour vérifier qu'on n'a rien cassé**

```bash
npm run test:run
```

Expected: tous les tests passent (les tests existants ne testent pas l'UI de la sidebar).

**Step 5: Commit**

```bash
git add lib/hooks/use-theme.ts components/sidebar.tsx
git commit -m "feat: add dark mode toggle with localStorage persistence"
```

---

## Task 7: Lancer le build final de validation

**Step 1: Build de production**

```bash
npm run build
```

Expected: build sans erreurs TypeScript ni erreurs Next.js. Si des erreurs apparaissent, les corriger avant de continuer.

**Step 2: Lancer tous les tests une dernière fois**

```bash
npm run test:run
```

Expected: tous les tests passent.

**Step 3: Commit de clôture sprint**

```bash
git add -A
git commit -m "chore: Sprint 1 complete — tokens, Inter, dark mode, Vitest, financial tests"
```

---

## Résumé Sprint 1

| Livrable | Fichier(s) |
|----------|-----------|
| Vitest configuré | `vitest.config.ts`, `vitest.setup.ts` |
| Tests financiers (17 cas) | `__tests__/lib/financial.test.ts` |
| `lib/financial.ts` | `lib/financial.ts` |
| Tests progression projet (20+ cas) | `__tests__/lib/projet-metrics.test.ts` |
| Design tokens light + dark | `app/globals.css` |
| Inter font | `app/layout.tsx` |
| Dark mode toggle + hook | `lib/hooks/use-theme.ts`, `components/sidebar.tsx` |

**Commande de vérification finale :**
```bash
npm run test:run && npm run build
```
Les deux doivent passer sans erreur pour valider le sprint.
