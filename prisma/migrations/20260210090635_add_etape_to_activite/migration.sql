-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Activite" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "consultantId" INTEGER NOT NULL,
    "projetId" INTEGER NOT NULL,
    "etapeId" INTEGER,
    "date" DATETIME NOT NULL,
    "heures" DECIMAL NOT NULL,
    "description" TEXT,
    "facturable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Activite_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Activite_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Projet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Activite_etapeId_fkey" FOREIGN KEY ("etapeId") REFERENCES "Etape" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Activite" ("consultantId", "createdAt", "date", "description", "facturable", "heures", "id", "projetId", "updatedAt") SELECT "consultantId", "createdAt", "date", "description", "facturable", "heures", "id", "projetId", "updatedAt" FROM "Activite";
DROP TABLE "Activite";
ALTER TABLE "new_Activite" RENAME TO "Activite";
CREATE INDEX "Activite_consultantId_idx" ON "Activite"("consultantId");
CREATE INDEX "Activite_projetId_idx" ON "Activite"("projetId");
CREATE INDEX "Activite_etapeId_idx" ON "Activite"("etapeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
