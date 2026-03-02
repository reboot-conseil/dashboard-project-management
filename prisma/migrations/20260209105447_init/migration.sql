-- CreateTable
CREATE TABLE "Consultant" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tjm" DECIMAL,
    "competences" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Projet" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nom" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "budget" DECIMAL,
    "dateDebut" DATETIME,
    "dateFin" DATETIME,
    "statut" TEXT NOT NULL DEFAULT 'PLANIFIE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Activite" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "consultantId" INTEGER NOT NULL,
    "projetId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "heures" DECIMAL NOT NULL,
    "description" TEXT,
    "facturable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Activite_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Activite_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Projet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Etape" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "projetId" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'A_FAIRE',
    "deadline" DATETIME,
    "ordre" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Etape_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Projet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Consultant_email_key" ON "Consultant"("email");

-- CreateIndex
CREATE INDEX "Activite_consultantId_idx" ON "Activite"("consultantId");

-- CreateIndex
CREATE INDEX "Activite_projetId_idx" ON "Activite"("projetId");

-- CreateIndex
CREATE INDEX "Etape_projetId_idx" ON "Etape"("projetId");
