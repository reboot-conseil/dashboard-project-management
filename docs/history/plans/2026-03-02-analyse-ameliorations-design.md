# Analyse & Améliorations — PM Dashboard
**Date :** 2026-03-02
**Auteur :** Chef de projet + Claude Code
**Statut :** Validé — prêt pour planification

---

## 1. Contexte & Objectif

Le PM Dashboard est un outil de gestion de projets de conseil actuellement utilisé en solo par un chef de projet. L'objectif est de le mettre en production pour une structure d'environ 10 personnes (direction, chefs de projet, consultants).

**Score de santé au départ (post-Sprint 8) :**

| Dimension | Score | Détail |
|---|---|---|
| Architecture | 8/10 | Solide, App Router, Prisma structuré |
| Fonctionnalités | 8/10 | Riche mais certaines incomplètes ou redondantes |
| Tests | 8/10 | 239 Vitest + 16 Playwright E2E |
| UX / Cohérence visuelle | 4/10 | Titres flottants, cards mal dimensionnées, exports manquants |
| Sécurité | 3/10 | 0 authentification, SQLite non production-ready |
| Calendrier | 4/10 | Illisible, pas de drag & drop |
| Exports / Rapports | 4/10 | Page rapports redondante, exports API = placeholder |
| Alertes | 5/10 | Système existant mais peu intelligent |
| Préparation production | 2/10 | Pas d'auth, pas de multi-utilisateurs |

---

## 2. Diagnostic des problèmes visuels identifiés

| Problème | Fichier | Gravité |
|---|---|---|
| `<h1>` brut sans `PageHeader` | `rapports/page.tsx:51` | Moyen |
| Aucun header sur la page Dashboard | `app/page.tsx` — onglets flottants | Haut |
| Exports dashboard non fonctionnels (placeholder `TODO`) | `api/dashboard/export/route.ts` | Critique |
| Boutons CSV cachés dans chaque onglet Rapports | `rapports/page.tsx` | Moyen |
| Gantt illisible (col 28px, noms tronqués, pas de zoom) | `calendrier/gantt-view.tsx` | Haut |
| Page `/rapports` duplique le dashboard | Toute la page | Haut |
| Sidebar expose "Teams Config" et "Audit" à tous | `components/sidebar.tsx` | Moyen |
| Page `/admin/audit` ne lance pas de vrai audit | `app/admin/audit/page.tsx` | Moyen |
| Bouton "Enregistrer" déborde dans SaisieRapide | `activites/saisie-rapide.tsx` | Moyen |
| Filtre bas Activités (Toutes/Facturable) masque des éléments | `activites/page.tsx` | Moyen |
| Raccourcis clavier affichés en dur (pas en popup) | Plusieurs pages | Bas |
| Palette de couleurs peu élégante, non configurable | Global | Moyen |

---

## 3. Approche retenue — 3 phases séquentielles

```
Phase A → UX & Cohérence visuelle
Phase B → Authentification & Production
Phase C → Exports réels & Alertes intelligentes
```

---

## Phase A — UX & Cohérence visuelle

### Objectif
Rendre l'outil cohérent, agréable et sans friction pour l'usage quotidien solo, avant la mise en production multi-utilisateurs.

### A1 — Cohérence des en-têtes (`PageHeader`)

**Problème :** Chaque page gère son titre différemment (h1 brut, h2, rien du tout).

**Solution :** Le composant `PageHeader` existant (`components/layout/page-header.tsx`) est appliqué systématiquement à toutes les pages avec :
- `title` : nom de la page
- `subtitle` : description courte (période active, nb d'éléments)
- `icon` : icône Lucide cohérente
- `actions` : slot pour boutons d'action (nouveau, export, filtre)

**Pages concernées :**
- `/` (dashboard) → PageHeader avec titre "Dashboard" + raccourci Ctrl+1/2/3 dans le subtitle
- `/rapports` → supprimée (voir A5)
- `/executive` → PageHeader + actions
- `/activites` → PageHeader + bouton "Saisie rapide" dans actions
- `/calendrier` → PageHeader + sélecteur de vue dans actions
- `/projets` → PageHeader + bouton "Nouveau projet"
- `/projets/[id]` → PageHeader dynamique (nom du projet) + statut badge
- `/consultants` → PageHeader + bouton "Nouveau consultant"
- `/documents` → PageHeader + bouton "Importer"

### A2 — Page `/parametres` (nouvelle)

**Problème :** Les raccourcis clavier sont affichés en dur sur les pages, la palette de couleurs n'est pas configurable, aucune page de préférences n'existe.

**Solution :** Nouvelle page accessible depuis la sidebar (icône Settings en bas).

**Sections :**

#### Raccourcis clavier
- Suppression des affichages "en dur" sur toutes les pages
- Bouton `?` (flottant, en bas à droite) sur chaque page → ouvre une `Sheet` (panneau latéral) listant les raccourcis de la page courante
- Les raccourcis sont définis dans un fichier de config central `lib/shortcuts.ts`

#### Palette de couleurs (thème)
Deux thèmes proposés en plus du dark/light existant :

**Thème "Classique"** (actuel)
- Primaire : bleu `#3b82f6`
- Projets : palette vive actuelle
- Consultants : palette vibrante actuelle

**Thème "Sobre & Classe"**
- Primaire : bleu ardoise `#475569`
- Accent : ambre chaud `#92400e`
- Projets : teintes neutres (ardoise, pierre, zinc, emeraude sourde)
- Consultants : teintes sourdes (violet grisé, rose poudré, ocre, vert sauge)
- Fond : blanc cassé `#fafaf9` / dark : `#1c1917`

Stockage : `localStorage("color-theme")` + variable CSS `data-color-theme` sur `<html>`.

#### Autres préférences
- Format date : `DD/MM/YYYY` ou `YYYY-MM-DD`
- Densité d'affichage : Compact / Confortable
- Première page au chargement : Dashboard / Projets / Activités

### A3 — Corrections UX ponctuelles

| Fix | Détail |
|---|---|
| Bouton "Enregistrer" déborde | Fix layout flex `SaisieRapide` — `flex-wrap` ou `min-w-0` sur les champs |
| Filtre Activités masque éléments | Repositionnement en haut du tableau (au-dessus de la liste), pas en bas |
| Exports dashboard (placeholder) | Suppression des boutons "Exporter PDF/Excel" du `DashboardHeader` — remplacés en Phase C par une vraie implémentation |
| Page `/admin/audit` | Entrée supprimée de la sidebar. La page peut rester accessible à l'URL directe mais n'est plus promue |
| "Teams Config" sidebar | Masquée par défaut, accessible uniquement via `/parametres` > "Intégrations" |

### A4 — Calendrier : lisibilité & drag & drop

#### Lisibilité (toutes les vues)

**Vue Mois :**
- Couleur de fond des cellules jours selon charge (gradient : transparent → `bg-orange-50` → `bg-red-50`)
- Points colorés (couleur du projet) sous la date pour chaque étape
- Tooltip au hover : nom étape, projet, statut, heures planifiées
- Indicateur de jour courant plus visible (ring coloré)

**Vue Gantt :**
- Largeur colonne jour augmentée : `28px → 40px`
- Bandes weekends grisées (`bg-muted/30`)
- Barres colorées par `Projet.couleur` (au lieu d'une couleur fixe)
- Nom de l'étape affiché dans la barre (tronqué si trop court)
- Ligne verticale "aujourd'hui" en rouge pointillé
- En-tête avec nom du mois regroupé (pas juste les numéros de jour)

**Vue Charge Équipe :**
- Barre de progression colorée par seuil : vert (<80%), orange (80-100%), rouge (>100%)
- Légende fixe en haut de la vue
- Affichage du % en chiffre dans la barre

#### Drag & drop

**Vue Gantt — comportement :**
- Glisser la **barre entière** → décale `dateDebut` + `deadline` de N jours
- Glisser le **bord droit** → étend/réduit uniquement la `deadline`
- Indicateur visuel pendant le drag : barre semi-transparente + tooltip "Nouvelle date : XX/MM"
- Snap au jour (pas de demi-journées)
- Au `mouseup` / `pointerup` : appel `PATCH /api/etapes/[id]` avec `{ dateDebut, deadline }`
- Toast de confirmation : "Étape X mise à jour"
- Annulation (Escape pendant le drag) : retour à l'état initial

**Vue Mois — comportement :**
- Glisser un point d'étape vers un autre jour → décale `dateDebut` + `deadline` de la même durée
- Même logique de persistence

**Implémentation technique :**
- Librairie `@dnd-kit/core` + `@dnd-kit/modifiers` (already compatible avec React 19)
- Alternative native si @dnd-kit trop lourde : `PointerEvents` API (onPointerDown/Move/Up)
- L'API `PATCH /api/etapes/[id]` est à créer (actuellement seul `POST` et `GET` existent)

### A5 — Suppression de `/rapports` + redistribution des exports

**Problème :** La page Rapports duplique le dashboard, est jugée inutile, et ses exports CSV sont éparpillés dans des onglets.

**Solution :**
- Suppression de `app/rapports/page.tsx` et `components/rapports-charts.tsx`
- Suppression du lien "Rapports" de la sidebar
- Redistribution des exports :
  - Export activités CSV → `/activites` PageHeader `actions`
  - Export projets CSV → `/projets` PageHeader `actions`
  - Export consultants CSV → `/consultants` PageHeader `actions`
  - Export facturation CSV → `/executive` PageHeader `actions`
- L'onglet "Facturation" (unique contenu de valeur) est intégré comme section dans `/executive`

---

## Phase B — Authentification & Production

### Objectif
Rendre l'outil déployable et sécurisé pour une équipe de ~10 personnes.

### B1 — Authentification (NextAuth.js v5 / Auth.js)

**Nouveau modèle Prisma `User` :**
```prisma
model User {
  id           Int         @id @default(autoincrement())
  email        String      @unique
  name         String
  password     String      // bcrypt hash
  role         Role        @default(CONSULTANT)
  consultantId Int?        // lien optionnel vers Consultant
  consultant   Consultant? @relation(fields: [consultantId], references: [id])
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
}

enum Role {
  ADMIN
  PM
  CONSULTANT
}
```

**Rôles & accès :**

| Page / Action | ADMIN | PM | CONSULTANT |
|---|---|---|---|
| Dashboard (toutes vues) | ✅ | ✅ | ✅ (vue limitée) |
| Projets (tous) | ✅ | ✅ | ✅ (ses projets) |
| Activités (toutes) | ✅ | ✅ | ✅ (les siennes) |
| Consultants | ✅ | ✅ | ❌ |
| Executive | ✅ | ✅ | ❌ |
| Calendrier | ✅ | ✅ | ✅ |
| Documents | ✅ | ✅ | ❌ |
| Paramètres | ✅ | ✅ | ✅ (préférences perso) |
| Teams Config | ✅ | ❌ | ❌ |
| Gestion utilisateurs | ✅ | ❌ | ❌ |

**UI Auth :**
- Page `/login` : formulaire email + mot de passe, dark mode compatible
- Pas de signup public — les comptes sont créés par l'ADMIN depuis une page `/admin/users`
- Session JWT (edge-compatible), durée 7 jours

### B2 — Protection des routes (Middleware)

`middleware.ts` à la racine : intercepte toutes les requêtes `/api/*` et pages, vérifie le token de session, redirige vers `/login` si non authentifié.

Les routes API retournent `401` si session absente, `403` si rôle insuffisant.

### B3 — Migration base de données

SQLite (dev) → PostgreSQL (production).

**Options recommandées :**
- **Neon** (serverless PostgreSQL, gratuit jusqu'à 0.5GB) — idéal Vercel
- **Railway** (5$/mois, plus simple à gérer)
- **Supabase** (si besoin de fonctionnalités temps réel plus tard)

Migration : `prisma migrate deploy` en production. Script de seed pour importer les données existantes.

### B4 — Déploiement

- **Vercel** (recommandé) : zéro config pour Next.js, variables d'env via dashboard
- Variables d'env requises : `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `ANTHROPIC_API_KEY`
- `.env.save` et `.env` contenant des secrets → à retirer du contrôle de version (`.gitignore` à vérifier)

---

## Phase C — Exports réels & Alertes intelligentes

### Objectif
Finaliser les fonctionnalités à haute valeur business : exports exploitables et alertes proactives.

### C1 — Exports fonctionnels

**Excel (.xlsx) via `exceljs` :**
- Compatible Edge runtime (pas de puppeteer)
- Exports : activités par période, projets (budget/marges), consultants (CA/occupation), facturation
- Format : colonnes auto-dimensionnées, en-tête coloré aux couleurs du thème, totaux en bas

**PDF via `@react-pdf/renderer` :**
- Rapport de synthèse mensuel / trimestriel
- Contenu : KPIs clés, top projets, top consultants, alertes actives
- Format A4, logo en en-tête (si configuré), numéros de page

**Placement des boutons d'export :**
- `PageHeader.actions` sur chaque page concernée
- Dropdown "Exporter ▾" → options Excel / PDF selon la page
- Download déclenché directement (pas de page intermédiaire)

### C2 — Alertes intelligentes

**Enrichissement de `/api/alertes` :**

Nouvelles catégories d'alertes :
- `BUDGET_CRITIQUE` : >90% du budget consommé
- `RETARD_PROBABLE` : vélocité actuelle → fin estimée > deadline
- `SOUS_OCCUPATION` : consultant <50% d'occupation sur 2 semaines
- `SURCHARGE` : consultant >100% planifié sur la semaine suivante
- `INACTIVITE_PROJET` : aucune activité saisie depuis 7 jours sur un projet EN_COURS
- `ETAPE_BLOQUEE` : étape EN_COURS sans activité depuis 5 jours

**Règles configurables (depuis `/parametres`) :**
- Seuils modifiables par l'utilisateur (ex: seuil budget critique = 80% au lieu de 90%)
- Activation/désactivation par catégorie
- Stockage : table `AlerteConfig` en DB (pas localStorage — partagé en prod)

**Notifications :**
- Badge sidebar (déjà existant, à enrichir avec catégories)
- Panel d'alertes in-app amélioré (groupement par projet, tri par priorité)
- Email digest hebdomadaire optionnel via `Resend` (gratuit jusqu'à 3000 emails/mois)

---

## 4. Roadmap synthétique

```
Phase A — UX & Cohérence (Sprint 9)
├── A1 : PageHeader toutes pages          ~2h
├── A2 : Page /parametres                 ~1 jour
├── A3 : Corrections UX ponctuelles       ~3h
├── A4 : Calendrier drag & drop           ~2 jours
└── A5 : Suppression /rapports            ~2h

Phase B — Auth & Production (Sprint 10)
├── B1 : NextAuth v5 + modèle User        ~1 jour
├── B2 : Middleware + protection API      ~3h
├── B3 : Migration PostgreSQL             ~2h
└── B4 : Déploiement Vercel              ~2h

Phase C — Exports & Alertes (Sprint 11)
├── C1 : Exports Excel + PDF             ~1.5 jours
└── C2 : Alertes intelligentes           ~1 jour
```

---

## 5. Décisions techniques clés

| Décision | Choix | Raison |
|---|---|---|
| Auth | NextAuth.js v5 (Auth.js) | Natif Next.js, edge-compatible, credentials + futur OAuth |
| Drag & drop | `@dnd-kit/core` | Léger, React 19 compatible, accessible |
| Export Excel | `exceljs` | Edge runtime, pas de dépendances natives |
| Export PDF | `@react-pdf/renderer` | Server-side, pas de headless browser |
| BDD prod | PostgreSQL (Neon) | Gratuit, serverless, compatible Prisma sans changement |
| Email alertes | `Resend` | API simple, 3000 emails/mois gratuits |
| Thème couleur | `data-color-theme` sur `<html>` + tokens CSS | Pas de rebuild, changement instantané |

---

## 6. Ce qui ne change PAS

- Stack technique (Next.js 16, React 19, Prisma, TailwindCSS, Shadcn UI)
- Structure des modèles Prisma existants (on ajoute `User`, on ne modifie pas les autres)
- Tests existants (239 Vitest + 16 Playwright) — à compléter mais pas à refaire
- Design system (tokens CSS, dark mode, animations Framer Motion)
- Logique financière (`lib/financial.ts`)
