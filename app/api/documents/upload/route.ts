import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import path from "path";
import fs from "fs/promises";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIMES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export async function POST(req: NextRequest) {
  console.log("═══════════════════════════════════════════════════");
  console.log("[UPLOAD] ===== NEW UPLOAD REQUEST =====");
  console.log("[UPLOAD] Time:", new Date().toISOString());
  console.log("═══════════════════════════════════════════════════");

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const documentType = (formData.get("documentType") as string) || null;
    const projetIdStr = formData.get("projetId") as string | null;

    console.log("[UPLOAD] FormData fields:", {
      hasFile: !!file,
      documentType,
      projetIdStr,
    });

    // ── Validation fichier ─────────────────────────────────────
    if (!file) {
      console.log("[UPLOAD] ❌ No file in request");
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    console.log("[UPLOAD] File received:", {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    if (file.size > MAX_FILE_SIZE) {
      console.log("[UPLOAD] ❌ File too large:", file.size, ">", MAX_FILE_SIZE);
      return NextResponse.json(
        { error: `Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024} MB)` },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIMES.includes(file.type)) {
      console.log("[UPLOAD] ❌ Unsupported MIME type:", file.type);
      return NextResponse.json(
        { error: "Format non supporté. Formats acceptés : PDF, DOCX, TXT" },
        { status: 400 }
      );
    }

    console.log("[UPLOAD] ✅ File validated");

    // ── Sauvegarde fichier ─────────────────────────────────────
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename = `${Date.now()}-${sanitizedName}`;
    const filepath = path.join(UPLOADS_DIR, filename);

    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filepath, buffer);

    console.log("[UPLOAD] ✅ File saved to:", filepath, `(${file.size} bytes)`);

    // ── Création en DB ─────────────────────────────────────────
    const projetId =
      projetIdStr && projetIdStr !== "new" && projetIdStr !== ""
        ? parseInt(projetIdStr)
        : null;

    const doc = await prisma.documentIngestion.create({
      data: {
        filename: file.name,
        filepath,
        filesize: file.size,
        mimetype: file.type,
        type: documentType === "auto" ? null : documentType,
        status: "UPLOADING",
        projetId: projetId && !isNaN(projetId) ? projetId : null,
      },
    });

    console.log("[UPLOAD] ✅ Document created in DB:", {
      id: doc.id,
      filename: doc.filename,
      status: doc.status,
    });

    // ── Trigger processing interne (fire-and-forget) ───────────
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      "http://localhost:3000";

    const processingUrl = `${appUrl}/api/documents/process`;

    console.log("[UPLOAD] 🚀 About to trigger processing...");
    console.log("[UPLOAD] Document ID:", doc.id);
    console.log("[UPLOAD] Processing URL:", processingUrl);

    fetch(processingUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: doc.id }),
    })
      .then(async (res) => {
        console.log("[UPLOAD] ✅ Processing HTTP response — status:", res.status);
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          console.log("[UPLOAD] Processing response body:", data);
        } catch {
          console.log("[UPLOAD] Processing response (raw):", text.substring(0, 300));
        }
      })
      .catch((err) => {
        console.error("[UPLOAD] ❌ Processing trigger FAILED:", err.message);
        console.error("[UPLOAD] Error stack:", err.stack);
      });

    console.log("[UPLOAD] Processing call initiated (async, not awaited)");

    console.log("[UPLOAD] ✅ Upload route completed, returning:", {
      documentId: doc.id,
      success: true,
    });
    console.log("═══════════════════════════════════════════════════");

    return NextResponse.json({ success: true, documentId: doc.id }, { status: 201 });

  } catch (error: any) {
    console.error("═══════════════════════════════════════════════════");
    console.error("[UPLOAD] ❌ FATAL ERROR:", error.message);
    console.error("[UPLOAD] Stack:", error.stack);
    console.error("═══════════════════════════════════════════════════");
    return NextResponse.json(
      {
        error: "Erreur lors de l'upload",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
