# Dashboard Chef de Projet — CLAUDE.md

## Stack
Next.js 16 App Router, React 19, TypeScript strict, Prisma (SQLite dev / PostgreSQL prod),
TailwindCSS, Shadcn UI, Recharts, Sonner, date-fns, next-auth@5.0.0-beta.30

## Commands
- `npm run test:run` — Vitest CI (239 tests, 23 files)
- `npm run test` — Vitest watch
- `npm run test:e2e` — Playwright E2E (16 tests, Chromium only)
- `npx tsc --noEmit 2>&1 | grep -v use-local-storage` — TypeScript check
- `npm run build` — Production build (prisma generate + next build)
- `npm run db:seed-admin` — Seed admin account (needs ADMIN_EMAIL/ADMIN_PASSWORD/ADMIN_NOM)

## Financial Formula
1 day = 7.5h. CA = (heures/7.5) × TJM. Cost = (heures/7.5) × coutJournalierEmployeur
Margin thresholds: >40% good · 30–40% medium · <30% poor
All logic centralized in `lib/financial.ts` — do not duplicate inline.

## Auth
- Stack: next-auth@5.0.0-beta.30, bcryptjs@3.0.3, JWT, Credentials provider
- Roles: ADMIN / PM / CONSULTANT
- `requireRole()` already includes auth check — never combine with `requireAuth()`
- Key files: auth.ts, lib/auth-guard.ts, lib/middleware-utils.ts, middleware.ts

## Design System — "Professional Dark Soft"
Tokens in `app/globals.css`. Doc in `docs/architecture/DESIGN-SYSTEM.md`.

### Light tokens
- bg: #F5F7FA · surface-raised: #F0F3F8 · primary: #2563EB · primary-hover: #1D4ED8
- border: #E4E8EF · border-muted: #EFF2F6 · ring: #93C5FD

### Dark tokens
- bg: #0C0E14 · surface: #161920 · surface-raised: #1E2130 · border: #252A3A

### Radius
xs=4px · sm=6px · md=10px · lg=14px(cards) · xl=20px · 2xl=24px

### Components
- `badge.tsx`: use soft variants — success-soft, warning-soft, destructive-soft, info, neutral
- `button.tsx`: variant soft + sizes xs/icon-sm/icon-xs available
- `card.tsx`: variants interactive (hover lift) + flat available
- `KpiCard.tsx`: isHero gradient, dot indicator, expand icon, trend column, sparkline, skeleton

### Color system (platform-wide)
- Projets palette: #3b82f6, #6366f1, #14b8a6, #f43f5e, #84cc16, #f97316 — displayed as squares (border-radius:3px)
- Consultants palette: #8B5CF6, #EC4899, #F59E0B, #10B981, #06B6D4, #F97316 — displayed as circles
- Stored in DB: Consultant.couleur, Projet.couleur

### Layout
- Sidebar: vertical (64px collapsed) or horizontal toggle — stored in localStorage `sidebarMode`
- No top AppShell header in vertical mode — content starts directly
- Mobile: minimal hamburger h-12 no breadcrumb
- Themes: light/dark only (no other themes)

## Key Patterns
- Hydration guard required for all localStorage access
- Recharts Tooltip formatter: use `any` types (Recharts complex generics)
- Chart tick color token: `var(--color-muted-foreground)` — NOT `--color-text-secondary`
- localStorage keys: `dashboard-filters`, `dashboard-objectifs`, `dashboard-dismissed-alertes`,
  `projets-filters`, `activites-filtres-sauvegardes`, `executive-objectifs`, `sidebarMode`,
  `calendrier-vue-active`, `calendrier-filtres`

## Testing Rules
- Framework: Vitest v4 + @testing-library/react + @testing-library/jest-dom/vitest
- `vitest.setup.ts` must have `afterEach(cleanup)` from @testing-library/react — required for React components
- `getByText` fails when text appears in both select AND table — use `getByTestId + toHaveTextContent`
- French apostrophes in test strings: use double quotes (e.g. `"affiche l'étape"`)
- Mock ResizeObserver in `beforeAll` for Recharts tests
- data-testid patterns: `kanban-col-{statut}`, `kanban-card-{id}`, `btn-edit-{id}`, `row-{id}`

## Never Do
- Never commit `.env*` files (`.env.production` especially)
- Never use `git add -A` without reviewing what's staged
- Never combine `requireRole()` with `requireAuth()` — redundant
- Never add emoji to UI/code unless explicitly asked
- Never add docstrings/comments to code you didn't change
- Never add error handling for scenarios that can't happen
- Never modify `prisma/dev.db` directly
- Never skip `--no-verify` on git hooks
