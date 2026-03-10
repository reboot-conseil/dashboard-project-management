# Phase B — Auth & Production : Design

> **Sprint 10** — Objectif : déploiement interne opérationnel d'ici fin de semaine pour une équipe de 5 à 10 personnes.

---

## Contexte

L'application est actuellement en local (SQLite, pas d'auth). Phase B la rend accessible à l'équipe sur Vercel Enterprise avec authentification et RBAC.

**Infrastructure retenue :** Vercel Enterprise (déjà disponible) + Azure Database for PostgreSQL (déjà dans l'accord enterprise).

---

## 1. Modèle de données — Fusion User/Consultant

**Approche choisie :** ajouter `password` et `role` directement au modèle `Consultant` existant. Pas de nouvelle table — migration légère, zéro régression sur les relations existantes.

```prisma
model Consultant {
  // ... champs existants inchangés ...
  password  String?   // bcrypt hash, null = compte non activé
  role      Role      @default(CONSULTANT)
}

enum Role {
  ADMIN
  PM
  CONSULTANT
}
```

Le premier compte ADMIN est créé via `prisma db seed`. Les comptes suivants sont créés par l'ADMIN depuis `/admin/users`.

---

## 2. Authentification — NextAuth v5 (Auth.js)

- **Provider :** Credentials (email + password bcrypt)
- **Session :** JWT (edge-compatible, requis pour Vercel serverless)
- **Durée de session :** 7 jours
- **Page `/login` :** formulaire email + password, dark mode compatible, pas de signup public
- **Pas de magic link ni OAuth dans cette phase**

---

## 3. Middleware & Protection des routes

`middleware.ts` à la racine intercepte toutes les requêtes et vérifie le token JWT.

### Matrice d'accès

| Route | ADMIN | PM | CONSULTANT |
|---|---|---|---|
| `/` (dashboard) | ✅ | ✅ | ✅ |
| `/projets`, `/projets/[id]` | ✅ | ✅ | ✅ (ses projets) |
| `/activites` | ✅ | ✅ | ✅ (les siennes) |
| `/calendrier` | ✅ | ✅ | ✅ |
| `/parametres` | ✅ | ✅ | ✅ (préférences perso) |
| `/consultants` | ✅ | ✅ | ❌ → redirect `/` |
| `/executive` | ✅ | ✅ | ❌ → redirect `/` |
| `/admin/users` | ✅ | ❌ | ❌ |
| `/api/*` | ✅ | selon route | selon route |

Les routes API retournent `401` si non authentifié, `403` si rôle insuffisant.

> **Note Phase B :** le filtrage des données par consultant (un CONSULTANT ne voit que ses propres activités/projets) est implémenté au niveau des APIs, pas seulement du middleware.

---

## 4. Page `/admin/users`

Interface accessible ADMIN uniquement.

**Fonctionnalités :**
- Liste de tous les Consultants avec leur rôle actuel et statut du compte (actif / pas de compte)
- Formulaire "Activer un compte" : sélectionne un Consultant existant, choisit son rôle, définit un mot de passe initial
- Formulaire "Créer un nouveau consultant + compte" en une étape
- Bouton "Réinitialiser le mot de passe" (génère un nouveau hash, affiché une seule fois)
- Bouton "Désactiver un compte" (met `actif: false`)

---

## 5. Migration base de données

### SQLite → Azure PostgreSQL

**Étapes :**
1. Provisionner une instance Azure Database for PostgreSQL (tier B1ms suffit pour ~10 users)
2. Modifier `schema.prisma` : `provider = "postgresql"`
3. Ajuster les types incompatibles (Decimal → Float, enums PostgreSQL)
4. `prisma migrate deploy` sur la DB Azure
5. Script de migration des données SQLite existantes vers PostgreSQL
6. Seed du premier compte ADMIN

**Variables d'environnement requises :**
```
DATABASE_URL=postgresql://...@...azure.com:5432/dashboard
NEXTAUTH_SECRET=<random 32 chars>
NEXTAUTH_URL=https://dashboard-xxx.vercel.app
```

---

## 6. Déploiement Vercel Enterprise

1. Connecter le repo GitHub au projet Vercel Enterprise
2. Configurer les variables d'env dans le dashboard Vercel
3. Ajouter `prisma generate` au build step (`package.json` → `"build": "prisma generate && next build"`)
4. Premier déploiement + vérification
5. Domaine custom optionnel (via Vercel Enterprise)

---

## 7. Ce qui n'est PAS dans Phase B

- SSO Azure AD / Microsoft Login (Phase C si besoin)
- Gestion fine des permissions par projet (ex: un PM ne voit que ses projets)
- Audit log des actions utilisateurs
- 2FA
- Export des données par rôle

---

## Critères de succès

- [ ] Login/logout fonctionnel sur Vercel
- [ ] Un CONSULTANT ne peut pas accéder à `/consultants` ni `/executive`
- [ ] Un ADMIN peut créer/désactiver des comptes depuis `/admin/users`
- [ ] Les données existantes sont migrées sans perte
- [ ] 245 tests Vitest continuent de passer
- [ ] L'équipe peut se connecter depuis leur navigateur d'ici vendredi
