# 📚 Documentation Complète — PM Dashboard (Chef de Projet)

> Générée le 2026-02-28 — Audit automatique par Claude Code

---

## 📋 Sommaire

1. [Vue d'ensemble](#1-vue-densemble)
2. [Stack technique](#2-stack-technique)
3. [Architecture du projet](#3-architecture-du-projet)
4. [Pages & Navigation](#4-pages--navigation)
5. [API Routes](#5-api-routes)
6. [Composants](#6-composants)
7. [Modèles de données (Prisma/SQLite)](#7-modèles-de-données-prismasqlite)
8. [Librairies & dépendances npm](#8-librairies--dépendances-npm)
9. [Intégrations externes](#9-intégrations-externes)
10. [Variables d'environnement](#10-variables-denvironnement)
11. [Logique métier clé](#11-logique-métier-clé)
12. [Migrations de base de données](#12-migrations-de-base-de-données)

---

## 1. Vue d'ensemble

**PM Dashboard** est une application web de gestion de projets de conseil, conçue pour suivre :

- Les **projets** (statut, budget, avancement, étapes)
- Les **consultants** (TJM, coût employeur, occupation, CA généré)
- Les **activités** (saisie de temps, lien projet/étape)
- Les **KPIs** financiers (CA, marge, burn rate, vélocité)
- L'**ingestion de documents** (PDF, DOCX, TXT → analyse Claude AI → création automatique de projets/activités)
- L'intégration **Microsoft Teams** (tableau de bord embarquable + webhooks)

**Données statistiques :**
- ~26 000 lignes de code TypeScript/TSX
- 13 pages applicatives
- 40 routes API
- 6 modèles Prisma
- 7 migrations de base de données
- 53 composants React (dont 15 composants Shadcn UI)

---

## 2. Stack technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| Framework | Next.js (App Router) | ^16.1.6 |
| UI Library | React | ^19.2.4 |
| Language | TypeScript | ^5.0.0 |
| ORM | Prisma | ^6.0.0 |
| Base de données | SQLite (dev) | — |
| Styling | TailwindCSS v4 | ^4.1.18 |
| UI Components | Shadcn UI (custom) | — |
| Charts | Recharts | ^3.7.0 |
| Forms | react-hook-form + zod | ^7.x / ^4.x |
| Notifications | Sonner | ^2.0.7 |
| Date utils | date-fns v3 | ^3.6.0 |
| AI | @anthropic-ai/sdk (Claude Sonnet) | ^0.78.0 |
| PDF extraction | pdf-parse | ^2.4.5 |
| DOCX extraction | mammoth | ^1.11.0 |
| File upload | react-dropzone | ^15.0.0 |
| Build | Turbopack (Next.js built-in) | — |

---

## 3. Architecture du projet

```
dashboard-chef-projet/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Layout racine (sidebar + toaster)
│   ├── page.tsx                  # Dashboard principal (3 vues)
│   ├── globals.css               # CSS global (TailwindCSS v4)
│   ├── error.tsx                 # Error boundary global
│   ├── not-found.tsx             # Page 404
│   ├── activites/page.tsx        # Saisie de temps
│   ├── admin/teams-config/       # Config Teams par projet
│   ├── calendrier/page.tsx       # Vue calendrier (3 modes)
│   ├── consultants/page.tsx      # Liste des consultants
│   ├── documents/                # Ingestion documentaire
│   │   ├── page.tsx              # Liste des documents
│   │   ├── upload/page.tsx       # Upload + déclenchement
│   │   └── review/[id]/page.tsx  # Revue analyse AI
│   ├── executive/page.tsx        # Dashboard dirigeant
│   ├── projets/
│   │   ├── page.tsx              # Liste des projets
│   │   └── [id]/page.tsx         # Détail projet (Kanban)
│   ├── rapports/page.tsx         # Rapports avancés
│   └── teams-dashboard/page.tsx  # Vue embarquable Teams
│
├── app/api/                      # Toutes les API routes
│   ├── activites/                # CRUD activités + quick-log
│   ├── admin/teams-config/       # CRUD config Teams + test n8n
│   ├── alertes/                  # Alertes auto (deadlines, budget)
│   ├── calendrier/               # Données calendrier agrégées
│   ├── consultants/              # CRUD consultants + by-email
│   ├── dashboard/                # KPIs dashboard (4 endpoints)
│   ├── documents/                # Pipeline ingestion (8 endpoints)
│   ├── etapes/                   # CRUD étapes
│   ├── executive/                # Métriques dirigeant
│   ├── kpis/                     # 10 KPIs prioritaires
│   ├── projets/                  # CRUD projets + progression
│   ├── rapports/                 # Données rapports + export CSV
│   ├── teams-dashboard/stats/    # Stats pour Teams
│   └── webhooks/                 # Webhooks entrants (Teams + n8n)
│
├── components/
│   ├── sidebar.tsx               # Navigation latérale (AppShell)
│   ├── alert-toaster.tsx         # Toast alertes
│   ├── consultant-form.tsx       # Formulaire consultant
│   ├── etape-form.tsx            # Formulaire étape
│   ├── projet-form.tsx           # Formulaire projet
│   ├── dashboard-charts.tsx      # Charts dashboard (ancien)
│   ├── projet-charts.tsx         # Charts progression projet
│   ├── rapports-charts.tsx       # Charts rapports
│   ├── dashboard/                # Dashboard modulaire
│   │   ├── index.ts              # Re-exports
│   │   ├── DashboardOperationnel.tsx
│   │   ├── DashboardConsultants.tsx
│   │   ├── DashboardStrategique.tsx
│   │   ├── DashboardConsultant.tsx
│   │   ├── DashboardChefProjet.tsx
│   │   ├── DashboardDirigeant.tsx
│   │   ├── DashboardFilters.tsx
│   │   ├── DashboardHeader.tsx
│   │   ├── KpiCard.tsx
│   │   ├── SectionCard.tsx
│   │   ├── consultants/          # Sous-composants vue consultants
│   │   ├── operationnel/         # Sous-composants vue opérationnelle
│   │   └── strategique/          # Sous-composants vue stratégique
│   └── ui/                       # Shadcn UI components
│
├── lib/
│   ├── prisma.ts                 # Singleton PrismaClient
│   ├── utils.ts                  # cn() helper TailwindCSS
│   └── projet-metrics.ts         # Calculs progression/health
│
├── prisma/
│   ├── schema.prisma             # Schéma DB (6 modèles)
│   ├── seed.ts                   # Données de test
│   └── migrations/               # 7 migrations SQLite
│
├── uploads/                      # Fichiers uploadés (PDF, DOCX, TXT)
├── document-ingestion-workflow.json  # Workflow n8n (non actif)
├── next.config.ts                # Config Next.js
├── package.json
└── tsconfig.json
```

---

## 4. Pages & Navigation

### Navigation principale (sidebar)

La sidebar (`components/sidebar.tsx`, 456 lignes) gère le layout global avec :
- **Mode sidebar** : étendu / compact (localStorage `sidebarMode`)
- Navigation vers toutes les sections
- Indicateur page active

### Pages

#### `/` — Dashboard Principal
- **Fichier** : `app/page.tsx` (97 lignes)
- **Description** : Hub central avec 3 vues en onglets
- **Vues** :
  - `Opérationnel` → `DashboardOperationnel` : priorités, tâches, tendances, alertes
  - `Consultants` → `DashboardConsultants` : occupation, performances, planning
  - `Stratégique` → `DashboardStrategique` : objectifs annuels, santé globale, capacité
- **Raccourcis clavier** : Ctrl+1/2/3 pour changer de vue
- **Persistance** : vue active en localStorage (`dashboard-active-view`)

#### `/executive` — Dashboard Dirigeant
- **Fichier** : `app/executive/page.tsx` (599 lignes)
- **Description** : Vision annuelle pour les dirigeants
- **Données** : `/api/executive`
- **Sections** : CA annuel, marge, ROI, pipeline projets, capacité équipe, tendances mensuelles, recommandations

#### `/projets` — Liste des Projets
- **Fichier** : `app/projets/page.tsx` (747 lignes)
- **Description** : Grille de cards projets avec métriques
- **Données** : `/api/projets`, `/api/consultants`, `/api/alertes`
- **Fonctionnalités** : Filtres (statut, consultant, période), création/édition/suppression, badges ROI/BurnRate/Vélocité

#### `/projets/[id]` — Détail Projet
- **Fichier** : `app/projets/[id]/page.tsx` (971 lignes)
- **Description** : Vue complète d'un projet
- **Sections** :
  - KPIs (budget consommé, réalisation, health score, vélocité)
  - Graphique progression (budget vs réalisation)
  - Kanban étapes (A_FAIRE → EN_COURS → VALIDEE)
  - Tableau activités récentes
  - Graphique distribution par étape
- **Données** : `/api/projets/[id]`, `/api/projets/[id]/progression`

#### `/activites` — Saisie de Temps
- **Fichier** : `app/activites/page.tsx` (969 lignes)
- **Description** : Time tracking complet
- **Fonctionnalités** : Formulaire saisie, filtres avancés, vue liste/groupe, calcul CA/coût, export
- **Persistance filtres** : localStorage `activites-filtres-sauvegardes`

#### `/consultants` — Gestion Consultants
- **Fichier** : `app/consultants/page.tsx` (314 lignes)
- **Description** : Table consultants avec métriques
- **Colonnes** : Nom, TJM, Coût Employeur, CA généré, Heures, Occupation, Tendance
- **Fonctionnalités** : CRUD complet, couleur personnalisée

#### `/rapports` — Rapports Avancés
- **Fichier** : `app/rapports/page.tsx` (929 lignes)
- **Description** : Analyses détaillées multi-onglets
- **Onglets** :
  - KPIs Globaux
  - Par Consultant
  - Par Projet
  - Vue Temporelle
  - Facturation
- **Export** : CSV via `/api/rapports/export-csv`

#### `/calendrier` — Vue Calendrier
- **Fichier** : `app/calendrier/page.tsx` (1921 lignes, le fichier le plus long !)
- **Description** : Calendrier avancé multi-vues
- **Vues** :
  - `Mois` : calendrier mensuel classique
  - `Gantt` : diagramme de Gantt des étapes
  - `Charge Équipe` : heatmap capacité consultants
- **Fonctionnalités** : Filtres avancés, sidebar détail étape au clic, clic-droit contextuel
- **Persistance** : localStorage `calendrier-vue-active`, `calendrier-filtres`
- **Données** : `/api/calendrier`

#### `/documents` — Ingestion Documentaire
- **Fichier** : `app/documents/page.tsx` (294 lignes)
- **Description** : Liste des documents ingérés avec statut
- **Statuts** : UPLOADING → EXTRACTING → ANALYZING → PENDING_REVIEW / ERROR

#### `/documents/upload` — Upload Document
- **Fichier** : `app/documents/upload/page.tsx` (295 lignes)
- **Description** : Interface upload (drag & drop via react-dropzone)
- **Formats** : PDF, DOCX, TXT (max 10 MB)
- **Flow** : Upload → trigger processing asynchrone → polling status

#### `/documents/review/[id]` — Revue Analyse AI
- **Fichier** : `app/documents/review/[id]/page.tsx` (863 lignes)
- **Description** : Interface de validation de l'analyse Claude
- **Fonctionnalités** : Affichage analyse JSON structurée, création/association projet, validation/rejet

#### `/teams-dashboard` — Vue Teams
- **Fichier** : `app/teams-dashboard/page.tsx` (1012 lignes)
- **Description** : Dashboard embarquable dans Microsoft Teams (iframe)
- **Headers** : X-Frame-Options ALLOWALL + CSP `frame-ancestors` restreint aux domaines Microsoft
- **Données** : `/api/teams-dashboard/stats`

#### `/admin/teams-config` — Configuration Teams
- **Fichier** : `app/admin/teams-config/page.tsx` (666 lignes)
- **Description** : Configuration webhooks/canaux Teams par projet
- **Données** : `/api/admin/teams-config`

---

## 5. API Routes

### Activités

| Method | Route | Description |
|--------|-------|-------------|
| GET, POST | `/api/activites` | Liste (avec filtres) + création |
| GET, PUT, DELETE | `/api/activites/[id]` | CRUD activité individuelle |
| POST | `/api/activites/quick-log` | Saisie rapide (Teams/n8n) |

### Consultants

| Method | Route | Description |
|--------|-------|-------------|
| GET, POST | `/api/consultants` | Liste + création |
| GET, PUT, DELETE | `/api/consultants/[id]` | CRUD consultant individuel |
| GET | `/api/consultants/by-email` | Lookup par email (Teams) |

### Projets

| Method | Route | Description |
|--------|-------|-------------|
| GET, POST | `/api/projets` | Liste + création |
| GET, PUT, DELETE | `/api/projets/[id]` | CRUD projet individuel |
| GET | `/api/projets/[id]/progression` | Métriques progression (health score, vélocité) |
| GET | `/api/projets/search` | Recherche fulltext |

### Étapes

| Method | Route | Description |
|--------|-------|-------------|
| GET, POST | `/api/etapes` | Liste + création |
| GET, PUT, DELETE | `/api/etapes/[id]` | CRUD étape individuelle |

### Dashboard / KPIs

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/dashboard` | KPIs principaux (filtrés par période) |
| GET | `/api/dashboard/operationnel` | Données vue opérationnelle (437 lignes) |
| GET | `/api/dashboard/strategique` | Données vue stratégique (558 lignes) |
| GET | `/api/dashboard/consultants` | Données vue consultants (412 lignes) |
| GET | `/api/dashboard/export` | Export dashboard |
| GET | `/api/kpis` | 10 KPIs prioritaires (objectifCA/objectifHeures params) |
| GET | `/api/executive` | Métriques dirigeant annuelles |
| GET | `/api/alertes` | Alertes automatiques (deadlines, budget) |
| GET | `/api/rapports` | Données rapports multi-onglets |
| GET | `/api/rapports/export-csv` | Export CSV rapports |
| GET | `/api/calendrier` | Données calendrier agrégées |

### Documents (Pipeline Ingestion)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/documents` | Liste documents |
| GET, DELETE | `/api/documents/[id]` | Détail + suppression |
| GET | `/api/documents/[id]/status` | Status polling (debug) |
| POST | `/api/documents/upload` | Upload fichier (fire-and-forget → process) |
| POST | `/api/documents/process` | Pipeline complet (extraction + Claude + save) |
| POST | `/api/documents/update-status` | MAJ statut (usage n8n legacy) |
| POST | `/api/documents/save-text` | Sauvegarde texte extrait (usage n8n legacy) |
| POST | `/api/documents/save-analysis` | Sauvegarde analyse (usage n8n legacy) |
| POST | `/api/documents/validate` | Valider/créer projet depuis analyse |

### Teams & Admin

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/teams-dashboard/stats` | Stats Teams |
| GET, POST | `/api/admin/teams-config` | Config Teams (liste/création) |
| GET, PUT, DELETE | `/api/admin/teams-config/[id]` | CRUD config Teams |
| POST | `/api/admin/teams-config/test-n8n` | Test webhook n8n |

### Webhooks entrants

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/webhooks/n8n/activity-confirmed` | Création activité via n8n (auth Bearer) |
| POST | `/api/webhooks/teams/route` | Webhook Teams entrant |
| POST | `/api/webhooks/teams/action` | Actions Teams (boutons adaptatifs) |

---

## 6. Composants

### Layout

#### `components/sidebar.tsx` (456 lignes)
- **`AppShell`** : Layout principal wrappant toutes les pages
- Navigation avec icônes, mode compact/étendu
- Gestion état sidebar en localStorage (`sidebarMode`)

#### `components/alert-toaster.tsx` (41 lignes)
- Composant abstrait pour afficher les alertes en toast Sonner

### Formulaires

| Composant | Lignes | Description |
|-----------|--------|-------------|
| `consultant-form.tsx` | 281 | Formulaire CRUD consultant (react-hook-form + zod) |
| `projet-form.tsx` | 256 | Formulaire CRUD projet |
| `etape-form.tsx` | 240 | Formulaire CRUD étape |

### Charts

| Composant | Lignes | Description |
|-----------|--------|-------------|
| `dashboard-charts.tsx` | 130 | Charts génériques dashboard (legacy) |
| `projet-charts.tsx` | 137 | Charts progression projet (budget vs réalisation) |
| `rapports-charts.tsx` | 223 | Charts rapports multi-axes |

### Dashboard — Composants principaux

| Composant | Lignes | Description |
|-----------|--------|-------------|
| `DashboardOperationnel.tsx` | 458 | Vue opérationnelle : priorités, tâches, tendances |
| `DashboardConsultants.tsx` | 430 | Vue consultants : occupation, CA, performance |
| `DashboardStrategique.tsx` | 404 | Vue stratégique : objectifs, santé, capacité |
| `DashboardConsultant.tsx` | 432 | Vue individuelle d'un consultant |
| `DashboardChefProjet.tsx` | 1008 | Vue chef de projet (le plus grand composant) |
| `DashboardDirigeant.tsx` | 580 | Vue dirigeant |
| `DashboardFilters.tsx` | 217 | Filtres partagés (période, consultant, projet) |
| `DashboardHeader.tsx` | 98 | En-tête dashboard |
| `KpiCard.tsx` | 82 | Carte KPI réutilisable |
| `SectionCard.tsx` | 29 | Carte section générique |

### Dashboard — Sous-composants (consultants/)

| Composant | Lignes | Description |
|-----------|--------|-------------|
| `ActivitesRecentesTable.tsx` | 183 | Table activités récentes |
| `DeadlinesAVenirSection.tsx` | 111 | Section deadlines |
| `HistoriquePerformanceChart.tsx` | 222 | Historique performance chart |
| `PlanningSemaineSection.tsx` | 138 | Planning semaine |
| `ProjetsEnCoursSection.tsx` | 147 | Projets en cours |

### Dashboard — Sous-composants (operationnel/)

| Composant | Lignes | Description |
|-----------|--------|-------------|
| `ActiviteEquipeChart.tsx` | 128 | Activité équipe (Recharts) |
| `MesTachesSection.tsx` | 33 | Section tâches personnelles |
| `PrioritesSection.tsx` | 259 | Section priorités projets |
| `ProjetsASurveillerList.tsx` | 166 | Projets à risque |
| `TendancesChart.tsx` | 148 | Chart tendances CA/heures |

### Dashboard — Sous-composants (strategique/)

| Composant | Lignes | Description |
|-----------|--------|-------------|
| `CapaciteEquipeSection.tsx` | 147 | Capacité équipe |
| `DecompositionConsultantsSection.tsx` | 99 | Décomposition par consultant |
| `DonutChartSection.tsx` | 171 | Donut chart répartition |
| `ObjectifsAnnuelsSection.tsx` | 251 | Objectifs annuels CA/heures |
| `RisquesSection.tsx` | 52 | Section risques |
| `SanteGlobaleSection.tsx` | 149 | Santé globale projets |
| `TendancesPrevisionsChart.tsx` | 226 | Tendances et prévisions |
| `TousProjetsTable.tsx` | 371 | Table tous les projets |

### UI Components (Shadcn UI personnalisé)

| Composant | Description |
|-----------|-------------|
| `accordion.tsx` | Accordéon |
| `alert-dialog.tsx` | Dialog de confirmation |
| `badge.tsx` | Badge (variants: success, warning, destructive, secondary, default, outline) |
| `button.tsx` | Bouton (variants multiples) |
| `card.tsx` | Carte |
| `checkbox.tsx` | Case à cocher |
| `dialog.tsx` | Modal dialog |
| `dropdown-menu.tsx` | Menu déroulant |
| `input.tsx` | Champ de saisie |
| `label.tsx` | Label formulaire |
| `progress.tsx` | Barre de progression |
| `select.tsx` | Sélecteur |
| `separator.tsx` | Séparateur |
| `skeleton.tsx` | Loading skeleton |
| `status-badge.tsx` | Badge statut spécialisé |
| `table.tsx` | Table |
| `tabs.tsx` | Onglets |
| `textarea.tsx` | Zone de texte |

---

## 7. Modèles de données (Prisma/SQLite)

### `Consultant`
```prisma
id                     Int        @id @default(autoincrement())
nom                    String
email                  String     @unique
tjm                    Decimal?           // Taux Journalier Moyen en €
coutJournalierEmployeur Float?            // Coût employeur journalier en €
competences            String?            // Compétences (texte libre)
couleur                String  @default("#8B5CF6")  // Couleur UI
actif                  Boolean @default(true)
activites              Activite[]
```

### `Projet`
```prisma
id                  Int           @id @default(autoincrement())
nom                 String
client              String
budget              Decimal?              // Budget en €
chargeEstimeeTotale Float?                // Charge totale estimée en jours
dateDebut           DateTime?
dateFin             DateTime?
statut              StatutProjet  @default(PLANIFIE)
couleur             String  @default("#3b82f6")
activites           Activite[]
etapes              Etape[]
teamsConfig         ProjetTeamsConfig?
documentsSource     DocumentIngestion[]
```

**Statuts projet** : `PLANIFIE | EN_COURS | EN_PAUSE | TERMINE`

### `Activite`
```prisma
id           Int        @id @default(autoincrement())
consultantId Int                    // FK → Consultant
projetId     Int                    // FK → Projet
etapeId      Int?                   // FK → Etape (optionnel)
date         DateTime
heures       Decimal                // Nombre d'heures
description  String?
facturable   Boolean @default(true)
```

### `Etape`
```prisma
id                  Int         @id @default(autoincrement())
projetId            Int                    // FK → Projet
nom                 String
description         String?
statut              StatutEtape @default(A_FAIRE)
dateDebut           DateTime?
deadline            DateTime?
chargeEstimeeJours  Float?                 // Estimation en jours
ordre               Int                    // Ordre dans le Kanban
```

**Statuts étape** : `A_FAIRE | EN_COURS | VALIDEE`

### `ProjetTeamsConfig`
```prisma
id          Int     @id @default(autoincrement())
projetId    Int     @unique               // FK → Projet (1-to-1)
canalNom    String?                       // Ex: "refonte-site-web"
canalId     String?                       // ID Teams du canal
webhookUrl  String?                       // URL webhook sortant Teams
logAutoActif Boolean @default(true)
```

### `DocumentIngestion`
```prisma
id             Int       @id @default(autoincrement())
filename       String
filepath       String                     // Chemin local dans uploads/
filesize       Int?                       // Taille en octets
mimetype       String?                    // application/pdf | application/vnd... | text/plain
type           String?                    // devis | presentation | transcript | compte_rendu | email | autre
status         String @default("UPLOADING")
// Cycle: UPLOADING → EXTRACTING → ANALYZING → PENDING_REVIEW → PROCESSED/REJECTED/ERROR

projetId       Int?                       // FK → Projet (optionnel)
extractedText  String?                    // Texte extrait (max 50k chars)
analysis       Json?                      // Analyse Claude (JSON structuré)
confidence     Int?                       // Score confiance 0-100
validatedData  Json?                      // Données validées par l'utilisateur
errorMessage   String?
processedAt    DateTime?
```

### `IntegrationConfig`
```prisma
id            Int      @id @default(autoincrement())
n8nUrl        String   @default("https://n8n.spoton-ai.fr")
webhookSecret String                      // Secret partagé Bearer
emailDomain   String   @default("@reboot-conseil.com")
actif         Boolean  @default(true)
derniereSync  DateTime?
```

---

## 8. Librairies & dépendances npm

### Dependencies (production)

| Package | Version | Usage |
|---------|---------|-------|
| `@anthropic-ai/sdk` | ^0.78.0 | API Claude pour analyse documents |
| `@hookform/resolvers` | ^5.2.2 | Intégration zod + react-hook-form |
| `@prisma/client` | ^6.0.0 | ORM client |
| `class-variance-authority` | ^0.7.1 | Variants CSS Shadcn UI |
| `clsx` | ^2.1.1 | Utilitaire classes conditionnelles |
| `date-fns` | ^3.6.0 | Manipulation dates (v3 — v4 incompatible Turbopack) |
| `lucide-react` | ^0.563.0 | Icônes |
| `mammoth` | ^1.11.0 | Extraction texte DOCX |
| `next` | ^16.1.6 | Framework |
| `pdf-parse` | ^2.4.5 | Extraction texte PDF |
| `react` | ^19.2.4 | UI Library |
| `react-dom` | ^19.2.4 | DOM renderer |
| `react-dropzone` | ^15.0.0 | Upload drag & drop |
| `react-hook-form` | ^7.71.1 | Gestion formulaires |
| `recharts` | ^3.7.0 | Graphiques |
| `sonner` | ^2.0.7 | Toast notifications |
| `tailwind-merge` | ^3.4.0 | Merge classes Tailwind |
| `zod` | ^4.3.6 | Validation schéma |

### DevDependencies

| Package | Version | Usage |
|---------|---------|-------|
| `@tailwindcss/postcss` | ^4.1.18 | Plugin PostCSS TailwindCSS v4 |
| `@types/node` | ^25.2.2 | Types Node.js |
| `@types/react` | ^19.2.13 | Types React |
| `@types/react-dom` | ^19.2.3 | Types React DOM |
| `autoprefixer` | ^10.4.24 | PostCSS autoprefixer |
| `postcss` | ^8.5.6 | PostCSS |
| `prisma` | ^6.0.0 | CLI Prisma |
| `tailwindcss` | ^4.1.18 | CSS framework |
| `tsx` | ^4.21.0 | TypeScript runner (seed) |
| `typescript` | ^5.0.0 | Compilateur TypeScript |

---

## 9. Intégrations externes

### 🤖 Claude AI (Anthropic)
- **SDK** : `@anthropic-ai/sdk`
- **Modèle** : `claude-sonnet-4-20250514`
- **Usage** : Analyse documents uploadés → extraction structurée JSON
- **Route** : `POST /api/documents/process`
- **Prompt système** : Extrait projet, étapes, activités, contacts depuis documents

### 📋 Microsoft Teams (intégration partielle)
- **Page embarquable** : `/teams-dashboard` (iframe dans Teams)
- **Headers CSP** : `frame-ancestors` restreint à `*.teams.microsoft.com`, `*.microsoft.com`, `*.office.com`, `*.sharepoint.com`, `*.skype.com`
- **Webhooks entrants** : `/api/webhooks/teams/route` + `/api/webhooks/teams/action`
- **Webhooks sortants** : `ProjetTeamsConfig.webhookUrl` configuré par projet
- **Statut** : Partiellement implémenté

### 🔄 n8n (workflow automation — legacy)
- **URL** : `https://n8n.spoton-ai.fr` (configuré en DB dans `IntegrationConfig`)
- **Secret** : Partagé via `N8N_WEBHOOK_SECRET`
- **Ancien usage** : Pipeline document ingestion via n8n (remplacé par Next.js natif)
- **Fichier** : `document-ingestion-workflow.json` (workflow n8n archivé, non actif)
- **Routes legacy** (toujours présentes, pourraient être supprimées) :
  - `/api/documents/update-status`
  - `/api/documents/save-text`
  - `/api/documents/save-analysis`
  - `/api/admin/teams-config/test-n8n`
  - `/api/webhooks/n8n/activity-confirmed`

---

## 10. Variables d'environnement

Fichier `.env` à la racine du projet :

| Variable | Description | Requis |
|----------|-------------|--------|
| `DATABASE_URL` | URL SQLite (`file:./dev.db`) | ✅ Oui |
| `ANTHROPIC_API_KEY` | Clé API Anthropic Claude | ✅ Pour documents |
| `N8N_WEBHOOK_SECRET` | Secret authentification webhooks n8n | ⚠️ Legacy |
| `N8N_WEBHOOK_URL` | URL webhook n8n Teams | ⚠️ Legacy |
| `N8N_WEBHOOK_DOCUMENT_URL` | URL webhook n8n documents | ⚠️ Legacy (dupliqué 2x) |
| `NEXT_PUBLIC_APP_URL` ou `APP_URL` | URL de l'app (pour les appels internes) | Optionnel (défaut localhost:3000) |

> ⚠️ **SÉCURITÉ** : Le fichier `.env` contient la clé API Anthropic en clair. S'assurer que `.env` est dans `.gitignore`.

---

## 11. Logique métier clé

### Formules financières

```
1 jour = 8 heures (constante système)
CA consultant = (heures / 8) × TJM
Coût consultant = (heures / 8) × coutJournalierEmployeur
Marge = CA - Coût
Taux de marge = (Marge / CA) × 100

Seuils marge : >40% = vert, 30-40% = orange, <30% = rouge
```

### Health Score projet (lib/projet-metrics.ts)

```
budgetConsommePct = (heuresActivités / 8) / chargeEstimeeTotale × 100

réalisationPct (méthode A, si charges estimées):
  = (chargeValidée + chargeEnCours × prorata) / totalCharges × 100

réalisationPct (méthode B, si pas de charges):
  = étapesValidées / totalÉtapes × 100

écart = réalisationPct - budgetConsommePct
health: bon (écart > 0), normal (écart ≥ -10), critique (écart < -10)
```

### Pipeline d'ingestion documentaire

```
1. Upload fichier (POST /api/documents/upload)
   → Validation (type, taille max 10MB)
   → Sauvegarde dans uploads/
   → Création DocumentIngestion en DB (status: UPLOADING)
   → Déclenchement asynchrone POST /api/documents/process

2. Processing (POST /api/documents/process)
   → status: EXTRACTING
   → Extraction texte selon mimetype :
       PDF  → pdf-parse (chargé lazily via getPdfParse())
       DOCX → mammoth.extractRawText()
       TXT  → fs.readFile() UTF-8
   → Tronquage à 50 000 caractères
   → Sauvegarde extractedText en DB
   → status: ANALYZING
   → Appel Claude API (claude-sonnet-4-20250514, max_tokens: 4000)
   → Parse JSON réponse
   → Sauvegarde analysis + confidence en DB
   → status: PENDING_REVIEW

3. Validation utilisateur (page /documents/review/[id])
   → Affichage analyse structurée
   → Création/association projet
   → POST /api/documents/validate
   → status: PROCESSED / REJECTED
```

---

## 12. Migrations de base de données

| Date | Nom | Changements |
|------|-----|-------------|
| 2026-02-09 | `init` | Schéma initial (Consultant, Projet, Activite, Etape) |
| 2026-02-10 | `add_etape_to_activite` | Ajout FK `etapeId` sur `Activite` |
| 2026-02-10 | `add_cout_employeur` | Ajout `coutJournalierEmployeur` sur `Consultant` |
| 2026-02-16 | `add_charge_estimee` | Ajout `chargeEstimeeJours` sur `Etape` |
| 2026-02-19 | `add_couleurs_and_date_debut_etape` | Ajout `couleur` (Consultant + Projet) + `dateDebut` (Etape) |
| 2026-02-22 | `add_teams_config` | Ajout `ProjetTeamsConfig` + `IntegrationConfig` |
| 2026-02-25 | `add_document_ingestion` | Ajout `DocumentIngestion` |

---

## Scripts npm

```bash
npm run dev          # Démarrer en dev (Turbopack)
npm run build        # Build production
npm run start        # Démarrer en production
npm run db:migrate   # Appliquer migrations Prisma
npm run db:generate  # Regénérer client Prisma
npm run db:studio    # Ouvrir Prisma Studio
npm run db:seed      # Injecter données de test
```

---

*Documentation générée automatiquement — 2026-02-28*
