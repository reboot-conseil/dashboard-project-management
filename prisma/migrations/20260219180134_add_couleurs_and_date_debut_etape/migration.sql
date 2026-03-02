-- AlterTable
ALTER TABLE "Etape" ADD COLUMN "dateDebut" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Consultant" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tjm" DECIMAL,
    "coutJournalierEmployeur" REAL,
    "competences" TEXT,
    "couleur" TEXT NOT NULL DEFAULT '#8B5CF6',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Consultant" ("actif", "competences", "coutJournalierEmployeur", "createdAt", "email", "id", "nom", "tjm", "updatedAt") SELECT "actif", "competences", "coutJournalierEmployeur", "createdAt", "email", "id", "nom", "tjm", "updatedAt" FROM "Consultant";
DROP TABLE "Consultant";
ALTER TABLE "new_Consultant" RENAME TO "Consultant";
CREATE UNIQUE INDEX "Consultant_email_key" ON "Consultant"("email");
CREATE TABLE "new_Projet" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nom" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "budget" DECIMAL,
    "chargeEstimeeTotale" REAL,
    "dateDebut" DATETIME,
    "dateFin" DATETIME,
    "statut" TEXT NOT NULL DEFAULT 'PLANIFIE',
    "couleur" TEXT NOT NULL DEFAULT '#3b82f6',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Projet" ("budget", "chargeEstimeeTotale", "client", "createdAt", "dateDebut", "dateFin", "id", "nom", "statut", "updatedAt") SELECT "budget", "chargeEstimeeTotale", "client", "createdAt", "dateDebut", "dateFin", "id", "nom", "statut", "updatedAt" FROM "Projet";
DROP TABLE "Projet";
ALTER TABLE "new_Projet" RENAME TO "Projet";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
