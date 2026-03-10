# Sprint 4 — Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Tester les fonctions utilitaires de `DashboardFilters`, créer les primitives génériques `components/charts/` (BarChart, AreaChart, KpiSparkline) et refactorer `app/page.tsx` pour utiliser `useLocalStorage`.

**Architecture:** Extract-first — on teste les fonctions pures existantes, on crée les primitives charts testables, puis on simplifie la page principale. Zéro breaking change sur les imports existants.

**Tech Stack:** Next.js 16 App Router · Recharts · Vitest v4 · @testing-library/react · Tailwind v4

---

## Contexte projet

- Racine : `/Users/jonathanbraun/dashboard-chef-projet`
- Tests existants : 107 tests passent — ne pas les casser
- Config Vitest : `vitest.config.ts` (NO globals — toujours importer `describe, it, expect, vi` depuis `vitest`)
- Setup tests : `vitest.setup.ts` (contient `afterEach(cleanup)` déjà configuré)
- Pas de git dans ce projet — ignorer toutes les étapes `git commit`
- Vérification finale : `npm run test:run && npm run build`
- Hook `useLocalStorage` disponible : `@/lib/hooks/use-local-storage`

### Fichiers à comprendre avant de commencer

- `components/dashboard/DashboardFilters.tsx` — fonctions utilitaires à tester : `getPeriodDates`, `getDefaultFilters`, `loadFilters`, `saveFilters`
- `app/page.tsx` — 97 lignes, logique localStorage inline à remplacer
- `components/dashboard/operationnel/ActiviteEquipeChart.tsx` — chart existant (BarChart stacké)
- `components/dashboard/operationnel/TendancesChart.tsx` — chart existant (LineChart CA/Marge)

---

## Task 1 : Tests `DashboardFilters` — fonctions utilitaires

**Files:**
- Create: `__tests__/components/dashboard/dashboard-filters.test.ts`
- Read: `components/dashboard/DashboardFilters.tsx` (lignes 47–120)

**Contexte important :** `const now = new Date()` est défini au niveau module dans `DashboardFilters.tsx`. On ne peut pas contrôler sa valeur dans les tests. On teste donc la **structure** et les **relations** entre `dateDebut`/`dateFin`, pas les valeurs exactes.

### Step 1 : Écrire le test (RED)

Créer `__tests__/components/dashboard/dashboard-filters.test.ts` :

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import {
  getPeriodDates,
  getDefaultFilters,
  loadFilters,
  saveFilters,
  type PeriodeKey,
  type DashboardFiltersValue,
} from '@/components/dashboard/DashboardFilters'

// ── Helpers ──────────────────────────────────────────────────────────────
function isISODate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

function dayDiff(dateDebut: string, dateFin: string): number {
  const ms = new Date(dateFin).getTime() - new Date(dateDebut).getTime()
  return Math.round(ms / (24 * 3600 * 1000))
}

// ── getPeriodDates ────────────────────────────────────────────────────────
describe('getPeriodDates', () => {
  it('today : dateDebut === dateFin, format YYYY-MM-DD', () => {
    const { dateDebut, dateFin } = getPeriodDates('today')
    expect(isISODate(dateDebut)).toBe(true)
    expect(dateDebut).toBe(dateFin)
  })

  it('week : exactement 6 jours d\'écart (lundi→dimanche)', () => {
    const { dateDebut, dateFin } = getPeriodDates('week')
    expect(isISODate(dateDebut)).toBe(true)
    expect(isISODate(dateFin)).toBe(true)
    expect(dayDiff(dateDebut, dateFin)).toBe(6)
  })

  it('month : dateDebut <= dateFin, premier jour du mois', () => {
    const { dateDebut, dateFin } = getPeriodDates('month')
    expect(dateDebut <= dateFin).toBe(true)
    expect(dateDebut.endsWith('-01')).toBe(true)
    expect(dayDiff(dateDebut, dateFin)).toBeGreaterThanOrEqual(27)
  })

  it('quarter : dateDebut < dateFin, écart ≥ 89 jours', () => {
    const { dateDebut, dateFin } = getPeriodDates('quarter')
    expect(dateDebut < dateFin).toBe(true)
    expect(dayDiff(dateDebut, dateFin)).toBeGreaterThanOrEqual(89)
  })

  it('year : dateDebut < dateFin, 1er janv → 31 déc', () => {
    const { dateDebut, dateFin } = getPeriodDates('year')
    expect(dateDebut).toMatch(/-01-01$/)
    expect(dateFin).toMatch(/-12-31$/)
    expect(dayDiff(dateDebut, dateFin)).toBeGreaterThanOrEqual(364)
  })

  it('custom (clé inconnue) : fallback mois en cours', () => {
    const { dateDebut, dateFin } = getPeriodDates('custom' as PeriodeKey)
    // fallback = startOfMonth → endOfMonth
    expect(dateDebut.endsWith('-01')).toBe(true)
    expect(dateDebut <= dateFin).toBe(true)
  })
})

// ── getDefaultFilters ─────────────────────────────────────────────────────
describe('getDefaultFilters', () => {
  it('retourne projetId = "all" et periode = defaultPeriode', () => {
    const f = getDefaultFilters('week')
    expect(f.projetId).toBe('all')
    expect(f.periode).toBe('week')
    expect(isISODate(f.dateDebut)).toBe(true)
    expect(isISODate(f.dateFin)).toBe(true)
  })

  it('utilise "week" comme période par défaut quand non fourni', () => {
    const f = getDefaultFilters()
    expect(f.periode).toBe('week')
  })
})

// ── loadFilters ───────────────────────────────────────────────────────────
describe('loadFilters', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('retourne les valeurs par défaut si rien dans localStorage', () => {
    const f = loadFilters('test-key', 'month')
    expect(f.periode).toBe('month')
    expect(f.projetId).toBe('all')
  })

  it('retourne les filtres sauvegardés si valides', () => {
    const saved: DashboardFiltersValue = {
      periode: 'quarter',
      dateDebut: '2026-01-01',
      dateFin: '2026-03-31',
      projetId: '42',
    }
    localStorage.setItem('test-key', JSON.stringify(saved))
    const f = loadFilters('test-key', 'week')
    expect(f.periode).toBe('quarter')
    expect(f.projetId).toBe('42')
    expect(f.dateDebut).toBe('2026-01-01')
  })

  it('retourne les valeurs par défaut si JSON invalide', () => {
    localStorage.setItem('test-key', 'INVALID{{{')
    const f = loadFilters('test-key', 'month')
    expect(f.periode).toBe('month')
  })

  it('retourne les valeurs par défaut si champs obligatoires manquants', () => {
    localStorage.setItem('test-key', JSON.stringify({ projetId: 'all' })) // sans periode, dateDebut, dateFin
    const f = loadFilters('test-key', 'year')
    expect(f.periode).toBe('year')
  })
})

// ── saveFilters ───────────────────────────────────────────────────────────
describe('saveFilters', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('écrit le filtre sérialisé en JSON dans localStorage', () => {
    const filters: DashboardFiltersValue = {
      periode: 'week',
      dateDebut: '2026-02-23',
      dateFin: '2026-03-01',
      projetId: 'all',
    }
    saveFilters('save-key', filters)
    const raw = localStorage.getItem('save-key')
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    expect(parsed.periode).toBe('week')
    expect(parsed.projetId).toBe('all')
  })

  it('écrase la valeur existante', () => {
    const initial: DashboardFiltersValue = {
      periode: 'month', dateDebut: '2026-03-01', dateFin: '2026-03-31', projetId: 'all',
    }
    const updated: DashboardFiltersValue = {
      periode: 'year', dateDebut: '2026-01-01', dateFin: '2026-12-31', projetId: '5',
    }
    saveFilters('save-key', initial)
    saveFilters('save-key', updated)
    const parsed = JSON.parse(localStorage.getItem('save-key')!)
    expect(parsed.periode).toBe('year')
    expect(parsed.projetId).toBe('5')
  })
})
```

### Step 2 : Vérifier que le test échoue (RED)

```bash
cd /Users/jonathanbraun/dashboard-chef-projet && npm run test:run -- __tests__/components/dashboard/dashboard-filters.test.ts 2>&1 | tail -10
```

Expected : `Cannot find module '@/components/dashboard/DashboardFilters'` **ou** des erreurs de type si le module existe mais manque des exports nommés.

> **Note :** Le module existe déjà. Les fonctions `getPeriodDates`, `getDefaultFilters`, `loadFilters`, `saveFilters` sont déjà exportées. Le test devrait en fait **passer directement** car ces fonctions sont pures et déjà implémentées. Si c'est le cas, passer au Step 4.

### Step 3 : (Si nécessaire) Corriger les exports

Si des exports manquent dans `components/dashboard/DashboardFilters.tsx`, les ajouter. Sinon passer au Step 4.

### Step 4 : Vérifier que les tests passent (GREEN)

```bash
cd /Users/jonathanbraun/dashboard-chef-projet && npm run test:run -- __tests__/components/dashboard/dashboard-filters.test.ts 2>&1 | tail -10
```

Expected : `15 passed` (6 getPeriodDates + 2 getDefaultFilters + 4 loadFilters + 2 saveFilters + 1 save écrase = 15)

---

## Task 2 : Refactorer `app/page.tsx` — utiliser `useLocalStorage`

**Files:**
- Modify: `app/page.tsx`

**Objectif :** Remplacer les ~20 lignes de gestion manuelle de localStorage par le hook `useLocalStorage`. Conserver le raccourci clavier.

### Step 1 : Lire le fichier actuel

```bash
cat /Users/jonathanbraun/dashboard-chef-projet/app/page.tsx
```

### Step 2 : Remplacer `app/page.tsx`

**Avant (lignes 1–97) :**
```tsx
"use client";

import { useEffect, useState } from "react";
// ... imports

type VueDashboard = "operationnel" | "consultants" | "strategique";
const STORAGE_KEY = "dashboard-active-view";

export default function DashboardPage() {
  const [vue, setVue] = useState<VueDashboard>("operationnel");
  const [hydrated, setHydrated] = useState(false);

  // Load saved view preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "operationnel" || saved === "consultants" || saved === "strategique") {
        setVue(saved);
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  // Save view preference
  useEffect(() => {
    if (hydrated) {
      try {
        localStorage.setItem(STORAGE_KEY, vue);
      } catch { /* ignore */ }
    }
  }, [vue, hydrated]);

  // ... keyboard shortcuts
  if (!hydrated) return null;
  // ...
}
```

**Après — réécrire `app/page.tsx` en entier :**

```tsx
"use client";

import { useEffect, useState } from "react";
import { BarChart3, Users, TrendingUp } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DashboardConsultants } from "@/components/dashboard/DashboardConsultants";
import { DashboardOperationnel } from "@/components/dashboard/DashboardOperationnel";
import { DashboardStrategique } from "@/components/dashboard/DashboardStrategique";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";

// ── Types ─────────────────────────────────────────────────────────────
type VueDashboard = "operationnel" | "consultants" | "strategique";

const VALID_VUES: readonly VueDashboard[] = ["operationnel", "consultants", "strategique"];

// ── Page ──────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [storedVue, setVue] = useLocalStorage<string>("dashboard-active-view", "operationnel");
  const [ready, setReady] = useState(false);

  // Wait for hydration before rendering (prevents tab flash)
  useEffect(() => { setReady(true); }, []);

  // Validate stored value — fallback to "operationnel" if corrupted
  const vue: VueDashboard = VALID_VUES.includes(storedVue as VueDashboard)
    ? (storedVue as VueDashboard)
    : "operationnel";

  // Keyboard shortcuts: Ctrl+1, Ctrl+2, Ctrl+3
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      switch (e.key) {
        case "1": e.preventDefault(); setVue("operationnel"); break;
        case "2": e.preventDefault(); setVue("consultants"); break;
        case "3": e.preventDefault(); setVue("strategique"); break;
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [setVue]);

  if (!ready) return null;

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-7xl mx-auto">
      <Tabs value={vue} onValueChange={(v) => setVue(v)}>
        <TabsList className="mb-6">
          <TabsTrigger value="operationnel" title="Vue Opérationnelle (Ctrl+1)">
            <BarChart3 className="h-4 w-4 mr-2" />
            Opérationnel
          </TabsTrigger>
          <TabsTrigger value="consultants" title="Vue Consultants (Ctrl+2)">
            <Users className="h-4 w-4 mr-2" />
            Consultants
          </TabsTrigger>
          <TabsTrigger value="strategique" title="Vue Stratégique (Ctrl+3)">
            <TrendingUp className="h-4 w-4 mr-2" />
            Stratégique
          </TabsTrigger>
        </TabsList>

        <TabsContent value="operationnel">
          <DashboardOperationnel />
        </TabsContent>

        <TabsContent value="consultants">
          <DashboardConsultants />
        </TabsContent>

        <TabsContent value="strategique">
          <DashboardStrategique />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### Step 3 : Vérifier que le build passe

```bash
cd /Users/jonathanbraun/dashboard-chef-projet && npm run build 2>&1 | tail -15
```

Expected : build sans erreur TypeScript.

### Step 4 : Vérifier que tous les tests continuent de passer

```bash
cd /Users/jonathanbraun/dashboard-chef-projet && npm run test:run 2>&1 | tail -8
```

Expected : tous les tests passent (aucune régression).

---

## Task 3 : `components/charts/bar-chart.tsx` — primitive générique

**Files:**
- Create: `components/charts/bar-chart.tsx`
- Create: `__tests__/components/charts/bar-chart.test.tsx`

**Objectif :** Un wrapper Recharts `BarChart` réutilisable, testable, avec état vide et support multi-barres.

### Step 1 : Écrire le test (RED)

Créer `__tests__/components/charts/bar-chart.test.tsx` :

```tsx
import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BarChartWrapper } from '@/components/charts/bar-chart'

// Recharts utilise ResizeObserver — mock requis en jsdom
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

const bars = [
  { key: 'heures', label: 'Heures', color: '#2563eb' },
]

const data = [
  { jour: 'Lun', heures: 6 },
  { jour: 'Mar', heures: 7.5 },
  { jour: 'Mer', heures: 8 },
]

describe('BarChartWrapper', () => {
  it('affiche le message vide quand data est vide', () => {
    render(<BarChartWrapper data={[]} xKey="jour" bars={bars} />)
    expect(screen.getByText('Aucune donnée disponible')).toBeInTheDocument()
  })

  it('affiche un message vide personnalisé', () => {
    render(
      <BarChartWrapper data={[]} xKey="jour" bars={bars} emptyMessage="Pas de données ce mois" />
    )
    expect(screen.getByText('Pas de données ce mois')).toBeInTheDocument()
  })

  it('affiche le container quand data est présent', () => {
    render(<BarChartWrapper data={data} xKey="jour" bars={bars} />)
    expect(screen.getByTestId('bar-chart-container')).toBeInTheDocument()
  })

  it('ne plante pas avec plusieurs barres', () => {
    const multiBars = [
      { key: 'heures', label: 'Heures', color: '#2563eb' },
      { key: 'ca', label: 'CA', color: '#7c3aed' },
    ]
    const multiData = [{ jour: 'Lun', heures: 6, ca: 500 }]
    expect(() =>
      render(<BarChartWrapper data={multiData} xKey="jour" bars={multiBars} />)
    ).not.toThrow()
  })

  it('ne plante pas quand data est undefined (fallback empty)', () => {
    expect(() =>
      render(<BarChartWrapper data={undefined as any} xKey="jour" bars={bars} />)
    ).not.toThrow()
    expect(screen.getByText('Aucune donnée disponible')).toBeInTheDocument()
  })
})
```

### Step 2 : Vérifier que le test échoue (RED)

```bash
cd /Users/jonathanbraun/dashboard-chef-projet && npm run test:run -- __tests__/components/charts/bar-chart.test.tsx 2>&1 | tail -10
```

Expected : `Cannot find module '@/components/charts/bar-chart'`

### Step 3 : Créer `components/charts/bar-chart.tsx`

```tsx
"use client"

import * as React from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

// ── Types ─────────────────────────────────────────────────────────────
export interface BarDef {
  key: string
  label: string
  color: string
}

export interface BarChartWrapperProps {
  data: Record<string, unknown>[] | undefined
  xKey: string
  bars: BarDef[]
  yFormatter?: (v: number) => string
  height?: number
  emptyMessage?: string
}

// ── Component ─────────────────────────────────────────────────────────
export function BarChartWrapper({
  data,
  xKey,
  bars,
  yFormatter,
  height = 280,
  emptyMessage = "Aucune donnée disponible",
}: BarChartWrapperProps) {
  if (!data || data.length === 0) {
    return (
      <p className="text-center py-10 text-muted-foreground text-sm">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div data-testid="bar-chart-container">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            vertical={false}
          />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={yFormatter}
            width={40}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              fontSize: "13px",
            }}
          />
          {bars.map((bar) => (
            <Bar
              key={bar.key}
              dataKey={bar.key}
              fill={bar.color}
              name={bar.label}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

### Step 4 : Vérifier que les tests passent (GREEN)

```bash
cd /Users/jonathanbraun/dashboard-chef-projet && npm run test:run -- __tests__/components/charts/bar-chart.test.tsx 2>&1 | tail -10
```

Expected : `5 passed`

---

## Task 4 : `components/charts/area-chart.tsx` — primitive générique

**Files:**
- Create: `components/charts/area-chart.tsx`
- Create: `__tests__/components/charts/area-chart.test.tsx`

**Objectif :** Un wrapper Recharts `AreaChart` réutilisable (lignes avec aire remplie), pensé pour les tendances temporelles (CA, marge, heures).

### Step 1 : Écrire le test (RED)

Créer `__tests__/components/charts/area-chart.test.tsx` :

```tsx
import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AreaChartWrapper } from '@/components/charts/area-chart'

beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

const areas = [
  { key: 'ca', label: 'CA', color: '#2563eb' },
  { key: 'marge', label: 'Marge', color: '#16a34a' },
]

const data = [
  { mois: 'Jan', ca: 45000, marge: 18000 },
  { mois: 'Fév', ca: 52000, marge: 22000 },
  { mois: 'Mar', ca: 48000, marge: 19000 },
]

describe('AreaChartWrapper', () => {
  it('affiche le message vide quand data est vide', () => {
    render(<AreaChartWrapper data={[]} xKey="mois" areas={areas} />)
    expect(screen.getByText('Aucune donnée disponible')).toBeInTheDocument()
  })

  it('affiche un message vide personnalisé', () => {
    render(
      <AreaChartWrapper data={[]} xKey="mois" areas={areas} emptyMessage="Pas de tendances" />
    )
    expect(screen.getByText('Pas de tendances')).toBeInTheDocument()
  })

  it('affiche le container quand data est présent', () => {
    render(<AreaChartWrapper data={data} xKey="mois" areas={areas} />)
    expect(screen.getByTestId('area-chart-container')).toBeInTheDocument()
  })

  it('ne plante pas avec une seule aire', () => {
    const singleArea = [{ key: 'ca', label: 'CA', color: '#2563eb' }]
    expect(() =>
      render(<AreaChartWrapper data={data} xKey="mois" areas={singleArea} />)
    ).not.toThrow()
  })

  it('ne plante pas quand data est undefined', () => {
    expect(() =>
      render(<AreaChartWrapper data={undefined as any} xKey="mois" areas={areas} />)
    ).not.toThrow()
    expect(screen.getByText('Aucune donnée disponible')).toBeInTheDocument()
  })
})
```

### Step 2 : Vérifier que le test échoue (RED)

```bash
cd /Users/jonathanbraun/dashboard-chef-projet && npm run test:run -- __tests__/components/charts/area-chart.test.tsx 2>&1 | tail -10
```

Expected : `Cannot find module '@/components/charts/area-chart'`

### Step 3 : Créer `components/charts/area-chart.tsx`

```tsx
"use client"

import * as React from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

// ── Types ─────────────────────────────────────────────────────────────
export interface AreaDef {
  key: string
  label: string
  color: string
}

export interface AreaChartWrapperProps {
  data: Record<string, unknown>[] | undefined
  xKey: string
  areas: AreaDef[]
  yFormatter?: (v: number) => string
  height?: number
  emptyMessage?: string
  showLegend?: boolean
}

// ── Component ─────────────────────────────────────────────────────────
export function AreaChartWrapper({
  data,
  xKey,
  areas,
  yFormatter,
  height = 280,
  emptyMessage = "Aucune donnée disponible",
  showLegend = true,
}: AreaChartWrapperProps) {
  if (!data || data.length === 0) {
    return (
      <p className="text-center py-10 text-muted-foreground text-sm">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div data-testid="area-chart-container">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <defs>
            {areas.map((area) => (
              <linearGradient
                key={`gradient-${area.key}`}
                id={`gradient-${area.key}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={area.color} stopOpacity={0.15} />
                <stop offset="95%" stopColor={area.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            vertical={false}
          />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={yFormatter}
            width={44}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              fontSize: "13px",
            }}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              formatter={(value) => (
                <span style={{ color: "var(--color-text-secondary)" }}>{value}</span>
              )}
            />
          )}
          {areas.map((area) => (
            <Area
              key={area.key}
              type="monotone"
              dataKey={area.key}
              name={area.label}
              stroke={area.color}
              strokeWidth={2.5}
              fill={`url(#gradient-${area.key})`}
              dot={{ r: 3, fill: area.color, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
```

### Step 4 : Vérifier que les tests passent (GREEN)

```bash
cd /Users/jonathanbraun/dashboard-chef-projet && npm run test:run -- __tests__/components/charts/area-chart.test.tsx 2>&1 | tail -10
```

Expected : `5 passed`

---

## Task 5 : `components/charts/kpi-sparkline.tsx` — mini sparkline

**Files:**
- Create: `components/charts/kpi-sparkline.tsx`
- Create: `__tests__/components/charts/kpi-sparkline.test.tsx`

**Objectif :** Un micro graphique linéaire sans axes — idéal pour afficher la tendance dans les `KpiCard`. Données : tableau de nombres. Très léger (pas de grille, pas de tooltip textuel complexe).

### Step 1 : Écrire le test (RED)

Créer `__tests__/components/charts/kpi-sparkline.test.tsx` :

```tsx
import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KpiSparkline } from '@/components/charts/kpi-sparkline'

beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

describe('KpiSparkline', () => {
  it('ne plante pas avec des données valides', () => {
    expect(() =>
      render(<KpiSparkline data={[10, 20, 15, 30, 25]} />)
    ).not.toThrow()
  })

  it('affiche le container quand data est présent', () => {
    render(<KpiSparkline data={[10, 20, 15]} />)
    expect(screen.getByTestId('kpi-sparkline')).toBeInTheDocument()
  })

  it('ne plante pas avec un seul point de donnée', () => {
    expect(() => render(<KpiSparkline data={[42]} />)).not.toThrow()
  })

  it('ne plante pas avec un tableau vide', () => {
    expect(() => render(<KpiSparkline data={[]} />)).not.toThrow()
  })
})
```

### Step 2 : Vérifier que le test échoue (RED)

```bash
cd /Users/jonathanbraun/dashboard-chef-projet && npm run test:run -- __tests__/components/charts/kpi-sparkline.test.tsx 2>&1 | tail -10
```

Expected : `Cannot find module '@/components/charts/kpi-sparkline'`

### Step 3 : Créer `components/charts/kpi-sparkline.tsx`

```tsx
"use client"

import * as React from "react"
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
} from "recharts"

// ── Types ─────────────────────────────────────────────────────────────
export interface KpiSparklineProps {
  data: number[]
  color?: string
  height?: number
}

// ── Component ─────────────────────────────────────────────────────────
export function KpiSparkline({
  data,
  color = "var(--color-primary)",
  height = 40,
}: KpiSparklineProps) {
  // Recharts veut un tableau d'objets
  const chartData = data.map((v, i) => ({ i, v }))

  return (
    <div data-testid="kpi-sparkline" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Tooltip
            contentStyle={{ display: "none" }}
            cursor={false}
          />
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

### Step 4 : Vérifier que les tests passent (GREEN)

```bash
cd /Users/jonathanbraun/dashboard-chef-projet && npm run test:run -- __tests__/components/charts/kpi-sparkline.test.tsx 2>&1 | tail -10
```

Expected : `4 passed`

---

## Task 6 : Validation finale Sprint 4

### Step 1 : Tous les tests (nouvelle suite complète)

```bash
cd /Users/jonathanbraun/dashboard-chef-projet && npm run test:run 2>&1 | tail -15
```

Expected : `107 + 15 + 5 + 5 + 4 = 136 tests` passent (15 DashboardFilters + 5 bar-chart + 5 area-chart + 4 kpi-sparkline).

### Step 2 : Build de production

```bash
cd /Users/jonathanbraun/dashboard-chef-projet && npm run build 2>&1 | tail -15
```

Expected : build sans erreur TypeScript ni lint.

### Step 3 : Vérifier la structure des nouveaux fichiers

```bash
ls /Users/jonathanbraun/dashboard-chef-projet/components/charts/
ls /Users/jonathanbraun/dashboard-chef-projet/__tests__/components/charts/
```

Expected :
- `components/charts/` : `bar-chart.tsx`, `area-chart.tsx`, `kpi-sparkline.tsx`
- `__tests__/components/charts/` : `bar-chart.test.tsx`, `area-chart.test.tsx`, `kpi-sparkline.test.tsx`

---

## Résumé Sprint 4

| Livrable | Fichier(s) | Tests |
|----------|-----------|-------|
| Tests DashboardFilters | `__tests__/components/dashboard/dashboard-filters.test.ts` | 15 |
| Refacto `app/page.tsx` | `app/page.tsx` (useLocalStorage) | — |
| BarChartWrapper | `components/charts/bar-chart.tsx`, `__tests__/components/charts/bar-chart.test.tsx` | 5 |
| AreaChartWrapper | `components/charts/area-chart.tsx`, `__tests__/components/charts/area-chart.test.tsx` | 5 |
| KpiSparkline | `components/charts/kpi-sparkline.tsx`, `__tests__/components/charts/kpi-sparkline.test.tsx` | 4 |

**Total : +29 tests → 136 tests**

**Commande de validation :**
```bash
npm run test:run && npm run build
```
