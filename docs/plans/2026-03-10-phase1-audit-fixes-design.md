# Design — Phase 1 Audit Fixes
*2026-03-10 — Corrections MAJEURES post-audit UX*

## Contexte
Audit UX v2 identifie 2 écarts MAJEURS. Les APIs existantes couvrent 100% des besoins — aucune nouvelle route.

---

## Tâche 1 : Bande personnelle PM (DashboardOperationnel)

### Objectif
Le PM connecté voit ses propres métriques en 1 ligne compacte en haut du dashboard, avant les filtres/KPIs d'équipe.

### Design
- **Position** : première section du dashboard, au-dessus des filtres
- **Style** : `surface-raised`, padding compact, 1 ligne, 4 métriques inline
- **Contenu** : `Mes heures ce mois : Xh · Mon CA : X€ · Occupation : X% · Mes projets : N`
- **Data source** : `/api/kpis` avec `consultantId` du user connecté (useSession)
- **Condition d'affichage** : uniquement si `session.user.role === 'PM'`

### Fichier
`components/dashboard/DashboardOperationnel.tsx` — ajout d'un bloc en haut du JSX

---

## Tâche 2 : Onglet Activités dans ProjectDetailPane

### Objectif
4e onglet "Activités" dans le panneau détail projet slide-in, avec liste des saisies du projet et CTA.

### Design
- **Onglets** : Aperçu · Kanban · Financier · **Activités** (4e, nouvel onglet)
- **Renommage** : "Overview" → "Aperçu"
- **Fetch** : lazy au premier clic sur l'onglet — `GET /api/activites?projetId={id}`
- **Contenu** :
  - Table compacte : Date · Consultant · Étape · Heures · Description (truncate) · Facturable
  - Footer : total heures
  - CTA "Saisir une activité" → ouvre dialog SaisieRapide avec projet pré-sélectionné
- **État vide** : message "Aucune activité saisie sur ce projet"
- **Composant** : `ProjetActivitesTab` isolé dans `components/projets/`

### Fichier principal
`app/projets/page.tsx` — ajout de l'onglet + import ProjetActivitesTab
`components/projets/ProjetActivitesTab.tsx` — nouveau composant

---

## Ce qui ne change pas
- Toutes les routes API
- `lib/financial.ts`
- Auth/middleware
- Structure des autres onglets
