# Design — Création d'utilisateur depuis la page Admin
*2026-03-11*

## Objectif
Permettre à un ADMIN de créer un nouveau consultant avec son compte en une seule action depuis `/admin/users`.

## Architecture
- Endpoint atomic : `POST /api/admin/users` enrichi pour gérer la création complète
- Transaction Prisma : crée Consultant + hash password en une seule opération
- UI : panel inline dans `admin-users-client.tsx` (même pattern que "Activer")

## Champs du formulaire
- **Nom** (requis)
- **Email** (requis, doit être unique)
- **Rôle** : select ADMIN / PM / CONSULTANT (défaut CONSULTANT)
- **TJM €/j** (optionnel)
- **Mot de passe initial** (requis)
- Couleur : auto-assignée par rotation sur CONSULTANT_COLORS

## API
`POST /api/admin/users` — nouveau body `{ action: "create", nom, email, role, password, tjm? }`
- Vérifie unicité email
- Hash password (bcrypt)
- Crée `prisma.consultant.create(...)` avec tous les champs
- Retourne le consultant créé

## Fichiers à modifier
- `app/api/admin/users/route.ts` — enrichir POST pour gérer `action: "create"`
- `app/admin/users/admin-users-client.tsx` — bouton + panel inline
- `app/admin/users/page.tsx` — pas de changement (recharge via router.refresh)

## Comportement post-création
- `router.refresh()` → le consultant apparaît dans la liste
- Il est automatiquement visible dans `/consultants` (même table DB)
