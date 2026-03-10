# PM Dashboard — Guide d'Amélioration UX/UI Complet
*Audit 2026-03-08 — Inspection Playwright + analyse codebase + validation utilisateur*

---

## Table des matières

1. [Personas & accès par rôle](#1-personas--accès-par-rôle)
2. [Architecture de l'information](#2-architecture-de-linformation)
3. [Dashboard — 3 vues par persona](#3-dashboard--3-vues-par-persona)
4. [Pages secondaires — structure & data](#4-pages-secondaires--structure--data)
5. [Calendrier — refonte from scratch](#5-calendrier--refonte-from-scratch)
6. [Design visuel global](#6-design-visuel-global)
7. [Composants à corriger](#7-composants-à-corriger)
8. [Formats de données](#8-formats-de-données)
9. [Priorités d'implémentation](#9-priorités-dimplémentation)

---

## 1. Personas & accès par rôle

### Stratégie : auto-routing par rôle au login

Chaque rôle atterrit sur sa vue naturelle. Les accès sont restrictifs vers le bas (Consultant ne voit pas les vues PM/Direction), ouverts vers le haut (PM peut voir Stratégique).

| Rôle | Vue par défaut | Accès autorisés |
|------|---------------|-----------------|
| **CONSULTANT** | Dashboard Consultant | Dashboard Consultant uniquement |
| **PM** | Dashboard PM | Dashboard PM + Dashboard Stratégique |
| **ADMIN / Direction** | Dashboard Stratégique | Toutes les vues + Admin |

### Besoins par persona

**Consultant**
- Saisir ses heures facilement (action quotidienne principale)
- Voir ses propres métriques : heures ce mois, CA généré, taux d'occupation
- Connaître ses projets assignés et les prochaines deadlines
- Accéder à son planning semaine
- Voir ses activités récentes

**PM (Chef de Projet)**
- Surveiller tous les projets sous sa responsabilité
- Monitorer les dérives (budget, planning, équipe)
- Voir ses propres métriques en tant que consultant actif
- Anticiper les deadlines et blocages
- Accéder à la vue financière pour reporting
- Sélectionner un ou plusieurs projets à la fois pour filtrer

**Direction (Stratégique)**
- Santé financière globale : CA, marge, tendances
- Vue portfolio : santé de tous les projets simultanément
- Capacité et utilisation de l'équipe
- Comparaisons périodiques et par client
- Aucun besoin opérationnel quotidien

---

## 2. Architecture de l'information

### 2.1 Navigation sidebar — structure recommandée

```
[Logo PM Dashboard]  [toggle ⇌]

──────────────────────────────
  Dashboard           ← actif = fond coloré, texte primary
  Projets
  Activités
  Calendrier
──────────────────────────────
  Consultants         ← visible PM + Admin seulement
──────────────────────────────
  Documents
  Paramètres
──────────────────────────────
  Utilisateurs        ← visible Admin seulement

[Search ⌘K]          ← reste en bas
──────────────────────────────
[Avatar] Prénom · Rôle  [Logout]
```

**Changements vs état actuel :**
- Supprimer les labels section "NAVIGATION / COMPTE / ADMIN" → remplacer par séparateurs visuels `border-t` 1px
- L'item actif = fond `primary/10` + texte `primary` + barre gauche 3px `primary`
- "Consultants" masqué pour les Consultants
- "Utilisateurs" masqué pour PM et Consultants
- Pas de breadcrumb sauf sur les pages de détail (ex: Projets > Refonte Site Web)

### 2.2 Identification de la page active sans header

**Règle globale : pas de titre H1 de page visible.** L'utilisateur sait où il est via :
1. Item actif dans la sidebar (fond + couleur + barre)
2. Le premier élément de contenu à l'écran (ex: les cards projets, la table activités)
3. Breadcrumb uniquement sur les pages de détail `/projets/[id]`

### 2.3 Login — correction critique

**Problème actuel :** La sidebar est visible sur la page login.
**Fix :** Le layout `(auth)/layout.tsx` ne rend pas la sidebar. Page login = fond dégradé neutre, card centré, logo seul. La sidebar n'apparaît que dans `app/layout.tsx` après authentification confirmée.

**Splash screen :** Conserver le splash écran de transition login → dashboard :
- "Bonjour [Prénom] — [jour] [date]"
- Gradient, fade-out 600ms, sessionStorage guard

---

## 3. Dashboard — 3 vues par persona

### 3.1 Vue PM — Opérationnelle + personnelle

La vue PM affiche à la fois les données de l'équipe/projets ET les métriques personnelles du PM en tant que consultant actif.

```
┌─────────────────────────────────────────────────────────────────┐
│  BANDE PERSONNELLE (compact, 1 ligne, fond surface-raised)      │
│  Mes heures ce mois: 42h  ·  Mon CA: 5 250€  ·  Occupation: 70% · Mes projets: 3  │
├─────────────────────────────────────────────────────────────────┤
│  [Filtres] Période ▼  +  Sélection projet(s) — multi-select     │
│            Rafraîchir ↻                                          │
├──────────┬──────────┬──────────┬────────────────────────────────┤
│ KPI 1    │ KPI 2    │ KPI 3    │ KPI 4                          │
│ Heures   │ CA       │ Marge    │ Alertes Projets                │
│ Équipe   │ Période  │ Globale  │ (card combinée surveiller)     │
│ [hero]   │          │          │                                │
├──────────┴──────────┴──────────┴────────────────────────────────┤
│ COLONNE GAUCHE (60%)           │ COLONNE DROITE (40%)           │
│                                │                                │
│ Projets actifs                 │ Deadlines N+14 jours           │
│ → état santé par projet        │ → liste compacte par deadline  │
│ → barre budget/réalisé         │ → badge retard J+X             │
│ → badge marge %                │                                │
│ → link "Voir →"                │ Activité équipe (mini)         │
│                                │ → qui a saisi aujourd'hui      │
│                                │ → heures totales du jour       │
├────────────────────────────────┴────────────────────────────────┤
│ CHART — Activité Équipe 7 derniers jours (area chart)           │
│ Légende interactive par consultant                              │
├─────────────────────────────────────────────────────────────────┤
│ CHART — Tendances CA & Marge 6 mois (line chart 2 séries)       │
├─────────────────────────────────────────────────────────────────┤
│ CHART — Répartition heures par projet (bar chart empilé)        │
│ → visualiser quelle proportion du temps va sur quel projet      │
└─────────────────────────────────────────────────────────────────┘
```

**KPI 4 — Alertes Projets (card combinée) :**
- Remplace la zone alerte ET "Projets à Surveiller" (fusionnés)
- Fond neutre `surface-raised`, bordure gauche colorée par sévérité
- Si 0 alerte → "Tout est sous contrôle ✓" en vert, fond surface normal
- Si alertes → liste compacte : `● Dashboard RH Analytics — Dérive -22.8% — 1j retard`
- Expandable : cliquer ouvre le détail projet

**KPIs supplémentaires disponibles (optionnels, configurables) :**
- Jours facturables restants dans la période
- Taux d'occupation moyen équipe
- Nombre de consultants sous-utilisés (<50% occupation)
- Velocity (heures loguées / heures planifiées ce mois)

---

### 3.2 Vue Consultant — Personnelle uniquement

Le Consultant ne voit que ses propres données. Aucune donnée d'équipe.

```
┌─────────────────────────────────────────────────────────────────┐
│  [Filtre] Période ▼                                             │
├──────────┬──────────┬──────────┬────────────────────────────────┤
│ KPI 1    │ KPI 2    │ KPI 3    │ KPI 4                          │
│ Mon CA   │ Mes      │ Mon taux │ Mes projets                    │
│ ce mois  │ heures   │ occup.   │ actifs                         │
│          │ (fact/tot)│ + label │                                │
├──────────┴──────────┴──────────┴────────────────────────────────┤
│ COLONNE GAUCHE (55%)           │ COLONNE DROITE (45%)           │
│                                │                                │
│ Mes projets en cours           │ Mon planning semaine           │
│ → nom projet + client          │ → lun/mar/mer/jeu/ven          │
│ → mes étapes assignées         │ → heures loguées par jour      │
│ → deadline prochaine           │ → objectif journalier (8h)     │
│ → % avancement étape           │ → CTA "Saisir activité"        │
│                                │                                │
│                                │ Prochaines deadlines           │
│                                │ → mes deadlines N+14           │
├────────────────────────────────┴────────────────────────────────┤
│ CHART — Mon évolution 6 mois (area chart)                       │
│ Séries : Heures · CA · Occupation %                             │
│ Stats résumé : moyenne 6 mois, tendance →↑↓                    │
├─────────────────────────────────────────────────────────────────┤
│ Activités récentes                                              │
│ → 5 dernières entrées loguées, link "Voir toutes →"             │
└─────────────────────────────────────────────────────────────────┘
```

**Note importante :** Le bouton "Saisir une activité" doit être très accessible depuis cette vue. C'est l'action principale du Consultant. Envisager un bouton flottant ou sticky en bas à droite.

---

### 3.3 Vue Stratégique — Direction

Vue macro, financière et portfolio. Aucun détail opérationnel.

```
┌─────────────────────────────────────────────────────────────────┐
│  [Filtre] Période annuelle ▼  Année ▼                           │
├──────────┬──────────┬──────────┬────────────────────────────────┤
│ KPI 1    │ KPI 2    │ KPI 3    │ KPI 4                          │
│ CA total │ Marge    │ Heures   │ Taux utilisation               │
│ période  │ globale  │ facturées│ équipe                         │
│ + trend  │ + trend  │ + % fact.│ + nb consultants               │
├──────────┴──────────┴──────────┴────────────────────────────────┤
│ Portfolio Health Matrix                                         │
│ → 1 tile par projet, coloré selon santé (vert/orange/rouge)     │
│ → taille = poids budget relatif                                 │
│ → hover = tooltip avec métriques clés                           │
├────────────────────────────────┬────────────────────────────────┤
│ CHART — CA & Marge 12 mois     │ CHART — CA par client (donut)  │
│ (line chart 2 séries)          │ → Optima Group / TechFlow /... │
│ + projection N+3 mois en tiret │ → % du CA total par client     │
├────────────────────────────────┴────────────────────────────────┤
│ CHART — Occupation équipe (grouped bar)                         │
│ → 1 groupe par consultant, barres par mois sur 6 mois           │
│ → ligne horizontale = objectif (80%)                            │
├─────────────────────────────────────────────────────────────────┤
│ Projets à risque financier                                      │
│ → projets avec marge < 30% ou budget > 90%                      │
│ → tableau compact : nom, client, marge%, budget%, statut        │
└─────────────────────────────────────────────────────────────────┘
```

**Données supplémentaires Stratégique :**
- Velocity équipe (heures loguées vs heures planifiées)
- Projets terminés dans les délais (% de réussite)
- Pipeline : projets planifiés vs en cours vs terminés
- ROI moyen par type de projet

---

## 4. Pages secondaires — structure & data

### 4.1 Page Projets `/projets`

**Layout :**
```
[Filtres] Tous | En cours | Planifiés | Terminés
[Barre] Recherche · Tri ▼ · [Toggle Cards/Liste]

[Portfolio Health Matrix — compact, collapsible]
  Tiles colorées par santé projet

[Grille de cards OU table selon toggle]
```

**Project Card — améliorée :**
- Barre couleur 6px en haut (conserver)
- Badge statut "En cours" (conserver)
- Budget : barre unique (supprimer les doubles barres redondantes)
  - Couleur barre : bleu neutre jusqu'à 85% → orange 85-99% → rouge 100%+
- Marge % : badge agrandi (padding suffisant, font-size 13px), coloré
  - > 40% = vert · 30-40% = orange · < 30% = rouge
- Étapes : "X/Y validées" (conserver)
- Boutons "Modifier" + "Voir détail" (conserver)

**Vue Liste (nouveau toggle) :**
Colonnes : Couleur · Nom · Client · Budget% · Marge% · Deadline · Statut · Actions

**État vide :**
Illustration + "Aucun projet" + CTA "Créer un projet"

---

### 4.2 Page Projet Détail `/projets/[id]`

Breadcrumb : `Projets > Refonte Site Web`

**Structure :**
```
[Header compact] Nom projet · Client · Statut badge · Dates
[Onglets] Kanban | Financier | Activités | Documents

TAB KANBAN (défaut) :
  Étapes en colonnes (À faire / En cours / Terminé)
  Cards étapes avec heures + deadline + consultant

TAB FINANCIER :
  [KPIs] Budget total · Consommé · Marge · Projection fin
  [CHART] Burndown budget (ligne idéale vs réelle)
  [CHART] Heures par étape (bar chart horizontal)

TAB ACTIVITÉS :
  Table des activités de ce projet uniquement
  (filtré automatiquement)

TAB DOCUMENTS :
  Documents liés à ce projet
```

---

### 4.3 Page Activités `/activites`

**Suppression :** filtre "Facturable / Non facturable" → retiré

**Layout :**
```
[Header fonctionnel]
  Activités · X activités · Xh  |  [Table/Feed toggle]  [Exporter]  [+ Saisir activité]

[Stats bar — compact, 1 ligne]
  Heures: 168h  ·  Facturables: 168h  ·  Consultants: 4  ·  Projets: 3

[Filtres — 1 seule ligne]
  [Consultant ▼]  [Projet ▼]  [Aujourd'hui · Cette semaine · Ce mois · Toutes]  [⋯ Sauvegarder]

[Table avec row hover actions]
  Colonnes : Date · Consultant · Projet · Étape · Heures · Description · Actions(hover)
  Tri par date décroissant par défaut
  Groupement par jour optionnel (toggle dans ⋯)

[Footer sticky] Total: Xh · Facturables: Xh · Non fact.: Xh · (X activités)
```

**Améliorations table :**
- Description : colonne plus large, truncate au-delà de 60 chars avec tooltip hover
- Actions (✏ 🗑) : visibles uniquement au hover de la ligne
- Pagination : 25 lignes par page avec navigateur en bas
- Groupement par jour : sous-totaux par jour (heures · consultants · projets)

**Vue Feed :**
- Groupé par date
- Entrée par activité avec avatar consultant, projet coloré, heures
- Plus lisible pour la saisie récente

---

### 4.4 Page Consultants `/consultants`

**Pas de KPI header** — ces KPIs sont dans les dashboards respectifs.

**Layout :**
```
[Action bar]
  [+ Nouveau consultant]  [Exporter CSV]

[Table consultants]
  Colonnes : Dot couleur · Nom · Email · TJM · Occupation · CA ce mois · Tendance (sparkline) · Statut · Actions

[Row actions (hover)]
  ✏ Modifier  |  📊 Voir dashboard  ← navigue vers Dashboard tab Consultant filtré sur ce consultant

[Row expandable (clic sur la ligne)]
  Projets en cours + activités récentes (inline, sans naviguer)
```

**Statut :** badge cliquable pour activer/désactiver (comportement existant à conserver)

**État vide :** illustration + CTA "Ajouter un consultant"

---

### 4.5 Page Documents `/documents`

**Layout :**
```
[Action bar]
  Documents · X documents  |  [+ Uploader un document]

[Filtres]
  [Statut ▼ : Tous / En attente / Traités / Erreurs]  [Actualiser]

[Grille de cards OU empty state]
```

**Document card (quand documents présents) :**
- Icône fichier (selon type : .docx, .pdf, .xlsx)
- Nom fichier + date upload
- Projet associé (tag cliquable → /projets/[id])
- Badge statut IA : "Analysé ✓" · "En cours..." · "Erreur ✗"
- Spinner pendant traitement IA
- Click → page review existante

**Upload (`/documents/upload`) :**
- Supprimer les boutons radio "Nouveau projet / Projet existant"
- Remplacer par : champ texte contexte libre + dropdown `Associer à un projet ▼`
  - Options : "Nouveau projet" (en haut de liste) + liste projets existants
  - Projet optionnel (peut uploader sans associer)

---

### 4.6 Admin — Utilisateurs `/admin/users`

**Layout actuel à conserver** (grille de cards, bon)

**Amélioration cards :**
- Avatar gradient couleur → conserver
- Pour comptes actifs : bouton "Paramètres ▼" avec dropdown (Réinitialiser mdp · Désactiver)
- Pour comptes inactifs : bouton "Activer" (conserver)
- Indicateur de rôle plus visible : badge "PM" / "Consultant" / "Admin" avec couleur

**Grid :** forcer `grid-cols-3` strict avec breakpoints (éviter la 4ème card seule)

---

## 5. Calendrier — refonte from scratch

### 5.1 Philosophie

Le calendrier est l'outil de **pilotage temporel** du PM. Il doit répondre à 3 questions :
1. **Où en sont mes projets dans le temps ?** → Vue Timeline
2. **Quelles sont les échéances ce mois ?** → Vue Mois
3. **Qui fait quoi et à quelle capacité ?** → Vue Équipe

### 5.2 Structure de la page

```
┌──────────────────────────────────────────────────────────────────────┐
│ TOP BAR (sticky)                                                      │
│ [Timeline | Mois | Équipe]   ← Mars 2026 →   [Aujourd'hui]          │
│ [Projets ▼] [Consultants ▼]  ·  [⌨ Nouvelle étape]                  │
├──────────────┬───────────────────────────────────────┬───────────────┤
│ LEFT PANEL   │ MAIN AREA                             │ RIGHT PANEL   │
│ (200px)      │ (flexible)                            │ (280px)       │
│ collapsible  │                                       │ collapsible   │
│              │                                       │               │
│ Projets      │  [Vue Timeline / Mois / Équipe]       │ Cette semaine │
│ ● Proj 1     │                                       │ ou            │
│ ● Proj 2     │                                       │ Détail évént  │
│ ● Proj 3     │                                       │               │
│              │                                       │               │
│ Consultants  │                                       │               │
│ ○ Sophie     │                                       │               │
│ ○ Marc       │                                       │               │
└──────────────┴───────────────────────────────────────┴───────────────┘
```

**Left panel :**
- Liste des projets avec dot couleur + checkbox pour show/hide
- Séparateur · Liste consultants avec circle couleur + checkbox
- Collapsible via bouton ‹ / › en haut du panel

**Right panel :**
- Par défaut : résumé semaine courante (deadlines + heures loguées J0)
- Quand un événement est sélectionné : fiche détail de l'étape
- Collapsible via bouton en top bar

---

### 5.3 Vue Timeline (défaut)

Gantt moderne avec rangées par projet et blocs par étape.

```
     │ lun 2 │ mar 3 │ mer 4 │ jeu 5 │ ven 6 │ sem 7 │ ...
─────┼───────┼───────┼───────┼───────┼───────┼───────┼────
Proj │███████████████████████████████│         ◆
  A  │  Développement Frontend       │     Design
─────┼───────────────────────────────┼───────────────────
Proj │               │███████████████████████████│
  B  │               │  Migration Données        │ ◆
─────┼───────────────┼───────────────────────────┼──────
     ▲ TODAY line
```

**Éléments visuels :**
- **Blocs** : colorés par projet (palette système), bords arrondis `radius-sm`
- **Label** dans le bloc si assez large (≥80px) : nom de l'étape
- **Ligne TODAY** : trait vertical rouge/primary avec label "Aujourd'hui"
- **Milestone ◆** : diamant à la date deadline, coloré selon statut
  - vert = on track · orange = attention (<7j) · rouge = dépassé
- **Ligne de grille** : alternance très légère pair/impair pour lisibilité
- **Hover sur bloc** : tooltip avec nom étape, consultant, dates, % avancement
- **Click sur bloc** : ouvre le right panel avec fiche détail

**Granularité adaptative :**
- Vue semaine : colonnes = jours
- Vue mois : colonnes = semaines
- Vue trimestre : colonnes = mois
- Boutons de zoom + / − dans la top bar

**Comportement :**
- Scroll horizontal pour naviguer dans le temps
- Header colonnes (jours/semaines) sticky lors du scroll horizontal
- Lignes de projet sticky lors du scroll vertical

---

### 5.4 Vue Mois

Grille mensuelle enrichie.

```
  Lun    Mar    Mer    Jeu    Ven    Sam    Dim
┌──────┬──────┬──────┬──────┬──────┬──────┬──────┐
│  2   │  3   │  4   │  5   │  6   │  7   │  8   │
│ 14h  │ 22h  │ 20h  │ 18h  │ 16h  │  0h  │  0h  │
│●Dev  │●Dev  │●Dev  │      │◆Dead │      │      │
│ Mig  │      │ Mig  │ Mig  │      │      │      │
└──────┴──────┴──────┴──────┴──────┴──────┴──────┘
```

**Éléments visuels :**
- Numéro de jour en haut à gauche de la cellule
- Total heures loguées du jour (gris léger, sous le numéro)
- Blocs événements : pill coloré par projet, nom tronqué
- Multi-day events : barre qui s'étire sur plusieurs cellules
- Milestone ◆ : s'affiche dans la cellule de deadline
- Hover sur cellule : léger highlight
- Click sur cellule : right panel avec détail du jour
- Click sur bloc : right panel avec détail de l'étape

**Indicateur de charge :**
- Fond de cellule légèrement teinté selon charge du jour
  - < 4h = neutre · 4-8h = très léger vert · > 8h = léger orange

---

### 5.5 Vue Équipe

Vue de charge et planification des ressources.

```
            │ lun 2 │ mar 3 │ mer 4 │ jeu 5 │ ven 6
────────────┼───────┼───────┼───────┼───────┼──────
Sophie L.   │  7h   │  8h   │  6h   │  7h   │  0h
            │ ████▒ │ █████ │ ████  │ ████▒ │      │
────────────┼───────┼───────┼───────┼───────┼──────
Marc D.     │  6h   │  8h   │  8h   │  6h   │  7h
            │ ████  │ █████ │ █████ │ ████  │ ████▒│
────────────┼───────┼───────┼───────┼───────┼──────
Julie C.    │  8h   │  7h   │  7h   │  8h   │  6h
            │ █████ │ ████▒ │ ████▒ │ █████ │ ████ │
```

**Éléments visuels :**
- Barre de charge par jour : remplie proportionnellement à 8h (objectif)
  - Couleur barre = couleur projet principal du jour
  - Si plusieurs projets : barre segmentée par couleur projet
- Chiffre heures au-dessus de la barre
- Code couleur charge : < 50% = gris · 50-100% = vert · > 100% = rouge
- Hover : tooltip "Sophie Leroux — Refonte Site Web : 7h"
- Click : right panel avec détail des activités du jour pour ce consultant

**En-tête gauche :**
- Avatar circulaire + prénom + indicateur statut (point vert/gris)

---

### 5.6 Right Panel — fiche détail étape

Apparaît au click sur n'importe quel élément de toutes les vues.

```
┌─────────────────────────────┐
│ [×]                         │
│                             │
│ ████ Développement Frontend │  ← couleur projet
│ Refonte Site Web            │
│ Eco Green Solutions         │
│                             │
│ 📅 02/03 → 14/03/2026       │
│ ⏱ 42h loguées / 56h prévues │
│ 👤 Sophie Leroux            │
│                             │
│ Progression                 │
│ ████████████░░░░ 75%        │
│                             │
│ Statut  [On track ●]        │
│                             │
│ [Voir projet →]             │
│ [Saisir activité →]         │
└─────────────────────────────┘
```

---

### 5.7 UX Smart — détails importants

- **Drag & drop** (futur) : prévoir les handles visuels sur les blocs mais implémenter en phase ultérieure
- **Quick action** : clic droit sur une cellule → contextMenu "Saisir une activité"
- **Keyboard nav** : flèches ← → pour naviguer entre périodes
- **Responsive** : mobile affiche uniquement Vue Mois simplifiée
- **Scroll memory** : mémoriser la position de scroll en localStorage lors du changement de vue
- **Couleurs** : utiliser exclusivement la palette projets existante (carrés border-radius:3px)
- **Empty state** : si aucun projet/étape → illustration + "Aucune étape planifiée" + CTA "Voir les projets"
- **Chargement** : skeleton rows dans Timeline/Équipe, skeleton cells dans Mois

---

## 6. Design visuel global

### 6.1 Principes directeurs

1. **Pas de header H1 de page** — l'UI elle-même communique le contexte
2. **Couleur = information** — chaque usage de couleur a une signification (projet, santé, statut)
3. **Actions au hover** — les boutons d'édition/suppression ne s'affichent qu'au survol de la ligne/card
4. **Hiérarchie par densité** — information critique = grand, information secondaire = petit+gris
5. **Consistance totale** — mêmes composants, mêmes règles sur toutes les pages

### 6.2 Corrections composants visuels

**Barres de progression (systémique) :**
- 0-84% → bleu `--color-primary`
- 85-99% → orange `--color-warning`
- ≥ 100% → rouge `--color-destructive`
- Fond de barre : `--color-border` (pas de gris foncé)

**Badges marge % :**
- Agrandir : padding `px-3 py-1`, font-size 13px, border-radius `radius-sm`
- > 40% → `success-soft` · 30-40% → `warning-soft` · < 30% → `destructive-soft`

**Zone alertes Dashboard :**
- Supprimer le fond rose (#FEF2F2) agressif
- Intégrer dans la 4ème KPI card (voir section 3.1)
- Bordure gauche 4px colorée selon sévérité : orange `attention` · rouge `dérive`
- Zéro alerte → carte verte "Tout est sous contrôle"

**Sidebar section labels :**
- Supprimer "NAVIGATION / COMPTE / ADMIN" en uppercase
- Remplacer par séparateurs visuels `border-t border-border-muted` + `my-2`

**Login page :**
- Supprimer sidebar (cf. 2.3)
- Card centré vertical+horizontal, fond `--bg` avec léger gradient
- Logo seul au-dessus du formulaire

**Boutons d'action dans les tables :**
- `opacity-0 group-hover:opacity-100 transition-opacity` sur le container
- Les lignes de table : `group` className sur le `<tr>`

**Skeleton loading :**
- Toutes les pages avec API calls doivent avoir un skeleton state défini
- Tables → skeleton rows (4-6 lignes)
- Cards → skeleton cards avec shimmer
- KPI cards → skeleton avec valeur remplacée par barre shimmer

**Doubles barres dans project cards :**
- Supprimer les petites barres Budget/Réalisé en bas de card
- Ne garder que les grandes barres avec % en texte à droite

### 6.3 Tokens à utiliser / rappels

```css
/* Couleurs correctes (ne pas improviser) */
--color-muted-foreground  /* ticks graphiques, textes secondaires */
--color-primary           /* éléments actifs, liens, hero KPI */
--color-surface-raised    /* fond cards neutres, bandes */
--shadow-sm               /* cards interactives */

/* Radius */
radius-sm = 6px   /* badges, pills */
radius-md = 10px  /* inputs, small cards */
radius-lg = 14px  /* cards principales */

/* Transitions */
transition-colors duration-150  /* hover sur éléments interactifs */
transition-opacity duration-200 /* show/hide actions */
```

---

## 7. Composants à corriger

| Composant | Problème actuel | Correction |
|-----------|----------------|------------|
| `badge` marge % | Trop petit, illisible | `px-3 py-1` font-13px, variant coloré |
| Barre progression | Orange ambigu | Bleu → orange 85% → rouge 100% |
| Row actions table | Toujours visible | `opacity-0 group-hover:opacity-100` |
| Tooltip cellule tronquée | Absent | `title` attr ou `<Tooltip>` Radix |
| Skeleton loading | Inconsistant | Systématiser sur toutes les pages |
| Login sidebar | Bug UX | Retirer du layout `(auth)` |
| Section labels sidebar | All caps | Séparateurs visuels `border-t` |
| Pagination table activités | Absente | 25 lignes/page + navigateur |
| Calendrier | Chargement infini | Refonte complète (section 5) |
| Double barres project card | Redondant | Supprimer les petites barres |
| Alert zone dashboard | Fond rose agressif | Intégrer dans KPI card 4 |

---

## 8. Formats de données

| Type | Format | Exemple |
|------|--------|---------|
| Montants > 10k€ | `Xk€` 1 décimale | `42.3k€` |
| Montants < 10k€ | `X XXX €` | `4 275 €` |
| Marge % | `X.X%` coloré | `41.5%` (vert) |
| Heures | `Xh` entier | `126h` |
| Heures facturables | `Xh fact. (XX%)` | `42h fact. (100%)` |
| Dates courtes | `JJ MMM` | `7 mars` |
| Dates longues | `JJ/MM/AAAA` | `07/03/2026` |
| Retard | `J+X` badge destructive-soft | `J+3` |
| Tendance | `↑ +X%` ou `↓ -X%` vs N-1 | `↑ +12%` |
| Taux occupation | `XX%` + label | `65% · Bon rythme` |
| Labels occupation | < 50% → Sous-utilisé · 50-80% → Bon rythme · > 80% → Chargé · > 100% → Surchargé | — |

**Supprimer les emojis des labels** (ex: `🟡 Sous-utilisé` → `● Sous-utilisé` avec dot CSS coloré)

---

## 9. Priorités d'implémentation

### 🔴 Critique — UX cassée ou information manquante

1. Supprimer sidebar du layout login
2. Routing par rôle au login (Consultant → vue Consultant, PM → vue PM, Admin → Stratégique)
3. Skeleton loading systématique sur toutes les pages
4. Pagination table Activités (25/page)
5. Refonte Calendrier (section 5 complète)

### 🟠 Haute valeur — Impact fort, effort moyen

6. Refonte Dashboard PM (bande perso + KPI combinée alertes + colonnes + charts enrichis)
7. Refonte Dashboard Consultant (vue personnelle avec planning semaine)
8. Refonte Dashboard Stratégique (portfolio matrix + donut client + occupation team)
9. Fusion zone alertes → KPI card 4 sur le dashboard
10. Bouton "Voir dashboard" sur les cards/lignes consultants
11. Dropdown projet sur Documents upload (remplace radio buttons)
12. Supprimer filtre facturable sur Activités

### 🟡 Amélioration UX — Impact moyen, effort faible

13. Row hover actions (tables et cards)
14. Séparateurs sidebar (supprimer labels uppercase)
15. Barres progression couleur systémique
16. Badge marge % agrandi et coloré
17. Supprimer doubles barres dans project cards
18. Stats bar au-dessus table Activités
19. Grid `grid-cols-3` strict sur /admin/users

### 🟢 Enrichissement données — Nouvelles fonctionnalités

20. Heatmap activité (calendrier type GitHub) sur /activites
21. Portfolio health matrix sur /projets
22. Burndown budget sur page projet détail
23. Donut CA par client sur vue Stratégique
24. Gauge d'occupation sur /consultants
25. Toggle Cards/Liste sur /projets
26. Zoom in/out sur Timeline calendrier

---

*Guide finalisé le 2026-03-08 — Références visuelles 2026-03-08 — Mockups validés 2026-03-09 — Prêt pour implémentation.*

---

## 11. Mockups validés — Décisions d'implémentation

Tous les mockups sont dans `docs/mockups/`. Chaque section ci-dessous documente les décisions validées lors des sessions de review.

---

### 11.1 Dashboard PM (`dashboard-pm.html`) ✅

**Structure validée :**
- Top bar : tabs `Opérationnel | Consultants | Stratégique` à gauche · pills période à droite (1 seule ligne)
- Pas de bande personnelle (supprimée après feedback)
- Filtres : pills dans container arrondi + dropdown projet + refresh icon seul
- `Personnalisé` → date picker popup inline

**4 KPI cards :**
- Hero (CA généré) : gradient primary, `3rem font-800`, TJM + trend
- Heures équipe : dot bleu, occupation en sous-titre, trend +/- vs période
- Marge globale : dot vert, €, objectif
- Projets gérés : dot indigo, count + dots couleur projets + note "X nécessitent attention"
- Pas de card Alertes avec border orange — remplacée par Projets gérés

**Section Projets actifs :**
- Accent left 4px couleur projet
- Nom 14.5px font-700, client muted en dessous
- Barres : `Budget` (toujours `#2563EB`, orange si >85%) · `Réalisé` (toujours `#10b981`)
- Badge `Marge XX%` uniquement — coloré selon seuil (rouge <30% · orange 30-40% · vert >40%)
- Pas de badge Dérive/On track/Attention
- Flèche ↗ seule (pas de "Voir" texte)
- Pas d'étapes validées, pas d'échéance

**Section Deadlines :**
- Grille 2 colonnes, 3 items par colonne (6 deadlines max)
- Chaque item : étape (bold) + projet (dot couleur) + date colorée sur la même ligne
- Date rouge <7j · orange <14j · gris >14j

**Section Synthèse équipe** (remplace "Activité aujourd'hui") :
- Avatar + nom + heures + % + barre par consultant
- Total en footer

**Charts :** Labels dynamiques selon filtre période actif (lbl1, lbl2, lbl3 mis à jour par JS)

---

### 11.2 Dashboard Consultant (`dashboard-consultant.html`) ✅

**Spécificités rôle :**
- Sidebar réduite : Mon tableau de bord · Mes activités · Mes projets · Calendrier · Documents · Paramètres
- Top bar : label pill "Mon tableau de bord" à gauche · pills période + CTA "Saisir une activité" à droite
- Pas d'onglets switchables (consultant = 1 seule vue)

**CTA Saisir une activité :** bouton bleu prominent, visible en permanence dans le top bar

**Colonne droite (2 cartes distinctes) :**
1. **Saisie rapide** (en premier) : projet → étape → date + heures → Enregistrer
2. **Deadlines à venir** (en dessous) : même format exactement que PM v4 (dl-grid 2 cols, dl-cell, dl-row avec date côté)

**Mes étapes en cours :** accent left couleur projet + nom étape + heures loguées/prévues + barre progression + badge date deadline

---

### 11.3 Dashboard Stratégique (`dashboard-strategique.html`) ✅

**Hero metric CA :**
- Label `CHIFFRE D'AFFAIRES ANNUEL` en `text-xs uppercase tracking-widest text-muted` au-dessus
- Valeur `3.2rem font-800`, trend + badge objectif en ligne
- 3 micro-stats inline à droite (Marge nette · Heures facturées · Taux utilisation)

**Portfolio health matrix :**
- 3 tiles colorés (success-bg/warning-bg/danger-bg) avec accent left 3px
- Budget barre + marge % dans chaque tile
- Hover : translateY(-2px) + shadow

**CA par client :**
- Donut CSS via `conic-gradient` avec trou central "3 clients"
- Légende avec barres proportionnelles + %

**Occupation équipe :**
- Barres par consultant avec couleur consultant
- Ligne verticale objectif 80% dans chaque barre
- Moyenne équipe en footer

**Projets à risque :**
- Table compacte 7 colonnes
- Filtre automatique : marge < 40% ou budget > 85%

---

### 11.4 Calendrier (`calendrier-v2.html`) ✅

**3 vues switchables via JS :** Timeline (défaut) · Mois · Équipe

**Filtres :** 3 dropdowns `Projets ▼` `Consultants ▼` `Statut ▼` (pas de pills/chips)

**Pas de left panel** — supprimé après feedback. Bouton Filtres supprimé.

**Bouton Détail :**
- Au repos : gris
- S'active (bleu) au clic sur une barre Gantt → right panel slide-in automatique
- ✕ pour fermer

**Right panel détail étape :**
- Header : badge projet + barre couleur + nom étape + projet + dates
- Barre progression avec heures loguées/prévues
- Avatar consultant
- Liste activités loguées sur cette étape
- Liens : Voir le projet · Saisir une activité
- Quand pas d'étape sélectionnée : hint "Cliquer sur une étape"

**Vue Timeline (Gantt) :**
- Colonne label 200px fixe + zone barre flexible
- Groups par projet avec header `surface-raised`
- Barres bicolores : plein (réalisé) + hachuré opacity 0.35 (planifié)
- Milestones ◆ colorés (danger = retard · warning = proche · success = ok)
- Aujourd'hui = colonne `today-col` mise en évidence (généré par JS)

**Vue Mois :**
- Semaine **Lundi → Dimanche**
- **Sam/Dim vides d'activité** (surface-raised, aucune barre)
- Milestones tombant Sam/Dim reportés au Vendredi précédent
- Barres continues : `margin: -6px` (= 5px padding + 1px border), hauteur fixe `20px`
- Dots d'activité sous les numéros de jour (loguée = dot couleur consultant)
- Aujourd'hui = cercle primary sur le numéro
- Clic sur event/milestone → right panel détail

**Vue Équipe :**
- Header sticky : numéros + noms jours, aujourd'hui bleu, weekends grisés
- 4 lignes consultants avec avatar
- Cellules : barre colorée projet (cliquable) + heures loguées
- Colonne aujourd'hui teintée bleue "À saisir"
- Footer sticky totaux par jour

---

### 11.5 Projets (`projets-v2.html`) ✅

**Pas de Portfolio Health Matrix** — supprimée après feedback

**Toggle Cards ↔ Liste** dans la barre recherche/tri

**Clic sur card/ligne → panneau détail slide-in (520px)**
- Card sélectionnée : `border-color: primary + box-shadow primary-10`
- 4 onglets : Aperçu · Kanban · Financier · Activités
- Fermeture via ✕ ou clic autre projet

**Onglet Aperçu :**
- Description + 3 KPIs (budget % · réalisé · deadline) + barres + liste étapes

**Onglet Kanban :**
- 3 colonnes : À faire · En cours · Terminé
- Cards étapes avec accent left couleur projet + barre progression

**Onglet Financier :**
- 4 KPIs grille (budget total · consommé · marge · restant)
- Heures par étape en barres

**Onglet Activités :**
- Liste saisies avec avatar consultant
- CTA "Saisir une activité"

**Project cards :**
- Header teinté 10% couleur projet + trait 3px en haut
- Statut + badge marge dans le header
- Flèche ↗ couleur text-muted → primary au hover
- Barres uniformes (Budget = `#2563EB` orange si >85% · Réalisé = `#2563EB`)
- Montant + deadline colored en footer

---

### 11.6 Activités (`activites-v2.html`) ✅

**Vue Feed : SUPPRIMÉE** — inutile selon validation utilisateur. Garder uniquement la vue Table.

**Top bar :** titre + count total · toggle Table/Feed (à retirer) · Exporter · "+ Saisir une activité"

**Filtres (1 ligne) :**
- Consultant ▼ · Projet ▼ · Pills période (Aujourd'hui · Cette semaine · Ce mois · Toutes)
- Pas de filtre Facturable/Non facturable
- Stats inline côté droit : Heures · Facturables (%) · Consultants · Projets

**Table :**
- Groupement par jour avec header `surface-raised` + total heures du jour
- Colonnes : Date · Consultant (avatar + nom) · Projet (dot couleur) · Étape · Heures · Description (truncate + tooltip) · Fact. · Actions(hover)
- Actions hover : ✏ Modifier · 🗑 Supprimer (rouge au hover)
- Description `overflow:hidden text-overflow:ellipsis white-space:nowrap` avec `title` attr

**Pagination :** 25/page (sélecteur 25/50/100) + navigateur pages

**Footer sticky :** Total · Facturables · Non facturables · (count activités)

**Dialog "Saisir une activité" :** Projet → Étape → Date + Heures → Description (optionnel) · Annuler / Enregistrer

---

### 11.7 Consultants (`consultants-v2.html`) ✅

**Pas de KPI header** — les KPIs vont dans les dashboards respectifs

**Toggle Table ↔ Cards**

**Vue Table :**
- Colonnes : Avatar+Nom/Rôle · Email · TJM · Occupation (barre 80px + %) · CA ce mois · Tendance 4 mois (barres CSS) · Statut (badge cliquable) · Actions(hover)
- **Clic sur ligne → expand inline** : 2 colonnes (Projets en cours · Activités récentes). Un seul expand à la fois.
- **Statut badge** : `onclick="event.stopPropagation()"` pour ne pas déclencher l'expand
- **Actions hover** : bouton "Dashboard" (primary style) + "Modifier"
- Bouton "Dashboard" → navigue vers Dashboard tab Consultants filtré sur ce consultant

**Vue Cards :**
- Avatar large 48px centré à gauche
- 2 KPIs grid (CA ce mois · Occupation)
- Barre occupation colorée (vert >80% · orange 60-80%)
- Sparkline tendance 4 mois en barres CSS
- Bouton "Voir dashboard" prominent en bas

**Couleur occupation :**
- >80% → `#10b981` vert
- 60-80% → `#F59E0B` orange
- <60% → `var(--danger)` rouge

---

### 11.8 Notes transversales d'implémentation

| Sujet | Décision |
|-------|----------|
| Barres Budget | Toujours `#2563EB` (primary), orange si >85%, rouge si >100% |
| Barres Réalisé | Toujours `#10b981` (vert) |
| Badge marge | Coloré par seuil : rouge <30% · warning 30-40% · success >40% |
| Flèches navigation | `↗` SVG diagonal (path `M7 17L17 7 M17 7H7 M17 7v10`) |
| Actions tables | `opacity-0 group-hover:opacity-100` — jamais visibles au repos |
| Expand ligne | Un seul ouvert à la fois, clic re-ferme |
| Deadlines grid | `grid-cols-2`, 3 items/col, date colorée sur même ligne que titre |
| Calendrier semaine | Lundi→Dimanche, Sam/Dim surface-raised et vides d'activité |
| Vue Feed activités | **Supprimer** — non retenu |
| Dashboard routing | Auto-route par rôle : Consultant→vue Consultant, PM→Opérationnel, Admin→Stratégique |
| Sidebar réduite consultant | Dashboard renommé "Mon tableau de bord", sans Consultants ni Utilisateurs |

---

## 10. Références visuelles — Inspirations par composant

Sources analysées : Vento, Learning app, Fitness dark, Workspace CRM, OxeliaMetrix widgets, Kristin personal dashboard, Ledgerix accounting, Taskly calendar.

---

### 10.1 KPI Cards

**Références :** Vento (dot + label + grand chiffre + trend) · Kristin (gradient card hero)

**Implémentation :**
- **Hero card** (Heures Équipe) : fond `--color-primary` plein, texte blanc, chiffre `3rem font-bold`, sparkline en bas — style Kristin gradient card
- **Cards standard** : fond `surface`, dot coloré top-left, label `text-muted-foreground`, chiffre `2rem font-semibold`, trend `↑ +12%` en dessous — style Vento (Total views / Customers / Orders)
- La valeur secondaire (ex: "65.6% taux occupation") : texte muted, pas de sous-texte redondant

---

### 10.2 Bande personnelle PM (personal strip)

**Référence :** Kristin (3 mini stats inline sous le nom) · OxeliaMetrix "Total project time" card

**Implémentation :**
- Bande horizontale compacte `surface-raised`, hauteur ~64px
- Avatar initial coloré à gauche, prénom + rôle, puis 4 métriques inline séparées par `·` :
  `Mes heures: 42h · Mon CA: 5.2k€ · Occupation: 70% · Projets: 3`
- Une seule ligne discrète — pas d'encart card par métrique

---

### 10.3 Filtres de période et toggles de vue

**Références :** Vento ("This month | Last month | Custom") · Ledgerix ("Week | Month | Quarter | Year") · Taskly (pill tabs "List | Calendar | Planner")

**Implémentation :**
- **Sélecteurs de période** : texte seul, actif = `font-semibold` + `border-b-2 border-primary` — style Vento/Ledgerix
- **Toggles de vue** (Table/Feed, Timeline/Mois/Équipe) : pills avec fond actif `bg-primary/10 text-primary` — style Taskly

---

### 10.4 Project Cards — /projets

**Références :** Learning app (gradient header sur course cards) · OxeliaMetrix "Project Roadmap" widget

**Implémentation :**
- **Header card** : bande supérieure ~48px avec fond teinté à 12% de la couleur projet (`rgba(project-color, 0.12)`), remplace la barre 6px brusque — style Learning app course card
- **Progress** : une seule barre `height: 8px`, `radius-full`, gradient fill clair → saturé de la couleur projet — suppression des barres doublons
- **Étapes** : `2/4 validées` + % compact style OxeliaMetrix Roadmap (Intro 100%, Audit 59%)

---

### 10.5 Calendrier — Vue Mois

**Références :** Taskly (grille propre, event pills multi-day, avatar stacks) · Fitness dark (dots d'activité sous les dates)

**Implémentation :**
- **Grille** : fond `#F5F7FA` (token `--bg`), cellules blanches, `border border-border-muted` — style Taskly
- **Étapes multi-day** : barres horizontales colorées s'étirant sur les colonnes, `radius-full`, couleur projet, nom tronqué — style Taskly events
- **Avatar stack** : 2-3 cercles consultants qui se chevauchent à droite du bloc événement — style Taskly
- **Dots d'activité** : petits dots 2px sous le numéro de jour = activités loguées ce jour — style Fitness dark month calendar
- **Aujourd'hui** : cercle `--color-primary` autour du chiffre du jour, cellule très légèrement teintée — style Fitness dark "17" orange circle

---

### 10.6 Calendrier — Vue Timeline (Gantt)

**Références :** OxeliaMetrix "Project Roadmap" widget · Workspace schedule timeline bar

**Implémentation :**
- **Rangées** : lignes par projet, `divide-y divide-border-muted`, fond blanc
- **Barres** : couleur projet solide, `radius-sm`, label nom étape à l'intérieur si ≥80px — style OxeliaMetrix roadmap
- **Progress split** : portion complétée = couleur pleine, portion restante = couleur à 30% opacity avec hachures légères — style OxeliaMetrix (Intro 100% / Audit 59%)
- **Avatars** : stack de 2-3 consultants à l'extrémité droite de la barre
- **Ligne TODAY** : trait vertical `--color-primary`, cercle en haut + label "Auj." — style Workspace timeline current position marker

---

### 10.7 Calendrier — Navigation jours

**Référence :** OxeliaMetrix "Upcoming Meetings" date picker horizontal scrollable

**Implémentation :**
- Strip horizontal scrollable de pills jours : `[Lun 2] [Mar 3] [Mer 4]...`
- Inactif : fond `surface-raised`, chiffre + initial jour en muted
- Actif : fond `--color-primary`, texte blanc, `radius-lg`
- Utilisé pour la navigation semaine dans Vue Mois et en haut de Vue Timeline

---

### 10.8 Dashboard Stratégique — Hero metric CA

**Référence :** Ledgerix (headline énorme, label tiny, period toggle)

**Implémentation :**
- Chiffre CA total en `font-size: 2.75rem font-bold`
- Label `CHIFFRE D'AFFAIRES` en `text-xs uppercase tracking-widest text-muted-foreground` au-dessus
- Toggle `Semaine | Mois | Trimestre | Année` en text tabs à droite — style Ledgerix
- Fond blanc/surface neutre — la force vient de la typographie seule, zéro gradient

---

### 10.9 Charts — Area / Line

**Références :** Learning app Performance chart (area transparent, tooltip dark bubble) · Ledgerix (bar + line overlay)

**Implémentation :**
- **Activité Équipe / Évolution consultant** : area chart, `fillOpacity: 0.12`, courbes lisses, tooltip = bulle sombre arrondie avec annotation — style Learning app
- **Tendances CA 12 mois (Stratégique)** : bar chart (colonnes) + smooth line overlay — style Ledgerix
- Points sur les courbes supprimés — juste la ligne et le fill transparent

---

### 10.10 Charts — Bar hebdomadaire

**Référence :** Fitness dark "This week" chart

**Implémentation :**
- Barres verticales avec **caps arrondies en haut** (`border-radius` haut uniquement)
- Couleur = couleur consultant ou projet principal de la journée
- Barres vides (weekend, jour sans log) = `border-muted` très léger
- Axe X : jours courts (Lun/Mar/Mer...), axe Y supprimé — la hauteur parle d'elle-même

---

### 10.11 Barres de progression

**Références :** Kristin "Developed areas" (thin bars + %) · Fitness dark rows (icône + X/Y + %)

**Implémentation :**
- **Budget/occupation dans les cards** : `height: 6px`, `radius-full`, couleur système (bleu→orange→rouge), % label à droite — style Kristin
- **Étapes dans projet détail** : `height: 10px`, gradient fill couleur projet, icône à gauche, `X/Y heures` + `%` à droite — style Fitness dark progress rows
- **Occupation consultants** : `height: 6px`, % + indicateur ↑↓ trend — style Kristin "Developed areas"

---

### 10.12 Tables

**Référence :** Vento "Spending" table (icon + label + valeur + dot statut)

**Implémentation :**
- `divide-y divide-border-muted`, zéro border extérieure sur la table
- Colonnes de statut : dot coloré `●` + texte — pas de badge pill (trop lourd en table dense)
- Actions (✏ 🗑) : `opacity-0 group-hover:opacity-100` sur chaque ligne
- Hover ligne : `bg-surface-raised/60`

---

### 10.13 Right Panel — Calendrier

**Références :** Kristin "My meetings" right panel · OxeliaMetrix "Upcoming Meetings" card

**Implémentation :**
- Panel `border-l border-border w-72 bg-background`
- Section **"Cette semaine"** : liste items `[Date courte] · [Nom étape] · [tag projet coloré] ↗` — style Kristin My meetings
- Section **"Heures loguées"** : chiffre compact + lien "Saisir →"
- Quand événement sélectionné : remplace le contenu avec fiche détail (barre couleur projet en haut + métadonnées)

---

### 10.14 Cards Consultant — /consultants (vue Cards toggle)

**Références :** Workspace "New Leads" cards · Kristin profile card

**Implémentation :**
- Circle avatar couleur consultant centré en haut, nom + email, barre occupation `6px`, sparkline 4 mois en bas
- Bouton "Voir dashboard ↗" discret en bas de card — style Workspace lead card, sans les rating dots

---

### 10.15 Sidebar — État actif

**Références :** Taskly (active = fond pleine largeur) · Fitness dark (active icon = fond accent arrondi)

**Implémentation :**
- Item actif : `bg-primary/10 text-primary` pleine largeur, `border-l-2 border-primary` — style Taskly
- Mode collapsed 64px : icône active sur `bg-primary/15 rounded-md` — style Fitness dark
- Hover (inactif) : `bg-surface-raised` très léger

---

### 10.16 Splash screen login → dashboard

**Référence :** Fitness dark hero banner (gradient doux, grand texte)

**Implémentation :**
- Fond `--bg` avec gradient radial très subtil `primary/5` en haut gauche
- "Bonjour Jonathan" en `text-3xl font-bold`, date dessous en `text-muted-foreground`
- Fade-out 600ms — comportement existant conservé, fond ajusté

---

### Ce qui n'est PAS repris des références

| Élément | Image source | Raison |
|---------|-------------|--------|
| AI "Ask me anything" panel | Vento | Hors scope |
| Rating dots sur lead cards | Workspace | Non pertinent pour consultants |
| Vert néon #lime | OxeliaMetrix, Workspace | Trop éloigné du "Professional Dark Soft" |
| KPI cards full gradient 83%/56% | Kristin | Trop consumer, pas assez B2B professionnel |
| Timeline schedule bar top | Workspace | Trop CRM, pas adapté PM |
