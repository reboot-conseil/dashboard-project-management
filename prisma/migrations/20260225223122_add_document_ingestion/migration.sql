-- CreateTable
CREATE TABLE "DocumentIngestion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "filename" TEXT NOT NULL,
    "filepath" TEXT NOT NULL,
    "filesize" INTEGER,
    "mimetype" TEXT,
    "type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UPLOADING',
    "projetId" INTEGER,
    "extractedText" TEXT,
    "analysis" JSONB,
    "confidence" INTEGER,
    "validatedData" JSONB,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" DATETIME,
    CONSTRAINT "DocumentIngestion_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Projet" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DocumentIngestion_status_idx" ON "DocumentIngestion"("status");

-- CreateIndex
CREATE INDEX "DocumentIngestion_createdAt_idx" ON "DocumentIngestion"("createdAt");
