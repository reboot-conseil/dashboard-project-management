-- CreateTable
CREATE TABLE "ProjetTeamsConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "projetId" INTEGER NOT NULL,
    "canalNom" TEXT,
    "canalId" TEXT,
    "webhookUrl" TEXT,
    "logAutoActif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjetTeamsConfig_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Projet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IntegrationConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "n8nUrl" TEXT NOT NULL DEFAULT 'https://n8n.spoton-ai.fr',
    "webhookSecret" TEXT NOT NULL,
    "emailDomain" TEXT NOT NULL DEFAULT '@reboot-conseil.com',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "derniereSync" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjetTeamsConfig_projetId_key" ON "ProjetTeamsConfig"("projetId");
