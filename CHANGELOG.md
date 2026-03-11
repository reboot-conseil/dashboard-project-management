# Changelog

Toutes les versions notables de ce projet sont documentées ici.
Format : [version] — date — description

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
