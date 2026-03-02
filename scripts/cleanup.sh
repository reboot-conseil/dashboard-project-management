#!/bin/bash
# =============================================================================
# cleanup.sh — Script de nettoyage PM Dashboard
# =============================================================================
# ⚠️  CE SCRIPT EST EN MODE REVUE UNIQUEMENT (DRY-RUN par défaut)
# ⚠️  Aucune suppression ne sera effectuée sans lancer avec --execute
#
# Usage:
#   ./scripts/cleanup.sh           # Affiche ce qui SERAIT supprimé (dry-run)
#   ./scripts/cleanup.sh --execute # SUPPRIME réellement les fichiers (interactif)
#   ./scripts/cleanup.sh --execute --web  # Supprime sans confirmation (API web)
#
# Généré le 2026-02-28 — Validation manuelle requise
# =============================================================================

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DRY_RUN=true
WEB_MODE=false  # Mode non-interactif pour l'API web (pas de sleep, pas de prompts)

for arg in "$@"; do
  case "$arg" in
    --execute) DRY_RUN=false ;;
    --web)     WEB_MODE=true ;;
  esac
done

# ── Couleurs ──────────────────────────────────────────────────────────────────
# En mode web, on désactive les couleurs ANSI pour un output lisible dans le navigateur
if [[ "$WEB_MODE" == "true" ]]; then
  RED='' YELLOW='' GREEN='' BLUE='' NC='' BOLD=''
else
  RED='\033[0;31m'
  YELLOW='\033[1;33m'
  GREEN='\033[0;32m'
  BLUE='\033[0;34m'
  NC='\033[0m'
  BOLD='\033[1m'
fi

# ── Helpers ───────────────────────────────────────────────────────────────────
log_header() {
  echo ""
  echo "══════════════════════════════════════"
  echo "  $1"
  echo "══════════════════════════════════════"
}
log_info()   { echo "  ℹ  $1"; }
log_warn()   { echo "  ⚠  $1"; }
log_delete() { echo "  🗑  $1"; }
log_ok()     { echo "  ✓  $1"; }
log_skip()   { echo "  ↷  $1 (not found — already clean)"; }

delete_file() {
  local file="$1"
  local reason="${2:-}"
  if [[ -f "$file" ]]; then
    if [[ "$DRY_RUN" == "true" ]]; then
      log_delete "[DRY-RUN] Would delete: $file"
      [[ -n "$reason" ]] && echo "           Reason: $reason"
    else
      rm "$file"
      log_ok "Deleted: $file"
    fi
  else
    log_skip "$file"
  fi
}

check_file() {
  local file="$1"
  local desc="${2:-}"
  if [[ -f "$file" ]]; then
    log_warn "EXISTS: $file — $desc"
  else
    log_ok "NOT FOUND (already clean): $file"
  fi
}

# ── Banner ────────────────────────────────────────────────────────────────────
echo ""
echo "╔════════════════════════════════════════════╗"
echo "║    PM Dashboard — Script de nettoyage      ║"
echo "╚════════════════════════════════════════════╝"
echo ""

if [[ "$WEB_MODE" == "true" ]]; then
  echo "  MODE: WEB (non-interactif, ANSI désactivé)"
fi

if [[ "$DRY_RUN" == "true" ]]; then
  echo "  MODE: DRY-RUN (simulation — rien ne sera supprimé)"
  echo "  Pour exécuter réellement: ./scripts/cleanup.sh --execute"
else
  echo "  MODE: EXÉCUTION RÉELLE — Les fichiers vont être supprimés !"
  if [[ "$WEB_MODE" == "false" ]]; then
    echo "  Appuyer sur Ctrl+C dans les 5 secondes pour annuler..."
    sleep 5
  fi
fi
echo ""

# =============================================================================
# SECTION 1 — Fichiers à supprimer (certitude haute)
# =============================================================================
log_header "1. Fichiers à supprimer (certitude haute)"

cd "$PROJECT_DIR"

# Workflow n8n archivé (pipeline migré vers Next.js natif)
delete_file "document-ingestion-workflow.json" \
  "Workflow n8n archivé — pipeline migré vers /api/documents/process"

# Backup .env automatique
delete_file ".env.save" \
  "Fichier de backup automatique vim/nano — contient des secrets inutiles"


# =============================================================================
# SECTION 2 — Fichiers uploads de test
# =============================================================================
log_header "2. Fichiers uploads de test"

log_warn "Les fichiers suivants semblent être des uploads de test :"

UPLOADS_DIR="$PROJECT_DIR/uploads"
TEST_FILES=(
  "1772208033549-test_devis.docx"
  "1772304128856-test_devis.docx"
)

for fname in "${TEST_FILES[@]}"; do
  FPATH="$UPLOADS_DIR/$fname"
  if [[ -f "$FPATH" ]]; then
    echo ""
    log_warn "Fichier de test trouvé : $FPATH"
    log_info "  Vérifier si un enregistrement DB pointe vers ce fichier :"
    log_info "  SELECT id, status FROM DocumentIngestion WHERE filepath LIKE '%$fname%';"
    echo ""
    if [[ "$DRY_RUN" == "true" ]]; then
      log_delete "[DRY-RUN] Would delete: $FPATH"
    elif [[ "$WEB_MODE" == "true" ]]; then
      # Mode web : suppression automatique sans prompt
      rm "$FPATH"
      log_ok "Deleted (web mode): $FPATH"
    else
      read -p "  Supprimer $fname ? [y/N] " -n 1 -r
      echo ""
      if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm "$FPATH"
        log_ok "Deleted: $FPATH"
      else
        log_info "Skipped: $FPATH"
      fi
    fi
  else
    log_skip "$FPATH"
  fi
done


# =============================================================================
# SECTION 3 — Vérifications sécurité (.gitignore)
# =============================================================================
log_header "3. Vérifications sécurité"

GITIGNORE="$PROJECT_DIR/.gitignore"

echo ""
log_info "Vérification que .env est bien dans .gitignore..."
if [[ -f "$GITIGNORE" ]]; then
  if grep -q "^\.env$\|^\.env\b" "$GITIGNORE" 2>/dev/null; then
    log_ok ".env est présent dans .gitignore"
  else
    log_warn "ATTENTION: .env n'est PAS dans .gitignore !"
    log_warn "Ajouter 'echo \".env\" >> .gitignore' avant tout commit !"
  fi
else
  log_warn "Pas de fichier .gitignore trouvé !"
  log_warn "Créer un .gitignore avec : .env, .env.local, .env.save, node_modules/, .next/"
fi

echo ""
log_info "Vérification doublon dans .env..."
if [[ -f "$PROJECT_DIR/.env" ]]; then
  DUPES=$(sort "$PROJECT_DIR/.env" | uniq -d | grep -v "^$" | grep -v "^#" || true)
  if [[ -n "$DUPES" ]]; then
    log_warn "Lignes dupliquées dans .env :"
    echo "$DUPES" | while IFS= read -r line; do
      log_warn "  → $line"
    done
    log_info "Éditer manuellement .env pour supprimer les doublons"
  else
    log_ok "Pas de doublons détectés dans .env"
  fi
fi

echo ""
log_info "Vérification clé API Anthropic..."
if [[ -f "$PROJECT_DIR/.env" ]]; then
  if grep -q "ANTHROPIC_API_KEY=sk-ant-" "$PROJECT_DIR/.env" 2>/dev/null; then
    log_warn "Clé API Anthropic trouvée dans .env"
    log_warn "S'assurer que ce fichier n'est JAMAIS commité dans git"
    log_warn "En production, utiliser des variables d'environnement système"
  fi
fi


# =============================================================================
# SECTION 4 — Routes API legacy (information uniquement)
# =============================================================================
log_header "4. Routes API legacy (information — suppression manuelle)"

echo ""
log_info "Les routes suivantes étaient utilisées par le workflow n8n,"
log_info "désormais remplacé par /api/documents/process (Next.js natif)."
log_info "Si n8n est définitivement abandonné, ces fichiers peuvent être supprimés."
echo ""

LEGACY_ROUTES=(
  "app/api/documents/update-status/route.ts"
  "app/api/documents/save-text/route.ts"
  "app/api/documents/save-analysis/route.ts"
  "app/api/documents/[id]/status/route.ts"
  "app/api/admin/teams-config/test-n8n/route.ts"
  "app/api/webhooks/n8n/activity-confirmed/route.ts"
)

for route in "${LEGACY_ROUTES[@]}"; do
  check_file "$PROJECT_DIR/$route" "Route legacy n8n"
done

echo ""
log_info "Pour supprimer ces fichiers (après validation) :"
for route in "${LEGACY_ROUTES[@]}"; do
  echo "    rm \"$route\""
done
echo ""
log_warn "Ne pas supprimer ces routes sans vérifier qu'elles ne sont plus appelées"
log_warn "Commande de vérification :"
log_warn "grep -r 'update-status|save-text|save-analysis' app/ --include='*.tsx'"


# =============================================================================
# SECTION 5 — Cache .next
# =============================================================================
log_header "5. Cache .next (optionnel)"

NEXT_DIR="$PROJECT_DIR/.next"
if [[ -d "$NEXT_DIR" ]]; then
  NEXT_SIZE=$(du -sh "$NEXT_DIR" 2>/dev/null | cut -f1)
  log_info "Cache .next présent — taille : ${NEXT_SIZE:-inconnu}"
  log_info "Supprimer si des problèmes de build persistent :"
  log_info "  rm -rf .next && npm run dev"
else
  log_ok "Pas de cache .next (déjà nettoyé)"
fi


# =============================================================================
# RÉSUMÉ
# =============================================================================
log_header "Résumé"

echo ""
if [[ "$DRY_RUN" == "true" ]]; then
  echo "  Mode DRY-RUN — Aucune modification effectuée."
  echo "  Relancer avec --execute pour appliquer les changements."
else
  echo "  Nettoyage terminé."
fi

echo ""
echo "  Documentation de référence :"
echo "    - NETTOYAGE_RECOMMANDE.md    (analyse complète)"
echo "    - DOCUMENTATION_COMPLETE_PROJET.md  (architecture)"
echo "    - RAPPORT_AUDIT.md           (synthèse exécutive)"
echo ""
