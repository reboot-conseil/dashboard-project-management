# Design System + TDD — Document de conception

> Créé le 2026-03-01 · Approuvé par le product owner

---

## Contexte

Le PM Dashboard est une application Next.js 16 (App Router) de gestion de projets de conseil. Score de santé actuel : 7.2/10. Les deux lacunes majeures sont l'absence de tests (2/10) et l'absence d'un design system documenté et cohérent. Ce document définit le plan pour les combler en 8 sprints.

**Hors scope :** `/rapports`, `/documents`, `/admin` — ces pages ne seront pas refactorisées.

---

## 1. Token System

### Couleurs (light + dark)

```css
:root {
  /* Surfaces */
  --color-background:    #f8fafc;
  --color-surface:       #ffffff;
  --color-surface-raised:#f1f5f9;

  /* Brand */
  --color-primary:       #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-accent:        #7c3aed;

  /* Sémantique */
  --color-success:       #16a34a;
  --color-warning:       #ea580c;
  --color-destructive:   #dc2626;
  --color-info:          #0891b2;

  /* Text */
  --color-text-primary:  #0f172a;
  --color-text-secondary:#475569;
  --color-text-muted:    #94a3b8;

  /* Borders */
  --color-border:        #e2e8f0;
  --color-border-strong: #cbd5e1;

  /* Radius */
  --radius-sm:  4px;
  --radius-md:  6px;
  --radius-lg:  8px;
  --radius-xl:  12px;

  /* Shadows */
  --shadow-sm:  0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md:  0 4px 6px -1px rgb(0 0 0 / 0.07);
  --shadow-lg:  0 10px 15px -3px rgb(0 0 0 / 0.08);

  /* Glassmorphism — cards stats, modales */
  --glass-bg:     rgba(255, 255, 255, 0.7);
  --glass-border: rgba(255, 255, 255, 0.9);
  --glass-blur:   blur(12px);
}

.dark {
  --color-background:    #09090b;
  --color-surface:       #18181b;
  --color-surface-raised:#27272a;
  --color-text-primary:  #fafafa;
  --color-text-secondary:#a1a1aa;
  --color-text-muted:    #71717a;
  --color-border:        #27272a;
  --color-border-strong: #3f3f46;
  --glass-bg:     rgba(24, 24, 27, 0.7);
  --glass-border: rgba(63, 63, 70, 0.8);
}
```

Les palettes consultants et projets existantes sont conservées sans changement.

### Typographie

- **Font** : Inter via `next/font/google`, variable CSS `--font-sans`
- **Fallback** : `system-ui, -apple-system, sans-serif`
- Scale : `xs` 0.75rem · `sm` 0.875rem · `base` 1rem · `lg` 1.125rem · `xl` 1.25rem · `2xl` 1.5rem

### Direction visuelle

Style cible : **Clean & Pro** (Linear / Notion) avec glassmorphism ciblé sur les KPI cards et les modales. Pas de glassmorphism généralisé — uniquement là où ça renforce la hiérarchie visuelle.

---

## 2. Architecture des composants

### Structure cible

```
components/
├── ui/                      # Primitives atomiques — 100% testées
│   ├── button.tsx           ✓ refacto tokens
│   ├── badge.tsx            ✓ refacto tokens
│   ├── card.tsx             ✓ + variante glass
│   ├── input.tsx            ✓ refacto tokens
│   ├── skeleton.tsx         ✓ usage standardisé
│   ├── tooltip.tsx          → nouveau
│   └── spinner.tsx          → nouveau
├── layout/                  → nouveau dossier
│   ├── app-shell.tsx        ← extrait de sidebar.tsx
│   ├── sidebar.tsx          ← allégé
│   └── page-header.tsx      → nouveau (titre + actions + breadcrumb)
├── dashboard/               ✓ découpage des fichiers >500 lignes
├── charts/                  → nouveau dossier
│   ├── area-chart.tsx
│   ├── bar-chart.tsx
│   └── kpi-sparkline.tsx
└── forms/                   → nouveau dossier
    ├── consultant-form.tsx  ← déplacé
    ├── projet-form.tsx      ← déplacé
    └── activite-form.tsx    ← déplacé
```

### Conventions

- Composants : `PascalCase.tsx`, export nommé + type `Props` explicite
- Hooks : `use-kebab-case.ts` dans `lib/hooks/`
- Tests : dans `__tests__/` qui miroir la structure `components/` et `lib/`
- Design tokens : préfixe catégorie obligatoire (`--color-*`, `--shadow-*`, `--radius-*`)

---

## 3. Stack de tests

| Outil | Rôle |
|-------|------|
| **Vitest** | Tests unitaires et composants |
| **@testing-library/react** | Tests composants React |
| **MSW** | Mock des routes API Next.js |
| **Playwright** | E2E — flux critiques uniquement (sprint 8) |

### Structure `__tests__/`

```
__tests__/
├── lib/
│   ├── projet-metrics.test.ts   # Priorité 1 — 20+ cas
│   ├── financial.test.ts        # Priorité 1 — CA/coût/marge
│   └── utils.test.ts
├── components/
│   ├── ui/
│   │   ├── button.test.tsx
│   │   ├── badge.test.tsx
│   │   └── kpi-card.test.tsx
│   └── dashboard/
│       └── dashboard-filters.test.tsx
└── api/
    ├── activites.test.ts
    └── dashboard.test.ts
```

---

## 4. Data flow & Error handling

### Pattern de data fetching

Les pages Next.js lisent les données en **Server Components** (fetch Prisma direct, sans round-trip API). Les routes API sont réservées aux mutations et aux cas cross-origin (webhooks Teams).

```
Server Component (page.tsx)
  └─ fetch Prisma direct
       └─ props vers Client Components
            └─ mutations via fetch() + toast Sonner
```

### Loading states unifiés

| Situation | Pattern cible |
|-----------|---------------|
| Page entière | `<Skeleton />` structuré |
| Composant async | `<Spinner />` centré |
| Tableau vide | `<EmptyState icon message action />` |
| Erreur API | Toast `destructive` + log console |

### `lib/financial.ts` — nouveau fichier

Toutes les formules financières convergent ici et sont testées à 100% :

```ts
export const CA = (heures: number, tjm: number) => (heures / 8) * tjm
export const cout = (heures: number, coutJour: number) => (heures / 8) * coutJour
export const marge = (ca: number, cout: number) => ca - cout
export const margePct = (ca: number, cout: number) =>
  ca > 0 ? ((ca - cout) / ca) * 100 : 0
export const margeLabel = (pct: number): "bon" | "moyen" | "faible" =>
  pct >= 40 ? "bon" : pct >= 30 ? "moyen" : "faible"
```

---

## 5. Plan de migration — 8 sprints

| Sprint | Périmètre | Livrables clés |
|--------|-----------|----------------|
| **1** | Fondations | `globals.css` tokens light/dark · Inter · dark mode toggle · Vitest setup · `lib/financial.ts` + tests |
| **2** | Composants UI atomiques | Refacto `components/ui/` · `tooltip`, `spinner` · tests button/badge/kpi-card |
| **3** | Layout & Navigation | `app-shell.tsx` · `page-header.tsx` · `use-local-storage` · `use-alert-count` |
| **4** | Dashboard | Découpage `DashboardOperationnel` · `components/charts/` · tests filtres |
| **5** | Projets | Découpage `projets/[id]/page.tsx` · Kanban isolé · tests |
| **6** | Calendrier | `GanttView` · `MonthView` · `TeamCapacityView` séparés |
| **7** | Activités | Découpage `activites/page.tsx` |
| **8** | Polish | Animations de transition · a11y pass · Playwright flux critiques |

**Hors scope :** `/rapports`, `/documents`, `/admin/teams-config`, `/admin/audit`

---

## Décisions clés

| Décision | Choix | Raison |
|----------|-------|--------|
| Dark mode | Classe `.dark` sur `<html>` | Compatible Tailwind v4, toggle manuel |
| Typographie | Inter (next/font/google) | Standard dashboards pro, zero layout shift |
| Tests | Vitest | Zero config Next.js 16, TS natif, 10x plus rapide que Jest |
| Glassmorphism | Ciblé (KPI cards, modales) | Éviter le surcharge visuelle |
| Data fetching | Server Components pour les lectures | Moins de waterfalls, moins de routes API |
