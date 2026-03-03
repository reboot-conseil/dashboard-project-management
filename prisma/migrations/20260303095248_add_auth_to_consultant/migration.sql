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
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CONSULTANT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Consultant" ("actif", "competences", "couleur", "coutJournalierEmployeur", "createdAt", "email", "id", "nom", "tjm", "updatedAt") SELECT "actif", "competences", "couleur", "coutJournalierEmployeur", "createdAt", "email", "id", "nom", "tjm", "updatedAt" FROM "Consultant";
DROP TABLE "Consultant";
ALTER TABLE "new_Consultant" RENAME TO "Consultant";
CREATE UNIQUE INDEX "Consultant_email_key" ON "Consultant"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
