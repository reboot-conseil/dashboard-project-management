# Handoff — Sprint 9 Phase A (en cours)

**Date :** 2026-03-02
**Branche :** `sprint9/phase-a-ux-polish`
**Worktree :** `.worktrees/sprint9-phase-a`
**Tests actuels :** 242/242 passent

## Tâches terminées

| # | Tâche | Commit |
|---|---|---|
| 1 | Nettoyage sidebar (Rapports/Teams/Audit supprimés) + suppression exports placeholder DashboardHeader | `b003f43` |
| 2 | Fix bouton Enregistrer SaisieRapide (col-span-full + min-w) | `68b7b29` |
| 3 | Fix filtre Facturable repositionné ligne 1 (plus de masquage) | `9ec9043` |
| 4 | Suppression /rapports + functions exportCsv dans activites/projets/consultants/executive | `ef5e240` |

## Tâches restantes (à exécuter avec subagent-driven-development)

Lire le plan complet : `docs/plans/2026-03-02-sprint9-phase-a-ux-polish.md`

| # | Tâche | Priorité |
|---|---|---|
| 5 | PageHeader uniformisé sur toutes les pages + boutons CSV dans les actions | Haute |
| 6 | Thème "Sobre & Classe" — use-color-theme.ts + tokens CSS globals.css | Haute |
| 7 | Page /parametres — sélecteur palette + section raccourcis | Haute |
| 8 | Modal raccourcis clavier (touche ?) — lib/shortcuts.ts + shortcuts-modal.tsx + layout.tsx | Moyenne |
| 9 | Calendrier lisibilité — COL_WIDTH 44, noms étapes, couleur projet, charge seuils | Moyenne |
| 10 | API PATCH /api/etapes/[id] accepte { dateDebut, deadline } | Haute (prérequis Task 11) |
| 11 | Gantt drag & drop natif (Pointer Events) — move + resize | Haute |

## Pour reprendre

1. Ouvrir une nouvelle session Claude Code
2. `cd /Users/jonathanbraun/dashboard-chef-projet/.worktrees/sprint9-phase-a`
3. Lire ce fichier + `docs/plans/2026-03-02-sprint9-phase-a-ux-polish.md`
4. Utiliser `superpowers:subagent-driven-development` pour continuer depuis Task 5
5. Les tâches 10 et 11 sont dépendantes (10 avant 11)

## Contexte technique important

- Les fonctions `exportCsvActivites`, `exportCsvProjets`, `exportCsvConsultants`, `exportCsvFacturation` existent mais ne sont **pas encore appelées** — les boutons seront ajoutés en Task 5 dans les `PageHeader.actions`
- Le lien `/parametres` est déjà dans la sidebar (Task 1) mais la page n'existe pas encore (Task 7)
- `use-color-theme.ts` n'existe pas encore (Task 6)
- `lib/shortcuts.ts` n'existe pas encore (Task 8)
