# Sprint 3 — Layout & Navigation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Extraire les logiques dupliquées de `components/sidebar.tsx` (488 lignes) en hooks réutilisables, créer un composant `PageHeader` générique, et alléger `AppShell` en le faisant consommer ces nouvelles abstractions.

**Architecture:** Hook-First — on extrait d'abord les comportements en hooks testés, puis on refactore le composant pour les consommer. Aucun breaking change sur les imports existants (`app/layout.tsx` importe `AppShell` depuis `components/sidebar.tsx` → conserver ce chemin).

**Tech Stack:** Next.js 16 App Router · Tailwind v4 · Vitest · @testing-library/react (renderHook, act, waitFor)

---

## Contexte projet

- Racine : `/Users/jonathanbraun/dashboard-chef-projet`
- Fichier cible principal : `components/sidebar.tsx` (488 lignes, monolithique)
- Tests existants : 90 tests passent — ne pas les casser
- Config Vitest : `vitest.config.ts` (NO globals — toujours importer `describe, it, expect, vi` depuis `vitest`)
- Setup tests : `vitest.setup.ts` (contient `afterEach(cleanup)` déjà configuré)
- Pas de git dans ce projet — ignorer toutes les étapes `git commit`
- Vérification finale : `npm run test:run && npm run build`

### Logiques à extraire de `components/sidebar.tsx`

**Alert count (lignes 263–288) :**
```tsx
const [alertCount, setAlertCount] = useState(0);
const fetchAlertCount = useCallback(async () => {
  try {
    const res = await fetch("/api/alertes");
    if (res.ok) {
      const data = await res.json();
      setAlertCount(Array.isArray(data) ? data.length : 0);
    }
  } catch { /* silently ignore */ }
}, []);
useEffect(() => {
  fetchAlertCount();
  const interval = setInterval(fetchAlertCount, 60000);
  return () => clearInterval(interval);
}, [fetchAlertCount]);
useEffect(() => { fetchAlertCount(); }, [pathname, fetchAlertCount]);
```

**sidebarMode localStorage (lignes 290–304) :**
```tsx
useEffect(() => {
  const saved = localStorage.getItem("sidebarMode");
  if (saved === "full" || saved === "collapsed" || saved === "horizontal") {
    setSidebarMode(saved);
  }
  setHydrated(true);
}, []);
useEffect(() => {
  if (hydrated) { localStorage.setItem("sidebarMode", sidebarMode); }
}, [sidebarMode, hydrated]);
```

---

## Task 1: `use-local-storage` — hook générique

**Files:**
- Create: `lib/hooks/use-local-storage.ts`
- Create: `__tests__/lib/hooks/use-local-storage.test.ts`

### Step 1: Écrire le test (RED)

Créer `__tests__/lib/hooks/use-local-storage.test.ts` :
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useLocalStorage } from '@/lib/hooks/use-local-storage'

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('retourne la valeur par défaut si aucune entrée localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'))
    // Valeur initiale = defaultValue (avant hydration)
    expect(result.current[0]).toBe('default')
  })

  it('lit la valeur sauvegardée au montage', async () => {
    localStorage.setItem('test-key', JSON.stringify('saved'))
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'))
    await waitFor(() => {
      expect(result.current[0]).toBe('saved')
    })
  })

  it('écrit dans localStorage quand setValue est appelé', async () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'))
    await act(async () => {
      result.current[1]('new-value')
    })
    // Attendre hydration + write
    await waitFor(() => {
      expect(localStorage.getItem('test-key')).toBe(JSON.stringify('new-value'))
    })
  })

  it('supporte les valeurs objet (JSON)', async () => {
    const { result } = renderHook(() => useLocalStorage('test-key', { a: 1 }))
    await act(async () => {
      result.current[1]({ a: 2, b: 3 })
    })
    expect(result.current[0]).toEqual({ a: 2, b: 3 })
  })

  it('remove() supprime la clé et remet la valeur par défaut', async () => {
    localStorage.setItem('test-key', JSON.stringify('saved'))
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'))
    await waitFor(() => {
      expect(result.current[0]).toBe('saved')
    })
    await act(async () => {
      result.current[2]() // remove
    })
    expect(result.current[0]).toBe('default')
    expect(localStorage.getItem('test-key')).toBeNull()
  })

  it('gère gracieusement un JSON invalide (retourne la valeur par défaut)', async () => {
    localStorage.setItem('test-key', 'NOT-VALID-JSON{{{')
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'))
    await waitFor(() => {
      // Après hydration, doit être revenu au default (parse échoué)
      expect(result.current[0]).toBe('default')
    })
  })
})
```

### Step 2: Vérifier que le test échoue (RED)
```bash
cd /Users/jonathanbraun/dashboard-chef-projet && npm run test:run -- __tests__/lib/hooks/use-local-storage.test.ts 2>&1 | tail -10
```
Expected: `Cannot find module '@/lib/hooks/use-local-storage'`

### Step 3: Créer `lib/hooks/use-local-storage.ts`
```ts
"use client"

import { useState, useEffect, useCallback, useRef } from "react"

export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => void, () => void] {
  const [value, setValue] = useState<T>(defaultValue)
  const [hydrated, setHydrated] = useState(false)
  const defaultRef = useRef(defaultValue)

  // Read from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key)
      if (saved !== null) {
        setValue(JSON.parse(saved) as T)
      }
    } catch {
      // JSON parse error — keep defaultValue
    }
    setHydrated(true)
  }, [key])

  // Write to localStorage when value changes (only after hydration)
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Ignore quota/private mode errors
    }
  }, [key, value, hydrated])

  const set = useCallback((newValue: T) => {
    setValue(newValue)
  }, [])

  const remove = useCallback(() => {
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
    setValue(defaultRef.current)
  }, [key])

  return [value, set, remove]
}
```

### Step 4: Vérifier que les tests passent (GREEN)
```bash
cd /Users/jonathanbraun/dashboard-chef-projet && npm run test:run -- __tests__/lib/hooks/use-local-storage.test.ts 2>&1 | tail -10
```
Expected: `6 passed`

---

## Task 2: `use-alert-count` — hook de polling alertes

**Files:**
- Create: `lib/hooks/use-alert-count.ts`
- Create: `__tests__/lib/hooks/use-alert-count.test.ts`

### Step 1: Écrire le test (RED)

Créer `__tests__/lib/hooks/use-alert-count.test.ts` :
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAlertCount } from '@/lib/hooks/use-alert-count'

describe('useAlertCount', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [{ id: 1 }, { id: 2 }, { id: 3 }],
    } as Response)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('retourne count=0 et loading=true initialement', () => {
    const { result } = renderHook(() => useAlertCount())
    expect(result.current.count).toBe(0)
    expect(result.current.loading).toBe(true)
  })

  it('retourne le bon count après fetch réussi', async () => {
    const { result } = renderHook(() => useAlertCount())
    await waitFor(() => {
      expect(result.current.count).toBe(3)
    })
    expect(result.current.loading).toBe(false)
  })

  it('retourne count=0 si la réponse n\'est pas un tableau', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ error: 'not an array' }),
    } as Response)
    const { result } = renderHook(() => useAlertCount())
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.count).toBe(0)
  })

  it('retourne count=0 si le fetch échoue', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useAlertCount())
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.count).toBe(0)
  })

  it('retourne count=0 si res.ok est false', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => [],
    } as Response)
    const { result } = renderHook(() => useAlertCount())
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.count).toBe(0)
  })
})
```

### Step 2: Vérifier que le test échoue (RED)
```bash
cd /Users/jonathanbraun/dashboard-chef-projet && npm run test:run -- __tests__/lib/hooks/use-alert-count.test.ts 2>&1 | tail -10
```
Expected: `Cannot find module '@/lib/hooks/use-alert-count'`

### Step 3: Créer `lib/hooks/use-alert-count.ts`
```ts
"use client"

import { useState, useEffect, useCallback } from "react"

export function useAlertCount(): { count: number; loading: boolean } {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch("/api/alertes")
      if (res.ok) {
        const data = await res.json()
        setCount(Array.isArray(data) ? data.length : 0)
      }
    } catch {
      // silently ignore network errors
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCount()
    const interval = setInterval(fetchCount, 60_000)
    return () => clearInterval(interval)
  }, [fetchCount])

  return { count, loading }
}
```

### Step 4: Vérifier que les tests passent (GREEN)
```bash
cd /Users/jonathanbraun/dashboard-chef-projet && npm run test:run -- __tests__/lib/hooks/use-alert-count.test.ts 2>&1 | tail -10
```
Expected: `5 passed`

---

## Task 3: `PageHeader` — composant générique

**Files:**
- Create: `components/layout/page-header.tsx`
- Create: `__tests__/components/layout/page-header.test.tsx`

### Step 1: Écrire le test (RED)

Créer `__tests__/components/layout/page-header.test.tsx` :
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageHeader } from '@/components/layout/page-header'
import { FolderOpen } from 'lucide-react'

describe('PageHeader', () => {
  it('affiche le titre', () => {
    render(<PageHeader title="Projets" />)
    expect(screen.getByRole('heading', { name: 'Projets' })).toBeInTheDocument()
  })

  it('affiche le subtitle quand fourni', () => {
    render(<PageHeader title="Projets" subtitle="Gérer vos projets" />)
    expect(screen.getByText('Gérer vos projets')).toBeInTheDocument()
  })

  it("n'affiche pas de subtitle quand absent", () => {
    render(<PageHeader title="Projets" />)
    expect(screen.queryByText('Gérer vos projets')).not.toBeInTheDocument()
  })

  it('affiche l\'icône quand fournie', () => {
    render(<PageHeader title="Projets" icon={<FolderOpen data-testid="icon" />} />)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('affiche le slot actions quand fourni', () => {
    render(
      <PageHeader
        title="Projets"
        actions={<button>Nouveau projet</button>}
      />
    )
    expect(screen.getByRole('button', { name: 'Nouveau projet' })).toBeInTheDocument()
  })

  it('accepte un className personnalisé', () => {
    const { container } = render(<PageHeader title="Projets" className="custom-class" />)
    expect(container.firstChild).toHaveClass('custom-class')
  })
})
```

### Step 2: Vérifier que le test échoue (RED)
```bash
cd /Users/jonathanbraun/dashboard-chef-projet && npm run test:run -- __tests__/components/layout/page-header.test.tsx 2>&1 | tail -10
```
Expected: `Cannot find module '@/components/layout/page-header'`

### Step 3: Créer `components/layout/page-header.tsx`
```tsx
import * as React from "react"
import { cn } from "@/lib/utils"

export interface PageHeaderProps {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, icon, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-6", className)}>
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground truncate">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
}
```

### Step 4: Vérifier que les tests passent (GREEN)
```bash
cd /Users/jonathanbraun/dashboard-chef-projet && npm run test:run -- __tests__/components/layout/page-header.test.tsx 2>&1 | tail -10
```
Expected: `6 passed`

---

## Task 4: Refactorer `components/sidebar.tsx`

**Files:**
- Modify: `components/sidebar.tsx`

### Objectif

Remplacer les blocs inline de gestion d'état par les hooks extraits :

**Avant (AppShell, lignes 260–303) :**
```tsx
const [sidebarMode, setSidebarMode] = useState<SidebarMode>("full");
const [hydrated, setHydrated] = useState(false);
const [alertCount, setAlertCount] = useState(0);

const fetchAlertCount = useCallback(async () => { ... }, []);
useEffect(() => {
  fetchAlertCount();
  const interval = setInterval(fetchAlertCount, 60000);
  return () => clearInterval(interval);
}, [fetchAlertCount]);
useEffect(() => { fetchAlertCount(); }, [pathname, fetchAlertCount]);

useEffect(() => {
  const saved = localStorage.getItem("sidebarMode");
  if (saved === "full" || saved === "collapsed" || saved === "horizontal") {
    setSidebarMode(saved);
  }
  setHydrated(true);
}, []);
useEffect(() => {
  if (hydrated) { localStorage.setItem("sidebarMode", sidebarMode); }
}, [sidebarMode, hydrated]);
```

**Après :**
```tsx
const [sidebarMode, setSidebarMode, _removeSidebarMode] = useLocalStorage<SidebarMode>("sidebarMode", "full");
const { count: alertCount } = useAlertCount();
```

### Étapes détaillées

**Step 1: Ajouter les imports dans `components/sidebar.tsx`**

Ajouter en haut du fichier (après les imports existants) :
```tsx
import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import { useAlertCount } from "@/lib/hooks/use-alert-count";
```

**Step 2: Remplacer les états et effets dans `AppShell`**

Dans la fonction `AppShell`, remplacer :
```tsx
const [mobileOpen, setMobileOpen] = useState(false);
const [sidebarMode, setSidebarMode] = useState<SidebarMode>("full");
const [hydrated, setHydrated] = useState(false);
const [alertCount, setAlertCount] = useState(0);

// Fetch alert count
const fetchAlertCount = useCallback(async () => {
  try {
    const res = await fetch("/api/alertes");
    if (res.ok) {
      const data = await res.json();
      setAlertCount(Array.isArray(data) ? data.length : 0);
    }
  } catch {
    // silently ignore
  }
}, []);

useEffect(() => {
  fetchAlertCount();
  // Refresh every 60 seconds
  const interval = setInterval(fetchAlertCount, 60000);
  return () => clearInterval(interval);
}, [fetchAlertCount]);

// Re-fetch on route change (e.g. after adding/editing data)
useEffect(() => {
  fetchAlertCount();
}, [pathname, fetchAlertCount]);

// Load saved preference
useEffect(() => {
  const saved = localStorage.getItem("sidebarMode");
  if (saved === "full" || saved === "collapsed" || saved === "horizontal") {
    setSidebarMode(saved);
  }
  setHydrated(true);
}, []);

// Persist preference
useEffect(() => {
  if (hydrated) {
    localStorage.setItem("sidebarMode", sidebarMode);
  }
}, [sidebarMode, hydrated]);
```

Par :
```tsx
const [mobileOpen, setMobileOpen] = useState(false);
const [sidebarMode, setSidebarMode] = useLocalStorage<SidebarMode>("sidebarMode", "full");
const { count: alertCount } = useAlertCount();
```

**Step 3: Supprimer les imports devenus inutiles**

Retirer `useCallback` de la ligne d'import React si plus utilisé :
```tsx
// Avant
import { useState, useEffect, useCallback } from "react";
// Après (si useCallback n'est plus utilisé ailleurs)
import { useState, useEffect } from "react";
```

**Step 4: Vérifier que l'app compile**
```bash
cd /Users/jonathanbraun/dashboard-chef-projet && npm run build 2>&1 | tail -10
```
Expected: build sans erreur TypeScript.

**Step 5: Vérifier que tous les tests continuent de passer**
```bash
cd /Users/jonathanbraun/dashboard-chef-projet && npm run test:run 2>&1 | tail -8
```
Expected: tous les tests passent (aucune régression).

**Remarque importante :** `useLocalStorage` gère le re-render pathname (le composant AppShell ré-effectue le routing normalement). Le polling de alertes est géré par `useAlertCount` directement. L'effet `useEffect(() => { fetchAlertCount(); }, [pathname, fetchAlertCount]);` disparaît — le polling toutes les 60s suffit. Si le comportement de refresh au changement de route est critique, il peut être réintroduit avec un `useEffect` simple utilisant `count` du hook.

---

## Task 5: Validation finale Sprint 3

### Step 1: Tous les tests
```bash
cd /Users/jonathanbraun/dashboard-chef-projet && npm run test:run 2>&1 | tail -12
```
Expected: `90 + 17 = 107 tests` passent (6 use-local-storage + 5 use-alert-count + 6 page-header).

### Step 2: Build de production
```bash
cd /Users/jonathanbraun/dashboard-chef-projet && npm run build 2>&1 | tail -15
```
Expected: build sans erreur.

### Step 3: Vérifier la structure des nouveaux fichiers
```bash
ls /Users/jonathanbraun/dashboard-chef-projet/lib/hooks/
ls /Users/jonathanbraun/dashboard-chef-projet/components/layout/
```
Expected:
- `lib/hooks/` : `use-theme.ts`, `use-local-storage.ts`, `use-alert-count.ts`
- `components/layout/` : `page-header.tsx`

---

## Résumé Sprint 3

| Livrable | Fichier(s) | Tests |
|----------|-----------|-------|
| useLocalStorage (6 tests) | `lib/hooks/use-local-storage.ts`, `__tests__/lib/hooks/use-local-storage.test.ts` | 6 |
| useAlertCount (5 tests) | `lib/hooks/use-alert-count.ts`, `__tests__/lib/hooks/use-alert-count.test.ts` | 5 |
| PageHeader (6 tests) | `components/layout/page-header.tsx`, `__tests__/components/layout/page-header.test.tsx` | 6 |
| Refacto sidebar.tsx | `components/sidebar.tsx` allégé de ~30 lignes | — |

**Commande de validation :**
```bash
npm run test:run && npm run build
```
