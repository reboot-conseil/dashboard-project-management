# 🧹 Nettoyage Recommandé — PM Dashboard

> Généré le 2026-02-28 — Analyse statique du codebase
> ⚠️ Ce document est informatif uniquement — NE PAS supprimer sans validation manuelle

---

## 📋 Sommaire

1. [Fichiers à supprimer — Certitude haute](#1-fichiers-à-supprimer--certitude-haute)
2. [Routes API redondantes / legacy](#2-routes-api-redondantes--legacy)
3. [Composants à auditer](#3-composants-à-auditer)
4. [Variables d'environnement inutilisées ou dupliquées](#4-variables-denvironnement-inutilisées-ou-dupliquées)
5. [Dépendances npm à vérifier](#5-dépendances-npm-à-vérifier)
6. [Problèmes de sécurité](#6-problèmes-de-sécurité)
7. [Refactorisations recommandées](#7-refactorisations-recommandées)
8. [Fichiers temporaires / résidus](#8-fichiers-temporaires--résidus)

---

## 1. Fichiers à supprimer — Certitude haute

### `document-ingestion-workflow.json`
- **Chemin** : `/dashboard-chef-projet/document-ingestion-workflow.json`
- **Raison** : Workflow n8n archivé. Le pipeline d'ingestion documentaire a été entièrement réimplémenté en Next.js natif (`/api/documents/process`). Ce fichier n8n n'est plus utilisé ni référencé par l'application.
- **Impact** : Aucun impact sur l'application
- **Action** : `rm document-ingestion-workflow.json`

### `.env.save`
- **Chemin** : `/dashboard-chef-projet/.env.save`
- **Raison** : Fichier de sauvegarde automatique créé par des éditeurs texte (vim, nano). Contient probablement des secrets en clair identiques à `.env`.
- **Impact** : Aucun impact fonctionnel, risque de sécurité si commité accidentellement
- **Action** : `rm .env.save`

### Fichiers DOCX de test dans `uploads/`
- **Chemins** :
  - `uploads/1772208033549-test_devis.docx`
  - `uploads/1772304128856-test_devis.docx`
- **Raison** : Fichiers uploadés lors des tests de développement. Ces fichiers de test ne correspondent à aucun utilisateur réel.
- **Impact** : Aucun impact applicatif (mais des enregistrements DB peuvent pointer vers ces fichiers)
- **Action** : Vérifier en DB si des DocumentIngestion pointent vers ces fichiers, puis supprimer

---

## 2. Routes API redondantes / legacy

Ces routes ont été créées pour l'intégration n8n mais le pipeline a été migré vers Next.js natif. Elles sont **redondantes** avec le traitement interne de `/api/documents/process`.

### `/api/documents/update-status` (POST)
- **Fichier** : `app/api/documents/update-status/route.ts` (55 lignes)
- **Usage actuel** : Aucun depuis la migration Next.js. Était utilisé par le workflow n8n.
- **Alternative** : La mise à jour du statut est gérée directement dans `/api/documents/process`
- **Risque si suppression** : Faible — vérifier qu'aucun frontend ne l'appelle
- **Recommandation** : Supprimer ou marquer `@deprecated`

### `/api/documents/save-text` (POST)
- **Fichier** : `app/api/documents/save-text/route.ts` (43 lignes)
- **Usage actuel** : Aucun depuis la migration Next.js. Était utilisé par le workflow n8n.
- **Alternative** : Sauvegarde directe dans `/api/documents/process`
- **Risque si suppression** : Faible
- **Recommandation** : Supprimer ou marquer `@deprecated`

### `/api/documents/save-analysis` (POST)
- **Fichier** : `app/api/documents/save-analysis/route.ts` (57 lignes)
- **Usage actuel** : Aucun depuis la migration Next.js. Était utilisé par le workflow n8n.
- **Alternative** : Sauvegarde directe dans `/api/documents/process`
- **Risque si suppression** : Faible
- **Recommandation** : Supprimer ou marquer `@deprecated`

### `/api/documents/[id]/status` (GET)
- **Fichier** : `app/api/documents/[id]/status/route.ts` (51 lignes)
- **Usage actuel** : Endpoint de debug uniquement. Créé pour diagnostiquer le pipeline.
- **Recommandation** : Conserver en développement, envisager suppression en production

### `/api/admin/teams-config/test-n8n` (POST)
- **Fichier** : `app/api/admin/teams-config/test-n8n/route.ts` (63 lignes)
- **Usage actuel** : Test de connectivité vers le serveur n8n. N'a de sens que si n8n est actif.
- **Recommandation** : Conserver si n8n peut être réactivé, sinon supprimer

### `/api/webhooks/n8n/activity-confirmed` (POST)
- **Fichier** : `app/api/webhooks/n8n/activity-confirmed/route.ts` (133 lignes)
- **Usage actuel** : Création d'activité déclenchée par n8n après confirmation. Requiert `N8N_WEBHOOK_SECRET` Bearer.
- **Recommandation** : Conserver si le bot Teams/n8n est actif, sinon supprimer

---

## 3. Composants à auditer

### `components/dashboard-charts.tsx` (130 lignes) — Potentiellement legacy
- **Description** : Composant de charts générique créé au début du projet
- **Problème** : Des composants de charts plus spécialisés existent maintenant (`projet-charts.tsx`, `rapports-charts.tsx`, sous-composants dans `dashboard/operationnel/` et `dashboard/strategique/`)
- **Action recommandée** : Vérifier si ce fichier est encore importé quelque part

```bash
grep -r "dashboard-charts" app/ components/ --include="*.tsx" --include="*.ts"
```

### `components/dashboard/DashboardChefProjet.tsx` (1008 lignes) — Très grand composant
- **Problème** : Le fichier fait 1008 lignes, ce qui le rend difficile à maintenir
- **Constaté** : Il n'est pas importé depuis `components/dashboard/index.ts` mais son export y est déclaré
- **Action recommandée** : Vérifier les usages et envisager un découpage en sous-composants

```bash
grep -r "DashboardChefProjet" app/ components/ --include="*.tsx" --include="*.ts"
```

### `components/dashboard/DashboardDirigeant.tsx` (580 lignes)
- **Description** : Vue dirigeant
- **Constaté** : Il y a déjà une page `/executive` (`app/executive/page.tsx`) qui semble remplir un rôle similaire
- **Action recommandée** : Vérifier si ce composant est utilisé ou s'il a été remplacé par la page executive

```bash
grep -r "DashboardDirigeant" app/ components/ --include="*.tsx" --include="*.ts"
```

### `components/dashboard/DashboardConsultant.tsx` (432 lignes) vs `DashboardConsultants.tsx` (430 lignes)
- **Problème** : Deux composants au nom similaire — risque de confusion
- `DashboardConsultant.tsx` : vue d'un consultant individuel
- `DashboardConsultants.tsx` : vue globale des consultants (utilisé dans `app/page.tsx`)
- **Action recommandée** : Renommer `DashboardConsultant.tsx` en `DashboardConsultantIndividuel.tsx` pour clarifier

---

## 4. Variables d'environnement inutilisées ou dupliquées

### Doublons dans `.env`
```env
# CES DEUX LIGNES SONT IDENTIQUES — DOUBLON
N8N_WEBHOOK_DOCUMENT_URL=https://n8n.spoton-ai.fr/webhook/document-ingestion
N8N_WEBHOOK_DOCUMENT_URL=https://n8n.spoton-ai.fr/webhook/document-ingestion
```
**Action** : Supprimer la ligne en doublon

### Variables legacy (n8n non utilisé)
```env
N8N_WEBHOOK_SECRET=...          # Utilisé seulement par /api/webhooks/n8n/ (legacy)
N8N_WEBHOOK_URL=...             # URL webhook Teams → n8n (si Teams inactif → inutile)
N8N_WEBHOOK_DOCUMENT_URL=...    # Plus utilisé (pipeline migré vers Next.js natif)
```
**Action** : Si n8n est définitivement abandonné, ces variables peuvent être retirées

---

## 5. Dépendances npm à vérifier

### `@hookform/resolvers` (^5.2.2)
- **Usage** : Intégration zod + react-hook-form dans les formulaires
- **Statut** : ✅ Utilisé activement dans consultant-form, projet-form, etape-form

### `react-dropzone` (^15.0.0)
- **Usage** : Utilisé dans `app/documents/upload/page.tsx` uniquement
- **Statut** : ✅ Nécessaire pour l'upload de documents

### `mammoth` (^1.11.0)
- **Usage** : Extraction DOCX dans `/api/documents/process/route.ts`
- **Statut** : ✅ Nécessaire — mais l'installation initiale a failli détruire l'environnement (installé accidentellement dans `~/` au lieu du projet)

### `pdf-parse` (^2.4.5)
- **Usage** : Extraction PDF dans `/api/documents/process/route.ts`
- **Statut** : ✅ Nécessaire — requiert `serverExternalPackages: ["pdf-parse"]` dans next.config.ts et chargement lazy obligatoire
- **Note** : Utiliser `pdf-parse` v2.x (v1.x a un bug connu avec Next.js/Turbopack)

### `@anthropic-ai/sdk` (^0.78.0)
- **Usage** : Uniquement dans `/api/documents/process/route.ts`
- **Statut** : ✅ Nécessaire si feature documents active

### `date-fns` (^3.6.0)
- **Usage** : Manipulation de dates dans plusieurs composants
- **Note critique** : **NE PAS upgrader vers v4** — date-fns v4.x incompatible avec Turbopack (barrel export)
- **Statut** : ✅ Conserver en v3.x

---

## 6. Problèmes de sécurité

### 🔴 CRITIQUE — Clé API Anthropic exposée dans `.env`
- La clé `ANTHROPIC_API_KEY` est une clé active en clair dans le fichier `.env`
- **Vérifier** que `.env` est bien dans `.gitignore`
- **Recommandation** : Régénérer la clé API si le repo a été exposé publiquement

```bash
# Vérifier .gitignore
cat .gitignore | grep ".env"
```

### 🟡 ATTENTION — Routes n8n sans authentification
- `/api/documents/update-status`, `/api/documents/save-text`, `/api/documents/save-analysis` sont des endpoints POST sans aucune authentification
- N'importe qui peut appeler ces routes et modifier les statuts de documents en DB
- **Recommandation** : Ajouter une authentification ou supprimer ces routes legacy

### 🟡 ATTENTION — Fichiers uploadés accessibles
- Le répertoire `uploads/` contient des fichiers sur le système de fichiers local
- En production, ces fichiers devraient être dans un stockage sécurisé (S3, etc.), pas sur le filesystem du serveur
- **Recommandation** : Migrer vers un stockage cloud pour la production

### 🟡 ATTENTION — `N8N_WEBHOOK_SECRET` en clair dans `.env`
- Même si n8n n'est plus actif, le secret est visible dans le fichier `.env`
- Ce secret était partagé avec n8n — si le compte n8n est compromis, le secret l'est aussi
- **Recommandation** : Rotation du secret si n8n est réactivé

---

## 7. Refactorisations recommandées

### Large fichiers à découper

| Fichier | Lignes | Priorité | Action suggérée |
|---------|--------|----------|-----------------|
| `app/calendrier/page.tsx` | 1921 | Haute | Extraire les 3 vues (Mois/Gantt/Charge) en composants séparés |
| `app/activites/page.tsx` | 969 | Moyenne | Extraire les filtres + tableau en composants |
| `app/projets/[id]/page.tsx` | 971 | Moyenne | Extraire le Kanban en composant `KanbanEtapes` |
| `components/dashboard/DashboardChefProjet.tsx` | 1008 | Moyenne | Découper en sous-composants |
| `app/teams-dashboard/page.tsx` | 1012 | Basse | Extraire les sections Teams |

### Duplication de code potentielle

1. **Calcul CA/coût** : La formule `(heures/8) × TJM` est recalculée dans plusieurs routes API (`/api/dashboard`, `/api/rapports`, `/api/executive`). Candidat pour extraction dans un utilitaire `lib/financial.ts`.

2. **Pattern de pagination/filtrage** : Les routes `/api/activites`, `/api/projets` et `/api/consultants` ont des patterns de filtrage similaires qui pourraient être factorisés.

3. **Guard d'hydratation localStorage** : Le pattern `useEffect + hydrated` apparaît dans plusieurs pages. Candidat pour un hook custom `useLocalStorage`.

### Améliorations TypeScript

1. **`process/route.ts` ligne 247** : `const analysis = JSON.parse(cleanJson)` retourne `any` — ajouter un type guard ou un schéma Zod pour la réponse Claude
2. **Recharts Tooltip** : Les `formatter` Recharts utilisent `any` (comportement documenté, non bloquant)

---

## 8. Fichiers temporaires / résidus

### Uploads de test
```
uploads/1772208033549-test_devis.docx   # Fichier test développement
uploads/1772304128856-test_devis.docx   # Fichier test développement
```
Ces fichiers ont probablement des entrées correspondantes en DB (`DocumentIngestion`).
**Avant suppression** : vérifier en DB avec `npx prisma studio` ou :
```sql
SELECT id, filename, status FROM DocumentIngestion WHERE filepath LIKE '%test_devis%';
```

### `.next/` cache
- Le cache Turbopack peut être corrompu après des changements de dépendances majeures
- **Si problèmes** : `rm -rf .next && npm run dev`

### `.env.save`
- Fichier créé automatiquement par vim/nano, contient les mêmes secrets que `.env`
- **Action** : `rm .env.save`

---

## Résumé des actions par priorité

### 🔴 Priorité HAUTE (sécurité)
1. Vérifier que `.env` est dans `.gitignore`
2. Supprimer `.env.save`
3. Ajouter authentification aux routes legacy (ou les supprimer)

### 🟡 Priorité MOYENNE (nettoyage code)
4. Supprimer `document-ingestion-workflow.json`
5. Supprimer ou marquer deprecated : `update-status`, `save-text`, `save-analysis` (si n8n définitivement abandonné)
6. Nettoyer les doublons dans `.env`
7. Supprimer les fichiers uploads de test après vérification DB

### 🟢 Priorité BASSE (qualité code)
8. Vérifier et clarifier `DashboardChefProjet.tsx` et `DashboardDirigeant.tsx`
9. Extraire la formule CA/coût dans `lib/financial.ts`
10. Créer hook `useLocalStorage` pour le pattern hydratation

---

*Analyse générée automatiquement — 2026-02-28 — Validation manuelle requise avant toute suppression*
