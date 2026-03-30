import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIMES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const documentType = (formData.get("documentType") as string) || null;
    const projetIdStr = formData.get("projetId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024} MB)` },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIMES.includes(file.type)) {
      return NextResponse.json(
        { error: "Format non supporté. Formats acceptés : PDF, DOCX, TXT" },
        { status: 400 }
      );
    }

    // ── Sauvegarde fichier → Vercel Blob ───────────────────────
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename = `documents/${Date.now()}-${sanitizedName}`;
    const blob = await put(filename, file, { access: "public" });

    // ── Création en DB ─────────────────────────────────────────
    const projetId =
      projetIdStr && projetIdStr !== "new" && projetIdStr !== ""
        ? parseInt(projetIdStr)
        : null;

    const doc = await prisma.documentIngestion.create({
      data: {
        filename: file.name,
        filepath: blob.url,
        filesize: file.size,
        mimetype: file.type,
        type: documentType === "auto" ? null : documentType,
        status: "UPLOADING",
        projetId: projetId && !isNaN(projetId) ? projetId : null,
      },
    });

    // ── Trigger processing (fire-and-forget) ──────────────────
    const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || "http://localhost:3000";
    fetch(`${baseUrl}/api/documents/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: doc.id }),
    }).catch(() => {});

    return NextResponse.json({ success: true, documentId: doc.id }, { status: 201 });

  } catch (error: any) {
    console.error("[UPLOAD] ERROR:", error.message);
    return NextResponse.json(
      {
        error: "Erreur lors de l'upload",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
