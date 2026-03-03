# Guide de déploiement — PM Dashboard

## Prérequis

- Compte Vercel Enterprise avec accès au repo GitHub
- Instance Azure Database for PostgreSQL Flexible Server provisionnée

## Étapes

### 1. Base de données PostgreSQL (Azure)

1. Provisionner Azure Database for PostgreSQL Flexible Server (tier B1ms suffit)
2. Créer une base `dashboard`
3. Récupérer la connection string : `postgresql://USER:PASSWORD@HOST.postgres.database.azure.com:5432/dashboard?sslmode=require`

### 2. Migration du schéma

```bash
DATABASE_URL="postgresql://..." DIRECT_URL="postgresql://..." npx prisma migrate deploy
```

### 3. Migration des données SQLite → PostgreSQL

```bash
SQLITE_URL="file:./prisma/dev.db" DATABASE_URL="postgresql://..." npm run db:migrate-data
```

### 4. Créer le compte ADMIN initial

```bash
DATABASE_URL="postgresql://..." ADMIN_EMAIL=admin@entreprise.com ADMIN_PASSWORD=VotreMotDePasse! npm run db:seed-admin
```

### 5. Déploiement Vercel

1. Connecter le repo GitHub au projet Vercel Enterprise
2. Framework : Next.js (auto-détecté)
3. Build Command : `prisma generate && next build` (déjà configuré dans package.json)
4. Variables d'environnement à configurer dans le dashboard Vercel :
   - `DATABASE_URL` = connection string PostgreSQL Azure
   - `DIRECT_URL` = connection string directe Azure
   - `NEXTAUTH_SECRET` = `openssl rand -base64 32`
   - `NEXTAUTH_URL` = URL de l'app (ex: `https://pm-dashboard.vercel.app`)
5. `git push origin main` → déploiement automatique

## Vérification post-déploiement

- [ ] `https://votre-app.vercel.app` redirige vers `/login`
- [ ] Login ADMIN fonctionne
- [ ] Un CONSULTANT ne peut pas accéder à `/consultants`
- [ ] `/admin/users` visible uniquement pour ADMIN
