import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/documents — Liste avec filtres optionnels
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const [documents, counts] = await Promise.all([
      prisma.documentIngestion.findMany({
        where,
        include: { projet: { select: { id: true, nom: true, client: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      // Stats agrégées
      Promise.all([
        prisma.documentIngestion.count(),
        prisma.documentIngestion.count({ where: { status: "PENDING_REVIEW" } }),
        prisma.documentIngestion.count({ where: { status: "PROCESSED" } }),
        prisma.documentIngestion.count({ where: { status: "ERROR" } }),
      ]),
    ]);

    return NextResponse.json({
      documents,
      stats: {
        total: counts[0],
        enAttente: counts[1],
        traites: counts[2],
        erreurs: counts[3],
      },
    });
  } catch (error: any) {
    console.error("[DOCUMENTS] Erreur liste:", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
