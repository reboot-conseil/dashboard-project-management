import { NextResponse } from "next/server";

// ── Types ──────────────────────────────────────────────────────────────
type ExportType = "pdf" | "excel";
type ExportView = "operationnel" | "consultants" | "strategique";

interface ExportRequestBody {
  type: ExportType;
  view: ExportView;
  filters?: {
    dateDebut?: string;
    dateFin?: string;
    projetId?: string;
  };
}

// ── POST /api/dashboard/export ─────────────────────────────────────────
export async function POST(request: Request) {
  let body: ExportRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const { type, view, filters } = body;

  if (!type || !["pdf", "excel"].includes(type)) {
    return NextResponse.json(
      { error: "type doit être 'pdf' ou 'excel'" },
      { status: 400 }
    );
  }

  if (!view || !["operationnel", "consultants", "strategique"].includes(view)) {
    return NextResponse.json(
      { error: "view doit être 'operationnel', 'consultants' ou 'strategique'" },
      { status: 400 }
    );
  }

  // TODO: Implémenter la génération réelle dans les phases suivantes
  // - PDF : utiliser puppeteer ou react-pdf
  // - Excel : utiliser xlsx ou exceljs

  return NextResponse.json({
    success: true,
    message: `Export ${type.toUpperCase()} de la vue "${view}" en cours de préparation`,
    placeholder: true,
    params: {
      type,
      view,
      filters: filters ?? {},
    },
  });
}
