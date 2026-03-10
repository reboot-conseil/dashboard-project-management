#!/bin/bash
# Copie bcryptjs depuis le serveur vers le conteneur
docker cp /home/jon/dashboard-chef-projet/node_modules/bcryptjs dashboard_app:/app/node_modules/bcryptjs
docker exec \
  -e ADMIN_EMAIL=jonathan.braun@reboot-conseil.com \
  -e ADMIN_PASSWORD=Reboot2026 \
  -e ADMIN_NOM="Jonathan Braun" \
  dashboard_app npm run db:seed-admin
