import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/documents/[id] — Détail document
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const docId = parseInt(id);
    if (isNaN(docId)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    const doc = await prisma.documentIngestion.findUnique({
      where: { id: docId },
      include: { projet: { select: { id: true, nom: true, client: true } } },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 });
    }

    return NextResponse.json(doc);
  } catch (error: any) {
    console.error("[DOCUMENT GET] Erreur:", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE /api/documents/[id] — Supprimer document + fichier
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const docId = parseInt(id);
    if (isNaN(docId)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    const doc = await prisma.documentIngestion.findUnique({
      where: { id: docId },
      select: { filepath: true },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 });
    }

    // Supprimer fichier physique (ignore si déjà absent)
    try {
      await fs.unlink(doc.filepath);
      console.log("[DOCUMENT DELETE] Fichier supprimé:", doc.filepath);
    } catch {
      console.warn("[DOCUMENT DELETE] Fichier déjà absent:", doc.filepath);
    }

    await prisma.documentIngestion.delete({ where: { id: docId } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DOCUMENT DELETE] Erreur:", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
