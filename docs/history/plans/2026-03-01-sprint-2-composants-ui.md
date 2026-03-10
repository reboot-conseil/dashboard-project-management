# Sprint 2 — Composants UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactoriser `components/ui/` sur les nouveaux tokens du design system, ajouter `tooltip.tsx` et `spinner.tsx`, une variante `glass` sur `Card`, et couvrir les composants clés avec des tests Vitest.

**Architecture:** Token-First — chaque composant consomme les CSS variables de `globals.css` (pas de couleurs hardcodées). Tests TDD pour tout nouveau composant. Composants existants refactorisés sans breaking change.

**Tech Stack:** Next.js 16 App Router · Tailwind v4 · CVA (class-variance-authority) · Vitest · @testing-library/react

---

## Contexte projet

- Racine : `/Users/jonathanbraun/dashboard-chef-projet`
- Tokens CSS : `app/globals.css` (@theme + .dark)
- Tests existants : `__tests__/lib/` (48 tests passent — ne pas les casser)
- Config Vitest : `vitest.config.ts` (NO globals — toujours importer `describe, it, expect` depuis `vitest`)
- Setup tests : `vitest.setup.ts` (importe `@testing-library/jest-dom/vitest`)
- Pas de git dans ce projet — ignorer toutes les étapes `git commit`
- Vérification finale : `npm run test:run && npm run build`

---

## Task 1: Spinner — nouveau composant

**Files:**
- Create: `components/ui/spinner.tsx`
- Create: `__tests__/components/ui/spinner.test.tsx`

**Step 1: Écrire le test en premier (RED)**

Créer `__tests__/components/ui/spinner.test.tsx` :
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Spinner } from '@/components/ui/spinner'

describe('Spinner', () => {
  it('rend un élément avec role="status"', () => {
    render(<Spinner />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
  it('a un texte accessible "Chargement..."', () => {
    render(<Spinner />)
    expect(screen.getByText('Chargement...')).toBeInTheDocument()
  })
  it('accepte un className personnalisé', () => {
    render(<Spinner className="h-8 w-8" />)
    const el = screen.getByRole('status')
    expect(el).toHaveClass('h-8', 'w-8')
  })
  it('accepte une size sm', () => {
    render(<Spinner size="sm" />)
    const el = screen.getByRole('status')
    expect(el).toHaveClass('h-4')
  })
  it('accepte une size lg', () => {
    render(<Spinner size="lg" />)
    const el = screen.getByRole('status')
    expect(el).toHaveClass('h-8')
  })
})
```

**Step 2: Vérifier que le test échoue**
```bash
cd /Users/jonathanbraun/dashboard-chef-projet && npm run test:run -- __tests__/components/ui/spinner.test.tsx
```
Expected: `Cannot find module '@/components/ui/spinner'`

**Step 3: Créer `components/ui/spinner.tsx`**
```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const spinnerVariants = cva(
  "animate-spin rounded-full border-2 border-border border-t-primary",
  {
    variants: {
      size: {
        sm: "h-4 w-4",
        md: "h-6 w-6",
        lg: "h-8 w-8",
      },
    },
    defaultVariants: { size: "md" },
  }
)

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {}

function Spinner({ className, size, ...props }: SpinnerProps) {
  return (
    <div
      role="status"
      className={cn(spinnerVariants({ size }), className)}
      {...props}
    >
      <span className="sr-only">Chargement...</span>
    </div>
  )
}

export { Spinner }
```

**Step 4: Vérifier que les tests passent**
```bash
cd /Users/jonathanbraun/dashboard-chef-projet && npm run test:run -- __tests__/components/ui/spinner.test.tsx
```
Expected: `5 passed`

---

## Task 2: Tooltip — nouveau composant

**Files:**
- Create: `components/ui/tooltip.tsx`
- Create: `__tests__/components/ui/tooltip.test.tsx`

**Step 1: Écrire le test (RED)**

Créer `__tests__/components/ui/tooltip.test.tsx` :
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tooltip } from '@/components/ui/tooltip'

describe('Tooltip', () => {
  it('rend le children', () => {
    render(
      <Tooltip content="Info bulle">
        <button>Hover me</button>
      </Tooltip>
    )
    expect(screen.getByRole('button', { name: 'Hover me' })).toBeInTheDocument()
  })
  it('affiche le contenu du tooltip au hover', async () => {
    const user = userEvent.setup()
    render(
      <Tooltip content="Info bulle">
        <button>Hover me</button>
      </Tooltip>
    )
    await user.hover(screen.getByRole('button'))
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    expect(screen.getByText('Info bulle')).toBeInTheDocument()
  })
  it('masque le tooltip par défaut (pas de role=tooltip visible)', () => {
    render(
      <Tooltip content="Info bulle">
        <button>Hover me</button>
      </Tooltip>
    )
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
})
```

**Step 2: Vérifier que le test échoue**
```bash
cd /Users/jonathanbraun/dashboard-chef-projet && npm run test:run -- __tests__/components/ui/tooltip.test.tsx
```
Expected: `Cannot find module '@/components/ui/tooltip'`

**Step 3: Créer `components/ui/tooltip.tsx`**
```tsx
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface TooltipProps {
  content: React.ReactNode
  children: React.ReactElement
  className?: string
}

function Tooltip({ content, children, className }: TooltipProps) {
  const [visible, setVisible] = React.useState(false)

  return (
    <span className="relative inline-flex">
      {React.cloneElement(children, {
        onMouseEnter: () => setVisible(true),
        onMouseLeave: () => setVisible(false),
        onFocus: () => setVisible(true),
        onBlur: () => setVisible(false),
      })}
      {visible && (
        <span
          role="tooltip"
          className={cn(
            "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1",
            "bg-foreground text-background text-xs rounded-md whitespace-nowrap",
            "shadow-md pointer-events-none z-50",
            className
          )}
        >
          {content}
        </span>
      )}
    </span>
  )
}

export { Tooltip }
```

**Step 4: Vérifier que les tests passent**
```bash
cd /Users/jonathanbraun/dashboard-chef-projet && npm run test:run -- __tests__/components/ui/tooltip.test.tsx
```
Expected: `3 passed`

---

## Task 3: Card — ajouter variante glass

**Files:**
- Modify: `components/ui/card.tsx`
- Create: `__tests__/components/ui/card.test.tsx`

**Step 1: Écrire les tests (certains RED pour la variante glass)**

Créer `__tests__/components/ui/card.test.tsx` :
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'

describe('Card', () => {
  it('rend avec les classes de base', () => {
    const { container } = render(<Card />)
    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass('rounded-lg', 'border', 'border-border', 'bg-card')
  })
  it('accepte un className personnalisé', () => {
    const { container } = render(<Card className="custom-class" />)
    expect(container.firstChild).toHaveClass('custom-class')
  })
  it('variante glass ajoute la classe glass', () => {
    const { container } = render(<Card variant="glass" />)
    expect(container.firstChild).toHaveClass('glass')
  })
  it('sans variante, pas de classe glass', () => {
    const { container } = render(<Card />)
    expect(container.firstChild).not.toHaveClass('glass')
  })
})

describe('CardHeader', () => {
  it('rend les children', () => {
    render(<CardHeader><span>Header</span></CardHeader>)
    expect(screen.getByText('Header')).toBeInTheDocument()
  })
})

describe('CardTitle', () => {
  it('rend le titre', () => {
    render(<CardTitle>Mon Titre</CardTitle>)
    expect(screen.getByText('Mon Titre')).toBeInTheDocument()
  })
})

describe('CardContent', () => {
  it('rend les children', () => {
    render(<CardContent><p>Contenu</p></CardContent>)
    expect(screen.getByText('Contenu')).toBeInTheDocument()
  })
})

describe('CardDescription', () => {
  it('a la classe text-muted-foreground', () => {
    const { container } = render(<CardDescription>Desc</CardDescription>)
    expect(container.firstChild).toHaveClass('text-muted-foreground')
  })
})
```

**Step 2: Vérifier que le test `variante glass` échoue**
```bash
cd /Users/jonathanbraun/dashboard-chef-projet && npm run test:run -- __tests__/components/ui/card.test.tsx
```
Expected: la plupart passent, le test `variante glass ajoute la classe glass` échoue car `variant` n'existe pas.

**Step 3: Modifier `components/ui/card.tsx` pour ajouter la prop `variant`**

Remplacer le fichier :
```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-lg border border-border bg-card text-card-foreground shadow-sm",
  {
    variants: {
      variant: {
        default: "",
        glass: "glass border-0 shadow-md",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

export { Card, CardHeader, CardTitle, CardDescription, CardContent, cardVariants }
```

**Step 4: Vérifier que tous les tests Card passent**
```bash
cd /Users/jonathanbraun/dashboard-chef-projet && npm run test:run -- __tests__/components/ui/card.test.tsx
```
Expected: `8 passed`

---

## Task 4: Button — tests + vérification tokens

**Files:**
- Create: `__tests__/components/ui/button.test.tsx`

Le composant Button existe déjà dans `components/ui/button.tsx`. On ajoute les tests sans modifier le composant (sauf si un token manque).

**Step 1: Créer `__tests__/components/ui/button.test.tsx`**
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('rend avec le texte correct', () => {
    render(<Button>Cliquer</Button>)
    expect(screen.getByRole('button', { name: 'Cliquer' })).toBeInTheDocument()
  })
  it('variante default a bg-primary', () => {
    const { container } = render(<Button>Test</Button>)
    expect(container.firstChild).toHaveClass('bg-primary')
  })
  it('variante destructive a bg-destructive', () => {
    const { container } = render(<Button variant="destructive">Supprimer</Button>)
    expect(container.firstChild).toHaveClass('bg-destructive')
  })
  it('variante outline a border border-border', () => {
    const { container } = render(<Button variant="outline">Outline</Button>)
    expect(container.firstChild).toHaveClass('border', 'border-border')
  })
  it('variante ghost n\'a pas bg-primary', () => {
    const { container } = render(<Button variant="ghost">Ghost</Button>)
    expect(container.firstChild).not.toHaveClass('bg-primary')
  })
  it('size sm a h-9', () => {
    const { container } = render(<Button size="sm">Petit</Button>)
    expect(container.firstChild).toHaveClass('h-9')
  })
  it('disabled est inactif', () => {
    render(<Button disabled>Désactivé</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
  it('appelle onClick quand cliqué', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Clic</Button>)
    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })
  it('ne déclenche pas onClick si disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>Désactivé</Button>)
    await user.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })
})
```

**Step 2: Lancer les tests**
```bash
cd /Users/jonathanbraun/dashboard-chef-projet && npm run test:run -- __tests__/components/ui/button.test.tsx
```
Expected: `9 passed`. Si un test échoue à cause d'un token manquant (ex: `border-border` absent), corrige le composant Button pour utiliser le bon token.

---

## Task 5: Badge — tests + vérification tokens dark mode

**Files:**
- Create: `__tests__/components/ui/badge.test.tsx`

Le composant Badge existe dans `components/ui/badge.tsx`. Les variantes `success` et `warning` utilisent des couleurs Tailwind hardcodées (`emerald-100`, `amber-100`) au lieu des tokens. On les migre vers les tokens du design system.

**Step 1: Créer `__tests__/components/ui/badge.test.tsx`**
```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Badge } from '@/components/ui/badge'

describe('Badge', () => {
  it('variante default a bg-primary', () => {
    const { container } = render(<Badge>Default</Badge>)
    expect(container.firstChild).toHaveClass('bg-primary')
  })
  it('variante secondary a bg-secondary', () => {
    const { container } = render(<Badge variant="secondary">Secondary</Badge>)
    expect(container.firstChild).toHaveClass('bg-secondary')
  })
  it('variante destructive a bg-destructive', () => {
    const { container } = render(<Badge variant="destructive">Danger</Badge>)
    expect(container.firstChild).toHaveClass('bg-destructive')
  })
  it('variante success a bg-success', () => {
    const { container } = render(<Badge variant="success">Succès</Badge>)
    expect(container.firstChild).toHaveClass('bg-success')
  })
  it('variante warning a bg-warning', () => {
    const { container } = render(<Badge variant="warning">Attention</Badge>)
    expect(container.firstChild).toHaveClass('bg-warning')
  })
  it('variante outline a border text-foreground', () => {
    const { container } = render(<Badge variant="outline">Outline</Badge>)
    expect(container.firstChild).toHaveClass('text-foreground')
  })
  it('accepte des children texte', () => {
    const { container } = render(<Badge>Mon badge</Badge>)
    expect(container.firstChild).toHaveTextContent('Mon badge')
  })
})
```

**Step 2: Lancer les tests pour voir les échecs (les variantes success/warning échouent)**
```bash
cd /Users/jonathanbraun/dashboard-chef-projet && npm run test:run -- __tests__/components/ui/badge.test.tsx
```
Expected: tests `success` et `warning` échouent (ils ont `bg-emerald-100` au lieu de `bg-success`).

**Step 3: Migrer `components/ui/badge.tsx` vers les tokens**

Remplacer les variantes success et warning :
```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:     "border-transparent bg-primary text-primary-foreground",
        secondary:   "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline:     "text-foreground",
        success:     "border-transparent bg-success text-success-foreground",
        warning:     "border-transparent bg-warning text-warning-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
```

**Step 4: Vérifier que tous les tests passent**
```bash
cd /Users/jonathanbraun/dashboard-chef-projet && npm run test:run -- __tests__/components/ui/badge.test.tsx
```
Expected: `7 passed`

---

## Task 6: KpiCard — tests

**Files:**
- Create: `__tests__/components/dashboard/kpi-card.test.tsx`

KpiCard existe dans `components/dashboard/KpiCard.tsx`. On ajoute les tests sans modifier le composant.

**Step 1: Créer `__tests__/components/dashboard/kpi-card.test.tsx`**
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { TrendingUp } from 'lucide-react'

const defaultProps = {
  title: 'Chiffre d\'affaires',
  value: '42 500 €',
  icon: <TrendingUp />,
}

describe('KpiCard', () => {
  it('affiche le titre', () => {
    render(<KpiCard {...defaultProps} />)
    expect(screen.getByText("Chiffre d'affaires")).toBeInTheDocument()
  })
  it('affiche la valeur', () => {
    render(<KpiCard {...defaultProps} />)
    expect(screen.getByText('42 500 €')).toBeInTheDocument()
  })
  it('affiche le subtitle quand fourni', () => {
    render(<KpiCard {...defaultProps} subtitle="Mois en cours" />)
    expect(screen.getByText('Mois en cours')).toBeInTheDocument()
  })
  it('n\'affiche pas de subtitle quand absent', () => {
    render(<KpiCard {...defaultProps} />)
    expect(screen.queryByText('Mois en cours')).not.toBeInTheDocument()
  })
  it('affiche le trend positif avec signe +', () => {
    render(<KpiCard {...defaultProps} trend={{ value: 12, label: 'vs mois dernier' }} />)
    expect(screen.getByText('+12%')).toBeInTheDocument()
    expect(screen.getByText('vs mois dernier')).toBeInTheDocument()
  })
  it('affiche le trend négatif sans signe +', () => {
    render(<KpiCard {...defaultProps} trend={{ value: -5, label: 'vs mois dernier' }} />)
    expect(screen.getByText('-5%')).toBeInTheDocument()
  })
  it('affiche trend 0 sans signe +', () => {
    render(<KpiCard {...defaultProps} trend={{ value: 0, label: 'stable' }} />)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })
  it('variante success ne lève pas d\'erreur', () => {
    expect(() => render(<KpiCard {...defaultProps} variant="success" />)).not.toThrow()
  })
  it('variante danger ne lève pas d\'erreur', () => {
    expect(() => render(<KpiCard {...defaultProps} variant="danger" />)).not.toThrow()
  })
})
```

**Step 2: Lancer les tests**
```bash
cd /Users/jonathanbraun/dashboard-chef-projet && npm run test:run -- __tests__/components/dashboard/kpi-card.test.tsx
```
Expected: `9 passed`. Si un test échoue, lire `components/dashboard/KpiCard.tsx` et ajuster les assertions (ne pas modifier le composant).

---

## Task 7: Validation finale Sprint 2

**Step 1: Lancer tous les tests**
```bash
cd /Users/jonathanbraun/dashboard-chef-projet && npm run test:run
```
Expected: tous les tests passent (48 Sprint 1 + nouveaux Sprint 2 = ~91 tests).

**Step 2: Build de production**
```bash
cd /Users/jonathanbraun/dashboard-chef-projet && npm run build 2>&1 | tail -15
```
Expected: build sans erreur.

**Step 3: Vérifier que les imports status-badge.tsx sont toujours valides**
```bash
grep -r "bg-emerald\|bg-amber" /Users/jonathanbraun/dashboard-chef-projet/components/ --include="*.tsx"
```
Si des occurrences restent dans d'autres composants (ex: `status-badge.tsx`), les migrer aussi vers `bg-success` / `bg-warning`.

---

## Résumé Sprint 2

| Livrable | Fichier(s) |
|----------|-----------|
| Spinner (5 tests) | `components/ui/spinner.tsx`, `__tests__/components/ui/spinner.test.tsx` |
| Tooltip (3 tests) | `components/ui/tooltip.tsx`, `__tests__/components/ui/tooltip.test.tsx` |
| Card + variante glass (8 tests) | `components/ui/card.tsx`, `__tests__/components/ui/card.test.tsx` |
| Button (9 tests) | `__tests__/components/ui/button.test.tsx` |
| Badge migrée tokens (7 tests) | `components/ui/badge.tsx`, `__tests__/components/ui/badge.test.tsx` |
| KpiCard (9 tests) | `__tests__/components/dashboard/kpi-card.test.tsx` |

**Commande de validation :**
```bash
npm run test:run && npm run build
```
