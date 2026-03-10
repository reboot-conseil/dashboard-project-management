# Changelog

Toutes les versions notables de ce projet sont documentées ici.
Format : [version] — date — description

---

## [v2.0.0] — en cours (branche `v2/redesign`)
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
