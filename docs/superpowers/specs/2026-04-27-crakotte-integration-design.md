# Intégration Crakotte — Spec Design
Date: 2026-04-27

## Contexte

Crakotte est la plateforme de time-tracking de l'organisation. Elle expose une API REST read-only (auth `X-API-Key`) avec 5 endpoints : `customers`, `projects`, `steps`, `consultants`, `time-spent`. L'objectif est de synchroniser automatiquement les temps validés Crakotte dans le dashboard, détecter les nouveaux projets/clients, et alerter en cas de conflits avec les saisies manuelles.

---

## Périmètre de ce sous-projet (sous-projet 1/3)

Ce spec couvre uniquement le **moteur de sync** :
- Sync automatique nocturne (Vercel Cron)
- Bouton de sync manuelle (admin)
- Mapping Crakotte → Activités/Projets/Consultants
- Détection de conflits et de nouveaux projets
- UI d'administration

Les sous-projets futurs (taux de facturation réel, détection d'écarts, réconciliation budget) ne sont pas dans ce scope.

---

## Architecture

### Déclenchement

- **Vercel Cron** : `0 2 * * *` (2h00 UTC chaque nuit) → `POST /api/sync/crakotte`
- **Manuel** : bouton "Synchroniser maintenant" dans `/admin/crakotte` → même route
- La route est protégée par `CRON_SECRET` (header `Authorization: Bearer <secret>`)

### Flow général

```
Vercel Cron (ou admin)
  → POST /api/sync/crakotte
    1. Lire CrakotteConfig (apiKey, lastSyncAt, actif)
    2. Fetch référentiels Crakotte (customers, projects, steps, consultants)
    3. Fetch time-spent FROM lastSyncAt TO now (sync incrémentale)
    4. Mapper consultants (par email)
    5. Mapper projets (par crakotteProjectId, puis nom flou)
    6. Créer/mettre à jour Activités (par crakotteEntryId)
    7. Détecter conflits → Alertes CONFLIT_SAISIE
    8. Détecter nouveaux projets → CrakottePendingProject + notification
    9. Écrire SyncLog
   10. Mettre à jour lastSyncAt
```

### Sync incrémentale

- `time-spent` : fetch uniquement `from: lastSyncAt` → `to: now`
- Première sync : `from` = date de démarrage configurée par l'admin dans CrakotteConfig
- Référentiels (customers, projects, steps, consultants) : fetch complet à chaque sync (listes légères)
- Déduplication par `crakotteEntryId` : si une Activite existe avec cet ID → skip

---

## Schéma de base de données

### Nouveaux modèles

```prisma
model CrakotteConfig {
  id              Int       @id @default(autoincrement())
  apiKey          String
  actif           Boolean   @default(true)
  dateDebutSync   DateTime  // date de départ pour la première sync
  lastSyncAt      DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model SyncLog {
  id                  Int       @id @default(autoincrement())
  startedAt           DateTime
  finishedAt          DateTime?
  status              String    // SUCCESS | PARTIAL | ERROR
  activitesCreees     Int       @default(0)
  activitesMiseAJour  Int       @default(0)
  conflitsDetectes    Int       @default(0)
  nouveauxProjets     Int       @default(0)
  nouveauxClients     Int       @default(0)
  consultantsSkippes  Int       @default(0)
  errorMessage        String?
  createdAt           DateTime  @default(now())
}

model CrakottePendingProject {
  id                    Int       @id @default(autoincrement())
  crakotteProjectId     String    @unique
  crakotteProjectName   String
  crakotteCustomerId    String
  crakotteCustomerName  String
  suggestedProjetId     Int?      // projet existant avec nom similaire
  suggestedProjet       Projet?   @relation(fields: [suggestedProjetId], references: [id])
  status                String    @default("PENDING") // PENDING | APPROVED | IGNORED
  createdAt             DateTime  @default(now())
  resolvedAt            DateTime?
  resolvedById          Int?
  resolvedBy            Consultant? @relation(fields: [resolvedById], references: [id])
}
```

### Champs ajoutés aux modèles existants

```prisma
// Activite
source              String    @default("MANUEL") // MANUEL | CRAKOTTE
crakotteEntryId     String?   @unique

// Projet
crakotteProjectId   String?   @unique

// Consultant
crakotteConsultantId String?  @unique
```

### Nouveau type d'alerte

Ajout de `CONFLIT_SAISIE` au système d'alertes existant.

---

## API Routes

| Route | Méthode | Auth | Description |
|---|---|---|---|
| `/api/sync/crakotte` | POST | CRON_SECRET | Déclenche la sync (cron ou manuel) |
| `/api/admin/crakotte/config` | GET | ADMIN | Lire la config |
| `/api/admin/crakotte/config` | PUT | ADMIN | Sauvegarder apiKey, actif, dateDebutSync |
| `/api/admin/crakotte/test` | POST | ADMIN | Tester la connexion Crakotte |
| `/api/admin/crakotte/logs` | GET | ADMIN | Historique SyncLogs (50 derniers) |
| `/api/admin/crakotte/conflicts` | GET | ADMIN | Alertes CONFLIT_SAISIE en attente |
| `/api/admin/crakotte/conflicts/[id]/resolve` | POST | ADMIN | Résoudre un conflit (body: `{ keep: "CRAKOTTE" | "MANUEL" }`) |
| `/api/admin/crakotte/pending-projects` | GET | ADMIN | Projets Crakotte sans équivalent |
| `/api/admin/crakotte/pending-projects/[id]/approve` | POST | ADMIN | Créer le projet dans le dashboard |
| `/api/admin/crakotte/pending-projects/[id]/ignore` | POST | ADMIN | Ignorer ce projet |

---

## Logique de mapping

### Consultants

- Match par `consultant.email` (Crakotte) ↔ `Consultant.email` (dashboard)
- Match trouvé → enregistrer `crakotteConsultantId` (une fois)
- Pas de match → warning dans SyncLog, activités de ce consultant skippées (pas de création auto)

### Projets

1. Chercher `Projet` avec `crakotteProjectId = item.project.id` → match direct
2. Sinon, chercher `Projet` avec `nom ILIKE item.project.name` → match flou → proposer le lien
3. Sinon → créer `CrakottePendingProject` (status PENDING)

### Steps → Étapes

- Match par `step.name` (insensible à la casse) ↔ `Etape.nom` sur le projet correspondant
- Match trouvé → `etapeId` renseigné sur l'Activite
- Pas de match → `etapeId` null (activité brute sur le projet)

### Activités (TimeSpentItem)

Pour chaque item Crakotte :

1. Si `Activite.crakotteEntryId = item.entry.id` existe → skip
2. Sinon créer :
   - `source: CRAKOTTE`
   - `crakotteEntryId: item.entry.id`
   - `date: item.date`
   - `heures: item.time`
   - `description: item.step.name`
   - `facturable: true` (temps validé = facturable)
   - `consultantId`, `projetId`, `etapeId` selon matching ci-dessus
3. Vérifier doublon MANUEL : même consultant + même date + même projet + écart heures ≤ 0.5h
   - Si doublon → créer Alerte `CONFLIT_SAISIE` avec référence aux deux activités

---

## Gestion des conflits

Un conflit = une activité `CRAKOTTE` et une activité `MANUEL` pour le même consultant, même date, même projet (± 0.5h d'écart).

- Les deux activités coexistent en DB
- Une Alerte `CONFLIT_SAISIE` est créée avec `{ crakotteActiviteId, manuelActiviteId }`
- Dans l'UI admin, l'admin voit les deux côte à côte et choisit laquelle supprimer
- La résolution supprime l'activité non retenue et clôt l'alerte

---

## Notifications

Quand la sync détecte des conflits ou nouveaux projets :
- Alerte créée dans le système d'alertes existant (visible dans le dashboard)
- Email via `lib/email.ts` :
  - Conflits → ADMIN uniquement
  - Nouveaux projets → ADMIN + PM dont des activités sont liées au projet Crakotte

---

## UI Admin — `/admin/crakotte`

Nouvelle sous-page accessible aux ADMIN uniquement, avec 4 sections :

### 1. Configuration
- Champ clé API (masquée, toggle afficher)
- Date de début de sync (date picker)
- Toggle actif/inactif
- Bouton "Tester la connexion" (appelle `/api/admin/crakotte/test`)
- Bouton "Synchroniser maintenant"

### 2. Dernière sync
- Statut (✅ SUCCESS / ⚠️ PARTIAL / ❌ ERROR)
- Date et durée
- Stats : X activités créées, Y conflits détectés, Z consultants skippés
- Lien "Voir l'historique"

### 3. Conflits à résoudre
- Liste des alertes CONFLIT_SAISIE
- Pour chaque : deux colonnes (MANUEL vs CRAKOTTE) avec date, heures, projet, description
- Boutons "Garder Crakotte" / "Garder Manuel"

### 4. Projets en attente
- Projets Crakotte sans équivalent dans le dashboard
- Pour chaque : nom du projet, client Crakotte, (suggestion de projet existant si match flou)
- Boutons "Créer dans le dashboard" (modal pré-rempli) / "Lier à un projet existant" / "Ignorer"

---

## Configuration Vercel

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/sync/crakotte",
      "schedule": "0 2 * * *"
    }
  ]
}
```

Variable d'environnement à ajouter dans Vercel : `CRON_SECRET`

---

## Fichiers à créer/modifier

### Nouveaux fichiers
- `prisma/migrations/` — migration pour les nouveaux modèles et champs
- `lib/crakotte.ts` — client Crakotte (fetch, types, auth)
- `lib/crakotte-sync.ts` — logique de sync (mapping, déduplication, conflits)
- `app/api/sync/crakotte/route.ts` — route déclenchée par cron
- `app/api/admin/crakotte/config/route.ts`
- `app/api/admin/crakotte/test/route.ts`
- `app/api/admin/crakotte/logs/route.ts`
- `app/api/admin/crakotte/conflicts/route.ts`
- `app/api/admin/crakotte/conflicts/[id]/resolve/route.ts`
- `app/api/admin/crakotte/pending-projects/route.ts`
- `app/api/admin/crakotte/pending-projects/[id]/approve/route.ts`
- `app/api/admin/crakotte/pending-projects/[id]/ignore/route.ts`
- `app/admin/crakotte/page.tsx` — UI admin
- `components/admin/crakotte/` — composants UI (ConfigSection, ConflictsSection, PendingProjectsSection, SyncLogSection)
- `vercel.json` — configuration cron

### Fichiers modifiés
- `prisma/schema.prisma` — nouveaux modèles + champs sur Activite, Projet, Consultant
- `app/admin/` — ajout lien navigation vers `/admin/crakotte`

---

## Sous-projets futurs (hors scope)

- Comparaison taux de facturation réel Crakotte vs dashboard
- Alerte "heures manquantes" si consultant a du temps Crakotte sans saisie dashboard
- Détection sur-déclaration (heures dashboard > heures Crakotte)
- Réconciliation budget projet via CA Crakotte
