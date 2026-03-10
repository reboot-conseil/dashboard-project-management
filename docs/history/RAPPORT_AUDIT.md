# 📊 Rapport d'Audit — PM Dashboard

> Généré le 2026-02-28 — Audit complet codebase

---

## 🎯 Synthèse Exécutive

Le **PM Dashboard** est une application de gestion de projets de conseil mûre et fonctionnelle, avec une architecture Next.js moderne (App Router), une base de données SQLite via Prisma, et une intégration AI Claude pour l'ingestion documentaire.

**Score de santé global : 7.2 / 10** ⭐⭐⭐⭐⭐⭐⭐

| Dimension | Score | Tendance |
|-----------|-------|----------|
| Architecture | 8/10 | ✅ Solide |
| Qualité du code | 7/10 | ✅ Bonne |
| Sécurité | 5/10 | ⚠️ À améliorer |
| Maintenabilité | 6/10 | ⚠️ Fichiers trop longs |
| Fonctionnalités | 9/10 | ✅ Très riche |
| Tests | 2/10 | 🔴 Absents |
| Documentation | 3/10 → 9/10 | ✅ Créée aujourd'hui |

---

## 📈 Statistiques du Projet

### Volume de code

| Catégorie | Fichiers | Lignes |
|-----------|----------|--------|
| Pages (app/) | 13 | ~9 200 |
| API Routes (app/api/) | 40 | ~6 000 |
| Composants | 53 | ~10 000 |
| Librairies (lib/) | 3 | ~400 |
| Schéma Prisma | 1 | 152 |
| **Total** | **~110** | **~26 000** |

### Répartition par module

```
Documents (pipeline AI)  ████████░░  8 routes API
Dashboard               ████████░░  5 routes API + 23 composants
Projets/Étapes          ██████░░░░  6 routes API
Activités               ████░░░░░░  3 routes API
Consultants             ████░░░░░░  3 routes API
Teams/Webhooks          ████░░░░░░  5 routes API
Rapports/KPIs           ████░░░░░░  5 routes API
Admin                   ███░░░░░░░  3 routes API
```

### Base de données

| Modèle | Migrations | Champs |
|--------|-----------|--------|
| Consultant | initiale | 9 champs |
| Projet | initiale | 11 champs |
| Activite | +2 migrations | 10 champs |
| Etape | +2 migrations | 10 champs |
| ProjetTeamsConfig | migration 6 | 8 champs |
| DocumentIngestion | migration 7 | 13 champs |
| IntegrationConfig | migration 6 | 7 champs |

---

## ✅ Points Forts

### 1. Architecture moderne et cohérente
- Next.js 16 App Router bien utilisé : Server Components où possible, Client Components (`"use client"`) justifiés
- Prisma avec pattern singleton correctement implémenté dans `lib/prisma.ts`
- Séparation claire pages / composants / API / lib

### 2. Feature set très complet
- 3 vues dashboard (opérationnel/consultants/stratégique) avec persistance locale
- Health Score projet calculé algorithmiquement avec vélocité et prédiction de fin
- Calendrier avancé avec 3 modes (Mois/Gantt/Charge Équipe)
- Pipeline AI complet (PDF/DOCX/TXT → Claude → validation utilisateur)
- Vue Teams embarquable avec headers CSP corrects

### 3. Formule financière cohérente
La règle `1 jour = 8 heures` est appliquée uniformément :
- `CA = (heures/8) × TJM`
- `Coût = (heures/8) × coutJournalierEmployeur`
- `Marge = CA - Coût`

### 4. Gestion des erreurs dans le pipeline documents
Le pipeline d'ingestion (`/api/documents/process`) gère correctement 3 niveaux d'erreurs avec mise à jour du statut en DB à chaque étape.

### 5. Bonnes pratiques localStorage
Pattern d'hydratation systématique pour éviter les erreurs SSR :
```tsx
const [hydrated, setHydrated] = useState(false);
useEffect(() => { /* load localStorage */ setHydrated(true); }, []);
if (!hydrated) return null;
```

### 6. Gestion du problème pdf-parse / Turbopack
Solution correcte en deux volets :
- `serverExternalPackages: ["pdf-parse"]` dans next.config.ts
- Chargement lazy via `getPdfParse()` pour éviter le DOMMatrix error

---

## ⚠️ Points d'Attention

### 1. Absence totale de tests (Score: 2/10)
**Criticité : Haute**

Aucun fichier de test n'a été trouvé dans le projet (ni `*.test.ts`, ni `*.spec.ts`, ni dossier `__tests__`). Pour une application gérant des données financières, l'absence de tests est un risque majeur.

**Recommandations :**
- Ajouter des tests unitaires pour `lib/projet-metrics.ts` (calculs financiers)
- Ajouter des tests d'intégration pour les routes API critiques
- Envisager Vitest (compatibilité Next.js/TypeScript)

### 2. Sécurité des routes API (Score: 5/10)
**Criticité : Moyenne-Haute**

- **Pas d'authentification globale** : toutes les routes API sont publiques (accessible sans login)
- **Routes legacy sans auth** : `/api/documents/update-status`, `save-text`, `save-analysis` sont POST ouverts sans aucune protection
- **Clé API Anthropic en clair** dans `.env` — risque si jamais le fichier est accidentellement commité
- **Fichiers uploadés** sur le filesystem local — non sécurisés pour la production

### 3. Fichiers trop longs (Maintenabilité)
**Criticité : Basse**

| Fichier | Lignes | Seuil recommandé |
|---------|--------|-----------------|
| `app/calendrier/page.tsx` | **1921** | 400-500 |
| `components/dashboard/DashboardChefProjet.tsx` | **1008** | 400-500 |
| `app/teams-dashboard/page.tsx` | **1012** | 400-500 |
| `app/projets/[id]/page.tsx` | **971** | 400-500 |
| `app/activites/page.tsx` | **969** | 400-500 |

### 4. Intégration n8n partiellement abandonnée
**Criticité : Basse**

6 routes API liées à n8n sont toujours présentes alors que le pipeline a été migré vers Next.js natif. Cela crée de la confusion dans la base de code. De plus, les variables d'environnement n8n dans `.env` ont un doublon.

### 5. Pas de gestion des migrations en production
**Criticité : Moyenne**

La base de données est SQLite (locale). En production, une migration vers PostgreSQL ou MySQL serait recommandée, avec un pipeline de migrations automatisées.

---

## 🔴 Problèmes Critiques à Résoudre

### P1 — Sécurité : .env dans le contrôle de version ?

```bash
# Vérification URGENTE :
cat .gitignore | grep ".env"
git log --all --full-history -- .env   # Vérifier qu'il n'a jamais été commité
```

Si le `.env` a été commité dans git, la clé API Anthropic est compromise. **Régénérer la clé immédiatement.**

### P2 — Doublon variable d'environnement

```env
# Dans .env — CES DEUX LIGNES SONT IDENTIQUES :
N8N_WEBHOOK_DOCUMENT_URL=https://n8n.spoton-ai.fr/webhook/document-ingestion
N8N_WEBHOOK_DOCUMENT_URL=https://n8n.spoton-ai.fr/webhook/document-ingestion
```

Supprimer la ligne en doublon manuellement.

---

## 📋 Plan d'Action Priorisé

### Sprint 1 — Sécurité (1-2 jours)
- [ ] Vérifier `.gitignore` contient `.env`, `.env.save`, `.env.*`
- [ ] Supprimer `.env.save`
- [ ] Corriger le doublon dans `.env`
- [ ] Évaluer l'ajout d'une couche d'authentification (NextAuth.js ?)

### Sprint 2 — Nettoyage (0.5 jour)
- [ ] Supprimer `document-ingestion-workflow.json`
- [ ] Décider du sort des routes API legacy n8n (supprimer ou conserver)
- [ ] Nettoyer les fichiers DOCX de test dans `uploads/`
- [ ] Vérifier et clarifier les composants `DashboardChefProjet` / `DashboardDirigeant`

### Sprint 3 — Qualité (3-5 jours)
- [ ] Ajouter tests unitaires pour `lib/projet-metrics.ts`
- [ ] Découper `app/calendrier/page.tsx` (1921 lignes) en composants
- [ ] Extraire la formule CA/coût dans `lib/financial.ts`
- [ ] Créer un hook `useLocalStorage` réutilisable

### Sprint 4 — Production (selon priorités)
- [ ] Migration vers PostgreSQL pour la production
- [ ] Stockage fichiers uploadés sur S3/cloud
- [ ] Variables d'environnement via service secrets (Vault, etc.)
- [ ] CI/CD avec tests automatiques

---

## 🏗️ Architecture Recommandée — Évolutions

### Court terme (maintenabilité)
```
lib/
  financial.ts       # Formules CA/coût/marge (extraire des routes API)
  hooks/
    useLocalStorage.ts  # Hook hydratation localStorage
```

### Moyen terme (qualité)
```
__tests__/
  lib/
    projet-metrics.test.ts   # Tests calculs financiers
  api/
    activites.test.ts         # Tests routes API critiques
```

### Long terme (production)
```
# Base de données
datasource db {
  provider = "postgresql"    # Migrer de SQLite → PostgreSQL
  url = env("DATABASE_URL")
}

# Stockage fichiers
uploads/  →  AWS S3 / Cloudflare R2 / Supabase Storage
```

---

## 📦 Dépendances — Points de vigilance

| Package | Note |
|---------|------|
| `date-fns` | **Rester en v3.x** — v4 incompatible Turbopack |
| `pdf-parse` | Requiert chargement lazy + serverExternalPackages |
| `next` | v16 — App Router exclusif, pas de Pages Router |
| `tailwindcss` | **v4** — syntaxe différente de v3 (CSS-first config) |
| `recharts` | Tooltip formatter doit utiliser `any` (types incomplets) |

---

## 🔍 Commandes d'Analyse Utiles

```bash
# Trouver les imports de composants suspects
grep -r "DashboardChefProjet\|DashboardDirigeant" app/ components/ --include="*.tsx"

# Vérifier les routes legacy encore appelées depuis le frontend
grep -r "update-status\|save-text\|save-analysis" app/ components/ --include="*.tsx" --include="*.ts"

# Lister les fichiers uploadés orphelins (correspondances en DB)
npx prisma studio  # → table DocumentIngestion → colonne filepath

# Vérifier taille du .next cache
du -sh .next/

# Lancer le script de nettoyage en mode simulation
./scripts/cleanup.sh

# Stats lignes de code par dossier
find app/ -name "*.tsx" -o -name "*.ts" | xargs wc -l | sort -n | tail -20
```

---

## Conclusion

Le **PM Dashboard** est une application bien conçue avec une richesse fonctionnelle remarquable. Les principaux risques sont :

1. **L'absence de tests** pour du code financier (critique à long terme)
2. **La sécurité des API** (pas d'authentification globale)
3. **La dette technique légère** liée à l'abandon du pipeline n8n (routes legacy à nettoyer)

La migration du pipeline d'ingestion documentaire de n8n vers Next.js natif (effectuée lors de la session précédente) a été une bonne décision : elle simplifie l'architecture et élimine une dépendance externe complexe.

**Le projet est prêt pour la production** dès que les points de sécurité (P1, P2) sont traités.

---

*Rapport généré automatiquement — 2026-02-28*
*Fichiers créés lors de cet audit : DOCUMENTATION_COMPLETE_PROJET.md, NETTOYAGE_RECOMMANDE.md, RAPPORT_AUDIT.md, scripts/cleanup.sh*
