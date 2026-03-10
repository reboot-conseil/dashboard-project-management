# Sprint 8 — Animations · A11y · Playwright

> Créé le 2026-03-02 · Approuvé par le product owner

---

## Contexte

Sprint final du design system (sprint 8/8). Les sprints 1-7 ont livré les fondations, composants UI, layout, dashboard, projets, calendrier et activités. Ce sprint apporte le polish final : animations de transition, accessibilité WCAG AA et tests E2E Playwright sur les flux critiques.

**Hors scope :** `/rapports`, `/documents`, `/admin`

---

## 1. Animations (hybride Tailwind + Framer Motion)

### Nouvelle dépendance

- `framer-motion` (~45KB gzip) — uniquement pour les 3 cas qu'il gère mieux que CSS

### Couche CSS Tailwind (globals.css)

4 keyframes exposés comme classes utilitaires Tailwind :

| Classe | Usage | Durée |
|--------|-------|-------|
| `animate-fade-in` | Mount de pages, KPI cards, dialogs | 200ms ease-out |
| `animate-slide-in-right` | Sidebar étape du calendrier | 200ms ease-out |
| `animate-scale-in` | Modales (96%→100% + fade) | 150ms ease-out |
| `transition-base` | Hover states (shorthand) | 150ms ease |

Implémentation dans `globals.css` :

```css
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

.animate-fade-in    { animation: fade-in 200ms ease-out; }
.animate-slide-in-right { animation: slide-in-right 200ms ease-out; }
.animate-scale-in   { animation: scale-in 150ms ease-out; }
.transition-base    { transition: all 150ms ease; }
```

### Couche Framer Motion (3 usages ciblés)

1. **`AnimatePresence`** — animer la sortie du DOM :
   - Alertes dashboard (dismiss)
   - Rows activités (suppression)
   - Dialogs (unmount)

2. **Route transitions** — dans `app/layout.tsx` :
   - Enveloppe `{children}` dans `<AnimatePresence mode="wait">`
   - `<motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-4 }} transition={{ duration: 0.2 }}>`

3. **Kanban layout animations** — dans `components/projets/kanban-board.tsx` :
   - `layoutId` sur les `KanbanCard`
   - `<motion.div layout>` sur les colonnes

### Règle prefers-reduced-motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Et `useReducedMotion()` de Framer Motion sur tous les `motion.*` composants.

---

## 2. A11y pass (WCAG AA critiques)

### Outil

`@axe-core/playwright` — intégré dans les tests E2E, pas de dépendance séparée.

### Pages auditées

- `/` — Dashboard principal
- `/projets` — Liste des projets
- `/projets/[id]` — Détail projet + Kanban
- `/activites` — Saisie des activités
- `/calendrier` — Vue calendrier

### Correctifs ciblés

| Catégorie | Correctif |
|-----------|-----------|
| **Contraste** | Vérifier `--color-text-muted` sur fonds clairs/sombres (ratio ≥ 4.5:1), corriger les tokens si nécessaire |
| **Labels formulaires** | Tous les `<input>`, `<select>` : `<label>` associé ou `aria-label` (formulaires activité, filtres, dialogs) |
| **Focus ring** | `focus-visible:ring-2 focus-visible:ring-primary` sur tous les éléments interactifs sans ring actuel |
| **Keyboard nav** | Tab order logique sur chaque page, corriger les `tabIndex` aberrants |
| **Icônes** | Lucide décoratives → `aria-hidden="true"`, fonctionnelles → `aria-label` |

### Objectif

Zéro violation axe-core de niveau `critical` ou `serious` sur les 5 pages.

---

## 3. Playwright — 4 flux critiques

### Setup

```ts
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  baseURL: 'http://localhost:3000',
  use: { browser: 'chromium' },
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: true,
  },
})
```

### Flux couverts

| Fichier | Flux | Assertions clés |
|---------|------|----------------|
| `e2e/activites.spec.ts` | Création activité via SaisieRapide | Form visible → submit → row apparaît dans liste |
| `e2e/navigation.spec.ts` | Dashboard → click card projet → détail | URL `/projets/[id]`, titre projet visible |
| `e2e/kanban.spec.ts` | Bouton changement statut étape | Étape change de colonne, persistance après reload |
| `e2e/dashboard-filtres.spec.ts` | Filtre période + consultant | KPIs mis à jour, filtre persiste en localStorage |
| `e2e/a11y.spec.ts` | Audit axe-core | 0 violation critical/serious par page |

### Scripts package.json

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

---

## Décisions clés

| Décision | Choix | Raison |
|----------|-------|--------|
| Animation library | Tailwind CSS + Framer Motion ciblé | CSS pour le statique, Framer pour exit/layout/routes |
| Framer Motion scope | 3 usages seulement | Éviter la dépendance généralisée |
| A11y niveau | WCAG AA critiques (axe-core) | Proportionné pour dashboard interne |
| Playwright browser | Chromium uniquement | Dashboard interne, pas de cross-browser requis |
| DB pour E2E | `db:seed` avant les tests | Données stables et reproductibles |
