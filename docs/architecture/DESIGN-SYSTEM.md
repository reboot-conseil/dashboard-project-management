# Design System — PM Dashboard Reboot Conseil
*Finalized 2026-03-07 — Implementation Blueprint*

---

## 1. Design Direction

**Swiss Minimalism + Data-Dense Dashboard**

Inspired by the best patterns across 18+ reference platforms (Sequence, Ledgerix, Connect360, Crextio, Kryptodash, Donezo, KosmoTime, Vento, Taskly, OxeliaMetrix, and others):

- Clean, airy white/light-grey surfaces — data breathes, not cluttered
- Large, confident typography for key metrics
- Minimal accent color usage — one primary, one accent, semantic colors for status only
- Full-height sidebar absorbing the header — no top bar
- Right-aligned detail panels for focused context
- Subtle elevation (shadow) not heavy borders to define card hierarchy

---

## 2. Color Palette

### 2.1 Base Tokens (Light Mode)

```css
/* Page background — very slightly warm grey, not pure white */
--color-background:     #F5F7FA;

/* Card / surface — pure white for maximum contrast against bg */
--color-surface:        #FFFFFF;
--color-surface-raised: #F0F3F8;  /* hover states, nested surfaces */

/* Borders — barely visible hairlines */
--color-border:         #E4E8EF;
--color-border-muted:   #EFF2F6;  /* table dividers, very subtle */

/* Text hierarchy */
--color-foreground:       #0F172A;   /* primary text — near black */
--color-muted-foreground: #64748B;   /* labels, captions, secondary info */
--color-placeholder:      #94A3B8;   /* placeholders, empty states */

/* Primary brand — Reboot blue */
--color-primary:          #2563EB;   /* slightly brighter than current #1d4ed8 */
--color-primary-hover:    #1D4ED8;
--color-primary-light:    #EFF6FF;   /* badge bg, selected row bg */

/* Accent — Reboot violet */
--color-accent:           #7C3AED;
--color-accent-light:     #F5F3FF;

/* Ring / focus */
--color-ring:             #93C5FD;   /* softer focus ring */

/* Semantic */
--color-success:          #16A34A;
--color-success-light:    #F0FDF4;
--color-warning:          #D97706;
--color-warning-light:    #FFFBEB;
--color-destructive:      #DC2626;
--color-destructive-light:#FEF2F2;
--color-info:             #0891B2;
--color-info-light:       #F0F9FF;
```

### 2.2 Dark Mode Overrides

```css
.dark {
  --color-background:     #0C0E14;
  --color-surface:        #161920;
  --color-surface-raised: #1E2130;

  --color-border:         #252A3A;
  --color-border-muted:   #1E2130;

  --color-foreground:       #F1F5F9;
  --color-muted-foreground: #94A3B8;
  --color-placeholder:      #475569;

  --color-primary:          #3B82F6;
  --color-primary-hover:    #60A5FA;
  --color-primary-light:    #1E3A5F;

  --color-ring:             #1D4ED8;
}
```

### 2.3 Project Color Palette (squares, border-radius: 3px)

Maintained from existing system — these identify projects platform-wide:
```
Projet 1: #3B82F6  (blue)
Projet 2: #6366F1  (indigo)
Projet 3: #14B8A6  (teal)
Projet 4: #F43F5E  (rose)
Projet 5: #84CC16  (lime)
Projet 6: #F97316  (orange)
```

### 2.4 Consultant Color Palette (circles)

```
Consultant 1: #8B5CF6  (violet)
Consultant 2: #EC4899  (pink)
Consultant 3: #F59E0B  (amber)
Consultant 4: #10B981  (emerald)
Consultant 5: #06B6D4  (cyan)
Consultant 6: #F97316  (orange)
```

---

## 3. Typography

**Font family: Inter** (already installed via next/font/google)

```
--font-sans: 'Inter', system-ui, -apple-system, sans-serif;
```

### 3.1 Scale

| Role | Size | Weight | Line-height | Usage |
|------|------|--------|-------------|-------|
| `display` | 44px / 2.75rem | 700 | 1.1 | Hero KPI value |
| `h1` | 30px / 1.875rem | 700 | 1.2 | Page titles |
| `h2` | 22px / 1.375rem | 600 | 1.3 | Card titles, section headers |
| `h3` | 16px / 1rem | 600 | 1.4 | Sub-section labels |
| `metric` | 38px / 2.375rem | 700 | 1.1 | Standard KPI card value |
| `metric-sm` | 28px / 1.75rem | 700 | 1.1 | Compact metric |
| `body` | 14px / 0.875rem | 400 | 1.6 | Default body text |
| `body-sm` | 13px / 0.8125rem | 400 | 1.5 | Table content, secondary text |
| `label` | 12px / 0.75rem | 500 | 1.4 | Form labels, KPI labels, column headers |
| `caption` | 11px / 0.6875rem | 400 | 1.3 | Timestamps, footnotes |

### 3.2 Number Rendering

All financial and metric values:
```css
font-variant-numeric: tabular-nums;
letter-spacing: -0.02em;  /* tighter for large numbers */
```

---

## 4. Spacing

**Base unit: 8px**

```
4px   — xs  — tight inline gaps (icon + label)
8px   — sm  — card padding minimal, row gaps
12px  — md  — standard inline padding
16px  — lg  — card padding standard, section gaps
24px  — xl  — section padding, larger gaps
32px  — 2xl — between major sections
48px  — 3xl — page-level padding
```

Card padding: `20px 24px` (comfortable, not cramped like 12px, not too spacious)
Table row height: `48px` minimum (touch targets)
Sidebar item height: `40px`

---

## 5. Border Radius

Increased from current small values to match reference platforms:

```css
--radius-xs:  4px;   /* badges, pills */
--radius-sm:  6px;   /* buttons, inputs */
--radius-md:  10px;  /* small cards, dropdowns */
--radius-lg:  14px;  /* main cards, modals */
--radius-xl:  20px;  /* hero cards, full panels */
--radius-full: 9999px; /* circle avatars, toggle pills */
```

**Key rule**: Cards use `14px`. This is the primary visible change vs current `8px`.

---

## 6. Shadows / Elevation

Three levels only (keep it subtle — the references never use heavy shadows):

```css
/* Level 1 — Card at rest */
--shadow-card:  0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04);

/* Level 2 — Card on hover / dropdown */
--shadow-hover: 0 4px 12px 0 rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.04);

/* Level 3 — Modal / overlay */
--shadow-modal: 0 20px 40px -8px rgba(0,0,0,0.14);
```

Dark mode: multiply opacity by ~1.5 (shadows more visible on dark bg).

---

## 7. Layout System

### 7.1 Sidebar (full absorption — no top header)

```
Width (expanded): 240px
Width (collapsed): 64px  (icon only)
Transition: 200ms ease

Structure (top → bottom):
  [Logo / Brand]          — 64px height
  [Search  ⌘K]            — 40px height, mx-3
  [Nav sections]          — flex-1, overflow-y auto
    Section label (12px uppercase, letter-spacing 0.08em, muted)
    Nav items (icon + label, 40px height, rounded-md mx-2)
  [Divider]
  [Theme toggle]          — 40px
  [User card]             — 56px (avatar + name + role)
```

Nav item states:
- Default: transparent bg, foreground color
- Hover: `--color-surface-raised` bg, foreground
- Active: `--color-primary-light` bg, `--color-primary` text+icon

### 7.2 Page Layout

```
Main area = full width minus sidebar
Page padding: 24px (all sides)
Max content width: none (full-width for tables/calendars)
Page header: 56px fixed — [page title left] [period tabs center or right] [+ CTA button right]
```

### 7.3 KPI Card Grid

```
grid-template-columns: 2fr 1fr 1fr 1fr
gap: 16px

Hero card (2fr): gradient background, value 44px
Standard cards (1fr): white bg, value 38px
```

---

## 8. Component Specifications

### 8.1 KPI Card Anatomy

```
┌─────────────────────────────────────────┐
│  Label (12px, muted, uppercase)         │
│                                         │
│  Value (44px / 38px, bold, tight kern)  │
│                                         │
│  [Sparkline ─────────] [▲ 3.2%     ]   │
│                        [vs M-1     ]   │
└─────────────────────────────────────────┘
```

- Padding: 20px 24px
- Border-radius: 14px
- Shadow: `--shadow-card`
- Hover shadow: `--shadow-hover`
- Expand icon (↗) top-right, 16px, appears on hover
- Trend column: `flex-direction: column; align-items: flex-end; margin-left: auto`
- Hero card: gradient `135deg, #1E40AF 0%, #3B82F6 60%, #60A5FA 100%`, text white, no decorative shapes

### 8.2 Status Badges

```
Planifié  — bg: #F1F5F9, text: #475569   (slate)
En cours  — bg: #FEF3C7, text: #92400E   (amber)
Validée   — bg: #F0FDF4, text: #15803D   (green)
En retard — bg: #FEF2F2, text: #DC2626   (red)
```

Height: 22px, padding: 2px 8px, border-radius: 4px (`--radius-xs`), font: 12px / weight 500.

### 8.3 Table Rows

- Height: 48px min
- Hover: `--color-surface-raised` bg
- Border: bottom `1px solid --color-border-muted`
- No left/right borders on rows
- Column header: 12px, 500 weight, uppercase, `--color-muted-foreground`, `letter-spacing: 0.06em`
- Project column: colored square (3px radius, 10x10px) + name inline
- Consultant column: plain name text (no avatar circle)

### 8.4 Calendar Event Bars

- Height: 22px
- Border-radius: 4px (full bar), 4px 0 0 4px (start of multi-day), 0 4px 4px 0 (end)
- Background: project color at 90% opacity
- Text: white, 11px, font-weight 600, truncated
- Vertical stacking gap: 3px between bars in same day cell

### 8.5 Right Detail Panel

- Width: 320px
- Slides in from right (translateX animation, 200ms ease-out)
- Background: `--color-surface`
- Border-left: `1px solid --color-border`
- Close button: top-right, 32x32px

### 8.6 Inputs & Forms

- Height: 36px (standard), 32px (compact/filter)
- Border: `1px solid --color-border`
- Border-radius: `--radius-sm` (6px)
- Focus: `border-color: --color-primary`, `box-shadow: 0 0 0 3px --color-ring`
- Background: `--color-surface`

---

## 9. Motion & Animation

```css
/* Micro-interactions */
transition-base: all 150ms ease;

/* Entrance animations */
fade-in:        opacity 0→1 + translateY 4px→0, 200ms ease-out
slide-in-right: opacity 0→1 + translateX 12px→0, 200ms ease-out
scale-in:       opacity 0→1 + scale 0.96→1, 150ms ease-out

/* Page transitions */
duration: 250ms ease-in-out
```

All animations respect `prefers-reduced-motion: reduce`.

---

## 10. Splash Screen (Post-Login)

- Full-screen overlay: gradient `135deg, #1E3A8A → #2563EB`
- Content: "Bonjour [Prénom]" (32px, bold, white) + current date (16px, white/70)
- Duration: 2.2s, then fade-out 400ms
- Guard: `localStorage.getItem('session-welcomed')` — shows once per session

---

## 11. Theme Strategy

Three themes supported:

| Theme | Class | Primary | Bg | Notes |
|-------|-------|---------|-----|-------|
| Default (Blue) | (none) | #2563EB | #F5F7FA | New default |
| Dark | `.dark` | #3B82F6 | #0C0E14 | Combined with any theme |
| Cerise | `.theme-cerise` | #F50C8B | #FAFAFA | Kept for demo |
| Reboot | `.theme-reboot` | #EE6F03 | #F4F0EC | Brand identity |
| Sobre | `[data-color-theme="sobre"]` | #475569 | #FAFAF9 | Kept |

---

## 12. Implementation Priorities

**Sprint A — Tokens & Base** (globals.css + layout.tsx)
1. Update color tokens (background, radius, shadows)
2. Increase card border-radius to 14px globally
3. Typography scale additions (display, metric)

**Sprint B — Sidebar Refactor** (components/sidebar.tsx)
1. Remove all top header references
2. Search bar at bottom of nav, above controls
3. User card at very bottom

**Sprint C — KPI Cards** (components/dashboard/KpiCard.tsx)
1. Hero card gradient with new token values
2. Trend column stacked right-aligned
3. Expand icon on hover

**Sprint D — Pages**
1. Page headers: remove titles, add period tabs + CTA
2. Activity rows: single-line with color square
3. Calendar: multi-day event bar system

**Sprint E — Splash Screen**
1. Component + session guard
2. Integration in layout.tsx

---

## 13. What NOT to Change

- Financial calculation logic (CA, marge, cost formulas)
- API routes structure
- Auth system (NextAuth v5)
- Test suite architecture
- Prisma schema / DB structure
- Recharts chart types (only reskin colors/fonts)
