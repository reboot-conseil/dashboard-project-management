#!/usr/bin/env bash
# deploy.sh — Déploiement Docker sur la tour SSH (192.168.1.63)
# Usage : bash deploy.sh
set -euo pipefail

SERVER="jon@192.168.1.63"
SSH="ssh -o ServerAliveInterval=30 -o ServerAliveCountMax=5"
REMOTE_DIR="/home/jon/dashboard-chef-projet"
APP_NAME="dashboard"

echo "==> [1/5] Transfert des fichiers vers ${SERVER}..."
rsync -az --exclude='.git' --exclude='node_modules' --exclude='.next' \
  --exclude='prisma/dev.db' --exclude='uploads' \
  ./ "${SERVER}:${REMOTE_DIR}/"

echo "==> [2/5] Copie du fichier .env.production..."
scp .env.production "${SERVER}:${REMOTE_DIR}/.env.production"

COMPOSE="-p dashboard -f ${REMOTE_DIR}/infra/docker-compose.yml"

echo "==> [3/5] Build de l'image Docker..."
$SSH "${SERVER}" "cd ${REMOTE_DIR} && DOCKER_BUILDKIT=0 docker compose ${COMPOSE} build --no-cache"

echo "==> [4/5] Arrêt de l'ancienne version et démarrage..."
$SSH "${SERVER}" "cd ${REMOTE_DIR} && docker compose ${COMPOSE} down && docker compose ${COMPOSE} --env-file .env.production up -d"

echo "==> [5/5] Synchronisation schéma Prisma..."
$SSH "${SERVER}" "cd ${REMOTE_DIR} && docker compose ${COMPOSE} exec app npx prisma@6 db push --accept-data-loss"
# Décommenter la ligne suivante pour créer le premier compte admin (première exécution uniquement) :
# $SSH "${SERVER}" "cd ${REMOTE_DIR} && docker compose exec -e ADMIN_EMAIL=jonathan.braun@reboot-conseil.com -e ADMIN_PASSWORD=Reboot2026 -e ADMIN_NOM=Jonathan app node prisma/seed-admin.js"

echo ""
echo "✓ Déploiement terminé — https://${SERVER#*@}"
echo "  Logs : ssh ${SERVER} 'cd ${REMOTE_DIR} && docker compose ${COMPOSE} logs -f app'"
