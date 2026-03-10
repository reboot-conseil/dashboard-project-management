# Plan d'Implémentation — Dashboard v2.0
*Rédigé le 2026-03-09 — Source de vérité pour l'implémentation*

---

## Synthèse

### Ce qui change
Redesign visuel et structurel de toutes les pages. **Les APIs existantes couvrent 100% des besoins** — aucune nouvelle route à créer sauf mention explicite.

### Ce qui ne change pas
- Toutes les routes API (`/api/**`)
- `lib/financial.ts` (formules)
- `lib/auth-guard.ts`, `middleware.ts`, `auth.ts`
- Composants UI (`components/ui/**`)
- Design tokens CSS (`app/globals.css`)
- Tests existants (adapter après chaque page)

### Référence visuelle
Tous les mockups dans `docs/mockups/` sont la source de vérité pour le rendu. En cas de doute : le mockup prime sur le texte.

---

## Architecture des changements

```
Phase 0 — Foundation          (critique, fait en premier)
Phase 1 — Dashboard 3 vues    (plus haute valeur quotidienne)
Phase 2 — Projets             (2ème page la plus utilisée)
Phase 3 — Activités           (action principale consultants)
Phase 4 — Consultants         (gestion équipe)
Phase 5 — Calendrier          (plus complexe, fait en dernier)
```

---

## Phase 0 — Foundation (3 tâches, ~2h)

### T0.1 — Fix login : supprimer la sidebar
**Fichier :** `app/(auth)/layout.tsx`
**Problème :** `app/layout.tsx` wrappe tout y compris les pages auth → sidebar visible sur /login
**Fix :**
```tsx
// app/(auth)/layout.tsx — ne rendre pas l'AppShell
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center"
         style={{ background: 'var(--bg)' }}>
      {children}
    </div>
  )
}
```
**Aussi dans `app/layout.tsx` :** conditionner l'AppShell selon le pathname (ne pas rendre sur `/login`)

---

### T0.2 — Role-based routing au login
**Fichier :** `app/(auth)/login/page.tsx` + `middleware.ts`

**Logique de redirect post-login :**
```
CONSULTANT → / (atterrit sur vue Consultant auto)
PM         → / (atterrit sur vue Opérationnelle auto)
ADMIN      → / (atterrit sur vue Stratégique auto)
```

**Implémentation :** après `signIn()` succès, lire `session.user.role` et rediriger vers `/` avec un query param ou via localStorage `dashboard-active-view` :
```ts
// Dans login/page.tsx après signIn réussi
const role = session?.user?.role
if (role === 'CONSULTANT') localStorage.setItem('dashboard-active-view', 'consultants')
else if (role === 'ADMIN') localStorage.setItem('dashboard-active-view', 'strategique')
else localStorage.setItem('dashboard-active-view', 'operationnel')
router.push('/')
```

**Règle d'accès par onglet :**
- `consultants` → CONSULTANT uniquement
- `operationnel` → PM + ADMIN
- `strategique` → PM + ADMIN

---

### T0.3 — Sidebar : supprimer labels de section
**Fichier :** `components/sidebar.tsx`

**Changements :**
- Supprimer les paragraphes "NAVIGATION", "COMPTE", "ADMIN" visibles
- Remplacer par des séparateurs `<div class="nav-sep" />` (déjà dans le CSS du mockup)
- Conserver les séparateurs visuels entre groupes
- Aucun changement fonctionnel

```tsx
// Remplacer <p className="...">Navigation</p> par un simple séparateur
<div style={{ height: 1, background: 'var(--border-muted)', margin: '5px 0' }} />
```

---

## Phase 1 — Dashboard 3 vues (~6h)

### T1.1 — App page.tsx : top bar unifiée + routing par rôle
**Fichier :** `app/page.tsx`

**Top bar (nouvelle structure) :**
```tsx
// Gauche : 3 view tabs
<button className="view-tab active">Opérationnel</button>
<button className="view-tab">Consultants</button>
<button className="view-tab">Stratégique</button>

// Droite : pills période
<div className="pills-container">
  <button className="ppill">Jour</button>
  <button className="ppill active">Semaine</button>
  <button className="ppill">Mois</button>
  <button className="ppill">Trimestre</button>
  <button className="ppill">Année</button>
  <button className="ppill">Personnalisé</button> {/* → datepicker popup */}
</div>
```

**Masquage par rôle :**
```tsx
const canViewPM = session?.user?.role !== 'CONSULTANT'
// Ne pas rendre l'onglet Stratégique pour CONSULTANT
// Ne pas rendre l'onglet Consultants pour CONSULTANT (redirected to their own view)
```

**Note :** le filtre projet reste dans la barre de filtres de chaque vue (pas dans le top bar global)

---

### T1.2 — Vue Opérationnelle (PM)
**Fichier :** `components/dashboard/DashboardOperationnel.tsx`
**API source :** `GET /api/dashboard/operationnel`

**Layout final (mockup `dashboard-pm.html`) :**

#### Filtre secondaire (sous le top bar)
```
[Tous les projets ▼]  [↻ icon seul]
```
- `projets` from API pour peupler le select
- `onProjectChange` → re-fetch dashboard avec `projetId`

#### 4 KPI Cards
| Card | API field | Notes |
|------|-----------|-------|
| CA généré (hero bleu) | `kpis.caTotal` | trend = delta vs période précédente (calculé côté client) |
| Heures équipe | `kpis.totalHeures` | sous-titre = `kpis.tauxOccupation`% |
| Marge globale | `kpis.tauxMarge`% | montant = `kpis.margeBrute`€ |
| Projets gérés | `kpis.projetsEnCours` | sous-titre "X nécessitent attention" = count alertes |

**KpiCard héro :** gradient primary, valeur `2.6rem font-800`, TJM moyen en sous-titre, trend bottom-right
**KpiCard standard :** dot coloré + icône top-right + valeur `2.6rem font-800` + sous-titre + trend

#### Projets actifs
**Source :** `projetsASurveiller[]` de l'API opérationnelle

Par projet :
- Accent left 4px couleur projet
- Nom 14.5px font-700 + client muted
- Badge `Marge X.X%` coloré (success/warning/danger selon seuil)
- Barres : Budget (`#2563EB`, orange si >85%) + Réalisé (`#10b981`)
- Flèche ↗ seule (lien `/projets/[id]`)
- **Pas** d'étapes validées, **pas** d'échéance

#### Deadlines à venir (grille 2×3)
**Source :** `prochainesDeadlines[]` — prendre les 6 premiers
```tsx
// Grille 2 colonnes, 3 items par colonne
// Chaque item : titre (bold) | date colorée (même ligne)
//               dot couleur + projet name (dessous)
// Couleur date : < 7j → danger · < 14j → warning · > 14j → text-muted
```

#### Synthèse équipe
**Source :** `consultants[]` du même endpoint (a `heuresPeriode`, `tauxOccupation`)
```tsx
// Avatar (couleur) + nom + heures + % + barre de progression
// Total en footer
// Couleur barre = couleur consultant (pas #10b981 ici — barres distinctes par person)
```

#### Charts
- **Activité Équipe** (area chart) : `activiteEquipe.data` + `activiteEquipe.consultants`
  - Label dynamique selon période sélectionnée
  - Déjà implémenté dans `ActiviteEquipeChart.tsx` — adapter le titre
- **Tendances CA & Marge** (line chart) : `tendances6Mois[]`
  - Déjà dans `TendancesPrevisionsChart.tsx` — adapter

---

### T1.3 — Vue Consultant
**Fichier :** `components/dashboard/DashboardConsultants.tsx`
**API source :** `GET /api/dashboard/consultants?consultantId=X&dateDebut=&dateFin=`

**Spécificité rôle CONSULTANT :** `consultantId` = `session.user.consultantId` (verrouillé)
**Pour PM/ADMIN :** select consultant dans la barre filtre

**Layout final (mockup `dashboard-consultant.html`) :**

#### 4 KPI Cards
| Card | API field |
|------|-----------|
| CA généré (hero) | `kpis.caGenere` + TJM = `consultant.tjm` |
| Heures ce mois | `kpis.heuresTotal` · sous-titre = `kpis.heuresBill`h facturables |
| Taux occupation | `kpis.tauxOccupation`% · barre + objectif 80% |
| Projets actifs | `kpis.nbProjetsActifs` · liste `kpis.projetsActifsList` |

#### Colonne gauche
- **Mes étapes en cours** : `projetsEnCours[].etapes` (filtrées EN_COURS)
  - Accent left couleur projet + nom étape + heures loguées/prévues + barre + badge deadline
- **Activités récentes** : `activitesRecentes[]` — 4 dernières entrées

#### Colonne droite (2 cartes distinctes)
1. **Saisie rapide** (en haut, en premier)
   - Selects : projet (`projetsEnCours`), étape, date, heures
   - POST `/api/activites` au submit
   - Saisie rapide = UX principale du consultant

2. **Mes deadlines à venir** (en bas)
   - Source : `deadlines[]`
   - Même format que deadlines PM : grille 2×3, date colorée côté titre

#### Chart évolution
- Source : appel `/api/dashboard/consultants` avec `dateDebut` = -6 mois
- Barres CSS (height proportionnelle) par mois, couleur = couleur consultant
- Stats inline : moyenne mensuelle, CA moyen, taux facturation moyen

---

### T1.4 — Vue Stratégique
**Fichier :** `components/dashboard/DashboardStrategique.tsx`
**API source :** `GET /api/dashboard/strategique`

**Layout final (mockup `dashboard-strategique.html`) :**

#### Hero CA (Ledgerix style)
```tsx
<div className="text-[10.5px] uppercase tracking-widest text-muted">
  Chiffre d'affaires — {année}
</div>
<div className="text-[3.2rem] font-extrabold tracking-tight">
  {formatCA(objectifsAnnuels.caAnnuelYTD)}
</div>
// Trend : +X% vs N-1 · badge "Objectif atteint" ou "X% de l'objectif"
// 3 micro-stats inline droite : Marge nette | Heures facturées | Taux utilisation
```

Sources :
- CA annuel YTD → `objectifsAnnuels.caAnnuelYTD`
- Marge nette → `kpis.tauxMarge`
- Heures facturées → `kpis.heuresTotal` (annuel)
- Taux utilisation → `capacite.tauxOccupationMoyen`

#### 4 KPI Cards
| Card | Source |
|------|--------|
| CA ce mois (hero) | `tendances` dernier mois + trend vs N-1 |
| Marge moyenne | `kpis.tauxMarge` + objectif 35% |
| Heures facturées | `kpis.heuresTotal` + taux facturation |
| Taux utilisation | `capacite.tauxOccupationMoyen` + barre |

#### Portfolio tiles (3 colonnes)
**Source :** `projets[]` avec `health` field
- health `bon` → success-bg + success border
- health `normal` → warning-bg + warning border
- health `critique` → danger-bg + danger border
- Données : `nom`, `client`, `pctBudget`, `tauxMarge` (calculé)
- Barre budget + badge statut + marge %

#### CA par client (donut CSS)
**Source :** `donutData[]` → `{ id, nom, client, ca, couleur }`
- Grouper par `client` pour sommer les CA
- `conic-gradient` CSS proportionnel
- Légende avec barres proportionnelles

#### Tendances 12 mois (barres groupées CA + Marge)
**Source :** `tendances[]` (12 entrées mois par mois si dispo, sinon 6)
- Barres CSS groupées par mois
- CA + Marge côte à côte
- Mois en cours = barres highlighted (border)

#### Occupation équipe
**Source :** `capacite.consultants[]` → `{ id, nom, heures, capacite, taux }`
- Barre par consultant couleur consultant
- Ligne verticale objectif 80%
- Couleur barre : >80% vert, 60-80% orange, <60% rouge

#### Projets à risque
**Source :** `projets[]` filtré `tauxMarge < 40 || pctBudget > 85`
- Table compacte 7 colonnes
- Lien ↗ vers projet

---

## Phase 2 — Projets (~4h)

### T2.1 — Page liste projets
**Fichier :** `app/projets/page.tsx`
**API :** `GET /api/projets?statut=`

**Changements :**
- Supprimer Portfolio Health Matrix (validé)
- Conserver : tabs statut, recherche, tri, toggle Cards/Liste
- Cards redesignées (voir specs T2.2)
- Vue Liste : table 7 colonnes avec mini barre budget

### T2.2 — Project cards redesign
**Design final (mockup `projets-v2.html`) :**
```tsx
// Header teinté 10% couleur projet + trait 3px en haut
<div style={{ background: `${projet.couleur}1A` }}>
  <div style={{ background: projet.couleur, height: 3 }} /> {/* top bar */}
  <StatusBadge /> + <MarginBadge /> {/* dans le header */}
</div>

// Body
<ProjectName fontSize="15" fontWeight="700" />
<ClientName className="text-muted" />
<DateRange />
<BudgetBar /> {/* Budget: primary, orange si >85% */}
<RealisedBar /> {/* Réalisé: always #10b981 */}
<Footer> montant€ / budget€ | deadline colored </Footer>
<ArrowLink href={`/projets/${id}`} /> {/* ↗ top-right */}
```

**Mapping données :**
- Budget bar width = `projet.budgetConsommePct`%
- Réalisé bar width = `projet.progressionRealisationPct`%
- Marge badge value = calculé : `(caTotal - coutReel) / caTotal * 100`
  - NB: `marge` field dans l'API = `CA - coût` en €, pas en %
  - Calculer `margePercent = projet.marge / (projet.budget * progressionBudgetPct / 100) * 100`

### T2.3 — Panneau détail slide-in
**Fichier :** `app/projets/page.tsx` (nouveau state + composant)
**API :** `GET /api/projets/[id]` + `GET /api/projets/[id]/progression` + `GET /api/activites?projetId=`

**Structure :**
```tsx
// State
const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
const [detailTab, setDetailTab] = useState<'apercu' | 'kanban' | 'financier' | 'activites'>('apercu')

// Layout
<div className="flex overflow-hidden">
  <div className={`flex-1 ${selectedProjectId ? 'mr-0' : ''}`}>
    {/* Liste projets */}
  </div>
  <DetailPane
    projectId={selectedProjectId}
    tab={detailTab}
    onClose={() => setSelectedProjectId(null)}
    className={selectedProjectId ? 'w-[520px]' : 'w-0'}
  />
</div>
```

**Onglet Aperçu :** description + 3 KPIs + barres + étapes list (from `/projets/[id]`)
**Onglet Kanban :** réutiliser `<KanbanBoard />` existant
**Onglet Financier :** `<BudgetCard />` + heures par étape (barres CSS)
**Onglet Activités :** `<ActivitesTable />` filtré sur ce projet

---

## Phase 3 — Activités (~3h)

### T3.1 — Cleanup et restructuration
**Fichier :** `app/activites/page.tsx`

**Supprimer :**
- Vue Feed (`<ActivitesFeed />`) — composant et toggle
- Filtre facturable/non facturable
- `<SaisieRapide />` inline (remplacé par dialog)

**Conserver et adapter :**
- Table (`<ActivitesList />`) avec ses filtres
- Export CSV

### T3.2 — Nouvelle structure page
```
[Top bar] Titre + count + toggle (Table only) + Exporter + "+ Saisir"
[Filtre bar 1 ligne] Consultant ▼ · Projet ▼ · Pills période · Stats→
[Stats inline] 168h · Facturables 168h(100%) · 4 consultants · 3 projets
[Table groupée] Header sticky + rows groupées par jour
[Pagination + Footer] 25/page · totaux
```

**Stats bar (nouveau) :**
```tsx
// Calculé depuis les totaux retournés par l'API
const stats = {
  heures: totaux.total,
  facturables: totaux.facturable,
  pctFacturable: Math.round(totaux.facturable / totaux.total * 100),
  nbConsultants: new Set(activites.map(a => a.consultant.id)).size,
  nbProjets: new Set(activites.map(a => a.projet.id)).size,
}
```

### T3.3 — Table groupée par jour
**Fichier :** `components/activites/activites-list.tsx`

**Groupement :**
```tsx
const grouped = activites.reduce((acc, a) => {
  const day = format(a.date, 'yyyy-MM-dd')
  if (!acc[day]) acc[day] = []
  acc[day].push(a)
  return acc
}, {})

// Rendre : <GroupHeader date={day} totalHeures={sum} />
//          {rows}
```

**Row actions hover :**
```tsx
<tr className="group ...">
  {/* ... data cells ... */}
  <td>
    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
      <EditButton />
      <DeleteButton className="hover:bg-red-50 hover:text-red-700" />
    </div>
  </td>
</tr>
```

### T3.4 — Dialog saisie rapide
**Fichier :** `components/activites/saisie-rapide.tsx` (adapter en dialog)

```tsx
// Actuellement : inline form
// Nouveau : <Dialog> ouvert par bouton "+ Saisir une activité"
// Champs : Projet → Étape → Date → Heures → Description (optionnel)
// POST /api/activites → toast succès → close dialog → refresh table
```

### T3.5 — Pagination
**Fichier :** `components/activites/activites-list.tsx`
```tsx
const PAGE_SIZE = 25
const [page, setPage] = useState(1)
const paginatedActivites = activites.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)
// Footer : Total heures · Facturables · Non fact. · count activités
```

---

## Phase 4 — Consultants (~3h)

### T4.1 — Page liste consultants
**Fichier :** `app/consultants/page.tsx`
**API source actuelle :** `GET /api/consultants` (liste basique)
**API supplémentaire :** `GET /api/dashboard/operationnel` pour heures/occupation

**Plan :**
1. Fetcher `/api/consultants` → liste de base
2. Fetcher `/api/dashboard/operationnel` → `consultants[]` avec `heuresPeriode`, `tauxOccupation`
3. Merger par `id` pour avoir les métriques dans la table

### T4.2 — Table avec expand inline
**Structure :**
```tsx
// Table header : Consultant · Email · TJM · Occupation (barre) · CA ce mois · Tendance · Statut · Actions

// Ligne cliquable → expand row dessous
// Expand : Projets en cours | Activités récentes (flex gap-6)
// Un seul expand ouvert à la fois

// Actions (hover) :
// [Dashboard ▸] → navigate to / avec dashboard-active-view=consultants + lastConsultantId=X
// [Modifier]    → open edit dialog (existant)

// Statut badge : cliquable, stopPropagation
// onClick → PATCH /api/consultants/[id] { actif: !actif }
```

**Expand data :**
- Projets en cours → `/api/projets?statut=EN_COURS` filtré par consultant (si API le supporte, sinon filtrer côté client)
- Activités récentes → `/api/activites?consultantId=X&dateFin=today&dateDebut=today-14j` (2 dernières semaines)

### T4.3 — Vue Cards (toggle)
```tsx
// Grid 2 colonnes
// Card : avatar 48px + nom + rôle + TJM
//       2 KPIs (CA ce mois · Occupation)
//       barre occupation colorée
//       sparkline tendance 4 mois (barres CSS, données de l'historique)
//       bouton "Voir dashboard" → même action que bouton Dashboard en table
```

**Tendance 4 mois (sparkline CSS) :**
Calculer depuis tendances : nécessite un appel à `/api/dashboard/consultants` pour avoir l'historique. Pour éviter N appels, utiliser les données disponibles dans la table ou simplifier avec des barres proportionnelles.

---

## Phase 5 — Calendrier (refonte complète, ~8h)

### T5.1 — Page container + top bar
**Fichier :** `app/calendrier/page.tsx`

**Nouvelle top bar :**
```tsx
// Gauche : [Timeline | Mois | Équipe] 3 view buttons
// Centre : [← Mars 2026 →] [Aujourd'hui]
// Droite : [Détail (toggle)] [+ Nouvelle étape]
```

**Nouvelle barre filtres :**
```tsx
// 3 dropdowns seulement :
<Select placeholder="Tous les projets" options={projets} />
<Select placeholder="Tous les consultants" options={consultants} />
<Select placeholder="Tous les statuts" options={statuts} />
// + légende inline droite : Réalisé · Planifié · Deadline
```

**Supprimer :** `<FiltresBar />` actuel (complet), `<WeekSidePanel />`, bouton Filtres

**Right panel Détail :**
- Fermé par défaut
- S'ouvre quand on clique sur une étape (Timeline ou Mois ou Équipe)
- `onEtapeClick(etapeId)` → fetch détail → afficher
- Contenu : nom étape + projet + dates + progression + consultant + activités loguées + CTA

### T5.2 — Vue Timeline (Gantt)
**Remplace :** `components/calendrier/gantt-view.tsx` (refonte)
**API :** `GET /api/etapes?projetId=` pour chaque projet visible

**Structure HTML/CSS :**
```tsx
// Colonne fixe 200px : label projet (group header surface-raised) + label étape
// Zone flexible : position relative, barres absolues avec left%/width%
// Today line : calculé = (today - startDate) / totalDays * 100%

// Barre Gantt :
<div style={{
  left: `${startPct}%`,
  width: `${durationPct}%`,
  background: projet.couleur,
  borderRadius: 5
}}>
  {/* Portion réalisée (opaque) */}
  <div style={{ width: `${etape.progressionPct}%`, background: projet.couleur }} />
  {/* Portion planifiée (hachuré opacity 0.35) */}
  <div style={{ flex: 1, opacity: 0.35, backgroundImage: 'repeating-linear-gradient(45deg,...)' }} />
  {/* Label si assez large (>80px) */}
  {width > 80 && <span>{etape.nom} · {etape.progressionPct}%</span>}
  {/* Avatar stack */}
  <ConsultantAvatars consultants={etape.consultants} />
</div>

// Milestone ◆ :
<div style={{
  left: `${deadlinePct}%`,
  background: joursRestants < 0 ? 'danger' : joursRestants < 7 ? 'warning' : 'success',
  transform: 'rotate(45deg)',
}} title={etape.nom} />
```

**Données API nécessaires :**
- Pour chaque projet actif : liste des étapes avec `dateDebut`, `deadline`, `progressionPct`
- L'API `/api/etapes?projetId=X` retourne les étapes d'UN projet
- Pour le Gantt multi-projets : appels parallèles pour tous les projets visibles

**Période par défaut :** 2 semaines centrées sur aujourd'hui

### T5.3 — Vue Mois
**Remplace :** `components/calendrier/month-view.tsx` (refonte)

**Règles validées :**
- Semaine **Lundi → Dimanche**
- Sam/Dim : `background: var(--surface-raised)`, **aucune barre d'activité**
- Milestones tombant Sam/Dim → reportés au Vendredi précédent
- Barres continues : `margin: -6px` (couvre 5px padding + 1px border)
- Hauteur barre fixe : `height: 20px`

**Algorithme barres multi-day :**
```tsx
// Pour chaque étape dans la période du mois :
// → calculer les jours workdays dans la plage (excl. Sam/Dim)
// → pour chaque jour :
//   - premier jour workday = "continues-right" (ou standalone si 1 jour)
//   - jours intermédiaires = "continues-both"
//   - dernier jour workday = "continues-left"
//   - Sam/Dim entre deux jours : pas de rendu mais la barre "continue" visuellement

// Classes CSS :
// .continues-right { border-radius: '4px 0 0 4px'; margin-right: -6px; }
// .continues-left  { border-radius: '0 4px 4px 0'; margin-left: -6px; }
// .continues-both  { border-radius: 0; margin: 0 -6px; }
```

**Dots activité :** depuis `heuresParJour` de l'API calendrier → afficher dots consultants ayant logué ce jour

### T5.4 — Vue Équipe (Charge)
**Remplace :** `components/calendrier/charge-equipe-view.tsx` (refonte)

**Structure :**
```tsx
// Header sticky : [Name col 180px] + [jours colonnes]
// Pour chaque consultant : row avec
//   - Avatar + nom (col 180px)
//   - Pour chaque jour : cellule avec barres projet colorées + heures loguées
//   - Weekend : surface-raised opacity 0.4
//   - Aujourd'hui : background rgba(37,99,235,0.04) + header bleu "Auj."
// Footer sticky : totaux par jour

// Données : activites groupées par consultantId+date
// Source : GET /api/calendrier avec la période affichée
```

### T5.5 — Right panel détail étape
**Réutiliser :** `components/calendrier/etape-sidebar.tsx` (adapter)

```tsx
// Contenu quand étape sélectionnée :
// - Barre couleur projet (top 4px)
// - Nom étape + projet + client
// - Dates début → deadline (colorée selon urgence)
// - Barre progression avec heures loguées / heures prévues
// - Avatar + nom consultant assigné
// - Liste activités loguées sur cette étape (depuis /api/activites?etapeId=X)
// - Liens : [Voir projet ↗] [+ Saisir activité]

// Quand aucune étape sélectionnée :
// - Hint centré : icône + "Cliquer sur une étape"

// Données : GET /api/projets/[id] pour l'étape complète
```

---

## Composants à créer (nouveaux)

| Composant | Fichier | Usage |
|-----------|---------|-------|
| `ProjectDetailPane` | `components/projets/project-detail-pane.tsx` | Slide-in détail projet sur /projets |
| `DeadlinesGrid` | `components/dashboard/deadlines-grid.tsx` | Grille 2×3 déadlines (PM + Stratégique) |
| `SyntheseEquipe` | `components/dashboard/synthese-equipe.tsx` | Répartition heures équipe |
| `StatsBar` | `components/activites/stats-bar.tsx` | Ligne stats au-dessus de la table |
| `GanttTimeline` | `components/calendrier/gantt-timeline.tsx` | Vue Timeline refonte |
| `MonthGridCell` | `components/calendrier/month-grid-cell.tsx` | Cellule refonte vue Mois |
| `EquipeRow` | `components/calendrier/equipe-row.tsx` | Ligne consultant vue Équipe |

---

## Composants à supprimer / simplifier

| Composant actuel | Action |
|-----------------|--------|
| `components/activites/activites-feed.tsx` | **Supprimer** |
| `components/calendrier/week-side-panel.tsx` | **Supprimer** |
| `components/calendrier/filtres-bar.tsx` | **Remplacer** par 3 selects inline |
| `components/dashboard/DashboardHeader.tsx` | **Supprimer** (pas de header de page) |
| `components/layout/page-header.tsx` | **Ne plus utiliser** sur les pages redesignées |
| `components/dashboard/operationnel/ProjetsASurveillerList.tsx` | **Remplacer** par nouveau composant |
| `components/dashboard/operationnel/ActiviteEquipeChart.tsx` | **Garder + adapter titre dynamique** |

---

## Mapping données critiques

### Marge % par projet (calcul)
```ts
// L'API retourne marge en €, pas en %
// Pour afficher le badge "Marge XX%" :
const margePercent = projet.budget > 0
  ? Math.round((projet.marge / (projet.budget * projet.budgetConsommePct / 100)) * 100)
  : 0
// Ou plus simple : depuis progression
// marge% = (CA - cout) / CA * 100 où CA = heures/8 * tjm
```

### Couleur barre budget
```ts
const budgetBarColor = pctBudget > 100 ? '#b91c1c'  // danger
                     : pctBudget > 85  ? '#f97316'  // orange
                     : '#2563EB'                    // primary
```

### Couleur badge marge
```ts
const margeBadgeVariant = margePercent > 40 ? 'success'
                        : margePercent > 30 ? 'warning'
                        : 'danger'
```

### Couleur date deadline
```ts
const deadlineDateColor = joursRestants < 0  ? 'var(--danger)'
                        : joursRestants < 7  ? 'var(--danger)'
                        : joursRestants < 14 ? 'var(--warning)'
                        : 'var(--text-muted)'
```

### Couleur barre occupation consultant
```ts
const occupationBarColor = taux > 80 ? '#10b981'  // vert
                         : taux > 60 ? '#F59E0B'  // orange
                         : '#b91c1c'              // rouge sous-utilisé
```

---

## Ordre d'exécution recommandé

| # | Tâche | Durée est. | Valeur |
|---|-------|-----------|--------|
| 1 | T0.1 Login fix | 30min | Critique |
| 2 | T0.2 Role routing | 45min | Critique |
| 3 | T0.3 Sidebar labels | 20min | Faible effort |
| 4 | T1.1 Page.tsx top bar | 1h | Foundation |
| 5 | T1.2 Vue Opérationnelle | 2h | Plus haute valeur |
| 6 | T1.3 Vue Consultant | 1.5h | Haute valeur |
| 7 | T1.4 Vue Stratégique | 1.5h | Haute valeur |
| 8 | T2.1+T2.2 Projets list+cards | 1.5h | Haute valeur |
| 9 | T2.3 Projet detail pane | 1.5h | Haute valeur |
| 10 | T3.1→T3.5 Activités | 2.5h | Moyen |
| 11 | T4.1→T4.3 Consultants | 2.5h | Moyen |
| 12 | T5.1→T5.5 Calendrier | 8h | Complexe, en dernier |

**Total estimé : ~25-28h de développement**

---

## Notes de test post-implémentation

Après chaque phase :
```bash
npx tsc --noEmit 2>&1 | grep -v use-local-storage  # 0 erreurs TS
npm run test:run                                     # 239 tests passent
```

Après Phase 0 : tester login sans sidebar visible
Après Phase 1 : tester routing par rôle (3 utilisateurs différents)
Après Phase 5 : npm run test:e2e (16 tests Playwright)

---

*Ce document est la source de vérité pour l'implémentation.
Les mockups dans `docs/mockups/` sont la référence visuelle.
Le guide complet est dans `docs/UX-IMPROVEMENT-GUIDE.md`.*
