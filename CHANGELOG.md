# Changelog

Toutes les versions notables de ce projet sont documentées ici.
Format : [version] — date — description

---

## [v2.5.2] — 2026-03-19
Audit complet — correctifs critiques dashboard, projets, alertes, routing login

### Fixes critiques
- `components/sidebar.tsx:414,473` : `<main className="flex-1">` → `<main className="flex-1 flex flex-col">` (vertical + horizontal)
  - Bug racine : sans `flex-col` sur `<main>`, le `motion.div` enfant (`flex-1 min-h-0`) ne recevait aucune hauteur
  - Le `DashboardPage` avait `h-full` = auto → le `div.flex-1.overflow-y-auto` du contenu avait hauteur 0
  - Tout le contenu du dashboard (KPIs, graphiques, projets) était rendu en DOM mais entièrement invisible (clippé)
- `app/(auth)/login/page.tsx:35-39` : `localStorage.setItem("dashboard-active-view", "consultants")` → `JSON.stringify("consultants")`
  - `useLocalStorage` lit avec `JSON.parse()` : `"consultants"` brut lève SyntaxError → catch → retombe sur "operationnel"
  - Résultat : Admin et Consultant voyaient toujours la vue Opérationnel après login, routing par rôle inopérant
- `app/projets/page.tsx:417-450` : badge écart projets — couleurs et signe complètement inversés
  - `ecart = realisationPct − budgetConsommePct` (négatif = dérive, positif = avance)
  - Ancien code : `ecart >= 20` → rouge (bien), `< 10` → vert (inclut −22.8 critique) → couleurs à l'envers
  - Nouveau : `ecart <= -20` → rouge, `<= -10` → amber, sinon vert
  - Label corrigé : `Écart +X%/−X%` avec signe réel (anciennement inversé : −22.8 affichait "+22.8%" en vert)

### Fixes importants
- `components/dashboard/DashboardOperationnel.tsx:306-317` : badge santé projets actifs
  - Remplace `realisationPct` utilisé comme proxy de marge (faux : 74.7% pour un projet critique → "Bon")
  - Utilise désormais `proj.health` ("critique"/"normal"/"bon") et `proj.healthLabel` de l'API
- `app/api/alertes/route.ts:103-126` : deadline aujourd'hui (0 jours) classée `attention` → `critique`
  - Une étape dont la deadline est aujourd'hui génère maintenant une alerte critique "Deadline aujourd'hui"
  - Cohérent avec les deadlines dépassées (jours < 0) déjà en critique
- `app/page.tsx` + `DashboardOperationnel.tsx` : datepicker "Personnalisé" désormais fonctionnel
  - Les deux `<input type="date">` étaient non contrôlés — les dates saisies n'étaient jamais transmises
  - Ajout états `customDebut`/`customFin` (saisie) et `appliedCustomRange` (confirmé par "Appliquer")
  - `DashboardOperationnel` reçoit `customDateDebut`/`customDateFin` et les utilise quand `periode === "personnalise"`

---

## [v2.5.1] — 2026-03-19
Fixes bugs navigation + dropdowns + infra réseau Docker

### Fixes
- `components/layout/page-transition.tsx` : suppression de `AnimatePresence mode="wait"`
  - `mode="wait"` impose que la page sortante finisse son animation avant de monter la nouvelle
  - Incompatible avec React concurrent mode (Next.js App Router) → page `/projets/[id]` blanche au clic
  - Fix : sans `mode="wait"` les animations se chevauchent, la nouvelle page monte toujours
- `app/activites/page.tsx` : `fetch("/api/projets?statut=EN_COURS")` → `fetch("/api/projets")`
  - Dropdowns saisie/édition d'activité ne montraient que les projets EN_COURS
  - Les projets PLANIFIE et EN_PAUSE sont maintenant disponibles à la sélection
  - Les étapes de ces projets deviennent également accessibles

### Infra
- `infra/docker-compose.yml` : réseau `internal` → `dashboard_private_net` (avec `name:` explicite)
  - `reboot-conges-app-1` s'était connecté à `dashboard_internal` (nom générique partagé entre projets)
  - Conflit DNS : nginx résolvait `app` vers reboot-conges au lieu de dashboard_app → mauvaise app servie
  - Nom unique `dashboard_private_net` empêche toute collision future avec d'autres projets Docker

---

## [v2.5.0] — 2026-03-12
Fusion de profils consultants — merge + migration activités

### Fonctionnalité
- `POST /api/admin/consultants/merge` : migration atomique des activités source → cible + suppression source
  - Validation IDs (type check + isNaN guard)
  - Bloque si source `actif: true` (compte réel protégé — SSO inclus)
  - Bloque si cible `actif: false` (évite de rattacher des données à un profil inactif)
  - Transaction Prisma garantit intégrité (tout ou rien)
  - 7 cas de test couverts
- `admin-users-client.tsx` : bouton `GitMerge` sur les cards consultants inactifs
  - Panel de fusion : sélection cible (filtrée), avertissement irréversible amber, bouton Confirmer destructif
  - Toast de succès avec sourceNom, targetNom et nombre d'activités migrées

---

## [v2.4.5] — 2026-03-12
Page projet blanche + matching consultant par nom partiel

### Fixes
- `projets/[id] API` : null safety `a.consultant?.tjm` — évite crash si consultant supprimé post-import
- `projets/[id] page` : fallback `"Non attribué"` si `a.consultant` null — page ne crashe plus
- `validate/route.ts` : matching consultant en deux passes — exact d'abord, puis `contains` en fallback
  (ex: "Jonathan" trouve maintenant "Jonathan Braun" en DB)

---

## [v2.4.4] — 2026-03-12
Fix middleware — exclure toutes les routes /api/ de l'auth middleware

### Fixes
- `middleware.ts` : matcher `api/auth` → `api/` (toutes les routes API exclues)
- Le middleware redirigait les appels internes non-authentifiés vers `/login`
  → redirect HTTPS avec cert auto-signé → `TypeError: fetch failed` sur le trigger processing
- Les routes API gèrent leur propre auth via `requireRole()` — le middleware ne protège que les pages

---

## [v2.4.3] — 2026-03-12
Fix processing trigger — appel interne localhost au lieu de APP_URL HTTPS

### Fixes
- `upload/route.ts` : URL de processing `http://localhost:{PORT}` au lieu de `${APP_URL}`
- `APP_URL=https://192.168.1.63` faisait passer le trigger par nginx + cert auto-signé
  → Node.js rejetait le fetch → status bloqué sur UPLOADING indéfiniment

---

## [v2.4.2] — 2026-03-12
Fix Docker — permissions /app/uploads + volume persistant

### Fixes
- `Dockerfile` : `mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads` avant `USER nextjs`
  (résout `EACCES: permission denied, mkdir '/app/uploads'`)
- `docker-compose.yml` : volume `uploads_data` monté sur `/app/uploads`
  (fichiers uploadés persistés entre redémarrages du container)

---

## [v2.4.1] — 2026-03-12
Bouton Prompt sur la page Documents

### Fonctionnalité
- `documents/page.tsx` : bouton "Prompt" dans le header
- Copie le prompt d'ingestion IA dans le presse-papier en un clic
- Toast de confirmation + icône check 2s puis retour à l'état initial
- Prompt intégré directement dans le composant (pas de fetch fichier)

---

## [v2.4.0] — 2026-03-11
Agent IA — création complète depuis document (consultant par nom ou email)

### Documents / IA
- `validate/route.ts` : création automatique du profil consultant si inconnu en DB
  - Match par email → utilisé tel quel (lien SSO automatique à la 1ère connexion)
  - Match par nom (insensible à la casse) → consultant existant réutilisé
  - Email inconnu → profil créé, lien SSO automatique à la 1ère connexion Microsoft
  - Nom seul → profil créé avec email placeholder `_sans-email-{ts}@noemail.local`
  - Ni email ni nom → activité ignorée (signal d'échec de parsing)
- `review/[id]/page.tsx` : formulaire de validation enrichi
  - Champ `consultantNom` ajouté sur chaque ligne d'activité (à côté de la description)
  - Pre-fill intelligent : `act.consultant` routé vers email ou nom selon présence de `@`
  - Activités sans email ni nom surlignées en orange avec placeholder ambré
  - `runChecks` : avertissement si activités sans consultant (email ou nom)
  - Note de bas de section mise à jour pour expliquer le comportement

### Admin / Utilisateurs
- `admin/users/route.ts PATCH` : supporte la mise à jour de l'email (unicité vérifiée)
- `admin-users-client.tsx` :
  - Badge "Sans email" (warning-soft) sur les consultants créés par import
  - Panel "Modifier" : champ email affiché uniquement si email placeholder, avec rappel SSO

---

Toutes les versions notables de ce projet sont documentées ici.
Format : [version] — date — description

---

## [v2.3.2] — 2026-03-11
Correctifs UX admin/users + rôle SSO

### Fixes
- Bouton "Modifier" visible pour tous les comptes actifs (SSO inclus, pas seulement credentials)
- Changement de rôle nécessite une reconnexion pour prendre effet (comportement JWT normal)

---

## [v2.3.1] — 2026-03-11
Correctifs post-déploiement Microsoft SSO

### Fixes
- `auth.ts` : jwt callback — lookup DB pour rôle correct des utilisateurs SSO
- `nginx.conf` : proxy_buffer_size 128k pour headers JWT volumineux (502 corrigé)
- `docker-compose.yml` : context `..` + variables Microsoft passées au container
- `deploy.sh` : -p dashboard + -f infra/docker-compose.yml
- Admin/users : badge "SSO actif" (info) pour comptes sans mot de passe mais actifs
- Admin/users : bouton "Ajouter mot de passe" au lieu de "Activer" pour comptes SSO

---

## [v2.3.0] — 2026-03-11 (tag `v2.3.0`)
Microsoft SSO + Email automatique + HTTPS + Création utilisateurs

### Authentification
- Login Microsoft SSO via Office 365 (restreint @reboot-conseil.com)
- Bouton "Se connecter avec Microsoft" sur la page login
- Auto-création du consultant en DB au premier login SSO (rôle CONSULTANT)
- Credentials provider conservé pour ADMIN / urgence
- `auth.ts` : provider MicrosoftEntraId + callbacks signIn/session/jwt

### Email automatique
- `lib/email.ts` : service `sendWelcomeEmail` via Microsoft Graph API
- Email de bienvenue envoyé à la création d'un compte depuis `/admin/users`
- Contient : URL, email, mot de passe initial
- Échec silencieux si Microsoft Graph non configuré

### HTTPS
- `infra/nginx.conf` : port 443 SSL + redirection HTTP→HTTPS
- `infra/docker-compose.yml` : port 443 exposé + montage certificats SSL
- Certificat auto-signé sur le serveur (365 jours)

### Gestion utilisateurs
- Bouton "Nouvel utilisateur" dans `/admin/users`
- Création consultant + compte en une action (nom, email, rôle, TJM, password)
- API `POST /api/admin/users` : action=create atomique avec bcrypt

---

## [v2.2.0] — 2026-03-10 (tag `v2.2.0`)
Système de couleurs — Option A implémentée + Option B en paramètres

### Design System
- Option A "Professional Blue" : tokens mis à jour (fond #F8FAFC, borders #E2E8F0, success #059669 unifié)
- Dark mode GitHub-inspired : surfaces #0D1117 / #161B22 / #21262D / borders #30363D
- Option B "Slate Neutral" : thème `[data-palette="slate"]` disponible dans les paramètres
- Palette persistée en localStorage (`palette`)

### Page Paramètres
- Nouvelle section "Palette de couleurs" : Professional Blue (défaut) / Slate Neutral
- S'applique sur les deux modes clair et sombre

---

## [v2.1.0] — 2026-03-10 (tag `v2.1.0`)
Corrections post-audit UX + améliorations qualité

### Dashboard
- Bande personnelle PM (Heures · CA · Occupation · Projets) en haut du dashboard Opérationnel
- Synchronisation filtre période (Jour/Semaine/Mois/Trimestre/Année) sur les 3 dashboards
- Aligner visuellement les sections Projets et Deadlines dans Dashboard/Consultant et Dashboard/Consultants
- Bouton Dashboard consultants → redirige vers le bon consultant (JSON.stringify fix)

### Projets
- Clic carte → page détail · clic flèche ↗ → side panel d'aperçu
- Couleur distincte par projet : picker 6 swatches dans le formulaire, auto-assign à la création
- Couleur incluse dans la réponse GET /api/projets
- Suppression titre "X projets" redondant
- Onglet Activités dans le side panel : CTA saisie, footer total, indicateur NF

### Calendrier
- Vue Mois : barres continues (overlay absolu par semaine, plus de coupure)
- Vue Mois : nom affiché uniquement au premier jour de démarrage + hachures fin d'étape
- Vue Timeline : suppression emojis health et rond rouge deadline
- Vue Équipe : heures loguées réelles, dark mode (bg-destructive/10), sans banners planifiés
- Popups "Logger des heures" et "Nouvelle étape" directement dans le calendrier
- Bouton "Logger des heures" dans la sidebar étape → popup pré-rempli

### Activités
- Colonnes réordonnées : Projet → Étape → Consultant
- Rangées plus fines + carré coloré projet
- Ligne de date contrastée (surface-raised token, light + dark mode)
- Footer totaux sticky
- Bouton X pour fermer le dialog saisie

### Gestion utilisateurs
- Bouton "Modifier" pour changer le rôle d'un compte
- Bouton "Supprimer" avec confirmation + API DELETE

---

## [v2.0.0] — 2026-03-10 (tag `v2.0.0`, mergé dans `main`)
Redesign complet de l'interface — "Professional Dark Soft"

### Changements
- Dashboard : 3 vues persona (PM/Consultant/Stratégique), tabs + période pills
- Projets : cards redesign + detail slide-in 4 onglets
- Activités : table groupée/jour, stats bar, dialog saisie (vue Feed supprimée)
- Consultants : expand inline, cards toggle, bouton Dashboard
- Calendrier : top bar simplifié, 3 vues renommées (Mois/Timeline/Équipe)
- Design System : tokens centralisés dans globals.css, badge variants soft
- Auth : routing post-login par rôle (Admin→Stratégique, PM→Opérationnel, Consultant→Consultant)

### Mockups
`docs/mockups/v2.0/` — 7 prototypes HTML validés

---

## [v1.0.0] — 2026-03-09 (tag : `v1.0.0`)
Version stable initiale — fonctionnalités complètes, auth RBAC

### Fonctionnalités
- Dashboard opérationnel, stratégique (executive), consultant
- Projets avec Kanban, suivi budgétaire et marges
- Activités avec saisie rapide
- Calendrier 3 vues (Mois, Gantt, Charge Équipe)
- Consultants avec occupation et TJM
- Documents avec upload
- Auth next-auth v5 — 3 rôles (ADMIN/PM/CONSULTANT)
- Déploiement Docker Compose — PostgreSQL prod, SQLite dev

### Screenshots
`docs/mockups/v1.0/` — 14 screenshots état initial

---

## Déploiements

| Date | Version | Serveur | Notes |
|------|---------|---------|-------|
| — | v1.0.0 | 192.168.1.63 | Version initiale déployée |
