# Sprint 9 — Phase A : UX & Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Corriger toutes les incohérences visuelles, nettoyer la navigation, uniformiser les en-têtes, ajouter une page /parametres avec palette de couleurs et raccourcis, et implémenter le drag & drop sur le Gantt.

**Architecture:** Les changements sont majoritairement UI (pas de nouveau modèle de données sauf l'extension du PATCH etapes). Chaque tâche est indépendante et committable séparément. Priorité : corrections bloquantes d'abord, puis nouvelles fonctionnalités.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, TailwindCSS v4, Shadcn UI, Lucide React, Prisma. Drag & drop via Pointer Events natifs (pas de lib supplémentaire).

---

## Task 1 : Nettoyage sidebar & suppression exports placeholder

**Files:**
- Modify: `components/sidebar.tsx`
- Modify: `components/dashboard/DashboardHeader.tsx`

### Step 1 : Retirer "Rapports", "Teams Config", "Audit" de la sidebar

Dans `components/sidebar.tsx`, la constante `NAV_ITEMS` ligne ~20 contient ces entrées. Les supprimer :

```ts
const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/consultants", label: "Consultants", icon: Users },
  { href: "/projets", label: "Projets", icon: FolderOpen },
  { href: "/activites", label: "Activités", icon: Clock },
  { href: "/calendrier", label: "Calendrier", icon: CalendarDays },
  { href: "/documents", label: "Documents", icon: FileText },
  // "Rapports" supprimé (page supprimée en Task 4)
  // "Teams Config" supprimé (accessible via /parametres)
  // "Audit" supprimé (page non fonctionnelle)
];
```

Supprimer aussi les imports inutilisés : `BarChart3`, `Settings2`, `ShieldCheck`.

Ajouter en bas de `NAV_ITEMS` un lien Paramètres (sera créé en Task 7) :
```ts
{ href: "/parametres", label: "Paramètres", icon: Settings },
```
Importer `Settings` depuis `lucide-react`.

### Step 2 : Retirer onExport du DashboardHeader

Dans `components/dashboard/DashboardHeader.tsx`, supprimer :
- La prop `onExport?: (type: "pdf" | "excel" | "email") => void`
- Le bloc JSX `{onExport && ( <DropdownMenu>...</DropdownMenu> )}`
- Les imports `FileText`, `Sheet`, `Mail`, `ChevronDown`, `DropdownMenu*`

L'interface devient :
```ts
export interface DashboardHeaderProps {
  viewName: string;
  icon: React.ReactNode;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  children?: React.ReactNode;
  className?: string;
}
```

### Step 3 : Supprimer les appels onExport dans les vues dashboard

Chercher `onExport` dans :
- `components/dashboard/DashboardOperationnel.tsx`
- `components/dashboard/DashboardConsultants.tsx`
- `components/dashboard/DashboardStrategique.tsx`

Supprimer les props `onExport` passées à `DashboardHeader` et les handlers associés (fonctions `handleExport` ou similaires).

### Step 4 : Vérifier que le build TypeScript passe

```bash
cd /Users/jonathanbraun/dashboard-chef-projet && npx tsc --noEmit
```
Attendu : 0 erreurs de type liées aux suppressions.

### Step 5 : Lancer les tests unitaires

```bash
npm run test:run
```
Attendu : 239 tests passent (aucun test ne dépend de onExport ou des liens sidebar supprimés).

### Step 6 : Commit

```bash
git add components/sidebar.tsx components/dashboard/DashboardHeader.tsx \
  components/dashboard/DashboardOperationnel.tsx \
  components/dashboard/DashboardConsultants.tsx \
  components/dashboard/DashboardStrategique.tsx
git commit -m "chore(ux): remove unused sidebar links and placeholder export buttons"
```

---

## Task 2 : Fix bouton "Enregistrer" SaisieRapide

**Files:**
- Modify: `components/activites/saisie-rapide.tsx`
- Test: `__tests__/components/activites/saisie-rapide-layout.test.tsx` (nouveau)

### Step 1 : Identifier le problème

Dans `components/activites/saisie-rapide.tsx` ligne 59 :
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 items-end">
```
Le dernier enfant (ligne 145) est `flex items-end gap-3` avec checkbox + bouton. Le problème : sur `lg`, la grille à 7 colonnes ne laisse pas assez de place pour ce bloc, et le bouton n'a pas de `min-w`.

### Step 2 : Écrire le test de rendu

Créer `__tests__/components/activites/saisie-rapide-layout.test.tsx` :

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SaisieRapide } from "@/components/activites/saisie-rapide";

const baseProps = {
  consultants: [],
  projets: [],
  etapes: [],
  etapesLoading: false,
  activites: [],
  form: {
    consultantId: "", projetId: "", etapeId: "",
    date: "2026-03-02", heures: "", description: "", facturable: true,
  },
  saving: false,
  heuresRef: { current: null },
  onFormChange: vi.fn(),
  onSave: vi.fn(),
};

describe("SaisieRapide layout", () => {
  it("renders the save button without overflow", () => {
    render(<SaisieRapide {...baseProps} />);
    const btn = screen.getByTestId("btn-enregistrer");
    expect(btn).toBeInTheDocument();
    // Le bouton doit être dans un conteneur avec min-w-0
    expect(btn.closest(".min-w-0, .w-full, [class*='min-w']")).toBeTruthy();
  });
});
```

### Step 3 : Lancer le test (il doit échouer)

```bash
npm run test:run -- __tests__/components/activites/saisie-rapide-layout.test.tsx
```
Attendu : FAIL — le bouton n'est pas dans un conteneur min-w-0.

### Step 4 : Corriger le layout dans SaisieRapide

Modifier le bloc final (ligne 145) pour que le bouton ne déborde pas :

```tsx
{/* Dernière ligne : facturable + enregistrer — span complet */}
<div className="col-span-full flex flex-wrap items-end gap-3">
  <div className="flex items-center gap-2 pb-1">
    <Checkbox
      id="saisie-facturable"
      checked={form.facturable}
      onCheckedChange={(v) => onFormChange("facturable", v as boolean)}
    />
    <Label htmlFor="saisie-facturable" className="text-xs cursor-pointer">Facturable</Label>
  </div>
  <Button
    onClick={onSave}
    disabled={saving}
    className="min-w-[140px]"
    data-testid="btn-enregistrer"
  >
    <Save className="h-4 w-4" />
    {saving ? "Enregistrement..." : "Enregistrer"}
  </Button>
</div>
```

Note : ajouter `col-span-full` au wrapper et `min-w-[140px]` au bouton (au lieu de `flex-1` qui causait le débordement).

### Step 5 : Relancer le test

```bash
npm run test:run -- __tests__/components/activites/saisie-rapide-layout.test.tsx
```
Attendu : PASS.

### Step 6 : Vérifier que les 239 tests passent encore

```bash
npm run test:run
```
Attendu : 240 tests passent.

### Step 7 : Commit

```bash
git add components/activites/saisie-rapide.tsx \
  __tests__/components/activites/saisie-rapide-layout.test.tsx
git commit -m "fix(activites): save button no longer overflows on narrow screens"
```

---

## Task 3 : Fix filtre "Facturable" masquant des éléments

**Files:**
- Modify: `components/activites/activites-list.tsx`

### Step 1 : Identifier le problème

Dans `activites-list.tsx` lignes 55-86, le filtre `filtreFacturable` est le dernier élément d'un `grid grid-cols-2 sm:grid-cols-4`. Sur mobile il se place en 2ème colonne de la 2ème ligne, et la `div` de boutons périodes prend toute la largeur — ce qui pousse le select en dehors de la grille visible.

### Step 2 : Restructurer la barre de filtres

Remplacer le `grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4` par une structure en deux lignes claires :

```tsx
{/* Ligne 1 : filtres principaux */}
<div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-2">
  <Select value={filtreConsultant} onChange={(e) => onFiltreConsultant(e.target.value)} aria-label="Filtrer par consultant">
    <option value="">Tous les consultants</option>
    {consultants.map((c) => (
      <option key={c.id} value={c.id}>{c.nom}</option>
    ))}
  </Select>

  <Select value={filtreProjet} onChange={(e) => onFiltreProjet(e.target.value)} aria-label="Filtrer par projet">
    <option value="">Tous les projets</option>
    {projets.map((p) => (
      <option key={p.id} value={p.id}>{p.nom}</option>
    ))}
  </Select>

  <Select value={filtreFacturable} onChange={(e) => onFiltreFacturable(e.target.value)} aria-label="Filtrer par facturation">
    <option value="">Toutes</option>
    <option value="true">Facturables</option>
    <option value="false">Non facturables</option>
  </Select>
</div>

{/* Ligne 2 : filtre période */}
<div className="flex flex-wrap gap-1.5 mb-4">
  {PERIODES.map((p) => (
    <Button
      key={p.value}
      variant={filtrePeriode === p.value ? "default" : "outline"}
      size="sm"
      className="flex-none text-xs"
      onClick={() => onFiltrePeriode(p.value)}
    >
      {p.label}
    </Button>
  ))}
</div>
```

### Step 3 : Lancer les tests existants pour Activités

```bash
npm run test:run -- __tests__/components/activites/
```
Attendu : 24 tests passent (11 helpers + 13 activites-list).

### Step 4 : Commit

```bash
git add components/activites/activites-list.tsx
git commit -m "fix(activites): move facturable filter to top row, prevents element occlusion"
```

---

## Task 4 : Suppression de /rapports + redistribution des exports CSV

**Files:**
- Delete: `app/rapports/page.tsx`
- Delete: `components/rapports-charts.tsx`
- Modify: `app/activites/page.tsx`
- Modify: `app/projets/page.tsx`
- Modify: `app/consultants/page.tsx`
- Modify: `app/executive/page.tsx`

### Step 1 : Supprimer la page rapports et ses charts

```bash
rm /Users/jonathanbraun/dashboard-chef-projet/app/rapports/page.tsx
rm /Users/jonathanbraun/dashboard-chef-projet/components/rapports-charts.tsx
```

Vérifier qu'aucun fichier n'importe depuis `rapports-charts` :
```bash
grep -r "rapports-charts" /Users/jonathanbraun/dashboard-chef-projet/app /Users/jonathanbraun/dashboard-chef-projet/components
```
Attendu : aucun résultat.

### Step 2 : Ajouter export CSV Activités

Dans `app/activites/page.tsx`, ajouter une fonction `exportCsvActivites` et un bouton dans le `PageHeader` (ajouté en Task 5, mais anticiper le slot `actions`) :

```ts
function exportCsvActivites(activites: Activite[]) {
  const rows = [
    ["Date", "Consultant", "Projet", "Étape", "Heures", "Facturable", "Description"],
    ...activites.map((a) => [
      a.date,
      a.consultant?.nom ?? "",
      a.projet?.nom ?? "",
      a.etape?.nom ?? "",
      String(a.heures),
      a.facturable ? "Oui" : "Non",
      a.description ?? "",
    ]),
  ];
  const csv = rows.map((r) => r.map((v) => `"${v}"`).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `activites-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
```

Le bouton sera ajouté dans les `actions` du `PageHeader` à la Task 5.

### Step 3 : Ajouter export CSV Projets

Dans `app/projets/page.tsx`, ajouter :

```ts
function exportCsvProjets(projets: ProjetCard[]) {
  const rows = [
    ["Nom", "Client", "Statut", "Budget (€)", "CA Réel (€)", "Marge (%)", "Progression (%)"],
    ...projets.map((p) => [
      p.nom,
      p.client,
      p.statut,
      String(p.budget ?? ""),
      String(Math.round(p.caReel ?? 0)),
      String(Math.round(p.margePct ?? 0)),
      String(Math.round(p.progression ?? 0)),
    ]),
  ];
  const csv = rows.map((r) => r.map((v) => `"${v}"`).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `projets-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
```

### Step 4 : Vérifier le build TypeScript

```bash
npx tsc --noEmit
```
Attendu : 0 erreurs.

### Step 5 : Commit

```bash
git add app/activites/page.tsx app/projets/page.tsx app/consultants/page.tsx app/executive/page.tsx
git rm app/rapports/page.tsx components/rapports-charts.tsx
git commit -m "feat(exports): remove /rapports, add CSV export functions to each page"
```

---

## Task 5 : Uniformisation PageHeader sur toutes les pages

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/activites/page.tsx`
- Modify: `app/projets/page.tsx`
- Modify: `app/projets/[id]/page.tsx`
- Modify: `app/consultants/page.tsx`
- Modify: `app/executive/page.tsx`
- Modify: `app/calendrier/page.tsx`
- Modify: `app/documents/page.tsx`

### Step 1 : Dashboard principal (app/page.tsx)

Ajouter `PageHeader` au-dessus des `Tabs` :

```tsx
import { PageHeader } from "@/components/layout/page-header";
import { LayoutDashboard } from "lucide-react";

// Dans le return :
<div className="min-h-screen p-6 md:p-10 max-w-7xl mx-auto">
  <PageHeader
    title="Dashboard"
    subtitle="Vue d'ensemble de vos projets et consultants"
    icon={<LayoutDashboard className="h-5 w-5" />}
  />
  <Tabs value={vue} onValueChange={setVue}>
    {/* ... inchangé */}
  </Tabs>
</div>
```

### Step 2 : Page Activités (app/activites/page.tsx)

Remplacer tout h1/titre existant par :

```tsx
import { PageHeader } from "@/components/layout/page-header";
import { Clock, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

// Dans le return (en haut du JSX, avant SaisieRapide) :
<PageHeader
  title="Activités"
  subtitle={`${activites.length} activité${activites.length > 1 ? "s" : ""} sur la période`}
  icon={<Clock className="h-5 w-5" />}
  actions={
    <Button variant="outline" size="sm" onClick={() => exportCsvActivites(activites)}>
      <Download className="h-4 w-4 mr-1.5" />
      Exporter CSV
    </Button>
  }
/>
```

### Step 3 : Page Projets (app/projets/page.tsx)

```tsx
import { PageHeader } from "@/components/layout/page-header";
import { FolderOpen, Download, Plus } from "lucide-react";

<PageHeader
  title="Projets"
  subtitle={`${projets.length} projet${projets.length > 1 ? "s" : ""}`}
  icon={<FolderOpen className="h-5 w-5" />}
  actions={
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => exportCsvProjets(projets)}>
        <Download className="h-4 w-4 mr-1.5" />
        Exporter
      </Button>
      <Button size="sm" onClick={() => setDialogOpen(true)}>
        <Plus className="h-4 w-4 mr-1.5" />
        Nouveau projet
      </Button>
    </div>
  }
/>
```

### Step 4 : Page Consultants (app/consultants/page.tsx)

```tsx
import { PageHeader } from "@/components/layout/page-header";
import { Users, UserPlus } from "lucide-react";

<PageHeader
  title="Consultants"
  subtitle={`${consultants.length} consultant${consultants.length > 1 ? "s" : ""}`}
  icon={<Users className="h-5 w-5" />}
  actions={
    <Button size="sm" onClick={() => setDialogOpen(true)}>
      <UserPlus className="h-4 w-4 mr-1.5" />
      Nouveau consultant
    </Button>
  }
/>
```

### Step 5 : Page Executive (app/executive/page.tsx)

Remplacer le titre existant (h1/h2 libre) par :

```tsx
import { PageHeader } from "@/components/layout/page-header";
import { TrendingUp, Download } from "lucide-react";

<PageHeader
  title="Vue Dirigeant"
  subtitle="Performance annuelle et indicateurs stratégiques"
  icon={<TrendingUp className="h-5 w-5" />}
  actions={
    <Button variant="outline" size="sm" onClick={() => exportCsvFacturation(data?.facturation ?? [])}>
      <Download className="h-4 w-4 mr-1.5" />
      Export facturation
    </Button>
  }
/>
```

### Step 6 : Page Calendrier (app/calendrier/page.tsx)

```tsx
import { PageHeader } from "@/components/layout/page-header";
import { CalendarDays } from "lucide-react";

<PageHeader
  title="Calendrier"
  subtitle="Planification des étapes et charge équipe"
  icon={<CalendarDays className="h-5 w-5" />}
/>
```

### Step 7 : Page Documents (app/documents/page.tsx)

```tsx
import { PageHeader } from "@/components/layout/page-header";
import { FileText, Upload } from "lucide-react";

<PageHeader
  title="Documents"
  subtitle="Ingestion et analyse IA de vos documents"
  icon={<FileText className="h-5 w-5" />}
  actions={
    <Button size="sm" asChild>
      <Link href="/documents/upload">
        <Upload className="h-4 w-4 mr-1.5" />
        Importer
      </Link>
    </Button>
  }
/>
```

### Step 8 : Vérifier le build TypeScript

```bash
npx tsc --noEmit
```
Attendu : 0 erreurs.

### Step 9 : Lancer tous les tests

```bash
npm run test:run
```
Attendu : tous les tests passent.

### Step 10 : Commit

```bash
git add app/page.tsx app/activites/page.tsx app/projets/page.tsx \
  app/projets/[id]/page.tsx app/consultants/page.tsx app/executive/page.tsx \
  app/calendrier/page.tsx app/documents/page.tsx
git commit -m "feat(ux): apply PageHeader consistently across all pages with CSV export actions"
```

---

## Task 6 : Thème "Sobre & Classe" — tokens CSS + hook

**Files:**
- Modify: `app/globals.css`
- Modify: `lib/hooks/use-theme.ts`
- Create: `lib/hooks/use-color-theme.ts`

### Step 1 : Écrire le test du hook

Créer `__tests__/lib/hooks/use-color-theme.test.ts` :

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock localStorage
const store: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
});

// Mock document.documentElement
vi.stubGlobal("document", {
  documentElement: { setAttribute: vi.fn(), getAttribute: vi.fn(() => null) },
});

import { useColorTheme } from "@/lib/hooks/use-color-theme";

describe("useColorTheme", () => {
  beforeEach(() => { Object.keys(store).forEach((k) => delete store[k]); });

  it("defaults to classique", () => {
    const { result } = renderHook(() => useColorTheme());
    expect(result.current.colorTheme).toBe("classique");
  });

  it("toggles to sobre", () => {
    const { result } = renderHook(() => useColorTheme());
    act(() => result.current.setColorTheme("sobre"));
    expect(result.current.colorTheme).toBe("sobre");
  });

  it("persists to localStorage", () => {
    const { result } = renderHook(() => useColorTheme());
    act(() => result.current.setColorTheme("sobre"));
    expect(store["color-theme"]).toBe("sobre");
  });
});
```

### Step 2 : Lancer le test (il doit échouer)

```bash
npm run test:run -- __tests__/lib/hooks/use-color-theme.test.ts
```
Attendu : FAIL — module not found.

### Step 3 : Créer le hook use-color-theme.ts

Créer `lib/hooks/use-color-theme.ts` :

```ts
"use client";

import { useState, useEffect } from "react";

export type ColorTheme = "classique" | "sobre";

export function useColorTheme() {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>("classique");

  useEffect(() => {
    const saved = localStorage.getItem("color-theme") as ColorTheme | null;
    const initial: ColorTheme = saved === "sobre" ? "sobre" : "classique";
    applyColorTheme(initial);
    setColorThemeState(initial);
  }, []);

  function setColorTheme(theme: ColorTheme) {
    applyColorTheme(theme);
    localStorage.setItem("color-theme", theme);
    setColorThemeState(theme);
  }

  return { colorTheme, setColorTheme };
}

function applyColorTheme(theme: ColorTheme) {
  document.documentElement.setAttribute("data-color-theme", theme);
}
```

### Step 4 : Relancer le test

```bash
npm run test:run -- __tests__/lib/hooks/use-color-theme.test.ts
```
Attendu : PASS (3 tests).

### Step 5 : Ajouter les tokens CSS du thème "Sobre" dans globals.css

À la fin de `app/globals.css`, ajouter :

```css
/* ── Thème "Sobre & Classe" ──────────────────────────────────── */
[data-color-theme="sobre"] {
  --color-background:     #fafaf9;
  --color-surface:        #ffffff;
  --color-surface-raised: #f5f5f4;

  --color-primary:        #475569;
  --color-primary-hover:  #334155;
  --color-accent:         #92400e;

  --color-success:        #166534;
  --color-warning:        #92400e;

  --color-foreground:     #1c1917;
  --color-muted-foreground: #6b7280;
  --color-border:         #e7e5e4;
  --color-ring:           #475569;

  /* Consultants palette — tons sourds */
  --color-consultant-1: #6d5ea8;   /* violet grisé */
  --color-consultant-2: #b06070;   /* rose poudré */
  --color-consultant-3: #8a6b30;   /* ocre */
  --color-consultant-4: #3d7a5c;   /* vert sauge */
  --color-consultant-5: #3b7088;   /* bleu canard */
  --color-consultant-6: #8a5530;   /* terre cuite */

  /* Projets palette — teintes neutres */
  --color-projet-1: #475569;
  --color-projet-2: #4b5563;
  --color-projet-3: #374151;
  --color-projet-4: #52525b;
  --color-projet-5: #3f6212;
  --color-projet-6: #7c2d12;
}

[data-color-theme="sobre"].dark {
  --color-background:     #1c1917;
  --color-surface:        #292524;
  --color-surface-raised: #1c1917;
  --color-primary:        #94a3b8;
  --color-primary-hover:  #cbd5e1;
  --color-foreground:     #f5f5f4;
  --color-muted-foreground: #a8a29e;
  --color-border:         #3d3836;
}
```

### Step 6 : Commit

```bash
git add lib/hooks/use-color-theme.ts app/globals.css \
  __tests__/lib/hooks/use-color-theme.test.ts
git commit -m "feat(theme): add Sobre & Classe color theme with CSS tokens and hook"
```

---

## Task 7 : Page /parametres

**Files:**
- Create: `app/parametres/page.tsx`

### Step 1 : Créer la page

Créer `app/parametres/page.tsx` :

```tsx
"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Settings } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useColorTheme, type ColorTheme } from "@/lib/hooks/use-color-theme";
import { useTheme } from "@/lib/hooks/use-theme";
import { cn } from "@/lib/utils";

const COLOR_THEMES: { value: ColorTheme; label: string; description: string; preview: string[] }[] = [
  {
    value: "classique",
    label: "Classique",
    description: "Bleu vif, couleurs saturées — thème par défaut",
    preview: ["#1d4ed8", "#3b82f6", "#8B5CF6", "#EC4899", "#10B981"],
  },
  {
    value: "sobre",
    label: "Sobre & Classe",
    description: "Bleu ardoise, tons neutres et élégants",
    preview: ["#475569", "#94a3b8", "#6d5ea8", "#3d7a5c", "#8a6b30"],
  },
];

export default function ParametresPage() {
  const { colorTheme, setColorTheme } = useColorTheme();
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-4xl mx-auto">
      <PageHeader
        title="Paramètres"
        subtitle="Préférences d'affichage et configuration"
        icon={<Settings className="h-5 w-5" />}
      />

      <div className="space-y-6">
        {/* Apparence */}
        <Card>
          <CardHeader>
            <CardTitle>Apparence</CardTitle>
            <CardDescription>Choisissez le thème visuel de l'application</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Mode clair / sombre */}
            <div>
              <p className="text-sm font-medium mb-3">Mode</p>
              <div className="flex gap-3">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  size="sm"
                  onClick={() => theme === "dark" && toggle()}
                >
                  Clair
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  onClick={() => theme === "light" && toggle()}
                >
                  Sombre
                </Button>
              </div>
            </div>

            {/* Palette de couleurs */}
            <div>
              <p className="text-sm font-medium mb-3">Palette de couleurs</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {COLOR_THEMES.map((ct) => (
                  <button
                    key={ct.value}
                    onClick={() => setColorTheme(ct.value)}
                    className={cn(
                      "text-left p-4 rounded-lg border-2 transition-colors",
                      colorTheme === ct.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    )}
                    aria-pressed={colorTheme === ct.value}
                  >
                    <div className="flex gap-2 mb-2">
                      {ct.preview.map((color, i) => (
                        <div
                          key={i}
                          className="h-5 w-5 rounded-full border border-black/10"
                          style={{ backgroundColor: color }}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                    <p className="font-medium text-sm">{ct.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{ct.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Raccourcis clavier */}
        <Card>
          <CardHeader>
            <CardTitle>Raccourcis clavier</CardTitle>
            <CardDescription>Utilisez le bouton <kbd className="px-1.5 py-0.5 rounded border text-xs font-mono">?</kbd> sur chaque page pour afficher les raccourcis disponibles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
              {[
                { keys: "Ctrl+1/2/3", action: "Changer de vue Dashboard" },
                { keys: "?", action: "Afficher les raccourcis de la page" },
                { keys: "Échap", action: "Fermer les modales / panels" },
              ].map(({ keys, action }) => (
                <div key={keys} className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
                  <span className="text-sm text-muted-foreground">{action}</span>
                  <kbd className="px-2 py-0.5 rounded border bg-muted text-xs font-mono">{keys}</kbd>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

### Step 2 : Vérifier le build TypeScript

```bash
npx tsc --noEmit
```
Attendu : 0 erreurs.

### Step 3 : Commit

```bash
git add app/parametres/page.tsx
git commit -m "feat(parametres): add settings page with color theme picker and shortcuts info"
```

---

## Task 8 : Popup raccourcis clavier (bouton "?")

**Files:**
- Create: `lib/shortcuts.ts`
- Create: `components/ui/shortcuts-modal.tsx`
- Modify: `app/layout.tsx` (intégration globale)

### Step 1 : Créer lib/shortcuts.ts

```ts
export interface Shortcut {
  keys: string;
  action: string;
}

export interface PageShortcuts {
  page: string;
  shortcuts: Shortcut[];
}

export const SHORTCUTS_BY_PAGE: Record<string, Shortcut[]> = {
  "/": [
    { keys: "Ctrl+1", action: "Vue Opérationnelle" },
    { keys: "Ctrl+2", action: "Vue Consultants" },
    { keys: "Ctrl+3", action: "Vue Stratégique" },
  ],
  "/activites": [
    { keys: "Ctrl+S", action: "Enregistrer l'activité" },
    { keys: "Ctrl+F", action: "Focus sur la recherche" },
  ],
  "/projets": [
    { keys: "N", action: "Nouveau projet" },
  ],
  "/calendrier": [
    { keys: "←/→", action: "Mois précédent / suivant" },
    { keys: "1/2/3", action: "Vue Mois / Gantt / Charge Équipe" },
  ],
};

export const GLOBAL_SHORTCUTS: Shortcut[] = [
  { keys: "?", action: "Afficher les raccourcis" },
  { keys: "Échap", action: "Fermer les modales" },
];
```

### Step 2 : Créer le composant shortcuts-modal.tsx

Créer `components/ui/shortcuts-modal.tsx` :

```tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { SHORTCUTS_BY_PAGE, GLOBAL_SHORTCUTS, type Shortcut } from "@/lib/shortcuts";
import { Keyboard } from "lucide-react";

export function ShortcutsModal() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const pageShortcuts = SHORTCUTS_BY_PAGE[pathname] ?? [];
  const allShortcuts: Shortcut[] = [...GLOBAL_SHORTCUTS, ...pageShortcuts];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-4 w-4" aria-hidden="true" />
            Raccourcis clavier
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-1 mt-2">
          {allShortcuts.map(({ keys, action }) => (
            <div key={keys} className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
              <span className="text-sm text-muted-foreground">{action}</span>
              <kbd className="px-2 py-0.5 rounded border bg-muted text-xs font-mono">{keys}</kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Step 3 : Intégrer dans app/layout.tsx

Dans `app/layout.tsx`, importer et ajouter `<ShortcutsModal />` à côté du `<Toaster />` :

```tsx
import { ShortcutsModal } from "@/components/ui/shortcuts-modal";

// Dans le return, dans le body :
<ShortcutsModal />
```

### Step 4 : Vérifier le build TypeScript

```bash
npx tsc --noEmit
```
Attendu : 0 erreurs.

### Step 5 : Lancer les tests

```bash
npm run test:run
```
Attendu : tous les tests passent.

### Step 6 : Commit

```bash
git add lib/shortcuts.ts components/ui/shortcuts-modal.tsx app/layout.tsx
git commit -m "feat(ux): add keyboard shortcuts modal (press ? on any page)"
```

---

## Task 9 : Calendrier — lisibilité (sans drag)

**Files:**
- Modify: `components/calendrier/gantt-view.tsx`
- Modify: `components/calendrier/month-view.tsx`
- Modify: `components/calendrier/charge-equipe-view.tsx`

### Step 1 : Améliorer la vue Gantt

Dans `components/calendrier/gantt-view.tsx` :

**a) Augmenter la largeur des colonnes** : remplacer `const COL_WIDTH = 36;` par `const COL_WIDTH = 44;`

**b) Grouper l'en-tête par mois** : ajouter une ligne de mois au-dessus des jours :

```tsx
{/* En-tête mois */}
<div className="flex border-b border-border" style={{ paddingLeft: "200px" }}>
  <div
    className="flex-shrink-0 px-2 py-1 text-xs font-semibold text-muted-foreground capitalize bg-muted/50"
    style={{ width: `${totalDays * COL_WIDTH}px` }}
  >
    {format(monthStart, "MMMM yyyy", { locale: fr })}
  </div>
</div>
```

**c) Afficher le nom de l'étape dans la barre** : dans le `<button>` de la barre, ajouter un `<span>` :

```tsx
<button
  // ... props existantes ...
  style={{
    position: "absolute",
    top: "8px",
    left: `${barStart * COL_WIDTH}px`,
    width: `${Math.max(bw, 1) * COL_WIDTH - 2}px`,
    backgroundColor: etape.projet.couleur ?? "#3b82f6",
    height: "22px",
    borderRadius: "4px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    paddingLeft: "6px",
    overflow: "hidden",
    // ... reste ...
  }}
>
  <span className="text-[10px] font-medium text-white truncate leading-none">
    {etape.nom}
  </span>
</button>
```

**d) Colorier les barres selon `projet.couleur`** : remplacer la couleur fixe par `style={{ backgroundColor: etape.projet.couleur ?? "#3b82f6" }}`.

### Step 2 : Améliorer la vue Charge Équipe

Dans `components/calendrier/charge-equipe-view.tsx`, pour les barres de progression :
- Vert si charge < 80%
- Orange si 80-100%
- Rouge si > 100%

Trouver la barre de progression existante et remplacer la couleur fixe par :

```tsx
function chargeColor(pct: number): string {
  if (pct >= 100) return "bg-destructive";
  if (pct >= 80) return "bg-warning";
  return "bg-success";
}

// Dans le JSX de la barre :
<div
  className={cn("h-2 rounded-full transition-all", chargeColor(pct))}
  style={{ width: `${Math.min(pct, 100)}%` }}
/>
<span className="text-xs text-muted-foreground ml-2">{Math.round(pct)}%</span>
```

### Step 3 : Vérifier build TypeScript

```bash
npx tsc --noEmit
```

### Step 4 : Commit

```bash
git add components/calendrier/gantt-view.tsx \
  components/calendrier/month-view.tsx \
  components/calendrier/charge-equipe-view.tsx
git commit -m "feat(calendrier): improve readability - wider cols, colored bars, charge thresholds"
```

---

## Task 10 : API PATCH etapes/[id] pour les dates (drag & drop)

**Files:**
- Modify: `app/api/etapes/[id]/route.ts`
- Test: `__tests__/api/etapes-patch-dates.test.ts` (nouveau)

### Step 1 : Lire la route existante

Le fichier `app/api/etapes/[id]/route.ts` contient déjà un handler `PATCH`. Vérifier s'il accepte `dateDebut` et `deadline`.

D'après l'audit, le `PATCH` existant utilise probablement un schéma partiel. Ajouter `dateDebut` et `deadline` :

### Step 2 : Modifier le schéma PATCH

Dans `app/api/etapes/[id]/route.ts`, trouver le schéma PATCH et le remplacer par :

```ts
const patchDatesSchema = z.object({
  dateDebut: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
});
```

Le handler PATCH existant doit être adapté pour accepter `{ dateDebut, deadline }` et ne mettre à jour que ces champs :

```ts
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = patchDatesSchema.parse(body);

    const updateData: { dateDebut?: Date | null; deadline?: Date | null } = {};
    if ("dateDebut" in data) {
      updateData.dateDebut = data.dateDebut ? new Date(data.dateDebut) : null;
    }
    if ("deadline" in data) {
      updateData.deadline = data.deadline ? new Date(data.deadline) : null;
    }

    const etape = await prisma.etape.update({
      where: { id: parseInt(id) },
      data: updateData,
    });
    return NextResponse.json(etape);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
```

### Step 3 : Vérifier le build

```bash
npx tsc --noEmit
```
Attendu : 0 erreurs.

### Step 4 : Commit

```bash
git add app/api/etapes/[id]/route.ts
git commit -m "feat(api): PATCH /api/etapes/[id] accepts dateDebut and deadline for drag & drop"
```

---

## Task 11 : Gantt — drag & drop (Pointer Events natifs)

**Files:**
- Modify: `components/calendrier/gantt-view.tsx`
- Modify: `app/calendrier/page.tsx` (callback onEtapeUpdate)

### Step 1 : Ajouter la prop onEtapeUpdate au GanttView

Dans `components/calendrier/gantt-view.tsx`, ajouter la prop :

```ts
interface GanttViewProps {
  // ... props existantes ...
  onEtapeDatesChange?: (etapeId: number, dateDebut: string | null, deadline: string | null) => void;
}
```

### Step 2 : Implémenter le drag state

En haut du composant `GanttView`, ajouter le state de drag :

```tsx
const [drag, setDrag] = useState<{
  etapeId: number;
  type: "move" | "resize";
  startX: number;
  origDateDebut: string | null;
  origDeadline: string | null;
  deltaJours: number;
} | null>(null);

const [dragPreview, setDragPreview] = useState<{
  etapeId: number;
  dateDebut: string | null;
  deadline: string | null;
} | null>(null);
```

### Step 3 : Fonctions utilitaires drag

```tsx
import { addDays, format as dateFnsFormat } from "date-fns";

function pxToJours(px: number): number {
  return Math.round(px / COL_WIDTH);
}

function shiftDate(dateStr: string | null, delta: number): string | null {
  if (!dateStr) return null;
  return dateFnsFormat(addDays(parseISO(dateStr), delta), "yyyy-MM-dd");
}
```

### Step 4 : Handlers pointer events sur la barre

Sur le `<button>` de la barre Gantt, ajouter les handlers :

```tsx
onPointerDown={(e) => {
  e.preventDefault();
  e.currentTarget.setPointerCapture(e.pointerId);
  const isResize = e.nativeEvent.offsetX > (barWidthPx - 12); // bord droit
  setDrag({
    etapeId: etape.id,
    type: isResize ? "resize" : "move",
    startX: e.clientX,
    origDateDebut: etape.dateDebut ?? null,
    origDeadline: etape.deadline ?? null,
    deltaJours: 0,
  });
}}
onPointerMove={(e) => {
  if (!drag || drag.etapeId !== etape.id) return;
  const delta = pxToJours(e.clientX - drag.startX);
  if (delta === drag.deltaJours) return;
  setDrag((d) => d ? { ...d, deltaJours: delta } : null);

  if (drag.type === "move") {
    setDragPreview({
      etapeId: etape.id,
      dateDebut: shiftDate(drag.origDateDebut, delta),
      deadline: shiftDate(drag.origDeadline, delta),
    });
  } else {
    setDragPreview({
      etapeId: etape.id,
      dateDebut: drag.origDateDebut,
      deadline: shiftDate(drag.origDeadline, delta),
    });
  }
}}
onPointerUp={() => {
  if (!drag || !dragPreview || drag.deltaJours === 0) {
    setDrag(null);
    setDragPreview(null);
    return;
  }
  onEtapeDatesChange?.(
    drag.etapeId,
    dragPreview.dateDebut,
    dragPreview.deadline,
  );
  setDrag(null);
  setDragPreview(null);
}}
onKeyDown={(e) => {
  if (e.key === "Escape" && drag) {
    setDrag(null);
    setDragPreview(null);
  }
}}
```

### Step 5 : Style pendant le drag

Sur la barre, appliquer l'opacité et le curseur conditionnels :

```tsx
style={{
  // ... styles existants ...
  opacity: drag?.etapeId === etape.id ? 0.7 : 1,
  cursor: drag?.type === "resize" ? "ew-resize" : "grab",
  // Utiliser dragPreview si disponible pour les positions
  left: dragPreview?.etapeId === etape.id
    ? `${dayPercent(dragPreview.dateDebut ?? etape.dateDebut) * COL_WIDTH}px`
    : `${barStart * COL_WIDTH}px`,
}}
```

### Step 6 : Connecter dans app/calendrier/page.tsx

Dans `app/calendrier/page.tsx`, ajouter le callback :

```tsx
async function handleEtapeDatesChange(
  etapeId: number,
  dateDebut: string | null,
  deadline: string | null
) {
  try {
    await fetch(`/api/etapes/${etapeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dateDebut, deadline }),
    });
    toast.success("Étape mise à jour");
    fetchData(); // recharger les données
  } catch {
    toast.error("Erreur lors de la mise à jour");
  }
}

// Passer au composant GanttView :
<GanttView
  data={data}
  currentDate={currentDate}
  onSelectEtape={setSelectedEtape}
  onContextMenu={handleContextMenu}
  onEtapeDatesChange={handleEtapeDatesChange}
/>
```

### Step 7 : Vérifier le build TypeScript

```bash
npx tsc --noEmit
```
Attendu : 0 erreurs.

### Step 8 : Lancer tous les tests

```bash
npm run test:run
```
Attendu : tous les tests passent.

### Step 9 : Commit final Sprint 9

```bash
git add components/calendrier/gantt-view.tsx app/calendrier/page.tsx
git commit -m "feat(calendrier): drag & drop on Gantt bars to move/resize step dates"
```

---

## Récapitulatif des commits Sprint 9

```
Task 1  chore(ux): remove unused sidebar links and placeholder export buttons
Task 2  fix(activites): save button no longer overflows on narrow screens
Task 3  fix(activites): move facturable filter to top row, prevents element occlusion
Task 4  feat(exports): remove /rapports, add CSV export functions to each page
Task 5  feat(ux): apply PageHeader consistently across all pages with CSV export actions
Task 6  feat(theme): add Sobre & Classe color theme with CSS tokens and hook
Task 7  feat(parametres): add settings page with color theme picker and shortcuts info
Task 8  feat(ux): add keyboard shortcuts modal (press ? on any page)
Task 9  feat(calendrier): improve readability - wider cols, colored bars, charge thresholds
Task 10 feat(api): PATCH /api/etapes/[id] accepts dateDebut and deadline for drag & drop
Task 11 feat(calendrier): drag & drop on Gantt bars to move/resize step dates
```

**Total : ~11 commits atomiques, ~2-3 jours de travail.**

---

## Tests à créer pendant ce sprint

| Fichier test | Couvre |
|---|---|
| `__tests__/components/activites/saisie-rapide-layout.test.tsx` | Bouton enregistrer visible (Task 2) |
| `__tests__/lib/hooks/use-color-theme.test.ts` | Hook thème couleur (Task 6) |

Les autres tâches sont couvertes par les tests E2E Playwright existants (à relancer en fin de sprint).

```bash
npm run test:e2e
```
